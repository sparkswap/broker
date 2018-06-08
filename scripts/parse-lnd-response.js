const [ command, ...data ] = process.argv.slice(2)

const payload = JSON.parse(data.join(''))

/**
 * This file contains logic to fund a wallet w/ the default LND setup for a broker.
 *
 * Information in this script is based off the LND docker setup:
 * https://github.com/lightningnetwork/lnd/tree/master/docker
 *
 * NOTE: This script is incomplete because of the `--noencryptwallet` flag that is
 *       included in the lnd_btc container. If this flag was removed, we would need to
 *       create a wallet w/ pass and nmemonic
 *
 * EXAMPLE USAGE:
 *
 * Inside your bash script you can pipe commands to this file, with one of the following
 * specified commands:
 *
 * - segwit
 *
 * EXAMPLE:
 *
 * ```
 * SEGWIT_RESPONSE=$(node ./scripts/parse-lnd.js segwit $RAW_SEGWIT_RESPONSE)
 * echo $SEGWIT_RESPONSE // this is equal to the data contained in payload.bip9_softforks.segwit.status
 * ```
*/
switch (command.toLowerCase()) {
  case 'segwit':
    console.log(payload.bip9_softforks.segwit.status)
    break
}
