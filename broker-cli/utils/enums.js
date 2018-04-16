const timeInForceParams = {
	PO: 'post-only',
	FOK: 'fill-or-kill',
	IOC: 'immediate-or-cancel',
	GTC: 'good-til-cancel'
};

const ORDER_TYPES = {
	BID: 'BID',
	SELL: 'SELL',
};

module.exports = {
	timeInForceParams,
	ORDER_TYPES,
};
