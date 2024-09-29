import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import fastifyMultipart from "@fastify/multipart";
import { rabbitClient } from "./rabbit";
import { GlobalVars } from "./vars";
import { ShpotifyBackend } from "./backend";
import { createReadStream, readFileSync } from "fs";
import { MinioClient } from "./minio";
import {
  apiScanSchema,
  zAPIMiscJobs,
  zrSongScanJob,
  zrSongUploadJob,
  zStreamRequest,
} from "./zModels";
import path from "path";
import { async_ffmpeg_buffer, md5FromBuffer, sleep } from "./utils";
import Ffmpeg from "fluent-ffmpeg";

const VARS = new GlobalVars();
const PORT = VARS.API_PORT;

export class ShpotifyAPI {
  private port: number;
  private server: FastifyInstance;
  private rabbit: rabbitClient;
  private minio: MinioClient;
  private backend: ShpotifyBackend;

  constructor(backend: ShpotifyBackend) {
    this.port = PORT;
    this.server = Fastify({ logger: true });
    this.server.setValidatorCompiler(validatorCompiler);
    this.server.setSerializerCompiler(serializerCompiler);
    this.server.register(fastifyMultipart, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB
      },
    });

    this.rabbit = new rabbitClient("ShpotifyAPI");
    this.minio = new MinioClient(VARS.MINIO_URL);
    this.backend = backend;

    this.server.get("/ping", this.ping.bind(this));
    this.server.get("/rescan_all_meta", this.rescanAllMeta.bind(this));
    this.server.get("/scan/song/:id", this.scanSong.bind(this));
    this.server.post("/play_post", this.play_POST.bind(this));
    this.server.get("/play_get", this.play_GET.bind(this));
    this.server.post("/upload/song", this.uploadSong.bind(this));

    this.rabbit.startReconnectLoop();
    this.startServer();
  }

  private async startServer() {
    try {
      await this.server.listen({ port: this.port, host: "0.0.0.0" });
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }

  private async ping(request: FastifyRequest, reply: FastifyReply) {
    reply.status(200).send("pong");
  }

  private async rescanAllMeta(request: FastifyRequest, reply: FastifyReply) {
    await this.rabbit.publish(
      VARS.MISC_QUEUE,
      zAPIMiscJobs.Enum.rescan_all_meta
    );
    reply.status(200).send("OK");
  }

  private async scanSong(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = apiScanSchema.parse(request.params);
      await this.rabbit.publish(
        "scan_jobs",
        JSON.stringify(
          zrSongScanJob.parse({
            source_id: params.id,
          })
        )
      );
      reply.status(200).send(`OK: ${params.id} will be scanned.`);
    } catch (err) {
      reply.status(400).send({ error: err });
    }
  }

  private async uploadSong(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();
    if (!data) {
      reply.status(400).send("Upload failed");
      return;
    }

    const ext = path.extname(data.filename).toLowerCase();
    const md5 = await md5FromBuffer(await data.toBuffer());
    const md5filename = md5 + ext;

    // check if it already exists
    const exist = await this.minio.fileExists(
      VARS.SOURCE_FILES_BUCKET,
      md5filename
    );
    if (exist) {
      reply.status(400).send("File already existed");
      return;
    }

    const bucketUpload = await this.minio.uploadBuffer(
      VARS.SOURCE_FILES_BUCKET,
      await data.toBuffer(),
      md5filename
    );

    await this.rabbit.publish(
      VARS.SONG_UPLOADS_QUEUE,
      JSON.stringify(
        zrSongUploadJob.parse({
          url: bucketUpload,
        })
      )
    );

    reply.status(200).send(`Uploaded to ${bucketUpload}`);
  }

  private async play_POST(request: FastifyRequest, reply: FastifyReply) {
    /*
    curl -X POST http://localhost:3000/play -H "Content-Type: application/json" -d '{"source_id": 1, "codec": "mp3", "bitrate": 320}'
    */
    try {
      const params = zStreamRequest.parse(request.body);
      console.log("PLAY", params);

      const source = await this.backend.getSourceFileByID(params.source_id);
      if (!source) {
        reply.status(400).send("id not found");
        return;
      }

      const url = `${VARS.MINIO_URL}/sourcefiles/${source.filename}`;
      const ff = Ffmpeg(url);
      ff.outputOption("-vn");
      ff.outputOption("-sn");
      ff.audioCodec("libmp3lame");
      ff.audioBitrate(params.bitrate);
      ff.outputOption("-map_metadata -1");

      const output = "temp.mp3";
      ff.output(output);
      const run = await async_ffmpeg_buffer(ff);
      const buffer = readFileSync(output);
      //reply.type('audio/mp3')
      reply.status(200).send(buffer);
    } catch (err) {
      reply.status(400).send(err);
    }
  }

  private async play_GET(request: FastifyRequest, reply: FastifyReply) {
    /*
    http://localhost:3000/play_get?source_id=2&codec=mp3
    */
    try {
      const params = zStreamRequest.parse(request.query);
      const source = await this.backend.getSourceFileByID(params.source_id);
      if (!source) {
        reply.status(400).send("id not found");
        return;
      }

      const url = `${VARS.MINIO_URL}/sourcefiles/${source.filename}`;
      const ff = Ffmpeg(url);
      ff.outputOption("-vn");
      ff.outputOption("-sn");
      ff.outputOption("-map_metadata -1");
      let output = "temp";
      if (params.codec == "mp3") {
        ff.audioCodec("libmp3lame");
        ff.audioBitrate(params.bitrate);
        output = "temp.mp3";
      } else if (params.codec == "flac") {
        ff.audioCodec("flac");
        output = "temp.flac";
      } else if (params.codec == "aac") {
        // doesnt work
        ff.audioCodec("aac");
        output = "temp.m4a";
      }

      ff.output(output);
      await async_ffmpeg_buffer(ff);
      const buffer = readFileSync(output);
      reply.type("audio");
      reply.status(200).send(buffer);
    } catch (err) {
      reply.status(400).send(err);
    }
  }
}
