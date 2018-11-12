const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

describe('checksum', () => {
  const Checksum = rewire(path.resolve(__dirname, 'checksum'))

  describe('sha256', () => {
    let createHash
    let hash
    let hashed
    let start
    let end
    let sha256

    beforeEach(() => {
      hash = {
        update: sinon.stub(),
        digest: sinon.stub()
      }
      hash.update.returns(hash)
      createHash = sinon.stub().returns(hash)

      Checksum.__set__('createHash', createHash)

      sha256 = Checksum.__get__('sha256')
      start = 'hello'
      end = 'goodbye'

      hash.digest.returns(end)
      hashed = sha256(start)
    })

    it('creates a sha256 hash', () => {
      expect(createHash).to.have.been.calledOnce()
      expect(createHash).to.have.been.calledWith('sha256')
    })

    it('updates the hash with the supplied data', () => {
      expect(hash.update).to.have.been.calledOnce()
      expect(hash.update).to.have.been.calledWith(start)
    })

    it('returns a digest of the hash', () => {
      expect(hash.digest).to.have.been.calledOnce()
      expect(hashed).to.be.eql(end)
    })
  })

  describe('xor', () => {
    let bufA
    let bufB
    let xorBuf
    let xor

    beforeEach(() => {
      xor = Checksum.__get__('xor')

      bufA = Buffer.from([0x0, 0x1, 0x2])
      bufB = Buffer.from([0x1, 0x2, 0x3, 0x4])
      xorBuf = xor(bufA, bufB)
    })

    it('returns a buffer of the length of the larger buffer', () => {
      expect(xorBuf.length).to.be.eql(4)
    })

    it('xors each byte of each buffer', () => {
      expect(xorBuf[0]).to.be.eql(1)
      expect(xorBuf[1]).to.be.eql(3)
      expect(xorBuf[2]).to.be.eql(1)
      expect(xorBuf[3]).to.be.eql(4)
    })
  })

  describe('Checksum', () => {
    let sha256Stub
    let shaReset
    let xorStub
    let xorReset
    let xored
    let chk

    beforeEach(() => {
      sha256Stub = sinon.stub()

      shaReset = Checksum.__set__('sha256', sha256Stub)

      xored = Buffer.from('hello world')
      xorStub = sinon.stub().returns(xored)

      xorReset = Checksum.__set__('xor', xorStub)

      chk = new Checksum()
    })

    afterEach(() => {
      shaReset()
      xorReset()
    })

    describe('create', () => {
      it('returns an object', () => {
        expect(chk).to.be.an('object')
      })

      it('initializes the sum', () => {
        expect(chk).to.have.property('sum')
        expect(chk.sum).to.be.instanceOf(Buffer)
        expect(chk.sum).to.have.length(32)
      })

      it('provides a check function', () => {
        expect(chk).to.have.property('check')
        expect(chk.check).to.be.a('function')
      })

      it('provides a process function', () => {
        expect(chk).to.have.property('process')
        expect(chk.process).to.be.a('function')
      })
    })

    describe('process', () => {
      let processed
      let added
      let addedHashed

      beforeEach(() => {
        added = 'shalala'
        addedHashed = 'spartacus'
        sha256Stub.withArgs(added).returns(addedHashed)
        processed = chk.process(added)
      })

      it('returns the checksum object', () => {
        expect(processed).to.be.equal(chk)
      })

      it('updates the checksum', () => {
        expect(sha256Stub).to.have.been.calledOnce()
        expect(sha256Stub).to.have.been.calledWith(added)
        expect(xorStub).to.have.been.calledOnce()
        expect(xorStub).to.have.been.calledWith(Buffer.alloc(32), addedHashed)
        expect(chk.sum).to.be.eql(xored)
      })
    })

    describe('check', () => {
      beforeEach(() => {
        chk.sum = Buffer.from('glarp')
      })

      it('matches sums that match', () => {
        expect(chk.check(Buffer.from('glarp'))).to.be.true()
      })

      it('does not match sums that do not match', () => {
        expect(chk.check(Buffer.from('glorp'))).to.be.false()
      })
    })
  })
})

describe('checksum e2e', () => {
  const Checksum = require('./checksum')
  let mysum

  beforeEach(() => {
    mysum = new Checksum()
  })

  it('matches a zero checksum', () => {
    expect(mysum.check(Buffer.alloc(32))).to.be.true()
  })

  it('does not match when processing another item', () => {
    expect(mysum.process('hello').check(Buffer.alloc(32))).to.be.false()
  })

  it('matches when processing the same item twice', () => {
    expect(mysum.process('hello').process('hello').check(Buffer.alloc(32))).to.be.true()
  })

  it('matches two separate checksums', () => {
    expect(mysum.process('hello').check((new Checksum()).process('hello').sum)).to.be.true()
  })

  it('matches when processing multiple items', () => {
    expect(mysum.process('hello').process('goodbye').check((new Checksum()).process('hello').sum)).to.be.false()
    expect(mysum.check((new Checksum()).process('hello').process('goodbye').sum)).to.be.true()
    expect(mysum.process('hello').check((new Checksum()).process('goodbye').sum)).to.be.true()
  })
})
