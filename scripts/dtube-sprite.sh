#!/bin/bash

if [ $# -ne 2 ]; then
	echo
	echo call: $0 input_file.mp4 output_file.jpg
	exit 1
fi

if [ "$(command -v ffmpeg)" = "" ]; then
	echo
	echo Error: FFmpeg not found
	exit 1
fi

if [ "$(command -v montage)" = "" ]; then
	echo
	echo Error: ImageMagick not found
	exit 1
fi

if [ ! -e $1 ]; then
	echo
	echo Error: Input File not found
	exit 1
fi

TEMPDIR=$(mktemp -d)

RUNTIME=$(ffprobe -hide_banner -loglevel error -select_streams v:0 -show_streams $1 2>/dev/null | grep duration= | sed -e 's/duration=//')
RUNTIME=${RUNTIME%.*}

if [ $RUNTIME -lt 100 ]; then
	MAX=$RUNTIME
	STEPS=1
else
	MAX=100
	STEPS=$(bc <<< "scale=2; $RUNTIME/100")
fi

printf "Extracting frames from source video "

for i in `seq 0 $((MAX - 1))` ; do
	lz=""
	if [ $i -lt 10 ]; then lz=0; fi

	ffmpeg -hide_banner -loglevel error -accurate_seek -ss $(bc <<< $i*$STEPS) -i $1 -s 128x72 -frames:v 1 $TEMPDIR/sprite_$lz$i.bmp

	# exit if failed to extract
	if [ $? -ne 0 ]; then exit 1; fi

	if [ "$((i%(MAX/4)))" = 0 ]; then printf "$((i/(MAX/4)*25))%% "; fi
done
printf "100%%\nCreating sprite image\n"

montage $TEMPDIR/sprite_*.bmp -mode Concatenate -tile 1x$MAX $2
if [ $? -ne 0 ]; then exit 1; fi

echo Done.
echo Video duration: $RUNTIME seconds

rm -rf $TEMPDIR
exit 0