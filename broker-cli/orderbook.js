const BrokerDaemonClient = require('./broker-daemon-client')
const { validations } = require('./utils')
require('colors')

/**
 * Prints log statements for a psuedo UI for the orderbook
 *
 * TODO: Use a util like clui/smart-table to represent columns/rows
 * @param {String} market
 * @returns {Void}
 */
function createUI (market, asks, bids) {
  console.clear()

  const ui = []

  ui.push('')
  ui.push(String(`Market: ${market.toUpperCase()}`).bold.white)
  ui.push('')
  ui.push(['                ', String('ASK').underline.gray, String('                |                ').gray, String('BID').underline.gray, '                '].join(''))
  ui.push(String('      price      |      depth      |      price      |      depth      ').gray)
  ui.push(String('-----------------------------------------------------------------------').gray)

  let rows = Math.max(asks.length, bids.length)

  if (rows === 0) {
    ui.push(String('                             NO OPEN ORDERS                            ').white)
  }

  let asksAndBids = [asks, bids]
  let orderColors = ['red', 'green']

  for (var i = 0; i < rows; i++) {
    let row = ['', '']
    // TODO: collapse orders at the same price point into a single line
    asksAndBids.forEach((orders, index) => {
      if (orders[i]) {
        // TODO: pull the 8 out of here and make it per-currency configuration
        // TODO: make display of amounts consistent with inputs (buys, prices, etc)
        let price = String(` ${(orders[i].counterAmount / orders[i].baseAmount).toFixed(8)} `)
        let depth = String(` ${(orders[i].baseAmount * 1e-8).toFixed(8)} `)

        row[index] = [price, depth].map((field, j) => {
          while (field.length < 17) {
            field = ` ${field}`
          }

          return j ? field.white : field[orderColors[index]]
        }).join(String('|').gray)
      } else {
        row[index] = [Array(17).fill(' ').join(''), Array(17).fill(' ').join('')].join(String('|').gray)
      }

      while (row[index].length < 17) {
        row[index] = ` ${row[index]}`
      }
    })
    ui.push(row.join(String('|').gray))
  }

  console.log(ui.join('\n') + '\n')
}

/**
 * kcli orderbook
 *
 * ex: `kcli orderbook --market 'BTC/LTC'
 *
 * @param {Object} args
 * @param {Object} opts
 * @param {String} opts.market
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function orderbook (args, opts, logger) {
  const { market, rpcAddress = null } = opts
  const request = { market }

  try {
    const watchOrder = await new BrokerDaemonClient(rpcAddress).watchMarket(request)

    // TODO: We should save orders to an internal DB or figure out a way to store
    // this info instead of in memory?
    // (this probably needs to be done in the daemon itself)
    const bids = new Map()
    const asks = new Map()
    let sortedAsks = []
    let sortedBids = []

    // Lets initialize the view AND just to be sure, we will clear the view
    console.clear()
    createUI(market, Array.from(asks.values()), Array.from(bids.values()))

    watchOrder.on('data', (order) => {
      const { orderId, baseAmount, counterAmount, side } = order.marketEvent
      const { type } = order

      if (type === BrokerDaemonClient.proto.WatchMarketResponse.EventType.DEL) {
        asks.delete(orderId)
        bids.delete(orderId)
      } else {
        if (side === 'ASK') {
          asks.set(orderId, { counterAmount, baseAmount })
        } else {
          bids.set(orderId, { counterAmount, baseAmount })
        }
      }

      sortedAsks = Array.from(asks.values()).sort(sortAsksByPrice)
      sortedBids = Array.from(bids.values()).sort(sortBidsByPrice)
      console.clear()
      createUI(market, sortedAsks, sortedBids)
    })

    watchOrder.on('cancelled', () => logger.info('Stream was cancelled by the server'))
    watchOrder.on('end', () => logger.info('End of stream'))
  } catch (e) {
    logger.error(e.toString())
  }
};

function sortAsksByPrice (firstAsk, secondAsk) {
  const firstAskPrice = firstAsk.counterAmount / firstAsk.baseAmount
  const secondAskPrice = secondAsk.counterAmount / secondAsk.baseAmount

  let comparison = 0
  if (firstAskPrice < secondAskPrice) {
    comparison = -1
  } else if (firstAskPrice > secondAskPrice) {
    comparison = 1
  }
  return comparison
}

function sortBidsByPrice (firstBid, secondBid) {
  const firstBidPrice = firstBid.counterAmount / firstBid.baseAmount
  const secondBidPrice = secondBid.counterAmount / secondBid.baseAmount

  let comparison = 0
  if (firstBidPrice > secondBidPrice) {
    comparison = -1
  } else if (firstBidPrice < secondBidPrice) {
    comparison = 1
  }
  return comparison
}

module.exports = (program) => {
  program
    .command('orderbook', 'View the order book for a specific market.')
    .option('--market <marketName>', 'Relevant market name', validations.isMarketName, null, true)
    .option('--rpc-address <server>', 'Location of the RPC server to use.', validations.isHost)
    .action(orderbook)
}
