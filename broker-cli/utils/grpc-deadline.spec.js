const path = require('path')
const { rewire, expect, timekeeper } = require('test/test-helper')

const grpcDeadline = rewire(path.resolve(__dirname, 'grpc-deadline'))

describe('grpc-deadline', () => {
  let timeoutInSeconds

  beforeEach(() => {
    timeoutInSeconds = grpcDeadline.__get__('DEFAULT_TIMEOUT_IN_SECONDS')
    timekeeper.freeze(new Date())
  })

  afterEach(() => {
    timekeeper.reset()
  })

  it('returns a time in the future based on default timeout', () => {
    const expectedDeadline = (new Date().getSeconds() + timeoutInSeconds)
    const expectedDate = new Date().setSeconds(expectedDeadline)
    expect(grpcDeadline()).to.eql(expectedDate)
  })

  it('returns a time in the future based on a given timeout value', () => {
    const customTimeout = 500
    const expectedDeadline = (new Date().getSeconds() + customTimeout)
    const expectedDate = new Date().setSeconds(expectedDeadline)
    expect(grpcDeadline(customTimeout)).to.eql(expectedDate)
  })
})
