#!/bin/bash

################################################################################
#
# DANGEROUS: Docker destroy script.
#
# Destroy is a volatile operation that will run the following:
# 1. stops all containers
# 2. removes all containers
# 3. removes all images
# 4. removes all volumes
# 5. removes all networks
# 6. rebuilds images in the current repo
#
################################################################################

echo "You are about to reset Docker and rebuild all images."
echo "This will take a horribly long amount of time!"
echo "Are you sure you want to reset Docker? (this is a volatile operation)" "(y or n)"
read answer
if [ "$answer" = "y" ]; then
  docker stop $(docker ps -qa) 2>/dev/null
  docker rm $(docker ps -qa)
  docker rmi -f $(docker images -qa)
  docker volume rm $(docker volume ls -qf)
  docker network rm $(docker network ls -q)
  docker-compose build --force-rm
fi
