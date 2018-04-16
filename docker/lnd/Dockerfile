FROM golang:1.10

LABEL maintainer="Danny Pazuchowski <danny@kines.is>"

# Expose lnd ports (server, rpc).
EXPOSE 9735 10009

# Force Go to use the cgo based DNS resolver. This is required to ensure DNS
# queries required to connect to linked containers succeed.
ENV GODEBUG netdns=cgo

# Install dep to manage vendor.
RUN go get -u github.com/golang/dep/cmd/dep

# Grab and install the latest version of lnd and all related dependencies.
RUN go get -d github.com/lightningnetwork/lnd

# Make lnd folder default.
WORKDIR $GOPATH/src/github.com/lightningnetwork/lnd

# Install dependencies and install/build lnd.
RUN dep ensure
RUN go install . ./cmd/...

COPY "docker/lnd/start-lnd.sh" .
RUN chmod +x start-lnd.sh
