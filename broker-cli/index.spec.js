const { expect } = require('test/test-helper')

const {
  buyCommand,
  sellCommand,
  configCommand,
  orderbookCommand,
  healthCheckCommand,
  newDepositAddressCommand
} = require('./index')

describe('broker index', () => {
  it('defines buyCommand', () => {
    expect(buyCommand).to.not.be.null()
    expect(buyCommand).to.not.be.undefined()
  })

  it('defines sellCommand', () => {
    expect(sellCommand).to.not.be.null()
    expect(sellCommand).to.not.be.undefined()
  })

  it('defines configCommand', () => {
    expect(configCommand).to.not.be.null()
    expect(configCommand).to.not.be.undefined()
  })

  it('defines orderbookCommnad', () => {
    expect(orderbookCommand).to.not.be.null()
    expect(orderbookCommand).to.not.be.undefined()
  })

  it('defines healthCheckCommand', () => {
    expect(healthCheckCommand).to.not.be.null()
    expect(healthCheckCommand).to.not.be.undefined()
  })

  it('defines newDepositAddressCommand', () => {
    expect(newDepositAddressCommand).to.not.be.null()
    expect(newDepositAddressCommand).to.not.be.undefined()
  })
})
