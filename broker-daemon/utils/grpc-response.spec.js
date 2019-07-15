const { chai: { expect } } = require('test/test-helper')
const GrpcResponse = require('./grpc-response')

describe('GrpcResponse', () => {
  let status
  let market

  beforeEach(() => {
    status = 'FILLED'
    market = 'BTC/LTC'
  })

  it('sets params passed to constructor', () => {
    const response = new GrpcResponse({ status, market })

    expect(response.status).to.eql(status)
    expect(response.market).to.eql(market)
  })
})
