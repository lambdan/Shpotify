import express, { Express, Request, Response } from "express";
import multer, { Multer } from "multer";
import { MinioClient, MinioClient as shMinioClient } from "./minio";
import { md5ReadStream } from "./utils";
import { createReadStream, unlink } from "fs";
import path from "path";
import { rabbitClient } from "./rabbit";

const MINIO_URL = "http://localhost:19000";
const BUCKET = "sourcefiles";
const port = 3000;

export class shUploader {
  private express: Express;
  private minioClient: MinioClient;
  private multer: Multer;
  private rabbit: rabbitClient;

  constructor() {
    this.rabbit = new rabbitClient("uploader");
    this.rabbit.startReconnectLoop();
    this.express = express();
    this.minioClient = new shMinioClient(MINIO_URL);
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

        /*const exist = await minioClient.fileExists(BUCKET, fileName);
        if (exist) {
          res.status(400).send("File already existed");
          return;
        }*/

        const upl = await this.minioClient.uploadFileStream(
          BUCKET,
          createReadStream(file.path),
          fileName
        );

        unlink(file.path, (err) => {
          // remove multer upload
          if (err) {
            console.error("error deleting file");
            console.error(err);
          }
        });

        // Send upload to rabbit queue, for backend to process
        this.rabbit.publish(
          "uploads",
          JSON.stringify({
            url: upl,
          })
        );

        res.status(200).send("Uploaded!");
      }
    );

    // Start Express server
    this.express.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }
}
