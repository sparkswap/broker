ARG NODE_VERSION='8.11'
ARG BROKER_VERSION='v0.3.3-beta'

FROM node:${NODE_VERSION}-alpine as builder

LABEL maintainer="SparkSwap <dev@sparkswap.com>"

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssl

#############################################
# Build the broker
# This step generates certs and proto files for the project
#############################################
RUN mkdir "/home/app"
RUN git clone -b v0.3.2-beta https://github.com/sparkswap/broker.git /home/app
RUN npm run build no-docker

# Start a new, final image to reduce size.
FROM node:8.11 as final

RUN mkdir "/secure"

COPY --from=builder /home/app/certs /secure
COPY --from=builder /home/app /home/app

WORKDIR /home/app
