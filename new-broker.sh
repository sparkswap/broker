BROKER_DIR=$HOME/workspace/broker
WORDING_DIR=$PWD

echo "Copying broker"

(
  cd $BROKER_DIR &&
  cd ../ &&
  mkdir broker2/
  cp -r ./broker/* ./broker2/
)
