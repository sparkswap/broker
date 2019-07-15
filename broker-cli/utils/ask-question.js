const readline = require('readline')

/**
 * @constant
 * @type {string}
 * @default
 */
const NEW_LINE = '\n'

/**
 * @constant
 * @type {string}
 * @default
 */
const CARRIAGE_RETURN = '\r'

/**
 * @constant
 * @type {string}
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
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(`${message} `)
      break
  }
}

/**
 * Asks a question to a user through readline
 *
 * @param {string} message
 * @param {object} options
 * @param {object} [options.silent=false] - suppress typing for answer
 * @returns {Promise<string>} answer
 */
function askQuestion (message, { silent = false } = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 0
  })

  const dataHandler = (char) => suppressInput(message, char)

  // If `silent` is set to true, we open stdin and suppress all output until we
  // receive an 'end of data' command such as enter/return
  if (silent) {
    process.stdin.on('data', dataHandler)
  }

  return new Promise((resolve, reject) => {
    try {
      rl.question(`${message} `, (answer) => {
        // Remove the data listener that we had added so that we are not adding
        // multiple listeners on stdin which causes weird side-effects when using
        // `askQuestion` multiple times in the same command
        process.stdin.removeListener('data', dataHandler)

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
