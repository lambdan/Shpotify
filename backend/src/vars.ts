import { env } from "process";

// TODO: Check for env variables

// TODO: Minio, Mysql and Rabbit libraries dont use vars from here

export class GlobalVars {
  readonly DATABASE: string;
  readonly SOURCE_FILES_TABLE: string;
  readonly SONG_METADATA_TABLE: string;
  readonly SONG_METADATA_MAP_TABLE: string;
  readonly SONG_UPLOADS_QUEUE: string;
  readonly SCAN_JOBS_QUEUE: string;
  readonly MISC_QUEUE: string;

  readonly MINIO_URL: string;
  readonly SOURCE_FILES_BUCKET: string;
  readonly UPLOADER_PORT: number;

  readonly DEV_RESET_TABLES: boolean; // Drops all tables on restarts if true

  constructor() {
    this.DEV_RESET_TABLES = false;

    this.DATABASE = "library";
    this.SOURCE_FILES_TABLE = "source_files";
    this.SONG_METADATA_TABLE = "song_metadata";
    this.SONG_METADATA_MAP_TABLE = "song_metadata_mappings";
    this.SCAN_JOBS_QUEUE = "scan_jobs";
    this.SONG_UPLOADS_QUEUE = "song_uploads";
    this.MISC_QUEUE = "misc";

    this.MINIO_URL = "http://localhost:19000";
    this.SOURCE_FILES_BUCKET = "sourcefiles";
    this.UPLOADER_PORT = 3000;
  }
}
