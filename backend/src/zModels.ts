import { z } from "zod";
import { extendZodWithOpenApi } from "zod-openapi";
extendZodWithOpenApi(z);

export const zSongMetadata = z.object({
  title: z.string().default("?"),
  artist: z.string().default("?"),
  album: z.string().optional(),
  album_artist: z.string().optional(),
  track: z.number().optional(),
  disc: z.number().optional(),
  date: z.date().optional(),
  duration: z.number().default(0),
  art_url: z.string().optional().default("https://placehold.co/500"),
});
export type SongMetadata = z.infer<typeof zSongMetadata>;

export const zFileInfo = z.object({
  codec: z.string().optional(),
  bitrate: z.number().optional(),
});
export type FileInfo = z.infer<typeof zFileInfo>;

export const zSongData = z.object({
  songMetadata: zSongMetadata,
  fileInfo: zFileInfo,
});
export type SongData = z.infer<typeof zSongData>;

/* example ffprobe output:
    "streams": [
        {
            "index": 0,
            "codec_name": "mp3",
            "codec_long_name": "MP3 (MPEG audio layer 3)",
            "codec_type": "audio",
            "codec_tag_string": "[0][0][0][0]",
            "codec_tag": "0x0000",
            "sample_fmt": "fltp",
            "sample_rate": "44100",
            "channels": 2,
            "channel_layout": "stereo",
            "bits_per_sample": 0,
            "initial_padding": 0,
            "r_frame_rate": "0/0",
            "avg_frame_rate": "0/0",
            "time_base": "1/14112000",
            "start_pts": 353600,
            "start_time": "0.025057",
            "duration_ts": 3105792000,
            "duration": "220.081633",
            "bit_rate": "253928",
            "disposition": {
                "default": 0,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 0,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0
            },
            "tags": {
                "encoder": "Lavc61.3."
            }
        },
        {
            "index": 1,
            "codec_name": "mjpeg",
            "codec_long_name": "Motion JPEG",
            "profile": "Baseline",
            "codec_type": "video",
            "codec_tag_string": "[0][0][0][0]",
            "codec_tag": "0x0000",
            "width": 500,
            "height": 500,
            "coded_width": 500,
            "coded_height": 500,
            "closed_captions": 0,
            "film_grain": 0,
            "has_b_frames": 0,
            "sample_aspect_ratio": "1:1",
            "display_aspect_ratio": "1:1",
            "pix_fmt": "yuvj420p",
            "level": -99,
            "color_range": "pc",
            "color_space": "bt470bg",
            "chroma_location": "center",
            "refs": 1,
            "r_frame_rate": "90000/1",
            "avg_frame_rate": "0/0",
            "time_base": "1/90000",
            "start_pts": 2255,
            "start_time": "0.025056",
            "duration_ts": 19807347,
            "duration": "220.081633",
            "bits_per_raw_sample": "8",
            "disposition": {
                "default": 0,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 1,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0
            },
            "tags": {
                "comment": "Cover (front)"
            }
        }
    ],
    "format": {
        "filename": "1-06 Kingslayer.mp3",
        "nb_streams": 2,
        "nb_programs": 0,
        "nb_stream_groups": 0,
        "format_name": "mp3",
        "format_long_name": "MP2/3 (MPEG audio layer 2/3)",
        "start_time": "0.025056",
        "duration": "220.081633",
        "size": "7049003",
        "bit_rate": "256232",
        "probe_score": 51,
        "tags": {
            "album_artist": "Bring Me the Horizon",
            "title": "Kingslayer",
            "encoder": "Lavf61.1.100",
            "DISCTOTAL": "1",
            "artist": "Bring Me the Horizon feat. BABYMETAL",
            "album": "POST HUMAN: SURVIVAL HORROR",
            "genre": "Post-Hardcore, Alt.Rock, Industrial Rock, Electronic",
            "track": "6",
            "disc": "1",
            "ACOUSTID_ID": "1d4dffb8-a18b-4e3f-930a-5de4166c14c9",
            "MUSICBRAINZ_RELEASEGROUPID": "2d1d9561-4c16-41d4-8234-dfe30c6334eb",
            "ORIGINALDATE": "2020-10-29",
            "ORIGINALYEAR": "2020",
            "RELEASETYPE": "ep",
            "MUSICBRAINZ_ALBUMID": "c6d1f3f9-b212-4b3e-9c04-700bb61f1c08",
            "MUSICBRAINZ_ALBUMARTISTID": "074e3847-f67f-49f9-81f1-8c8cea147e8e",
            "ALBUMARTISTSORT": "Bring Me the Horizon",
            "RELEASECOUNTRY": "XW",
            "ASIN": "B08KWL1ZPR",
            "BARCODE": "886448602200",
            "SCRIPT": "Latn",
            "RELEASESTATUS": "official",
            "LABEL": "RCA",
            "TOTALDISCS": "1",
            "MEDIA": "Digital Media",
            "TOTALTRACKS": "9",
            "MUSICBRAINZ_TRACKID": "35253585-d752-4cd6-884c-2ee1e5a5d495",
            "ISRC": "GBARL2001276",
            "MUSICBRAINZ_ARTISTID": "074e3847-f67f-49f9-81f1-8c8cea147e8e;27e2997f-f7a1-4353-bcc4-57b9274fa9a4",
            "ARTISTSORT": "Bring Me the Horizon feat. BABYMETAL",
            "ARTISTS": "Bring Me the Horizon;BABYMETAL",
            "MUSICBRAINZ_RELEASETRACKID": "c33ecdd4-8e84-4b1b-bd5b-6e0abcdf84f0",
            "TRACKTOTAL": "9",
            "date": "2020-10-30"
        }
    }
}
    */
