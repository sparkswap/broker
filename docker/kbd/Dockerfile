FROM node:8 as builder

LABEL maintainer="Danny Paz <kinesis.exchange>"

# Install git for broker dependencies
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install git

#############################################
# Keypair Generation for Relayer
#
# This step creates certs to allow the broker to authenticate/auth for orders
# on the relayer
#############################################

ARG ID_PRIV_KEY='/secure/broker-identity.private.pem'
ARG ID_PUB_KEY='/secure/broker-identity.public.pem'

RUN mkdir "/secure"
RUN openssl ecparam -name prime256v1 -genkey -noout -out ${ID_PRIV_KEY}
RUN openssl ec -in ${ID_PRIV_KEY} -pubout -out ${ID_PUB_KEY}

#############################################
# Broker installation steps
#############################################

COPY . /home/app

# Start a new, final image to reduce size.
FROM node:8 as final

RUN mkdir "/secure"

# Copy Certs
COPY --from=builder /secure /secure

# Copy the application
COPY --from=builder /home/app /home/app

WORKDIR /home/app

RUN npm run build

# We declare node_modules volume here so that it can copy the contents of the
# `node_modules` folder from the builder images npm install. Since we mount
# node_modules as a volume in the associated `docker-compose.yml` file,
# if we don't declare it here, docker will always use the first creation of the
# node_modules volume and may have old dependencies as a result.
VOLUME ["/home/app/node_modules"]
