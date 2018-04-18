const [ command, ...data ] = process.argv.slice(2);
const payload = JSON.parse(data.join(''));

switch (command.toLowerCase()) {
  case 'wallet':
    return console.log(payload.address);
  case 'segwit':
    return console.log(payload.bip9_softforks.segwit.status);
}
