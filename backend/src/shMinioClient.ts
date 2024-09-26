import { ReadStream } from "fs";
import { Client, ClientOptions } from "minio";

export class MinioLibrary {
  private minioClient: Client;
  private url: string;

  constructor(url: string) {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_HOSTNAME || "localhost",
      port: +(process.env.MINIO_PORT || 19000),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESSKEY || "root",
      secretKey: process.env.MINIO_SECRETKEY || "rootroot",
    });
    this.url = url;
  }

  private async makeBucket(bucket: string) {
    if (!(await this.minioClient.bucketExists(bucket))) {
      await this.minioClient.makeBucket(bucket);
    }
  }

  public async uploadFileStream(
    bucket: string,
    stream: ReadStream,
    fileName: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.makeBucket(bucket);
        await this.minioClient.putObject(bucket, fileName, stream);
        const fileUrl = `${this.url}/${bucket}/${fileName}`;
        console.log("uploaded file stream");
        resolve(fileUrl);
      } catch (err) {
        reject(err);
      }
    });
  }

  /*public async uploadFilePath(bucket: string, filePath: string, urlPrefix: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.makeBucket(bucket);
        const objName = path.parse(filePath).base;
        await this.minioClient.fPutObject(this.bucket, objName, filePath);
        const fileUrl = `${urlPrefix}/${this.bucket}/${objName}`;
        //console.log('Uploaded', filePath, 'to', fileUrl);
        resolve(fileUrl);
      } catch (err) {
        reject(err);
      }
    });
  }*/

  public async fileExists(bucket: string, fileName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.minioClient.statObject(bucket, fileName);
        resolve(true);
      } catch (err) {
        resolve(false);
      }
    });
    return false;
  }
}
