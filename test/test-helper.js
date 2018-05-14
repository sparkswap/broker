/**
 * Kinesis test helper
 *
 * NOTE: This file is specifically loaded before all tests so that we
 * can globally require some files.
 *
 */
const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const dirtyChai = require('dirty-chai')
const chaiAsPromised = require('chai-as-promised')
const rewire = require('rewire')
const delay = require('timeout-as-promise')

chai.use(sinonChai)
chai.use(dirtyChai)
chai.use(chaiAsPromised)

let sandbox = sinon.createSandbox()

afterEach(function () {
  sandbox.restore()
})

module.exports = {
  chai,
  sinon: sandbox,
  rewire,
  delay
}
