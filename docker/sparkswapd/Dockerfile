ARG NODE_VERSION=8.11

FROM node:${NODE_VERSION}-alpine as builder

LABEL maintainer="SparkSwap <dev@sparkswap.com>"

RUN apk update && apk --no-cache add bash ca-certificates g++ git make openssl python wget && \
    wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub && \
    wget -q https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.28-r0/glibc-2.28-r0.apk && \
    apk add glibc-2.28-r0.apk

WORKDIR /home/app

COPY . /home/app

RUN npm install --quiet --production
# --no-docker is set so we don't get into an infinite loop
# --no-identity makes it so we do not generate keys for the daemons identity because we do this externally
# --no-certs  makes it so we do not re-generate tls certs for the daemon because we do this externally
RUN npm run build -- --no-docker --no-identity --no-certs

# Go into broker-cli to install node modules
WORKDIR /home/app/broker-cli

RUN npm install --quiet --production

# Create a final image as this will be < 50% the size of the build image
FROM node:${NODE_VERSION}-alpine as final

RUN apk update
RUN apk add bash curl

# Copy the application
COPY --from=builder /home/app/broker-daemon /home/app/broker-daemon
COPY --from=builder /home/app/broker-cli /home/app/broker-cli
COPY --from=builder /home/app/scripts/start-sparkswapd.sh /home/app/scripts/start-sparkswapd.sh
COPY --from=builder /home/app/package.json /home/app/package.json
COPY --from=builder /home/app/pm2.json /home/app/pm2.json

# Copy relayer-proto files
COPY --from=builder /home/app/proto /home/app/proto

# Copy node_modules
COPY --from=builder /home/app/node_modules /home/app/node_modules
COPY --from=builder /home/app/broker-cli/node_modules /home/app/broker-cli/node_modules

# Broker CLI expects config to be at ~/.sparkswap, so we need the default docker user's home
# directory to install our container config into
ARG USER_HOME=/root

# Copy configuration file for use inside the container
COPY --from=builder /home/app/broker-cli/container-config.js ${USER_HOME}/.sparkswap/config.js

# Set path so we can directly use `sparkswap` command
ENV PATH="./broker-cli/bin:${PATH}"

WORKDIR /home/app

CMD ["bash", "-c", "npm run start-sparkswapd"]
