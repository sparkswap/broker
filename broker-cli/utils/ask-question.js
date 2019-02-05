const readline = require('readline')

/**
 * @constant
 * @type {String}
 * @default
 */
const NEW_LINE = '\n'

/**
 * @constant
 * @type {String}
 * @default
 */
const CARRIAGE_RETURN = '\r'

/**
 * @constant
 * @type {String}
 * @default
 */
const END_OF_TRANSMISSION = '\u0004'

/**
 * Helper function for stdin that suppresses a user's input from being displayed
 * through stdout
 *
 * @param {string} message
 * @param {Buffer} char
 */
function suppressInput (message, char) {
  const input = char.toString('utf8')

  switch (input) {
    case NEW_LINE:
    case CARRIAGE_RETURN:
    case END_OF_TRANSMISSION:
      process.stdin.pause()
      break
    default:
      process.stdout.clearLine()
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(`${message} `)
      break
  }
}

/**
 * Asks a question to a user through readline
 *
 * @param {string} message
 * @param {Object} options
 * @param {Object} [options.silent=false] - suppress typing for answer
 * @return {Promise<string>} answer
 */
function askQuestion (message, { silent = false } = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  // If `silent` is set to true, we open stdin and suppress all output until we
  // receive an 'end of data' command such as enter/return
  if (silent) {
    process.stdin.on('data', char => suppressInput(message, char))
  }

  return new Promise((resolve, reject) => {
    try {
      rl.question(`${message} `, (answer) => {
        rl.history = rl.history.slice(1)
        rl.close()
        return resolve(answer)
      })
    } catch (e) {
      rl.close()
      return reject(e)
    }
  })
}

module.exports = askQuestion
