FROM node:latest

MAINTAINER Macdja38

RUN echo "deb http://http.debian.net/debian jessie-backports main" >> /etc/apt/sources.list

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && apt-get clean && npm install -g pm2 && npm install

WORKDIR /docker/pvpcraft/pvpcraft/

CMD ["pm2-docker", "/docker/pvpcraft/pvpcraft/pm2.json"]
