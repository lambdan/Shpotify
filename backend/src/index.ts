import { SongUploadWorker as Backend } from "./backend";
import { shUploader as Uploader } from "./upload";

const backend = new Backend();
const uploader = new Uploader();
