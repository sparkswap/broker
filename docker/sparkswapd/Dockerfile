FROM node:8.11 as builder

LABEL maintainer="SparkSwap <dev@sparkswap.com>"

ARG BROKER_VERSION='fix/docker-build'

RUN apt-get update && apt-get upgrade -y --no-install-recommends
RUN apt-get install git
RUN mkdir "/home/app"

WORKDIR /home/app

#############################################
# Build the broker
#############################################
RUN git clone -b ${BROKER_VERSION} https://github.com/sparkswap/broker.git .
RUN npm run build no-docker

FROM node:8.11-alpine as final

RUN mkdir "/secure"
RUN mkdir "/home/app"

WORKDIR /home/app

COPY --from=builder /home/app/certs /secure

# Copy the application
COPY --from=builder /home/app/broker-daemon /home/app/broker-daemon
COPY --from=builder /home/app/broker-cli /home/app/broker-cli

# Copy relayer-proto files
COPY --from=builder /home/app/proto /home/app/proto

# Copy node_modules and rebuild
COPY --from=dep /home/app/node_modules ./node_modules
RUN ["npm", "rebuild", "-q"]

CMD ["bash", "-c", "npm run start-sparkswapd"]
