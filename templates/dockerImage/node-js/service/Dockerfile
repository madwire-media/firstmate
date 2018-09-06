# Start from node version 10
FROM node:10
ENV DOCKER=true

# Set the current working directory (CWD) to /root (also $HOME or ~)
WORKDIR /root

# Add in the Node.js package.json and package-lock.json for the NPM install
ADD package.json package-lock.json /root/

# Install NPM packages (production by default)
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN npm i

# Add in the Node.js package and JavaScript source code
ADD src /root/src

# Run the Node.js package on container boot
CMD ["npm", "run", "start"]
