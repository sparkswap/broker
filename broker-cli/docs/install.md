Installation & Usage
====================

## Install Node.js and npm
  1. [Using the installer](https://nodejs.org/en/download/) (easiest)
  2. Using NVM
    1. Install nvm - `brew install nvm` or your favorite package manager
    2. Install the current LTS node and npm version - `nvm install --lts --latest-npm`

## Install `sparkswap`
Run `npm install -g https://github.com/sparkswap/broker-cli.git`

This installs `sparkswap` globally, so you may need to give it additional permissions.

## Configure the client
You can set your default configuration by moving the [sample configuration](./sample-.sparkswap.js) to your home directory and renaming it `.sparkswap.js`.

You can do this in bash by running:
```
cp -n "$(dirname $(which sparkswap))/../lib/node_modules/broker-cli/sample-.sparkswap.js" ~/.sparkswap.js
```

Or if you are already in the `broker-cli` directory,
```
cp -n ./sample-.sparkswap.js ~/.sparkswap.js
```

Once installed, in the correct location, you can edit the file to include your custom configuration.

Currently, supported custom configuration includes:
- RPC address of the SparkSwap Broker Daemon you are controlling

You can view default configuration for `sparkswap` in [`./.sparkswap.default.js`](./.sparkswap.default.js).

## Run commands
Run `sparkswap --help` to see a list of available commands.

![sparkswap help](./images/sparkswap_--help.gif?raw=true)