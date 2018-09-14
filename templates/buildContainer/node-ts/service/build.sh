#!/bin/bash

current_hash=$(md5sum package-lock.json | awk '{ print $1 }')
last_hash=$(cat /cache/package-lock.json.md5)

if [[ $current_hash != $last_hash ]]; then
  # Make sure node packages are installed
  npm i

  # Save the new md5 hash
  echo $current_hash > /cache/package-lock.json.md5
fi

# Build the typescript code
npm run build
