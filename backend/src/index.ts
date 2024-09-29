import { ShpotifyAPI } from "./api";
import { ShpotifyBackend as Backend } from "./backend";

const backend = new Backend();
const api = new ShpotifyAPI(backend);
