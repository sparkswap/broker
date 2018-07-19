const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const kbd = rewire(path.resolve(__dirname, 'kbd.js'))

describe('kbd', () => {
  let BrokerDaemon
  let argv

  beforeEach(() => {
    BrokerDaemon = sinon.stub()
    BrokerDaemon.prototype.initialize = sinon.stub()

    kbd.__set__('BrokerDaemon', BrokerDaemon)

    argv = [
      'node',
      './broker-daemon/bin/kbd'
    ]
  })

  /**
   * We skip all of the environment variable tests because we bind to process.env before
   * `rewire` has a chance to replace the values.
   */

  it('starts the BrokerDaemon', () => {
    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledOnce()
    expect(BrokerDaemon).to.have.been.calledWithNew()
  })

  it('initializes the BrokerDaemon', () => {
    kbd(argv)

    expect(BrokerDaemon.prototype.initialize).to.have.been.calledOnce()
  })

  it('provides the identity private/public key paths', () => {
    const idKeyPath = {
      privKeyPath: '/path/to/priv/key',
      pubKeyPath: '/path/pub/key'
    }

    argv.push('--id-privkey-path')
    argv.push(idKeyPath.privKeyPath)
    argv.push('--id-pubkey-path')
    argv.push(idKeyPath.pubKeyPath)

    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match(idKeyPath))
  })

  it('provides an rpc address', () => {
    const rpcAddress = '0.0.0.0:9876'
    argv.push('--rpc-address')
    argv.push(rpcAddress)

    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match.any, rpcAddress)
  })

  xit('defaults the rpc address to the env variable')

  it('provides an interchain router address', () => {
    const interchainRouterAddress = '0.0.0.0:9876'
    argv.push('--interchain-router-address')
    argv.push(interchainRouterAddress)

    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match.any, sinon.match.any, interchainRouterAddress)
  })

  xit('defaults the interchain router address to the env variable')

  it('provides an data dir', () => {
    const dataDir = '/dev/null'
    argv.push('--data-dir')
    argv.push(dataDir)

    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match.any, sinon.match.any, dataDir)
  })

  xit('defaults the data dir to the env variable')

  it('provides a relayer host', () => {
    const relayerHost = 'example.com:9876'
    argv.push('--relayer-host')
    argv.push(relayerHost)

    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match.any, sinon.match({ relayerRpcHost: relayerHost }))
  })

  xit('defaults the relayer host to the env variable')

  it('provides a relayer cert path', () => {
    const relayerCertPath = '/path/to/relayer/root.pem'
    argv.push('--relayer-cert-path')
    argv.push(relayerCertPath)

    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match.any, sinon.match({ relayerCertPath }))
  })

  xit('defaults the relayer cert path to the env variable')

  it('provides the markets', () => {
    const markets = 'BTC/LTC,ABC/XYZ'
    argv.push('--markets')
    argv.push(markets)

    kbd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match.any, sinon.match.any, sinon.match.any, sinon.match.any, sinon.match.any, markets.split(','))
  })

  xit('defaults the markets to the env variable')

  it('provides the engine type', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)

    kbd(argv)

    const engines = BrokerDaemon.args[0][6]
    expect(engines.LTC).to.have.property('type', ltcEngineType)
  })

  xit('defaults the engine type to the env variable')

  it('provides the engine rpc address', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)
    const ltcLndRpc = 'localhost:1337'
    argv.push('--ltc-lnd-rpc')
    argv.push(ltcLndRpc)

    kbd(argv)

    const engines = BrokerDaemon.args[0][6]
    expect(engines.LTC).to.have.property('lndRpc', ltcLndRpc)
  })

  xit('defaults the engine rpc address to the env variable')

  it('provides the engine tls cert', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)
    const ltcLndTls = '/dev/null'
    argv.push('--ltc-lnd-tls')
    argv.push(ltcLndTls)

    kbd(argv)

    const engines = BrokerDaemon.args[0][6]
    expect(engines.LTC).to.have.property('lndTls', ltcLndTls)
  })

  xit('defaults the engine tls cert to the env variable')

  it('provides the engine macaroon path', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)
    const ltcLndMacaroon = '/dev/null'
    argv.push('--ltc-lnd-macaroon')
    argv.push(ltcLndMacaroon)

    kbd(argv)

    const engines = BrokerDaemon.args[0][6]
    expect(engines.LTC).to.have.property('lndMacaroon', ltcLndMacaroon)
  })

  xit('defaults the engine macaroon path to the env variable')
})
