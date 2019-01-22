const { sinon, expect } = require('test/test-helper');
const eachRecord = require('./each-record');
describe('eachRecord', () => {
    let store;
    let stream;
    let fn;
    let params;
    beforeEach(() => {
        stream = {
            on: sinon.stub()
        };
        store = {
            createReadStream: sinon.stub().returns(stream)
        };
        fn = sinon.stub();
        params = {};
    });
    it('returns a promise', () => {
        expect(eachRecord(store, fn, params)).to.be.a('promise');
    });
    it('creates a readstream from the store', () => {
        eachRecord(store, fn, params);
        expect(store.createReadStream).to.have.been.calledOnce();
        expect(store.createReadStream).to.have.been.calledWith(sinon.match(params));
    });
    it('passes through params to the readstream', () => {
        params = {
            reverse: true
        };
        eachRecord(store, fn, params);
        expect(store.createReadStream).to.have.been.calledWith(sinon.match(params));
    });
    it('sets an error handler', () => {
        eachRecord(store, fn, params);
        expect(stream.on).to.have.been.calledWith('error', sinon.match.func);
    });
    it('sets an end handler', () => {
        eachRecord(store, fn, params);
        expect(stream.on).to.have.been.calledWith('end', sinon.match.func);
    });
    it('sets an data handler', () => {
        eachRecord(store, fn, params);
        expect(stream.on).to.have.been.calledWith('data', sinon.match.func);
    });
    it('rejects on error', async () => {
        stream.on.withArgs('error').callsArgWithAsync(1, new Error('fake error'));
        return expect(eachRecord(store, fn, params)).to.be.rejectedWith(Error);
    });
    it('resolves on end', async () => {
        stream.on.withArgs('end').callsArgAsync(1);
        return expect(await eachRecord(store, fn, params)).to.be.eql();
    });
    it('processes records through the provided fn', async () => {
        const fakeRecord = { key: 'mykey', value: 'myvalue' };
        const fakeProcessed = { hello: 'world' };
        fn.returns(fakeProcessed);
        stream.on.withArgs('data').callsArgWithAsync(1, fakeRecord);
        stream.on.withArgs('end').callsArgAsync(1);
        await eachRecord(store, fn, params);
        expect(fn).to.have.been.calledOnce();
        expect(fn).to.have.been.calledWith(sinon.match(fakeRecord.key), sinon.match(fakeRecord.value));
    });
});
//# sourceMappingURL=each-record.spec.js.map