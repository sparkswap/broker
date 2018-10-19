const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const sparkswapd = rewire(path.resolve(__dirname, 'sparkswapd.js'))

/**
 * IMPORTANT NOTE: We skip all of the environment variable (default) tests because
 * we bind to process.env before `rewire` has a chance to replace the values.
 */
describe('sparkswapd', () => {
  let BrokerDaemon
  let argv

  beforeEach(() => {
    BrokerDaemon = sinon.stub()
    BrokerDaemon.prototype.initialize = sinon.stub()

    sparkswapd.__set__('BrokerDaemon', BrokerDaemon)

    argv = [
      'node',
      './broker-daemon/bin/sparkswapd'
    ]
  })

  it('starts the BrokerDaemon', () => {
    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledOnce()
    expect(BrokerDaemon).to.have.been.calledWithNew()
  })

  it('initializes the BrokerDaemon', () => {
    sparkswapd(argv)

    expect(BrokerDaemon.prototype.initialize).to.have.been.calledOnce()
  })

  it('provides the daemon SSL private/public key paths', () => {
    const rpcKeyPath = {
      privRpcKeyPath: '/path/to/priv/key',
      pubRpcKeyPath: '/path/pub/key'
    }

    argv.push('--rpc-privkey-path')
    argv.push(rpcKeyPath.privRpcKeyPath)
    argv.push('--rpc-pubkey-path')
    argv.push(rpcKeyPath.pubRpcKeyPath)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match(rpcKeyPath))
  })

  it('provides the identity private/public key paths', () => {
    const privIdKeyPath = '/path/to/priv/key'
    const pubIdKeyPath = '/path/pub/key'

    argv.push('--id-privkey-path')
    argv.push(privIdKeyPath)
    argv.push('--id-pubkey-path')
    argv.push(pubIdKeyPath)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ }))
  })

  it('provides an rpc user/pass', () => {
    const rpcUser = 'sparkswap'
    const rpcPass = 'passwd'

    argv.push('--rpc-user')
    argv.push(rpcUser)
    argv.push('--rpc-pass')
    argv.push(rpcPass)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ rpcUser, rpcPass }))
  })

  it('provides an rpc address', () => {
    const rpcAddress = '0.0.0.0:9876'
    argv.push('--rpc-address')
    argv.push(rpcAddress)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ rpcAddress }))
  })

  it('provides an interchain router address', () => {
    const interchainRouterAddress = '0.0.0.0:9876'
    argv.push('--interchain-router-address')
    argv.push(interchainRouterAddress)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ interchainRouterAddress }))
  })

  it('provides an data dir', () => {
    const dataDir = '/dev/null'
    argv.push('--data-dir')
    argv.push(dataDir)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ dataDir }))
  })

  it('provides a relayer host', () => {
    const relayerHost = 'example.com:9876'
    argv.push('--relayer-host')
    argv.push(relayerHost)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ relayerOptions: { relayerRpcHost: relayerHost } }))
  })

  it('provides a relayer cert path', () => {
    const relayerCertPath = '/path/to/relayer/root.pem'
    argv.push('--relayer-cert-path')
    argv.push(relayerCertPath)

    sparkswapd(argv)

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ relayerOptions: { relayerCertPath } }))
  })

  it('provides the markets', () => {
    const markets = 'BTC/LTC,ABC/XYZ'
    argv.push('--markets')
    argv.push(markets)

    sparkswapd(argv)

    const marketNames = markets.split(',')

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ marketNames }))
  })

  it('provides the engine type', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)

    sparkswapd(argv)

    const { engines } = BrokerDaemon.args[0][0]
    expect(engines.LTC).to.have.property('type', ltcEngineType)
  })

  it('provides the engine rpc address', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)
    const ltcLndRpc = 'localhost:1337'
    argv.push('--ltc-lnd-rpc')
    argv.push(ltcLndRpc)

    sparkswapd(argv)

    const { engines } = BrokerDaemon.args[0][0]
    expect(engines.LTC).to.have.property('lndRpc', ltcLndRpc)
  })

  it('provides the engine tls cert', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)
    const ltcLndTls = '/dev/null'
    argv.push('--ltc-lnd-tls')
    argv.push(ltcLndTls)

    sparkswapd(argv)

    const { engines } = BrokerDaemon.args[0][0]
    expect(engines.LTC).to.have.property('lndTls', ltcLndTls)
  })

  it('provides the engine macaroon path', () => {
    const ltcEngineType = 'LND'
    argv.push('--ltc-engine-type')
    argv.push(ltcEngineType)
    const ltcLndMacaroon = '/dev/null'
    argv.push('--ltc-lnd-macaroon')
    argv.push(ltcLndMacaroon)

    sparkswapd(argv)

    const { engines } = BrokerDaemon.args[0][0]
    expect(engines.LTC).to.have.property('lndMacaroon', ltcLndMacaroon)
  })
})
