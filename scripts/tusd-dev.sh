#!/bin/bash
tusd -upload-dir /Users/techcoderx/tusfiles -hooks-http http://localhost:3000/uploadVideoResumable -hooks-enabled-events pre-create,post-finish