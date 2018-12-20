FROM node:8.11 as builder

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

ARG KEY_PATH
RUN : "${KEY_PATH:?KEY_PATH Build argument needs to be set.}"
ARG CERT_PATH
RUN : "${CERT_PATH:?CERT_PATH Build argument needs to be set.}"

ARG TLS_KEY="/secure/broker-rpc-tls.key"
ARG TLS_CERT="/secure/broker-rpc-tls.cert"

COPY ${KEY_PATH} ${TLS_KEY}
COPY ${CERT_PATH} ${TLS_CERT}

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
FROM node:8.11 as final

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
