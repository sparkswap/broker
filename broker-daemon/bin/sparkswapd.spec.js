const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const sparkswapd = rewire(path.resolve(__dirname, 'sparkswapd.js'))
const config = rewire(path.resolve(__dirname, '..', 'config.json'))

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

  it('calls broker daemon with defaults', () => {
    sparkswapd(argv)

    const {
      dataDir,
      interchainRouterAddress,
      idPubKeyPath: pubIdKeyPath,
      idPrivKeyPath: privIdKeyPath,
      markets,
      disableAuth,
      rpc: {
        address: rpcAddress,
        user: rpcUser,
        pass: rpcPass,
        pubKeyPath: pubRpcKeyPath,
        privKeyPath: privRpcKeyPath
      },
      relayer: {
        rpcHost: relayerRpcHost,
        certPath: relayerCertPath
      }
    } = config

    const brokerOptions = {
      dataDir,
      interchainRouterAddress,
      pubIdKeyPath,
      privIdKeyPath,
      marketNames: [markets],
      disableAuth,
      rpcAddress,
      rpcUser,
      rpcPass,
      pubRpcKeyPath,
      privRpcKeyPath,
      relayerOptions: {
        relayerRpcHost,
        relayerCertPath
      },
      engines: sinon.match.object
    }

    expect(BrokerDaemon).to.have.been.calledWith(sinon.match(brokerOptions))
  })

  context('broker params', () => {
    it('provides an data dir', () => {
      const dataDir = '/dev/null'
      argv.push('--data-dir')
      argv.push(dataDir)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ dataDir }))
    })

    it('provides an interchain router address', () => {
      const interchainRouterAddress = '0.0.0.0:9876'

      argv.push('--interchain-router-address')
      argv.push(interchainRouterAddress)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ interchainRouterAddress }))
    })

    it('provides the identity private/public key paths', () => {
      const privIdKeyPath = '/path/to/priv/key'
      const pubIdKeyPath = '/path/pub/key'

      argv.push('--id-priv-key-path')
      argv.push(privIdKeyPath)
      argv.push('--id-pub-key-path')
      argv.push(pubIdKeyPath)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ }))
    })

    it('provides the markets', () => {
      const markets = 'BTC/LTC,ABC/XYZ'
      argv.push('--markets')
      argv.push(markets)

      sparkswapd(argv)

      const marketNames = markets.split(',')

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ marketNames }))
    })

    describe('--disable-auth', () => {
      it('disables authentication if flag exists', () => {
        argv.push('--disable-auth')
        sparkswapd(argv)
        expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ disableAuth: true }))
      })

      it('does not disable authentication', () => {
        argv.push('--disable-auth')
        sparkswapd(argv)
        expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ disableAuth: false }))
      })
    })
  })

  context('rpc params', () => {
    it('provides the daemon SSL private/public key paths', () => {
      const rpcKeyPath = {
        privRpcKeyPath: '/path/to/priv/key',
        pubRpcKeyPath: '/path/pub/key'
      }

      argv.push('--rpc.priv-key-path')
      argv.push(rpcKeyPath.privRpcKeyPath)
      argv.push('--rpc.pub-key-path')
      argv.push(rpcKeyPath.pubRpcKeyPath)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match(rpcKeyPath))
    })

    it('provides an rpc user/pass', () => {
      const rpcUser = 'sparkswap'
      const rpcPass = 'passwd'

      argv.push('--rpc.user')
      argv.push(rpcUser)
      argv.push('--rpc.pass')
      argv.push(rpcPass)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ rpcUser, rpcPass }))
    })

    it('provides an rpc address', () => {
      const rpcAddress = '0.0.0.0:9876'
      argv.push('--rpc.address')
      argv.push(rpcAddress)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ rpcAddress }))
    })
  })

  context('relayer options', () => {
    it('provides a relayer host', () => {
      const relayerHost = 'example.com:9876'
      argv.push('--relayer.rpc-host')
      argv.push(relayerHost)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ relayerOptions: { relayerRpcHost: relayerHost } }))
    })

    it('provides a relayer cert path', () => {
      const relayerCertPath = '/path/to/relayer/root.pem'
      argv.push('--relayer.cert-path')
      argv.push(relayerCertPath)

      sparkswapd(argv)

      expect(BrokerDaemon).to.have.been.calledWith(sinon.match({ relayerOptions: { relayerCertPath } }))
    })
  })

  context('engine options', () => {
    it('provides the engine type', () => {
      const ltcEngineType = 'LND'
      argv.push('--ltc.engine-type')
      argv.push(ltcEngineType)

      sparkswapd(argv)

      const { engines } = BrokerDaemon.args[0][0]
      expect(engines.LTC).to.have.property('type', ltcEngineType)
    })

    it('provides the engine rpc address', () => {
      const ltcEngineType = 'LND'
      const ltcLndRpc = 'localhost:1337'

      argv.push('--ltc.engine-type')
      argv.push(ltcEngineType)
      argv.push('--ltc.rpc-host')
      argv.push(ltcLndRpc)

      sparkswapd(argv)

      const { engines } = BrokerDaemon.args[0][0]
      expect(engines.LTC).to.have.property('lndRpc', ltcLndRpc)
    })

    it('provides the engine tls cert', () => {
      const ltcEngineType = 'LND'
      const ltcLndTls = '/dev/null'

      argv.push('--ltc.engine-type')
      argv.push(ltcEngineType)
      argv.push('--ltc.tls-cert')
      argv.push(ltcLndTls)

      sparkswapd(argv)

      const { engines } = BrokerDaemon.args[0][0]
      expect(engines.LTC).to.have.property('lndTls', ltcLndTls)
    })

    context('LND specific configuration', () => {
      it('provides the engine macaroon path', () => {
        const ltcEngineType = 'LND'
        const ltcLndMacaroon = '/dev/null'

        argv.push('--ltc.engine-type')
        argv.push(ltcEngineType)
        argv.push('--ltc.lnd-macaroon')
        argv.push(ltcLndMacaroon)

        sparkswapd(argv)

        const { engines } = BrokerDaemon.args[0][0]
        expect(engines.LTC).to.have.property('lndMacaroon', ltcLndMacaroon)
      })
    })
  })
})
