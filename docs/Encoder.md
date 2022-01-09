# Encoder Config Guide

## `accounts`

List of Hive usernames who may run encoding servers remotely to encode incoming uploads by uploader users. The remote encoding servers are designed to reduce hosting costs as these can be run anywhere in the world given decent encoding hardware and internet bandwidth to download the input file and upload the result of the encode job.

## `encoder`

FFmpeg encoder to be used for encoding jobs. Specify the name of the encoder as listed in `ffmpeg -encoders`. It is highly recommended to use h.264 encoders for the best playback compatibility across older devices where the video might be watched from.

Recommended values (varies on hardware):
* `libx264`: CPU encoder. Produces the best quality possible at the smallest possible filesize at the cost of power efficiency.
* `h264_videotoolbox`: Apple VideoToolbox. Available on macOS only.
* `h264_nvenc`: NVIDIA NVENC. Available on Linux and Windows.
* `h264_qsv`: Intel Quicksync. Available on Linux and Windows.
* `h264_amf`: AMD VCE. Windows only.
* `h264_vaapi`: VAAPI abstraction API encoder. Linux only.
* `h264_omx`: Raspberry Pi encoder.

Leave this value blank to disable built-in encoder.

## `quality`

FFmpeg option to specify output video quality. Varies on the encoder selected above.

These values are tested (*or calculated) by myself for the best output quality at reasonable filesizes and may not contain the option that is specific to your hardware. If you want to add yours, please make a PR.

* `libx264`: `-crf 18`
* `h264_videotoolbox`: `-q:v 54`
* `h264_qsv`: `-global_quality 20`*
* `h264_nvenc`: `-cq:v 19`*

## `ffmpegPath`

Path to `ffmpeg` executable, varies by OS. Determine yours by running `which ffmpeg`.

## `ffprobePath`

Path to `ffprobe` executable, varies by OS. Installed together with `ffmpeg`. Determine yours by running `which ffprobe`.

## `outputs`

List of video resolution outputs that will be produced by the encoder. No video will be upscaled. Valid values: `4320`, `2160`, `1440`, `1080`, `720`, `480` and `240`.