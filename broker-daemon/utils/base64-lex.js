/**
 * Table that defines the conversion from a Base64 encoded character to a
 * character that is URL safe and preserves lexicographic ordering as defined
 * by the ASCII character code.
 *
 * @type {string}
 * @constant
 */
const ENCODE_TABLE = {
  'A': '-',
  'B': '0',
  'C': '1',
  'D': '2',
  'E': '3',
  'F': '4',
  'G': '5',
  'H': '6',
  'I': '7',
  'J': '8',
  'K': '9',
  'L': 'A',
  'M': 'B',
  'N': 'C',
  'O': 'D',
  'P': 'E',
  'Q': 'F',
  'R': 'G',
  'S': 'H',
  'T': 'I',
  'U': 'J',
  'V': 'K',
  'W': 'L',
  'X': 'M',
  'Y': 'N',
  'Z': 'O',
  'a': 'P',
  'b': 'Q',
  'c': 'R',
  'd': 'S',
  'e': 'T',
  'f': 'U',
  'g': 'V',
  'h': 'W',
  'i': 'X',
  'j': 'Y',
  'k': 'Z',
  'l': '_',
  'm': 'a',
  'n': 'b',
  'o': 'c',
  'p': 'd',
  'q': 'e',
  'r': 'f',
  's': 'g',
  't': 'h',
  'u': 'i',
  'v': 'j',
  'w': 'k',
  'x': 'l',
  'y': 'm',
  'z': 'n',
  '0': 'o',
  '1': 'p',
  '2': 'q',
  '3': 'r',
  '4': 's',
  '5': 't',
  '6': 'u',
  '7': 'v',
  '8': 'w',
  '9': 'x',
  '+': 'y',
  '/': 'z'
}

/**
 * Encodes data from a buffer to a variant of Base64 encoding that preserves
 * lexicographic order in a URL-safe string.
 *
 * @param {Buffer} buffer - buffer with data to encode lexicographically
 * @returns {string}
 */
function encodeBase64Lex (buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error(`Invalid type ${typeof buffer}. Expected type Buffer.`)
  }

  const base64Encoded = buffer.toString('base64')
  // Padding is removed since the encoded data can be reconstructed when either the data is
  // the same size or the encoded data is never concatenated
  const noPadding = base64Encoded.replace(/=/g, '')

  let encoded = ''
  for (let i = 0; i < noPadding.length; i++) {
    encoded += ENCODE_TABLE[noPadding[i]]
  }

  return encoded
}

module.exports = encodeBase64Lex
