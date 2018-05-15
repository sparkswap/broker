#!/bin/bash

set -e

echo "Restarting all broker images"
docker-compose down -v

echo "Rebuilding kbd"
docker-compose build --force-rm kbd

echo "Starting all containers"
docker-compose up -d
