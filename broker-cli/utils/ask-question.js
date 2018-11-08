const readline = require('readline')

function suppressInput (message, char) {
  const input = char + ''

  switch (input) {
    case '\n': // New line (line feed)
    case '\r': // Carriage return
    case '\u0004': // unicode for 'end of transmission'
      process.stdin.pause()
      break
    default:
      process.stdout.clearLine()
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(message + ' ')
      break
  }
}

/**
 * Asks a question to a user through readline
 *
 * @param {String} message
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
        // I wonder if we still need this
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
