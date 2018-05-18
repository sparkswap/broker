const { expect } = require('test/test-helper')

const RelayerClient = require('./index')

describe('relayer index', () => {
  it('defines RelayerClient', () => {
    expect(RelayerClient).to.not.be.null()
    expect(RelayerClient).to.not.be.undefined()
  })
})
