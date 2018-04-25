const { chai } = require('test/test-helper')
const { expect } = chai

const {
  TIME_IN_FORCE,
  ORDER_TYPES
} = require('./enums')

describe('Validations', () => {
  it('defines TIME_IN_FORCE', () => {
    expect(TIME_IN_FORCE).to.not.be.null()
    expect(TIME_IN_FORCE).to.not.be.undefined()
  })

  it('defines ORDER_TYPES', () => {
    expect(ORDER_TYPES).to.not.be.null()
    expect(TIME_IN_FORCE).to.not.be.undefined()
  })
})
