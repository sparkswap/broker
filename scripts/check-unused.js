const madge = require('madge')
require('colors')

/**
 * Regexp string to exclude spec files from orphans
 * @type {string}
 * @constant
 */
const REGEXP_TO_EXCLUDE = '.spec.js$'

/**
 * directory to check for orphans
 * @type {string}
 * @constant
 */
const DIRECTORY = 'broker-daemon/'

/**
 * Entrypoint into the app which will always be orphaned
 * @type {string}
 * @constant
 */
const ENTRYPOINT = 'bin/sparkswapd.js'

const config = {
  excludeRegExp: [ REGEXP_TO_EXCLUDE ]
}

madge(DIRECTORY, config).then((res) => {
  const orphans = res.orphans()
  if (orphans.length === 1 && orphans[0] === ENTRYPOINT) {
    return
  } else {
    console.error(`There are modules with no dependencies: ${orphans}`.red)
    process.exit(1)
  }
})
