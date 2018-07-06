FROM node:8 as builder

LABEL maintainer="Danny Paz <kinesis.exchange>"

# Set the version of the broker used for this image
ARG BROKER_VERSION='v0.1.0-alpha-preview-rc2'

# Set the version of the relayer used for this image
ARG RELAYER_VERSION='v0.1.0-alpha-preview-rc2'

# Install dependencies and install/build lnd.
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install git

# add credentials on build
ARG SSH_PRIVATE_KEY
RUN mkdir /root/.ssh/
RUN echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa
# Change permissions of key after adding or you will receive `permission too lax` errors
# when trying to use the key (it will be ignored)
RUN chmod 400 /root/.ssh/id_rsa

# make sure that the github domain is accepted to allow pulling a private repo
RUN touch /root/.ssh/known_hosts
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts

WORKDIR /home/app

RUN git clone --branch ${BROKER_VERSION} git@github.com:kinesis-exchange/broker.git .
RUN npm install --quiet

# Installing lnd-engine on the relayer
RUN git clone git@github.com:kinesis-exchange/lnd-engine.git ./node_modules/lnd-engine
RUN (cd ./node_modules/lnd-engine && npm i --production)

# Remove git file or npm will complain
RUN rm -rf ./node_modules/lnd-engine/.git

# Install relayer proto
RUN git clone --branch ${RELAYER_VERSION} git@github.com:kinesis-exchange/relayer.git ./proto/relayer
RUN cp ./proto/relayer/proto/relayer.proto ./proto/
RUN rm -rf ./proto/relayer

# Build the broker proto
RUN npm run broker-proto

# Start a new, final image to reduce size.
FROM node:8 as final

RUN mkdir "/secure"

COPY --from=builder /home/app /home/app

WORKDIR /home/app
