#!/bin/bash

# Map typescript's output directory to our output directory
mkdir -p dist
mount --bind /output dist

# Make sure node packages are installed
npm i

# Build the typescript code
npm run build

# Unmap directory
umount dist
