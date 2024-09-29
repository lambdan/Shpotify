import { createHash } from "crypto";
import { create } from "domain";
import { FfmpegCommand, ffprobe, FfprobeData } from "fluent-ffmpeg";
import { ReadStream } from "fs";

/**
 * Creates a md5 string of a read stream
 * @param stream
 * @returns md5 string
 */
export function md5FromBuffer(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex").toLowerCase();
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

/** Runs a ffmpeg command and resolves when its done */
export async function async_ffmpeg_buffer(
  command: FfmpegCommand
): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("start", function (commandLine) {
      console.log(commandLine);
    });
    command.on("error", (err) => {
      reject(err);
    });
    command.on("end", () => {
      resolve();
    });
    command.run();
  });
}
