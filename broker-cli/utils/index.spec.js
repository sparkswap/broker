const { expect } = require('test/test-helper')

const {
  ENUMS,
  validations,
  Big,
  strToPrice
} = require('./index')

describe('utils index', () => {
  it('defines ENUMS', () => {
    expect(ENUMS).to.not.be.null()
    expect(ENUMS).to.not.be.undefined()
  })

  it('defines validations', () => {
    expect(validations).to.not.be.null()
    expect(validations).to.not.be.undefined()
  })

  it('defines Big', () => {
    expect(Big).to.not.be.null()
    expect(Big).to.not.be.undefined()
  })

  it('defines strToPrice', () => {
    expect(strToPrice).to.not.be.null()
    expect(strToPrice).to.not.be.undefined()
  })
})
