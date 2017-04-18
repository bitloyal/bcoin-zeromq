const assert = require('assert')
const zeromq = require('zeromq')

const consensus = require('bcoin/lib/protocol/consensus')
const FullNode = require('bcoin/lib/node/fullnode')
const WalletDB = require('bcoin/lib/wallet/plugin')

const ZeroMQ = require('.')

const ZMQ_ADDRESS = 'tcp://127.0.0.1:28332'

describe('ZeroMQ', () => {
  const node = new FullNode({
    db: 'memory',
    apiKey: 'foo',
    network: 'regtest',
    zmqPubRawTx: ZMQ_ADDRESS,
    zmqPubHashTx: ZMQ_ADDRESS,
    zmqPubRawBlock: ZMQ_ADDRESS,
    zmqPubHashBlock: ZMQ_ADDRESS
  })

  node.on('error', () => {})

  const chain = node.chain
  const walletdb = node.use(WalletDB)
  const zmq = node.use(ZeroMQ)
  const miner = node.miner
  const messages = {}

  let subscriber, wallet, block, tx

  it('should open chain and miner', async () => {
    miner.mempool = null
    consensus.COINBASE_MATURITY = 0
    await node.open()
  })

  it('should open walletdb', async () => {
    wallet = await walletdb.create()
    miner.addresses.length = 0
    miner.addAddress(wallet.getReceive())
  })

  it('should setup a zeromq subscriber', async () => {
    subscriber = zeromq.socket('sub')
    subscriber.connect(ZMQ_ADDRESS)
    subscriber.subscribe('rawblock')
    subscriber.subscribe('hashblock')
    subscriber.subscribe('rawtx')
    subscriber.subscribe('hashtx')
    subscriber.on('message', (topic, msg) => {
      messages[topic] = msg
    })
  })

  it('should mine a block', async () => {
    block = await miner.mineBlock()
    await chain.add(block)
    await walletdb.rescan()
  })

  it('should send a transaction', async () => {
    tx = await wallet.send({
      outputs: [{
        address: wallet.getReceive(),
        value: 25*1e8
      }]
    })
    await walletdb.rescan()
  })

  it('should check the messages were received by the subscriber', () => {
    assert(messages.hashblock.toString() === block.rhash())
    assert(messages.rawblock.toString() === block.toRaw().toString())
    assert(messages.hashtx.toString() === tx.rhash())
    assert(messages.rawtx.toString() === tx.toRaw().toString())
  })

  it('should cleanup', async () => {
    consensus.COINBASE_MATURITY = 100
    await node.close()
  })
})
