const { chai } = require('test/test-helper')
const { expect } = chai

const GrpcAction = require('./grpc-action')

describe('GrpcAction', () => {
  describe('new', () => {
    it('assigns a logger', () => {
      const logger = 'mylogger'
      const action = new GrpcAction(logger)

      expect(action).to.have.property('logger')
      expect(action.logger).to.be.eql(logger)
    })

    it('assigns a store', () => {
      const store = 'mystore'
      const action = new GrpcAction(null, store)

      expect(action).to.have.property('store')
      expect(action.store).to.be.eql(store)
    })

    it('assigns a relayer client', () => {
      const relayer = 'myrelayer'
      const action = new GrpcAction(null, null, relayer)

      expect(action).to.have.property('relayer')
      expect(action.relayer).to.be.eql(relayer)
    })
  })
})
