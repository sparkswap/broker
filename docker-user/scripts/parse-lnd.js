const [ command, ...data ] = process.argv.slice(2);

function parseWalletAddr(data) {
  const payload = JSON.parse(data.join(''));
  return payload.address;
}

switch (command.toLowerCase()) {
  case 'wallet':
    const walletAddr = parseWalletAddr(data);
    return console.log(walletAddr);
}
