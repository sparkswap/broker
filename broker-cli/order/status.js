const BrokerDaemonClient = require('../broker-daemon-client')

/**
 * kcli order status
 *
 * ex: `kcli order status Aar_w9XuTtUqeqeaac5liIMR-Lqf1dJfKZikTkhJ'
 *
 * @param {Object} args
 * @param {String} args.blockOrderId
 * @param {String} [rpcaddress] opts.rpcaddress
 * @param {Logger} logger
 */
async function status (args, opts, logger) {
  const { blockOrderId } = args
  const { rpcAddress = null } = opts

  const request = {
    blockOrderId
  }

  try {
    const client = new BrokerDaemonClient(rpcAddress)
    const blockOrderResult = await client.orderService.getBlockOrder(request)

    // convert prices from the wire into something we like
    blockOrderResult.limitPrice = `${blockOrderResult.limitPrice.integer}.${blockOrderResult.limitPrice.decimal}`
    blockOrderResult.openOrders.map((order) => {
      order.price = `${order.price.integer}.${order.price.decimal}`
      return order
    })
    blockOrderResult.fills.map((order) => {
      fill.price = `${fill.price.integer}.${fill.price.decimal}`
      return fill
    })

    logger.info(blockOrderResult)
  } catch (e) {
    logger.error(e)
  }
};

module.exports = status
