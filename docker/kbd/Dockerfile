FROM node:8 as builder

LABEL maintainer="Danny Paz <kinesis.exchange>"

# Add ssh credentials on build to allow us to access private repos
# inside of the docker container
ARG SSH_PRIVATE_KEY
RUN : "${SSH_PRIVATE_KEY:?SSH_PRIVATE_KEY Build argument needs to be set.}"

RUN mkdir /root/.ssh/ \
&&  echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa \
#
# Change permissions of key after adding or you will receive `permission too lax` errors
# when trying to use the key (it will be ignored)
&&  chmod 400 /root/.ssh/id_rsa \
&&  touch /root/.ssh/known_hosts \
&&  ssh-keyscan github.com >> /root/.ssh/known_hosts

# Install git for broker/relayer/lnd-engine dependencies
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install git


#############################################
# Broker installation steps
#############################################
COPY . /home/app

WORKDIR /home/app

RUN npm install --quiet

#############################################
# lnd-engine installation steps
#
# Currently, lnd-engine is not a public/private npm package, so we need to manually
# install after `npm i` is ran on the broker
#############################################
ARG LND_ENGINE_COMMIT_SHA
RUN : "${LND_ENGINE_COMMIT_SHA:?LND_ENGINE_COMMIT_SHA Build argument needs to be set.}"

RUN git clone git@github.com:kinesis-exchange/lnd-engine.git ./node_modules/lnd-engine \
&& (cd ./node_modules/lnd-engine && git checkout ${LND_ENGINE_COMMIT_SHA}) \
&& (cd ./node_modules/lnd-engine && npm i --production) \
# Remove git file or npm will complain when using any commands
&& rm -rf ./node_modules/lnd-engine/.git

#############################################
# Relayer proto-file installation steps
#############################################
ARG RELAYER_PROTO_COMMIT_SHA
RUN : "${RELAYER_PROTO_COMMIT_SHA:?RELAYER_PROTO_COMMIT_SHA Build argument needs to be set.}"

RUN git clone git@github.com:kinesis-exchange/relayer-proto.git ./proto \
&&  (cd ./proto && git checkout ${RELAYER_PROTO_COMMIT_SHA}) \
&&  rm -rf ./proto/.git

#############################################
# Keypair Generation for use with Relayer
#############################################
RUN mkdir "/secure"
ARG ID_PRIV_KEY='/secure/broker-identity.private.pem'
ARG ID_PUB_KEY='/secure/broker-identity.public.pem'
RUN openssl ecparam -name prime256v1 -genkey -noout -out ${ID_PRIV_KEY}
RUN openssl ec -in ${ID_PRIV_KEY} -pubout -out ${ID_PUB_KEY}

# Start a new, final image to reduce size.
FROM node:8 as final

RUN mkdir "/secure"

# Copy keys to the final image
ARG ID_PRIV_KEY='/secure/broker-identity.private.pem'
ARG ID_PUB_KEY='/secure/broker-identity.public.pem'
COPY --from=builder ${ID_PRIV_KEY} /secure/
COPY --from=builder ${ID_PUB_KEY} /secure/

# Copy the application
COPY --from=builder /home/app /home/app

WORKDIR /home/app

# We declare node_modules volume here so that it can copy the contents of the
# `node_modules` folder from the builder image's npm install. Since we mount
# node_modules as a volume in the associated `docker-compose.yml` file,
# if we don't declare it here, docker will always use the first creation of the
# node_modules volume and may have old dependencies as a result.
VOLUME ["/home/app/node_modules"]
