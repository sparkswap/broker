const path = require('path');
const { expect, rewire, sinon } = require('test/test-helper');
const { BlockOrderNotFoundError } = require('../../models/errors');
const getBlockOrder = rewire(path.resolve(__dirname, 'get-block-order'));
describe('getBlockOrder', () => {
    let PublicError;
    let GetBlockOrderResponse;
    let blockOrderWorker;
    let blockOrder;
    beforeEach(() => {
        PublicError = getBlockOrder.__get__('PublicError');
        GetBlockOrderResponse = sinon.stub();
        blockOrder = {
            serialize: sinon.stub()
        };
        blockOrderWorker = {
            getBlockOrder: sinon.stub().resolves(blockOrder)
        };
    });
    it('throws a Public Error if the block order is not found', () => {
        blockOrderWorker.getBlockOrder.rejects(new BlockOrderNotFoundError('fakeID', new Error('fake error')));
        const params = {
            blockOrderId: 'fakeID'
        };
        return expect(getBlockOrder({ params, blockOrderWorker }, { GetBlockOrderResponse })).to.eventually.be.rejectedWith(PublicError);
    });
    it('throws a non-public error if another error is encountered', () => {
        blockOrderWorker.getBlockOrder.rejects();
        const params = {
            blockOrderId: 'fakeID'
        };
        return expect(getBlockOrder({ params, blockOrderWorker }, { GetBlockOrderResponse })).to.eventually.be.rejectedWith(Error);
    });
    it('retrieves the block order by id', async () => {
        const params = {
            blockOrderId: 'fakeID'
        };
        await getBlockOrder({ params, blockOrderWorker }, { GetBlockOrderResponse });
        expect(blockOrderWorker.getBlockOrder).to.have.been.calledOnce();
        expect(blockOrderWorker.getBlockOrder).to.have.been.calledWith('fakeID');
    });
    it('serializes the block order', async () => {
        const params = {
            blockOrderId: 'fakeID'
        };
        const serialized = { my: 'object' };
        blockOrder.serialize.returns(serialized);
        const res = await getBlockOrder({ params, blockOrderWorker }, { GetBlockOrderResponse });
        expect(blockOrder.serialize).to.have.been.calledOnce();
        expect(res).to.be.eql(serialized);
    });
});
//# sourceMappingURL=get-block-order.spec.js.map