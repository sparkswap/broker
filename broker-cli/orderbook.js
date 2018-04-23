/**
 * kcli orderbook
 *
 * ex: `kcli orderbook --market 'BTC/LTC'
 *
 * @param options
 * @option market - required
 */

require('colors')
const Broker = require('./broker')

/**
 * Prints log statements for a psuedo UI for the orderbook
 *
 * TODO: Use a util like clui to represent columns/rows
 * @param {String} market
 * @param {Array} asks
 * @param {Array} bids
 * @returns {Void}
 */
function createUI (market, asks, bids) {
  console.clear()

  const ui = []

  ui.push("")
  ui.push(String(`Market: ${market.toUpperCase()}`).bold.white)
  ui.push("")
  ui.push(["                ", String("ASK").underline.gray, String("                |                ").gray, String("BID").underline.gray, "                "].join(""))
  ui.push(String("      price      |      depth      |      price      |      depth      ").gray)
  ui.push(String("-----------------------------------------------------------------------").gray)

  let rows = Math.max(asks.length, bids.length)

  if(rows === 0) {
    ui.push(String("                             NO OPEN ORDERS                            ").white)
  }

  let asksAndBids = [asks, bids]
  let orderColors = ['red', 'green']

  for(var i=0; i<rows; i++) {
    let row = ["", ""]
    // TODO: collapse orders at the same price point into a single line
    asksAndBids.forEach( (orders, index) => {

      if(orders[i]) {
        // TODO: pull the 8 out of here and make it per-currency configuration
        // TODO: make display of amounts consistent with inputs (buys, prices, etc)
        let price = String(` ${(orders[i].counterAmount / orders[i].baseAmount).toFixed(8)} `)
        let depth = String(` ${(orders[i].baseAmount * 1e-8).toFixed(8)} `)

        row[index] = [price, depth].map( (field, j) => {
          while(field.length < 17) {
            field = ` ${field}`
          }

          return j ? field.white : field[orderColors[index]]
        }).join(String('|').gray)
      } else {
        row[index] = [Array(17).fill(" ").join(""), Array(17).fill(" ").join("")].join(String('|').gray)
      }

      while(row[index].length < 17) {
        row[index] = ` ${row[index]}`
      }
    })
    ui.push(row.join(String('|').gray))
  }

  console.log(ui.join("\n") + "\n")
}

async function orderbook (args, opts, logger) {
  const { market, rpcAddress = null } = opts

  if (!market) {
    logger.error('No market specified')
  }

  const request = { market }

  try {
    const watchOrder = await new Broker(rpcAddress).watchMarket(request)

    // TODO: We should save orders to an internal DB or figure out a way to store
    // this info instead of in memory?
    // (this probably needs to be done in the daemon itself)
    const asks = []
    const bids = []

    // Lets initialize the view AND just to be sure, we will clear the view
    createUI(market, asks, bids)

    watchOrder.on('data', (order) => {
      const { orderId, baseAmount, counterAmount, side } = order

      if (side === 'ASK') {
        asks.push({ counterAmount, baseAmount })
      } else {
        bids.push({ counterAmount, baseAmount })
      }

      createUI(market, asks, bids)
    })

    watchOrder.on('cancelled', () => logger.info('Stream was cancelled by the server'))
    watchOrder.on('end', () => logger.info('End of stream'))
  } catch (e) {
    logger.error(e.toString())
  }
};

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market.')
    .option('--market <marketName>', 'Relevant market name', /^[A-Z]{2,5}\/[A-Z]{2,5}$/, null, true)
    .option('--rpc-address <server>', 'Location of the RPC server to use.', /^.+(:[0-9]*)?$/)
    .action(orderbook)
}
