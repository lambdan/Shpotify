import { ReadStream } from "fs";
import { Client, ClientOptions } from "minio";
import path from "path";

export class Uploader {
  private minioClient: Client;
  private bucket: string;
  private urlPrefix: string;

  constructor(bucket: string, urlPrefix: string) {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_HOSTNAME || "localhost",
      port: +(process.env.MINIO_PORT || 19000),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESSKEY || "root",
      secretKey: process.env.MINIO_SECRETKEY || "rootroot",
    });
    this.bucket = bucket;
    this.urlPrefix = urlPrefix;
  }

  public async uploadFileStream(
    stream: ReadStream,
    fileName: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.minioClient.bucketExists(this.bucket))) {
          await this.minioClient.makeBucket(this.bucket);
        }
        await this.minioClient.putObject(this.bucket, fileName, stream);
        const fileUrl = `${this.urlPrefix}/${this.bucket}/${fileName}`;
        console.log("uploaded file stream");
        resolve(fileUrl);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async uploadFilePath(filePath: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(await this.minioClient.bucketExists(this.bucket))) {
          await this.minioClient.makeBucket(this.bucket);
        }

        const objName = path.parse(filePath).base;
        await this.minioClient.fPutObject(this.bucket, objName, filePath);
        const fileUrl = `${this.urlPrefix}/${this.bucket}/${objName}`;
        //console.log('Uploaded', filePath, 'to', fileUrl);
        resolve(fileUrl);
      } catch (err) {
        reject(err);
      }
    });
  }
}
