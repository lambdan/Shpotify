import { mysqlClient } from "./mysql";
import { FfprobeData } from "fluent-ffmpeg";
import {
  dbSourceFileInsert,
  dbSourceFileReturn as dbSourceFile,
  rSongScanJob,
  rSongUploadJob,
  SongMetadata,
  zdbSourceFileInsert,
  zdbSourceFileReturn,
  zrSongScanJob,
  zrSongUploadJob,
  zSongMetadata,
  dbSourceFileReturn,
} from "./zModels";
import { rabbitClient } from "./rabbit";
import { Message } from "amqplib";
import { z } from "zod";
import { QueryResult, ResultSetHeader, RowDataPacket } from "mysql2";
import { async_ffprobe, sleep } from "./utils";
import { GlobalVars } from "./vars";

const VARS = new GlobalVars();

export class SongUploadWorker {
  private sqlClient: mysqlClient;
  private rabbit: rabbitClient;

  constructor() {
    this.sqlClient = new mysqlClient(VARS.DATABASE);
    this.rabbit = new rabbitClient("SongUploadWorker");

    this.sqlClient.eventEmitter.on("connected", () => {
      this.createTables();
    });

    this.rabbit.eventEmitter.on("connected", () => {
      this.setupCallbacks();
    });

    this.rabbit.eventEmitter.on("disconnected", () => {
      // TODO
    });

    this.sqlClient.connect();
    this.rabbit.startReconnectLoop();
  }

  private async setupCallbacks() {
    await this.rabbit.subscribe(
      VARS.SONG_UPLOADS_QUEUE,
      async (message: Message) => {
        const parsed = zrSongUploadJob.parse(
          JSON.parse(message.content.toString())
        );
        await this.newSongUploaded(parsed);
        this.rabbit.ack(message);
      }
    );

    await this.rabbit.subscribe(
      VARS.SCAN_JOBS_QUEUE,
      async (message: Message) => {
        const parsed = zrSongScanJob.parse(
          JSON.parse(message.content.toString())
        );
        await this.scanForMetadata(parsed);
        await this.rabbit.ack(message);
      }
    );

    await this.rabbit.subscribe(VARS.MISC_QUEUE, async (message: Message) => {
      const m = message.content.toString();
      if (m == "rescan_all_meta") {
        await this.rescanAllMeta();
      }
      await this.rabbit.ack(message);
    });
  }

  private async createTables() {
    if (VARS.DEV_RESET_TABLES) {
      try {
        await this.sqlClient.query(`drop table \`${VARS.SOURCE_FILES_TABLE}\``);
      } catch (err) {
        console.log("drop table failed");
      }
    }

    // TODO Create based on zod model?
    await this.sqlClient.query(
      `create table if not exists \`${VARS.SOURCE_FILES_TABLE}\` 
        (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename TEXT,
        ffprobe TEXT,
        UNIQUE (filename)
      )`
    );

    await this.sqlClient.query(
      `create table if not exists \`${VARS.SONG_METADATA_TABLE}\` 
        (
        id INT AUTO_INCREMENT PRIMARY KEY,
        artist TEXT,
        album TEXT,
        album_artist TEXT,
        cover_url TEXT,
        date TEXT,
        disc INT,
        duration FLOAT,
        title TEXT,
        track INT
      )`
    );

    await this.sqlClient.query(
      `create table if not exists \`${VARS.SONG_METADATA_MAP_TABLE}\` 
        (
        source_id INT PRIMARY KEY,
        metadata_id INT,
        UNIQUE (source_id)
      )`
    );
  }

  /**
   * Inserts a song into source_files db, and returns its ID
   * @param entry
   * @returns ID of row
   */
  private async insertSourceFile(entry: dbSourceFileInsert): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const sql = `insert into \`${VARS.SOURCE_FILES_TABLE}\` (filename,ffprobe) values (?,?)`;
        const vals = [entry.filename, entry.ffprobe];
        const q = (await this.sqlClient.query(sql, vals)) as ResultSetHeader[];
        resolve(q[0].insertId);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Returns source_file with ID
   * @param id
   * @returns
   */
  private async getSourceFileByID(id: number): Promise<dbSourceFile> {
    return new Promise(async (resolve, reject) => {
      try {
        const query = await this.sqlClient.query(
          `SELECT * FROM \`${VARS.SOURCE_FILES_TABLE}\` WHERE id = ?`,
          [id]
        );
        const result = zdbSourceFileReturn.parse(
          (query as RowDataPacket[])[0][0] // good lord, surely theres a better way
        );
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Inserts song metadata into DB
   * @param meta
   * @returns ID of row
   */
  private async insertSongMetadata(meta: SongMetadata): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const sql = `insert into \`${VARS.SONG_METADATA_TABLE}\` 
         (artist, album, album_artist, cover_url, date, disc, duration, title, track) 
          values 
          (?,?,?,?,?,?,?,?,?)
          `;
        const vals = [
          meta.artist,
          meta.album,
          meta.album_artist,
          meta.cover_url,
          meta.date,
          meta.disc,
          meta.duration,
          meta.title,
          meta.track,
        ];
        const q = (await this.sqlClient.query(sql, vals)) as ResultSetHeader[];
        resolve(q[0].insertId);
      } catch (err) {
        reject(err);
      }
    });
  }

  private readMetadataFromFfprobe(ffprobeData: FfprobeData): SongMetadata {
    const sm = zSongMetadata.parse({});

    ffprobeData.streams.forEach((e) => {
      if (e.codec_type == "audio") {
        sm.duration = parseFloat(e.duration!);
      }

      if (e.codec_name == "mjpeg" || e.codec_name == "png") {
        // TODO steal cover art
      }
    });

    const tags = ffprobeData.format.tags!;

    for (const t in tags) {
      const lc = t.toLocaleLowerCase();
      if (lc == "title") {
        sm.title = tags[t] as string;
      } else if (lc == "artist") {
        sm.artist = tags[t] as string;
      } else if (lc == "album") {
        sm.album = tags[t] as string;
      } else if (lc == "album_artist") {
        sm.album_artist = tags[t] as string;
      } else if (lc == "track") {
        sm.track = parseInt(tags[t] as string);
      } else if (lc == "disc") {
        sm.disc = parseInt(tags[t] as string);
      } else if (lc == "date") {
        sm.date = tags[t] as string;
      }
    }
    return sm;
  }

  /**
   * Inserts a new source song into database and also publishes a ScanSongJob
   * @param songUpload
   * @returns
   */
  private async newSongUploaded(songUpload: rSongUploadJob): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // insert into sourcefiles db
        const probed = await async_ffprobe(songUpload.url);
        const id = await this.insertSourceFile(
          zdbSourceFileInsert.parse({
            filename: songUpload.url.split("/").pop(),
            ffprobe: JSON.stringify(probed),
          })
        );

        await this.rabbit.publish(
          VARS.SCAN_JOBS_QUEUE,
          JSON.stringify(
            zrSongScanJob.parse({
              source_id: id,
            })
          )
        );

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Updates what source file is associated with what metadata
   * A source can only be associated with one metadata.
   * @param source_id
   * @param metadata_id
   */
  private async updateMetadataMapping(source_id: number, metadata_id: number) {
    const q = await this.sqlClient.query(
      `REPLACE INTO \`${VARS.SONG_METADATA_MAP_TABLE}\` (source_id,metadata_id) VALUES (?,?)`,
      [source_id, metadata_id]
    );
    console.log(q);
  }

  /**
   * Scans a source file for metadata and inserts it into metadata table,
   * and then associates the source file with that metadata
   */
  private async scanForMetadata(scanJob: rSongScanJob) {
    //console.log(result);
    const row = await this.getSourceFileByID(scanJob.source_id);
    const ffprobe_data = JSON.parse(row.ffprobe) as FfprobeData;
    const meta = this.readMetadataFromFfprobe(ffprobe_data);

    console.log(meta);

    const song_id = scanJob.source_id;
    const metadata_id = await this.insertSongMetadata(meta);
    await this.updateMetadataMapping(song_id, metadata_id);
  }

  /**
   * Returns all source file IDs
   */
  private async getAllSourceFileIDs(): Promise<number[]> {
    const q = await this.sqlClient.query(
      `SELECT * FROM \`${VARS.SOURCE_FILES_TABLE}\` `
    );
    const rows = (q as RowDataPacket[])[0] as dbSourceFileReturn[]; // fuck me
    const result = new Array<number>();
    rows.forEach((r) => {
      result.push(r.id);
    });
    return result;
  }

  /**
   * Grabs all source file IDs, and then queues a scanMetadata job on them
   */
  private async rescanAllMeta() {
    const ids = await this.getAllSourceFileIDs();
    ids.forEach(async (id) => {
      await this.rabbit.publish(
        VARS.SCAN_JOBS_QUEUE,
        JSON.stringify(
          zrSongScanJob.parse({
            source_id: id,
          })
        )
      );
    });
    console.log("Rescan all metadata queued");
  }
}
