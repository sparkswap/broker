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

# Create a final image as this will be < 50% the size of the build image
FROM node:${NODE_VERSION}-alpine as final

RUN apk update
RUN apk add bash curl

RUN mkdir "/secure"

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

WORKDIR /home/app

CMD ["bash", "-c", "npm run start-sparkswapd"]
