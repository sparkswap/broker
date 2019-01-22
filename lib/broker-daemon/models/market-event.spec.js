const path = require('path');
const { expect, sinon, rewire } = require('test/test-helper');
const MarketEvent = rewire(path.resolve(__dirname, 'market-event'));
describe('MarketEvent', () => {
    describe('::TYPES', () => {
        it('defines 3 market event types', () => {
            expect(MarketEvent).to.have.property('TYPES');
            expect(Object.keys(MarketEvent.TYPES)).to.have.lengthOf(3);
        });
        it('freezes market event types', () => {
            expect(MarketEvent.TYPES).to.be.frozen();
        });
        it('defines a PLACED event', () => {
            expect(MarketEvent.TYPES).to.have.property('PLACED');
            expect(MarketEvent.TYPES.PLACED).to.be.eql('PLACED');
        });
        it('defines a FILLED event', () => {
            expect(MarketEvent.TYPES).to.have.property('FILLED');
            expect(MarketEvent.TYPES.FILLED).to.be.eql('FILLED');
        });
        it('defines a CANCELLED event', () => {
            expect(MarketEvent.TYPES).to.have.property('CANCELLED');
            expect(MarketEvent.TYPES.CANCELLED).to.be.eql('CANCELLED');
        });
    });
    describe('::sep', () => {
        it('defines a separator', () => {
            expect(MarketEvent).to.have.property('sep');
            expect(MarketEvent.sep).to.be.equal(':');
        });
    });
    describe('::fromStorage', () => {
        it('defines a static method for creating events from storage', () => {
            expect(MarketEvent).itself.to.respondTo('fromStorage');
        });
        it('creates events from a key and value', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const sequence = '0';
            const key = `${timestamp}:${sequence}:${eventId}`;
            const value = JSON.stringify({
                eventType,
                orderId
            });
            const event = MarketEvent.fromStorage(key, value);
            expect(event).to.have.property('eventId');
            expect(event.eventId).to.be.eql(eventId);
            expect(event).to.have.property('orderId');
            expect(event.orderId).to.be.eql(orderId);
            expect(event).to.have.property('timestamp');
            expect(event.timestamp).to.be.eql(timestamp);
            expect(event).to.have.property('eventType');
            expect(event.eventType).to.be.eql(eventType);
            expect(event).to.have.property('sequence');
            expect(event.sequence).to.be.eql(sequence);
        });
        it('creates events with mixed payloads from a key and value', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const payload = {
                my: 'props',
                are: 1
            };
            const key = `${timestamp}:${eventId}`;
            const value = JSON.stringify(Object.assign({ eventType,
                orderId }, payload));
            const event = MarketEvent.fromStorage(key, value);
            expect(event).to.have.property('payload');
            expect(payload).to.be.eql(payload);
        });
    });
    describe('new', () => {
        it('creates a market event', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const event = new MarketEvent({ eventId, orderId, timestamp, eventType });
            expect(event).to.have.property('eventId');
            expect(event.eventId).to.be.eql(eventId);
            expect(event).to.have.property('orderId');
            expect(event.orderId).to.be.eql(orderId);
            expect(event).to.have.property('timestamp');
            expect(event.timestamp).to.be.eql(timestamp);
            expect(event).to.have.property('eventType');
            expect(event.eventType).to.be.eql(eventType);
        });
        it('does not create events with wrong event type', () => {
            const fakeEventType = 'GIZMOED';
            expect(() => new MarketEvent({ eventType: fakeEventType })).to.throw();
        });
        it('creates events with a mixed payload', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const payload = {
                my: 'props',
                are: 1
            };
            const eventProps = Object.assign({ eventId,
                orderId,
                timestamp,
                eventType }, payload);
            const event = new MarketEvent(eventProps);
            expect(event).to.have.property('payload');
            expect(payload).to.be.eql(payload);
        });
    });
    describe('get key', () => {
        it('defines a key getter for sorting and identification', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const sequence = '0';
            const event = new MarketEvent({ eventId, orderId, timestamp, eventType, sequence });
            expect(event).to.have.property('key');
            expect(event.key).to.be.eql(`${timestamp}:${sequence}:${eventId}`);
        });
    });
    describe('get value', () => {
        it('defines a value getter for storage', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const event = new MarketEvent({ eventId, orderId, timestamp, eventType });
            expect(event).to.have.property('value');
            expect(event.value).to.be.eql(JSON.stringify({
                orderId,
                eventType
            }));
        });
        it('includes mixed payloads in values for storage', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const payload = {
                my: 'props',
                are: 1
            };
            const eventProps = Object.assign({ eventId,
                orderId,
                timestamp,
                eventType }, payload);
            const event = new MarketEvent(eventProps);
            expect(event.value).to.be.a('string');
            const parsedValue = JSON.parse(event.value);
            expect(parsedValue).to.have.property('my');
            expect(parsedValue.my).to.be.eql(payload.my);
            expect(parsedValue).to.have.property('are');
            expect(parsedValue.are).to.be.eql(payload.are);
        });
    });
    describe('#serialize', () => {
        it('defines a serialize method', () => {
            expect(MarketEvent).to.respondTo('serialize');
        });
        it('serializes market events', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const sequence = '0';
            const event = new MarketEvent({ eventId, orderId, timestamp, eventType, sequence });
            const serialized = event.serialize();
            expect(serialized).to.be.eql({
                eventId,
                orderId,
                timestamp,
                eventType,
                sequence
            });
        });
        it('serializes mixed payloads', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const payload = {
                my: 'props',
                are: 1
            };
            const eventProps = Object.assign({ eventId,
                orderId,
                timestamp,
                eventType }, payload);
            const event = new MarketEvent(eventProps);
            const serialized = event.serialize();
            expect(serialized).to.have.property('my');
            expect(serialized.my).to.be.eql(payload.my);
            expect(serialized).to.have.property('are');
            expect(serialized.are).to.be.eql(payload.are);
        });
    });
    describe('::rangeFromTimestamp', () => {
        it('creates a leveldb range query from a given startTime', () => {
            const startTime = 'starttime';
            const range = MarketEvent.rangeFromTimestamp(startTime);
            expect(range).to.have.property('gte');
            expect(range.gte).to.include(startTime);
        });
    });
    describe('price', () => {
        it('returns a price given base and counter symbols', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const payload = { baseAmount: '1000', counterAmount: '100000', fillAmount: '100' };
            const event = new MarketEvent(Object.assign({ eventId, orderId, timestamp, eventType }, payload));
            expect(event.price('BTC', 'LTC')).to.be.eql('100.0000000000000000');
        });
    });
    describe('amount', () => {
        it('returns an amount given base symbol', () => {
            const eventId = 'myid';
            const orderId = 'myorder';
            const timestamp = '123456677';
            const eventType = MarketEvent.TYPES.PLACED;
            const payload = { baseAmount: '1000', counterAmount: '100000', fillAmount: '1000' };
            const event = new MarketEvent(Object.assign({ eventId, orderId, timestamp, eventType }, payload));
            expect(event.amount('BTC')).to.be.eql('0.0000100000000000');
        });
    });
    describe('tradeInfo', () => {
        let revert;
        let nanoTypeStub;
        let eventId;
        let orderId;
        let timestamp;
        let eventType;
        let payload;
        let event;
        let nanoDatetime;
        beforeEach(() => {
            eventId = 'myid';
            orderId = 'myorder';
            timestamp = '1537526431834233900';
            eventType = MarketEvent.TYPES.PLACED;
            payload = { baseAmount: '1000', counterAmount: '100000', fillAmount: '1000', side: 'BID' };
            nanoDatetime = ['1537526431', '834233900'];
            nanoTypeStub = sinon.stub().returns(nanoDatetime);
            revert = MarketEvent.__set__('timestampToNano', nanoTypeStub);
        });
        beforeEach(() => {
            event = new MarketEvent(Object.assign({ eventId, orderId, timestamp, eventType }, payload));
        });
        afterEach(() => {
            revert();
        });
        it('converts a timestamp to a nano timestamp', () => {
            event.tradeInfo('BTC/LTC');
            expect(nanoTypeStub).to.have.been.calledWith(timestamp);
        });
        it('returns info about a trade given a marketName', () => {
            expect(event.tradeInfo('BTC/LTC')).to.be.eql({
                amount: '0.0000100000000000',
                timestamp: timestamp,
                datetime: '2018-09-21T10:40:31.8342339Z',
                id: 'myid',
                order: 'myorder',
                price: '100.0000000000000000',
                side: 'buy',
                market: 'BTC/LTC',
                type: 'limit'
            });
        });
    });
});
//# sourceMappingURL=market-event.spec.js.map