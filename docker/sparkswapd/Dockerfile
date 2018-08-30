FROM node:8 as builder

LABEL maintainer="SparkSwap <dev@sparkswap.com>"

# Install git for broker dependencies
RUN apt-get update && \
  apt-get upgrade -y --no-install-recommends && \
  apt-get install git

#############################################
# Keypair Generation for SSL to the broker
#
# This step creates certs to allow a user to host a broker on a remote machine
# and have connections to their daemon be secured through ssl
#
#############################################

ARG CERT_HOST
RUN : "${CERT_HOST:?CERTHOST Build argument needs to be set.}"
RUN mkdir -p '/secure'
ARG TLS_KEY="/secure/broker-rpc-tls.key"
ARG TLS_CERT="/secure/broker-rpc-tls.cert"
ARG TLS_CSR="/secure/broker-rpc-csr.csr"
RUN openssl ecparam -genkey -name prime256v1 -noout -out ${TLS_KEY}
RUN openssl req -new -sha256 -key ${TLS_KEY} -out ${TLS_CSR} -subj "/CN=${CERT_HOST}/O=sparkswap"
RUN openssl req -x509 -sha256 -days 36500 -key ${TLS_KEY} -in ${TLS_CSR} -out ${TLS_CERT}
RUN rm ${TLS_CSR}

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

ARG ID_PRIV_KEY='/secure/broker-identity.private.pem'
ARG ID_PUB_KEY='/secure/broker-identity.public.pem'

RUN openssl ecparam -name prime256v1 -genkey -noout -out ${ID_PRIV_KEY}
RUN openssl ec -in ${ID_PRIV_KEY} -pubout -out ${ID_PUB_KEY}

########
# Relayer proto file

#############################################
# Broker installation steps
#############################################

COPY . /home/app

# Copy startup script here, used by PM2 to start the daemon
COPY ./docker/sparkswapd/start-sparkswapd.sh ./start-sparkswapd.sh

# We remove the package-lock file here so that our github dependencies like lnd-engine
# and grpc-methods can continue to update if they are unstable.
#
# TODO: Remove this line when lnd-engine is ready for versioning
RUN rm -f package-lock.json

ARG RELAYER_PROTO_BRANCH
ARG RELAYER_PROTO_COMMIT_SHA

RUN mkdir -p /home/app/proto
RUN git clone --branch ${RELAYER_PROTO_BRANCH} https://github.com/sparkswap/relayer-proto.git /home/app/proto \
&&  (cd /home/app/proto && git checkout ${RELAYER_PROTO_COMMIT_SHA})


# Start a new, final image to reduce size.
FROM node:8 as final

RUN mkdir "/secure"

# Copy Certs
COPY --from=builder /secure /secure

# Copy the application
COPY --from=builder /home/app /home/app

# Copy relayer-proto files
COPY --from=builder /home/app/proto /home/app/proto

WORKDIR /home/app

RUN npm i --silent
RUN npm run broker-proto
