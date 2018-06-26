FROM node:8

LABEL maintainer="Danny Paz <kinesis.exchange>"

RUN mkdir "/home/app"

COPY package.json /home/app
COPY package-lock.json /home/app
COPY pm2.json /home/app
COPY ./scripts /home/app/scripts
COPY broker-daemon /home/app/broker-daemon
COPY proto /home/app/proto

# bin/kbd uses these utils for parameter validation
COPY broker-cli/utils /home/app/broker-cli/utils

WORKDIR /home/app

RUN npm i --production

RUN mkdir "./node_modules/lnd-engine"
COPY node_modules/lnd-engine ./node_modules/lnd-engine
