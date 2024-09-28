import { createHash } from "crypto";
import { ReadStream } from "fs";

export function md5ReadStream(stream: ReadStream): Promise<string> {
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

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
