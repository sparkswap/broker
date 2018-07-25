/*
 * QueryRoutes (BTC) script (internal use only)
 * This script can be used to troubleshoot routing issues w/ sparkswapd's interchain
 * router implementation
 *
 * Usage (inside of a kbd container): `node query-routes.js`
 */
const LndEngine = require('lnd-engine')

const LND_HOST = 'lnd_btc:10009'
const LND_TLS_CERT = '/shared/lnd-engine-tls-btc.cert'
const LND_MACAROON = '/shared/lnd-engine-admin-btc.macaroon'

const lnd = new LndEngine(LND_HOST, { logger: console, tlsCertPath: LND_TLS_CERT, macaroonPath: LND_MACAROON })

var request = {
  pubKey: '<your_pub_key>',
  amt: '10000',
  numRoutes: 1
}

lnd.client.queryRoutes(request, (err, res) => {
  console.log(err)
  console.log(res)
})
