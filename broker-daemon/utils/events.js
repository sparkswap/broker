const BlockOrderWorkerEvents = Object.freeze({
  CREATED: 'block-order:created',
  CANCEL: 'block-order:cancel',
  COMPLETE: 'block-order:complete',
  COMPLETED: 'block-order:completed',
  FAIL: 'block-order:fail',
  REJECTED: 'block-order:rejected'
})

module.exports = {
  BlockOrderWorkerEvents
}
