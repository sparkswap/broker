# Installing the broker
mkdir -p ~/sparkswap && cd sparkswap

# Download the source for a Lightning Network engine
git clone git://github.com/sparkswap/lnd-engine.git
(cd lnd-engine && npm run build)

# Download the source for a broker
git clone git://github.com/sparkswap/broker.git
cd broker
npm run build
cp .env-testnet-sample .env
sed -i "s/sample.ip.address/$EXTERNAL_ADDRESS/" .env
docker-compose up -d

# Install the CLI
npm install -g ./broker-cli
