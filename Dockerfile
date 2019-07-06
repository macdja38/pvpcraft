FROM node:latest

MAINTAINER Macdja38

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && apt-get clean;

RUN npm install -g pm2

RUN mkdir -p /code/

WORKDIR /code/

ADD ./package.json /code/

ADD ./package-lock.json /code

RUN npm install

ADD src /code/src

CMD ["pm2-docker", "/code/pm2.json"]
