# Shpotify

**Self-Hosted Spotify: Shpotify**

Or maybe just another project that I work on one night and then never touch again?

# Planned features

- Last.fm scrobbling
- "Liked songs" and playlists
- Clients through PWA
  - If caching songs for offline listening is possible... might have to make native apps otherwise
- Customizable ffmpeg parameters

**Low priority/nice to haves:**

- Basic Last.fm integration (grab how many times you listened to songs etc)
- MusicBrainz integration/other automatic metadata fetcher
  - For now you'll probably have to use MusicBrainz Picard before importing your files
- Metadata customization
- Multiple users on same server
  - Most stuff will be user-agnostic, but playlists etc are obviously personal
- Equalizer

# TODO/Roadmap

Backend:

- ✅ Store source files
- Scan and add them to database
- Store user data (playlists, liked songs, etc)
- Sync user data between clients
- Stream to clients (ffmpeg)
- Open API
  - Will make making clients easier

Clients:

- Frontend for uploading songs
- Frontend for searching songs/listing songs
- Frontend for playlists
- Frontend for now playing view
  - Like button
- Offline downloads
- Last.fm scrobbling

# Q & A

**How can I access this when I'm not home?**

Use something like [Tailscale](https://tailscale.com/) or other VPN solution. Tailscale is very "set it and forget it".

# Env Variables

- MARIADB_HOST
