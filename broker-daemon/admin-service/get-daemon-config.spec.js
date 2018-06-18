const path = require('path')
const {
  sinon,
  rewire,
  expect
} = require('test/test-helper')

const getDaemonConfig = rewire(path.resolve(__dirname, 'get-daemon-config'))

describe('get-daemon-config', () => {
  let engine
  let publicKeyStub
  let pubKey
  let GetDaemonConfigResponse
  let markets
  let rpcHost
  let lndHost
  let lndExternal
  let daemonExternal
  let revert

  beforeEach(() => {
    markets = 'BTC'
    rpcHost = '127.0.0.1:8675309'
    lndHost = '127.0.0.1:10009'
    pubKey = 'PUBLIC_KEY'
    lndExternal = '127.0.0.1:10011'
    daemonExternal = '127.0.0.1:27984'
    GetDaemonConfigResponse = sinon.stub()
    publicKeyStub = sinon.stub().returns(pubKey)
    engine = {
      getPublicKey: publicKeyStub
    }

    revert = getDaemonConfig.__set__('process', {
      env: {
        EXCHANGE_RPC_HOST: rpcHost,
        EXCHANGE_LND_HOST: lndHost,
        MARKETS: markets,
        EXTERNAL_ADDRESS: daemonExternal,
        LND_EXTERNAL_ADDRESS: lndExternal
      }
    })
  })

  beforeEach(async () => {
    await getDaemonConfig({ engine }, { GetDaemonConfigResponse })
  })

  afterEach(() => {
    revert()
  })

  it('grabs an engines public key', () => {
    expect(publicKeyStub).to.have.been.called()
  })

  it('constructs a daemon config response', () => {
    expect(GetDaemonConfigResponse).to.have.been.calledWith(sinon.match({
      daemonPublicKey: pubKey,
      relayerLndHost: lndHost,
      relayerRpcHost: rpcHost,
      daemonDefaultMarkets: markets,
      daemonRpcHost: daemonExternal,
      daemonLndHost: lndExternal
    }))
  })
})
