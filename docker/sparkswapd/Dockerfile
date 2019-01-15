FROM node:8.11 as builder

LABEL maintainer="SparkSwap <dev@sparkswap.com>"

ARG BROKER_VERSION='fix/docker-build'
ARG EXTERNAL_ADDRESS='localhost'

RUN apt-get update && apt-get upgrade -y --no-install-recommends
RUN apt-get install git
RUN mkdir "/home/app"

WORKDIR /home/app

#############################################
# Build the broker
#############################################
RUN git clone -b ${BROKER_VERSION} https://github.com/sparkswap/broker.git .
RUN npm run build --no-docker --no-cli

#############################################
# Keypair Generation for SSL to the broker
#
# This step creates certs to allow a user to host a broker on a remote machine
# and have connections to their daemon be secured through ssl
#
# Primary use is TLS between Broker-CLI and Broker Daemon
#
#############################################
RUN mkdir -p ./certs

WORKDIR /home/app/certs

# Set paths for self-signed key pair
ARG KEY_PATH="broker-rpc-tls.key"
ARG CERT_PATH="broker-rpc-tls.cert"
ARG CSR_PATH="broker-rpc-csr.csr"

RUN openssl ecparam -genkey -name prime256v1 -out $KEY_PATH
RUN openssl req -new -sha256 -key $KEY_PATH -out $CSR_PATH \
  -reqexts SAN \
  -extensions SAN \
  -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:${EXTERNAL_ADDRESS},DNS:localhost")) \
  -subj "/CN=$EXTERNAL_ADDRESS/O=sparkswap"
RUN openssl req -x509 -sha256 -key $KEY_PATH -in $CSR_PATH -out $CERT_PATH -days 36500 \
  -reqexts SAN \
  -extensions SAN \
  -config <(cat /etc/ssl/openssl.cnf \
      <(printf "\n[SAN]\nsubjectAltName=DNS:${EXTERNAL_ADDRESS},DNS:localhost"))

# Delete CSR before continuing
RUN rm $CSR_PATH

#############################################
# Keypair Generation for Relayer
#
# This step creates certs to allow the broker to authenticate/auth for orders
# on the relayer
#
# We use a "Secure key exchange algorithm" here because these keys are exchanged
# via a non secure channel. (ECDH)
#
#############################################
WORKDIR /home/app/certs

ARG ID_PRIV_KEY='broker-identity.private.pem'
ARG ID_PUB_KEY='broker-identity.public.pem'

RUN openssl ecparam -name prime256v1 -genkey -noout -out ${ID_PRIV_KEY}
RUN openssl ec -in ${ID_PRIV_KEY} -pubout -out ${ID_PUB_KEY}

FROM node:8.11-alpine as final

RUN mkdir "/secure"

# Copy the application
COPY --from=builder /home/app/broker-daemon /home/app/broker-daemon
COPY --from=builder /home/app/broker-cli /home/app/broker-cli

# Copy certs
COPY --from=builder /home/app/certs /secure

# Copy relayer-proto files
COPY --from=builder /home/app/proto /home/app/proto

# Copy node_modules and rebuild
COPY --from=dep /home/app/node_modules ./node_modules

WORKDIR /home/app

RUN ["npm", "rebuild", "-q"]

CMD ["bash", "-c", "npm run start-sparkswapd"]
