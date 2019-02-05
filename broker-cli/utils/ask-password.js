const readline = require('readline')

/**
 * Prompts the user for a password and asks them to confirm it
 * @returns {Object} res
 * @returns {string} res.password
 * @returns {string} res.confirm
 */
function askPassword () {
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
      // Do not suppress the output for the first question
      rl.silent = false

      rl.question('Please enter a password: ', (password) => {
        // Add a new line before the second question
        process.stdout.write('\n')
        // Do not suppress the output for the second question
        rl.silent = false

        rl.question('Please confirm password: ', (confirm) => {
          // Add a new line after the second question
          process.stdout.write('\n')

          // Remove both entries of the password from readline history
          rl.history = rl.history.slice(1)
          rl.history = rl.history.slice(1)

          // Close the interface
          rl.close()

          return resolve({ password, confirm })
        })

        // Suppress output when the user confirms their password
        rl.silent = true
      })

      // Suppress output when the user enters their password
      rl.silent = true
    } catch (e) {
      rl.close()
      return reject(e)
    }
  })
}

module.exports = askPassword
