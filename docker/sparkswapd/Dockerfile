FROM node:8.11-alpine as builder

LABEL maintainer="SparkSwap <dev@sparkswap.com>"

ARG BROKER_VERSION='fix/docker-build'

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssl

RUN mkdir "/home/app"
WORKDIR /home/app

#############################################
# Build the broker
#############################################

RUN git clone -b ${BROKER_VERSION} https://github.com/sparkswap/broker.git .

# Build the broker, which generates all tls certs
RUN npm run build no-docker

# Copy the certs to the secure directory
RUN mkdir "/secure"

# Move the certs to secure
RUN mv /home/app/certs /secure

# Remove certs directory
RUN rm -rf /home/app/certs
