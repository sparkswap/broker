#!/bin/bash

set -e

echo ""
echo "Building kcli for distribution."
echo ""


cd $(dirname "$0")
cd "../../"

echo "Removing any existing working directory"
rm -rf ./broker-cli-temp

echo "Creating working directory 'broker-cli-temp' in $(pwd)"
mkdir broker-cli-temp
cd broker-cli-temp

echo "Cloning master branch of existing repo at git@github.com:kinesis-exchange/broker.git"
git clone -b master git@github.com:kinesis-exchange/broker.git .

echo "Latest commit: $(git log --oneline -n 1)"

echo "Pruning git repo to only broker-cli"
git filter-branch --prune-empty --subdirectory-filter broker-cli master

echo "Updating remote origin"

git remote rm origin
git remote add origin git@github.com:kinesis-exchange/broker-cli.git

echo "Pushing to GitHub"
git push origin master

echo "Removing working directory"

cd ..
rm -rf ./broker-cli-temp

echo "Done."