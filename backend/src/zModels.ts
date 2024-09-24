import { z } from "zod";
import { extendZodWithOpenApi } from "zod-openapi";
extendZodWithOpenApi(z);

export const zSong = z.object({
  title: z.string(),
  artist: z.string(),
  filepath: z.string(),
  duration: z.number(),
});
