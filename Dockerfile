FROM node:10-buster
RUN apt-get update && apt-get install -y build-essential ffmpeg
RUN curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
RUN chmod a+rx /usr/local/bin/youtube-dl
RUN npm install -g node-gyp
WORKDIR /bot
COPY . .
RUN npm install
WORKDIR /bot/node_modules/jitterbuffer
RUN node-gyp rebuild
WORKDIR /bot/node_modules/node-opus
RUN node-gyp rebuild
WORKDIR /bot
CMD ["npm","start"]
