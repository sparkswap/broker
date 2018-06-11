const readline = require('readline')

/**
 * Asks a question to a user through readline
 *
 * @param {String} message
 * @return {Promise<string>} answer
 */
function askQuestion (message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve, reject) => {
    try {
      rl.question(`${message} `, (answer) => {
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
