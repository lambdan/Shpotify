#!/bin/bash

# verify ffmpeg is installed
if ! [ -x "$(command -v ffmpeg)" ]; then
  echo 'Error: ffmpeg is not installed.' >&2
  exit 1
fi

if ! [ -x "$(command -v ffprobe)" ]; then
  echo 'Error: ffprobe is not installed.' >&2
  exit 1
fi

# exec makes it run as PID 1 (necessary to detect SIGKILL and such from docker)
# https://petermalmgren.com/signal-handling-docker/
exec npm start