#!/bin/bash

# Map your compiler's output directory to our output directory
mkdir -p compiler_output
mount --bind /output compiler_output

# Run your build commands here
make

# Unmap directory
umount compiler_output
