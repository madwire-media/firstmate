# Start from node version 10
FROM node:10

# Set the current working directory (CWD) to /root (also $HOME or ~)
WORKDIR /root

# Add in the bootstrap code
ADD build.sh /scripts/build.sh

# Run the build script on container boot
CMD ["/scripts/build.sh"]
