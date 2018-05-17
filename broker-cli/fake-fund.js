const exec = require('child_process').exec

/**
 * kcli fake-fund
 *
 * Fake funds an account (SIMNET ONLY)
 *
 * ex: `kcli fake-fund`
 *
 * @function
 * @param {Object} args
 * @param {String} args.walletAddress
 * @param {Object} opts
 * @param {String} [rpcAddress] broker rpc address
 * @param {Logger} logger
 */
async function fakeFund (args, opts, logger) {
  const { walletAddress } = args

  try {
    const fund = exec(`WALLET_ADDR=${walletAddress} bash scripts/fund-wallet.sh`, () => {
      logger.info(`Successfully added BTC to: ${walletAddress}`)
    })

    fund.stdout.pipe(process.stdout)
    fund.stderr.pipe(process.stderr)
  } catch (e) {
    logger.error('hello')
  }
};

module.exports = (program) => {
  program
    .command('fake-fund', 'Fake funds a specified wallet address (SIMNET ONLY)')
    .argument('<wallet-address>', 'Wallet Address from daemon')
    .action(fakeFund)
}
