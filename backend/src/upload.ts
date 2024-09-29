import express, { Express, Request, Response } from "express";
import multer, { Multer } from "multer";
import { MinioClient, MinioClient as shMinioClient } from "./minio";
import { md5ReadStream } from "./utils";
import { createReadStream, unlink } from "fs";
import path from "path";
import { rabbitClient } from "./rabbit";
import { zrSongUploadJob } from "./zModels";
import { GlobalVars } from "./vars";

const VARS = new GlobalVars();

export class shUploader {
  private express: Express;
  private minioClient: MinioClient;
  private multer: Multer;
  private rabbit: rabbitClient;

  constructor() {
    this.rabbit = new rabbitClient("uploader");
    this.rabbit.startReconnectLoop();
    this.express = express();
    this.minioClient = new shMinioClient(VARS.MINIO_URL);
    this.multer = multer({ dest: "uploads/" });

    this.express.post(
      "/upload",
      this.multer.single("file"),
      async (req: Request, res: Response) => {
        if (!req.file) {
          return res.status(400).send("No file uploaded.");
        }
        const file = req.file;
        const ext = path.extname(req.file.originalname).toLowerCase();

        const md5 = await md5ReadStream(createReadStream(file.path));
        const fileName = md5 + ext; //file.originalname;

        // check if it already exists
        // TODO: check source_files db instead
        const exist = await this.minioClient.fileExists(
          VARS.SOURCE_FILES_BUCKET,
          fileName
        );
        if (exist) {
          res.status(400).send("File already existed");
          return;
        }

        const bucketUpload = await this.minioClient.uploadFileStream(
          VARS.SOURCE_FILES_BUCKET,
          createReadStream(file.path),
          fileName
        );

        // remove temporary upload in multer
        unlink(file.path, (err) => {
          if (err) {
            console.error("error deleting file");
            console.error(err);
          }
        });

        // Send upload to rabbit queue, for backend to process
        await this.rabbit.publish(
          VARS.SONG_UPLOADS_QUEUE,
          JSON.stringify(
            zrSongUploadJob.parse({
              url: bucketUpload,
            })
          )
        );

        res.status(200).send("Uploaded!");
      }
    );

    this.express.get(
      // TODO Move this elsewhere, this express app should only be focused on uploading
      "/rescan_all_meta",
      async (req: Request, res: Response) => {
        await this.rabbit.publish(VARS.MISC_QUEUE, "rescan_all_meta");
        res.status(200).send("OK");
      }
    );

    // Start Express server
    this.express.listen(VARS.UPLOADER_PORT, () => {
      console.log(`Uploader running on http://localhost:${VARS.UPLOADER_PORT}`);
    });
  }
}
