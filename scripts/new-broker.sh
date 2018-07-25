########################################################
# "New Broker Setup" script.
#
# This script contains code to setup a new broker by copying docker-compose
# files and providing information to allow multiple brokers on the same local
# development environment
#
# PARAMS:
#   - BROKER_DIR (defaults to $HOME/workspace/broker)
#
########################################################

set -e -u

BROKER_DIR=${BROKER_DIR:-$HOME/workspace/broker}

echo "Copying broker from $BROKER_DIR"

(
  cd $BROKER_DIR &&
  cd ../ &&
  mkdir broker2/
  cp -r $BROKER_DIR/* ./broker2/
)
