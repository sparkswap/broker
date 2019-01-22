const path = require('path');
const { expect, sinon, rewire } = require('test/test-helper');
const OrderbookIndex = rewire(path.resolve(__dirname, 'orderbook-index'));
describe('OrderbookIndex', () => {
    let baseStore;
    let eventStore;
    let marketName;
    let migrateStore;
    beforeEach(() => {
        baseStore = {
            sublevel: sinon.stub()
        };
        eventStore = {
            pre: sinon.stub()
        };
        marketName = 'BTC/LTC';
        migrateStore = sinon.stub().resolves();
        OrderbookIndex.__set__('migrateStore', migrateStore);
    });
    describe('constructor', () => {
        let orderbookIndex;
        let fakeStore;
        beforeEach(() => {
            fakeStore = 'mystore';
            baseStore.sublevel.returns(fakeStore);
            orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName);
        });
        it('creates a store for the index', () => {
            expect(baseStore.sublevel).to.have.been.calledOnce();
            expect(baseStore.sublevel).to.have.been.calledWith('orderbook');
            expect(orderbookIndex.store).to.be.eql(fakeStore);
        });
        it('assigns the market name', () => {
            expect(orderbookIndex.marketName).to.be.eql(marketName);
        });
        it('assigns the event store', () => {
            expect(orderbookIndex.eventStore).to.be.eql(eventStore);
        });
    });
    describe('ensureIndex', () => {
        let orderbookIndex;
        beforeEach(async () => {
            orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName);
            orderbookIndex._clearIndex = sinon.stub().resolves();
            orderbookIndex._rebuildIndex = sinon.stub().resolves();
            orderbookIndex._addIndexHook = sinon.stub();
            await orderbookIndex.ensureIndex();
        });
        it('clears the index', () => {
            expect(orderbookIndex._clearIndex).to.have.been.calledOnce();
        });
        it('rebuilds the index', () => {
            expect(orderbookIndex._rebuildIndex).to.have.been.calledOnce();
        });
        it('adds a hook for new events', () => {
            expect(orderbookIndex._addIndexHook).to.have.been.calledOnce();
        });
    });
    describe('_addToIndexOperation', () => {
        let MarketEvent;
        let MarketEventOrder;
        let orderKey;
        let orderValue;
        let event;
        let eventKey;
        let eventValue;
        let orderbookIndex;
        beforeEach(() => {
            MarketEvent = {
                fromStorage: sinon.stub(),
                TYPES: {
                    PLACED: 'PLACED',
                    CANCELLED: 'CANCELLED',
                    FILLED: 'FILLED'
                }
            };
            MarketEventOrder = {
                fromEvent: sinon.stub()
            };
            OrderbookIndex.__set__('MarketEvent', MarketEvent);
            OrderbookIndex.__set__('MarketEventOrder', MarketEventOrder);
            orderKey = 'mykey';
            orderValue = 'myvalue';
            eventKey = 'yourkey';
            eventValue = 'yourvalue';
            event = {
                eventType: MarketEvent.TYPES.PLACED
            };
            MarketEvent.fromStorage.returns(event);
            MarketEventOrder.fromEvent.returns({
                key: orderKey,
                value: orderValue
            });
            orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName);
        });
        it('inflates the market event', () => {
            orderbookIndex._addToIndexOperation(eventKey, eventValue);
            expect(MarketEvent.fromStorage).to.have.been.calledOnce();
            expect(MarketEvent.fromStorage).to.have.been.calledWith(eventKey, eventValue);
        });
        it('creates an order from the market event', () => {
            orderbookIndex._addToIndexOperation(eventKey, eventValue);
            expect(MarketEventOrder.fromEvent).to.have.been.calledOnce();
            expect(MarketEventOrder.fromEvent).to.have.been.calledWith(event, orderbookIndex.marketName);
        });
        it('creates orders when they are PLACED', () => {
            const addOp = orderbookIndex._addToIndexOperation(eventKey, eventValue);
            expect(addOp).to.be.eql({ type: 'put', key: orderKey, value: orderValue, prefix: orderbookIndex.store });
        });
        it('removes orders when they are CANCELLED', () => {
            event.eventType = MarketEvent.TYPES.CANCELLED;
            const addOp = orderbookIndex._addToIndexOperation(eventKey, eventValue);
            expect(addOp).to.be.eql({ type: 'del', key: orderKey, prefix: orderbookIndex.store });
        });
        it('removes orders when they are FILLED', () => {
            event.eventType = MarketEvent.TYPES.FILLED;
            const addOp = orderbookIndex._addToIndexOperation(eventKey, eventValue);
            expect(addOp).to.be.eql({ type: 'del', key: orderKey, prefix: orderbookIndex.store });
        });
    });
    describe('_clearIndex', () => {
        let orderbookIndex;
        beforeEach(() => {
            orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName);
            orderbookIndex._removeHook = sinon.stub();
        });
        it('removes any previous hooks', async () => {
            await orderbookIndex._clearIndex();
            expect(orderbookIndex._removeHook).to.have.been.calledOnce();
        });
        it('deletes the store through a self migration', async () => {
            await orderbookIndex._clearIndex();
            expect(migrateStore).to.have.been.calledOnce();
            expect(migrateStore).to.have.been.calledWith(orderbookIndex.store, orderbookIndex.store);
        });
        it('deletes every key in the store', async () => {
            await orderbookIndex._clearIndex();
            const migrator = migrateStore.args[0][2];
            expect(migrator).to.be.a('function');
            expect(migrator('mykey')).to.be.eql({ type: 'del', key: 'mykey' });
        });
    });
    describe('_rebuildIndex', () => {
        let orderbookIndex;
        beforeEach(() => {
            orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName);
        });
        it('rebuilds the store through from events', async () => {
            const fakeBound = 'fakefunc';
            orderbookIndex._addToIndexOperation.bind = sinon.stub().returns(fakeBound);
            await orderbookIndex._rebuildIndex();
            expect(migrateStore).to.have.been.calledOnce();
            expect(migrateStore).to.have.been.calledWith(eventStore, orderbookIndex.store, fakeBound);
        });
    });
    describe('_addIndexHook', () => {
        let orderbookIndex;
        let preHook;
        let add;
        beforeEach(() => {
            orderbookIndex = new OrderbookIndex(baseStore, eventStore, marketName);
            orderbookIndex._addIndexHook();
            preHook = eventStore.pre.args[0] ? eventStore.pre.args[0][0] : undefined;
            add = sinon.stub();
        });
        it('monitors the event store', () => {
            expect(eventStore.pre).to.have.been.calledOnce();
            expect(eventStore.pre).to.have.been.calledWithMatch(sinon.match.func);
        });
        it('ignores non-put operations on the event store', () => {
            const eventKey = 'yourkey';
            preHook({
                type: 'del',
                key: eventKey
            }, add);
            expect(add).to.not.have.been.called();
        });
        it('adds the index op when put operations happen on the event store', () => {
            const eventKey = 'yourkey';
            const eventValue = 'myvalue';
            const fakeOp = 'myop';
            orderbookIndex._addToIndexOperation = sinon.stub().returns(fakeOp);
            preHook({
                type: 'put',
                key: eventKey,
                value: eventValue
            }, add);
            expect(add).to.have.been.calledOnce();
            expect(orderbookIndex._addToIndexOperation).to.have.been.calledOnce();
            expect(orderbookIndex._addToIndexOperation).to.have.been.calledWith(eventKey, eventValue);
            expect(add).to.have.been.calledWith(fakeOp);
        });
    });
});
//# sourceMappingURL=orderbook-index.spec.js.map