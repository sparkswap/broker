const [ command, ...data ] = process.argv.slice(2)
const payload = JSON.parse(data.join(''))

switch (command.toLowerCase()) {
  case 'wallet':
    console.log(payload.address)
    break
  case 'segwit':
    console.log(payload.bip9_softforks.segwit.status)
    break
}
