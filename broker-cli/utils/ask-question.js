const readline = require('readline')

/**
 * Asks a question to a user through readline
 *
 * @param {string} message
 * @param {Object} options
 * @param {Object} [options.silent=false] - suppress typing for answer
 * @returns {Promise<string>} answer
 */
function askQuestion (message, { silent = false } = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  // We override the _writeToOutput method so that we can suppress the output
  // of a users input when `rl.silent` is set on the readline interface
  rl._writeToOutput = (str) => {
    if (rl.silent) {
      return rl.output.write('')
    }
    return rl.output.write(str)
  }

  return new Promise((resolve, reject) => {
    try {
      // Do not suppress the output for the question
      rl.silent = false
      rl.question(`${message} `, (answer) => {
        rl.history = rl.history.slice(1)
        rl.close()
        return resolve(answer)
      })
      rl.silent = silent
    } catch (e) {
      rl.close()
      return reject(e)
    }
  })
}

module.exports = askQuestion
