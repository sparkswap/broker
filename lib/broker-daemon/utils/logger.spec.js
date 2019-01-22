const path = require('path');
const { expect, rewire, sinon } = require('test/test-helper');
const logger = rewire(path.resolve(__dirname, 'logger'));
describe('logger', () => {
    let winston;
    let format;
    let createLogger;
    let timestamp;
    let json;
    let colorize;
    let simple;
    let combine;
    let Console;
    let customFormat;
    let customLogger;
    beforeEach(() => {
        timestamp = sinon.stub();
        json = sinon.stub();
        colorize = sinon.stub();
        simple = sinon.stub();
        combine = sinon.stub();
        customFormat = sinon.stub();
        format = sinon.stub().returns(customFormat);
        Object.assign(format, {
            timestamp,
            json,
            colorize,
            simple,
            combine
        });
        customLogger = {
            add: sinon.stub()
        };
        createLogger = sinon.stub().returns(customLogger);
        Console = sinon.stub();
        winston = {
            transports: {
                Console
            },
            format,
            createLogger
        };
        logger.__set__('winston', winston);
    });
    it('creates a logger', () => {
        logger._createLogger();
        expect(createLogger).to.have.been.calledOnce();
    });
    it('adds a format to logs', () => {
        const customCombined = {};
        combine.returns(customCombined);
        const customTimestamp = {};
        timestamp.returns(customTimestamp);
        const customJson = {};
        json.returns(customJson);
        const customCustomFormat = {};
        customFormat.returns(customCustomFormat);
        logger._createLogger();
        expect(timestamp).to.have.been.called();
        expect(combine).to.have.been.calledWith(customCustomFormat, customTimestamp, customJson);
    });
    describe('filters sensitive data', () => {
        it('replaces sensitive data with a filtered key', () => {
            logger._createLogger();
            expect(format).to.have.been.calledOnce();
            expect(format).to.have.been.calledWith(sinon.match.func);
            const filter = format.args[0][0];
            const info = {
                hello: 'world',
                password: 'mypassword',
                recoverySeed: 'myseed'
            };
            expect(filter(info)).to.be.eql({
                hello: 'world',
                password: '***FILTERED***',
                recoverySeed: '***FILTERED***'
            });
            expect(info.password).to.be.eql('mypassword');
        });
    });
});
//# sourceMappingURL=logger.spec.js.map