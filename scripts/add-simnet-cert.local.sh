#!/bin/bash

set -e

CERT_STRING=$(cd ../relayer && docker-compose exec relayer bash -c 'cat /shared/rpc.cert')

docker-compose exec kbd bash -c "echo \"$CERT_STRING\" >> /shared/simnet-rpc.cert"

docker-compose restart
