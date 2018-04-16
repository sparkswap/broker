FROM golang:1.9

LABEL maintainer="Danny Paz <kinesis.exchange>"

# Expose mainnet ports (server, rpc)
EXPOSE 8333 8334

# Expose testnet ports (server, rpc)
EXPOSE 18333 18334

# Expose simnet ports (server, rpc)
EXPOSE 18555 18556

# Expose segnet ports (server, rpc)
EXPOSE 28901 28902

# Grab and install the latest version of roasbeef's fork of ltcd and all
# related dependencies.
RUN go get -d github.com/ltcsuite/ltcd
RUN go get -u github.com/Masterminds/glide

WORKDIR $GOPATH/src/github.com/ltcsuite/ltcd
RUN glide install
RUN go install . ./cmd/ltcctl ./cmd/gencerts

RUN mkdir "/rpc" "/root/.ltcd" "/root/.ltcctl"
RUN touch "/root/.ltcd/ltcd.conf"

# "ltcctl" and "lnd" to "ltcd" over docker links.
RUN "/go/bin/gencerts" --host="*" --directory="/rpc" --force

# Create a volume to house pregenerated RPC credentials. This will be
# shared with any lnd, btcctl containers so they can securely query ltcd's RPC
# server.
# You should NOT do this before certificate generation!
# Otherwise manually generated certificate will be overridden with shared
# mounted volume! For more info read dockerfile "VOLUME" documentation.
VOLUME ["/rpc"]

COPY "docker/ltcd/start-ltcctl.sh" .
COPY "docker/ltcd/start-ltcd.sh" .

RUN chmod +x start-ltcctl.sh
RUN chmod +x start-ltcd.sh
