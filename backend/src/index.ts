import express, { Request, Response } from "express";
import multer from "multer";
import { Uploader } from "./uploader";
import { createHash } from "crypto";
import { createReadStream, ReadStream, unlink } from "fs";
import path from "path";

function createMD5(stream: ReadStream): Promise<string> {
  return new Promise((res, rej) => {
    const hash = createHash("md5");

    stream.on("data", (data) => {
      hash.update(data);
    });
    stream.on("end", () => {
      res(hash.digest("hex"));
    });
  });
}

const app = express();
const port = 3000;
const minioUploader = new Uploader("sourcefiles", "http://localhost:19000");
const multerUpload = multer({ dest: "uploads/" });

// File upload endpoint
app.post(
  "/upload",
  multerUpload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }
    const file = req.file;
    const ext = path.extname(req.file.originalname);

    const md5 = await createMD5(createReadStream(file.path));
    const fileName = md5 + ext; //file.originalname;

    const upl = await minioUploader.uploadFileStream(
      createReadStream(file.path),
      fileName
    );
    console.log(upl);

    unlink(file.path, (err) => {
      // remove multer upload
      if (err) {
        console.error("error deleting file");
        console.error(err);
      }
    });
  }
);

// Start Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
