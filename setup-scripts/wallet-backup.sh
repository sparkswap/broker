########################################################
# Sparkswap wallet backup
#
# In addition to saving your recovery seed AND password in a safe place, this script
# provides a utility where we export wallet databases from running lnd instances and
# archive them into a file that can be encrypted and uploaded to a cloud service for
# safe storage.
#
# This type of utility is recommended as a precaution, but is not recommended if other
# options are available, such as cipher seed wallet recovery.
#
# NOTE: The following script assumes that your broker lives on the same host machine.
#
########################################################

set -ex

# Available options: mainnet, regtest, testnet
CHAIN_ENV=regtest

# Destinations for the wallet db
BTC_WALLET=/data/chain/bitcoin/$CHAIN_ENV/wallet.db
LTC_WALLET=/data/chain/litecoin/$CHAIN_ENV/wallet.db

# We need to grab lnd docker id's for use with `docker cp`
LND_BTC_ID=$(docker-compose ps -q lnd_btc)
LND_LTC_ID=$(docker-compose ps -q lnd_ltc)

# Dump wallet.db files from both lnd_btc and lnd_ltc to the host
docker cp $LND_BTC_ID:$BTC_WALLET ./btc.db
docker cp $LND_LTC_ID:$LTC_WALLET ./ltc.db

# zip and compress each wallet file
tar -zcvf btc.tar.gz ./btc.db
tar -zcvf ltc.tar.gz ./ltc.db

# Remove local files
rm btc.db ltc.db

# Let the user know what happened
echo "BTC Archive is now stored at btc.tar.gz"
echo "LTC Archive is now stored at ltc.tar.gz"
