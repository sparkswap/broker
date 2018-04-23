/**
 * Kinesis test helper
 *
 * NOTE: This file is specifically loaded before all tests so that we
 * can globally require some files.
 *
 */
const sinon = require('sinon')
const chai = require('chai')
const dirtyChai = require('dirty-chai')

chai.use(dirtyChai)

beforeEach(function () {
  this.sandbox = sinon.sandbox.create()
})

afterEach(function () {
  this.sandbox.restore()
})

module.exports = {
  chai
}
