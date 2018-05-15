FROM node:8

LABEL maintainer="Danny Paz <kinesis.exchange>"

RUN mkdir "/home/app"

COPY package.json /home/app
COPY package-lock.json /home/app
COPY broker-cli /home/app/broker-cli
COPY bin/kcli /home/app/bin/kcli
COPY broker-daemon/proto/broker.proto /home/app/broker-daemon/proto/broker.proto

WORKDIR /home/app

RUN npm i --production

RUN mkdir "./node_modules/lnd-engine"
COPY node_modules/lnd-engine ./node_modules/lnd-engine
