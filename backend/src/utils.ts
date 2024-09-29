import { createHash } from "crypto";
import { ffprobe, FfprobeData } from "fluent-ffmpeg";
import { ReadStream } from "fs";

/**
 * Creates a md5 string of a read stream
 * @param stream
 * @returns md5 string
 */
export function md5ReadStream(stream: ReadStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");

    stream.on("data", (data) => {
      hash.update(data);
    });
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Async runs ffprobe on a file
 * @param url to file
 * @returns FfprobeData object
 */
export async function async_ffprobe(url: string): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffprobe(url, function (err, metadata) {
      if (metadata) {
        resolve(metadata);
      }
      reject(err);
    });
  });
}
