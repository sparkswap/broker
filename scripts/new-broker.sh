BROKER_DIR=$HOME/workspace/broker
WORDING_DIR=$PWD

echo "Copying broker"

(
  cd $BROKER_DIR &&
  cd ../ &&
  mkdir broker2/
  cp -r $BROKER_DIR/* ./broker2/

  echo "Updating port numbers"
  sed -i '' 's/27492/27494/' ./broker2/docker-compose.yml
  sed -i '' 's/10112/10114/' ./broker2/docker-compose.yml
)