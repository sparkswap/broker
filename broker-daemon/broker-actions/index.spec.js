const { chai } = require('test/test-helper')
const { expect } = chai

const {
  createOrder,
  watchMarket,
  healthCheck
} = require('./index')

describe('broker actions  index', () => {
  it('defines createOrder', () => {
    expect(createOrder).to.not.be.null()
    expect(createOrder).to.not.be.undefined()
  })

  it('defines watchMarket', () => {
    expect(watchMarket).to.not.be.null()
    expect(watchMarket).to.not.be.undefined()
  })

  it('defines healthCheck', () => {
    expect(healthCheck).to.not.be.null()
    expect(healthCheck).to.not.be.undefined()
  })
})
