/**
 * Update a channel's (fake) chain by updating the fee policy
 *
 * Example: node update-channel-chain.js <channelPoint> <symbol>`
 */

const chainFees = {
  BTC: '6',
  LTC: '7'
}

const LndEngine = require('lnd-engine')

const LND_HOST = 'lnd_btc:10009'
const LND_TLS_CERT = '/shared/lnd-engine-tls.cert'
const LND_MACAROON = '/shared/lnd-engine-admin.macaroon'

const args = process.argv.slice(2)
const [channelPoint, symbol] = args

if (!chainFees[symbol]) throw new Error('[update-channel-chain] symbol is not valid')
if (!channelPoint) throw new Error('[update-channel-chain] channelPoint is not specified')

const [ fundingTxidStr, outputIndex ] = channelPoint.split(':')

const lnd = new LndEngine(LND_HOST, { logger: console, tlsCertPath: LND_TLS_CERT, macaroonPath: LND_MACAROON })

lnd.client.updateChannelPolicy({
  chanPoint: {
    fundingTxidStr,
    outputIndex: parseInt(outputIndex, 10)
  },
  feeRate: parseInt(chainFees[symbol], 10) / 1000000,
  timeLockDelta: 9
}, (err) => {
  if (err) {
    throw err
  }
  console.log(`Updated channel to ${symbol}`)
})
