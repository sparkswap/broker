const { chai } = require('test/test-helper')
const { expect } = chai

const {
  ENUMS,
  validations
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
})
