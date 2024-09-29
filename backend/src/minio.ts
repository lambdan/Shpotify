import { ReadStream } from "fs";
import { Client, ClientOptions } from "minio";

export class MinioClient {
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

  /**
   * Uploads a Buffer into a file, and returns URL
   * @param bucket
   * @param buffer
   * @param fileName
   * @returns URL to uploaded file
   */
  public async uploadBuffer(
    bucket: string,
    buffer: Buffer,
    fileName: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.makeBucket(bucket);
        await this.minioClient.putObject(bucket, fileName, buffer);
        const fileUrl = `${this.url}/${bucket}/${fileName}`;
        resolve(fileUrl);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async fileExists(bucket: string, fileName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.minioClient.statObject(bucket, fileName);
        resolve(true);
      } catch (err) {
        //
      }
      resolve(false);
    });
  }
}
