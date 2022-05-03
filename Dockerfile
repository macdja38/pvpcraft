FROM node:16

MAINTAINER macdja38

RUN apt-get update && apt-get install -y ffmpeg build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && apt-get clean;

RUN npm install -g pm2

RUN mkdir -p /docker/pvpcraft/pvpcraft

WORKDIR /docker/pvpcraft/pvpcraft/

ADD package*.json /docker/pvpcraft/pvpcraft/

RUN npm install

ADD . /docker/pvpcraft/pvpcraft/

RUN git config --unset http.https://github.com/.extraheader && npm run build

CMD ["pm2-docker", "pm2.json"]
