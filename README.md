# bcoin-zeromq
### A zeromq plugin for bcoin

## Motivation

Some bitcoin applications (such as [bitcore-node](https://github.com/bitpay/bitcore-node)) currently hook to bitcoin core's zeromq sockets to fetch incoming blocks and transactions. This plugin aims to bring such functionality to bcoin.

## Usage 

Currently bcoin provides no funcionality to install and load global plugins, so in order to use this one you'll need to run it from a dedicated project directory:

```shell
mkdir mynode
cd mynode && npm init
npm install --save bcoin bcoin-zeromq
```

Then just create `index.js` with the following contents to load the node:

```js
const FullNode = require('bcoin/lib/node/fullnode')
const ZeroMQ = require('bcoin-zeromq')

const ZMQ_ADDRESS = 'tcp://127.0.0.1:28332'

const node = new FullNode({
  db: 'memory',
  zmqPubRawTx: ZMQ_ADDRESS,
  zmqPubHashTx: ZMQ_ADDRESS,
  zmqPubRawBlock: ZMQ_ADDRESS,
  zmqPubHashBlock: ZMQ_ADDRESS
})

node.use(ZeroMQ)

node.open()
  .then(() => node.connect())
  .then(() => node.startSync())
```

A subscriber may then start receiving block and transaction data. Here's an example using [zeromq](https://www.npmjs.com/package/zeromq):

```js
const zeromq = require('zeromq')

const ZMQ_ADDRESS = 'tcp://127.0.0.1:28332'
const ZMQ_TOPIC = 'hashblock'

const subscriber = zeromq.socket('sub')

subscriber.connect(ZMQ_ADDRESS)
subscriber.subscribe(ZMQ_TOPIC)

subscriber.on('message', (topic, msg) => {
  console.log('%s %s', topic, msg)
})
```
