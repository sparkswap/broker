#!/bin/bash

set -e

CERT_STRING=$(cat ./scripts/simnet-rpc.cert)
docker-compose exec kbd bash -c "echo \"$CERT_STRING\" >> /shared/simnet-rpc.cert"
