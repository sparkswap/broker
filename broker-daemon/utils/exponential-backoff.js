async function exponentialBackoff (callFunction, attempts, delay, callback) {
  try {
    var res = await callFunction()
  } catch (e) {
    console.log(e)
  }

  if (res) {
    callback(res)
  } else {
    if (attempts > 0) {
      setTimeout(function () {
        exponentialBackoff(callFunction, --attempts, delay * 2, callback)
      }, delay)
    } else {
      console.log(`${callFunction} failed`)
    }
  }
}

module.exports = exponentialBackoff
