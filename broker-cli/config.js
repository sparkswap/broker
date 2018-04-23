module.exports = (program) => {
  program
    .command('config', 'All current configuration settings')
    .action((args, options, logger) => {
      logger.info('Current Kinesis Configuration:')
      logger.info('{')
      logger.info(`  BROKER_DAEMON_HOST: ${process.env.BROKER_DAEMON_HOST}`)
      logger.info('}')
    })
}
