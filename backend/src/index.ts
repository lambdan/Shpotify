import express, { Request, Response } from "express";
import multer from "multer";
import { MinioLibrary as shMinioClient } from "./shMinioClient";

import { md5ReadStream } from "./utils";
import { createReadStream, unlink } from "fs";
import path from "path";
import { env } from "process";
import { Backend } from "./backend";

const app = express();
const port = 3000;
const BUCKET = "sourcefiles";
const MINIO_URL = "http://localhost:19000";
const minioClient = new shMinioClient(MINIO_URL);
const multerUpload = multer({ dest: "uploads/" });
const backend = new Backend();

app.post(
  "/upload",
  multerUpload.single("file"),
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

    const upl = await minioClient.uploadFileStream(
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

    backend.newSourceFile(upl);
    res.status(200).send("Uploaded!");
  }
);

// Start Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
