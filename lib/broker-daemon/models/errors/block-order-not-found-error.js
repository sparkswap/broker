class BlockOrderNotFoundError extends Error {
    constructor(id, err) {
        super(`Block Order with ID ${id} was not found.`, err);
        this.name = this.constructor.name;
        this.notFound = true;
        if (err)
            this.stack = err.stack;
    }
}
module.exports = BlockOrderNotFoundError;
//# sourceMappingURL=block-order-not-found-error.js.map