import { env } from "process";
import { shMysqlClient } from "./shMysql";
import Ffmpeg, { FfprobeFormat } from "fluent-ffmpeg";
import {
  SongData,
  SongMetadata,
  zFileInfo,
  zSongData,
  zSongMetadata,
} from "./zModels";

export class Backend {
  private sqlClient: shMysqlClient;

  constructor() {
    this.sqlClient = new shMysqlClient(env.MARIADB_HOST || "localhost");
  }

  public async prepareSongsDatabase() {
    if (await this.sqlClient.databaseExists("library")) {
      await this.sqlClient.query("drop database ??", ["library"]);
      console.warn("dropped library");
    }

    if (!(await this.sqlClient.databaseExists("library"))) {
      await this.sqlClient.query(`CREATE DATABASE library;`, []);
      console.log("created library database");
      this.sqlClient.query("use ??", ["library"]);
      // create table
      const sql = `create table songs (id INT AUTO_INCREMENT PRIMARY KEY, url text, songData text, ffprobe text);`;
      await this.sqlClient.query(sql, []);
    } else {
      console.log("library database existed");
    }
  }

  public async ffprobe(url: string): Promise<Ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      Ffmpeg.ffprobe(url, function (err, metadata) {
        if (metadata) {
          resolve(metadata);
        }
        reject(err);
      });
    });
  }

  public getSongData(ffprobeData: Ffmpeg.FfprobeData): SongData {
    const sm = zSongMetadata.parse({});
    const fi = zFileInfo.parse({});

    ffprobeData.streams.forEach((e) => {
      if (e.codec_type == "audio") {
        fi.codec = e.codec_name!;
        fi.bitrate = parseInt(e.bit_rate!);
        sm.duration = parseFloat(e.duration!);
      }

      if (e.codec_name == "mjpeg") {
        // TODO steal cover art
      }
    });

    const tags = ffprobeData.format.tags!;

    const title = (tags["title"] as string) || null;
    if (title) {
      sm.title = title;
    }

    const artist = (tags["artist"] as string) || null;
    if (artist) {
      sm.artist = artist;
    }

    const album = (tags["album"] as string) || null;
    if (album) {
      sm.album = album;
    }

    const album_artist = (tags["album_artist"] as string) || null;
    if (album_artist) {
      sm.album_artist = album_artist;
    }

    const track = (tags["track"] as string) || null;
    if (track) {
      sm.track = parseInt(track);
    }

    const disc = (tags["disc"] as string) || null;
    if (disc) {
      sm.disc = parseInt(disc);
    }

    const date = (tags["date"] as string) || "?";
    if (date) {
      sm.date = new Date(date);
    }

    return zSongData.parse({
      songMetadata: sm,
      fileInfo: fi,
    });
  }

  public async newSourceFile(url: string) {
    console.warn("Got new source file", url);
    await this.prepareSongsDatabase();

    const probed = await this.ffprobe(url);
    const songData = this.getSongData(probed);

    const sql = `insert into songs (url,songData,ffprobe) values (?,?,?)`;
    const vals = [url, JSON.stringify(songData), JSON.stringify(probed)];
    await this.sqlClient.query(sql, vals);
  }
}
