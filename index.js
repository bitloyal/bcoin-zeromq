const zeromq = require('zeromq')

class ZeroMQ {
  static get id () {
    return 'zeromq'
  }

  static init (node) {
    const { mempool, chain, config } = node
    return new ZeroMQ({
      node, mempool, chain, config
    })
  }

  constructor ({ node, mempool, chain, config }) {
    Object.assign(this, {
      node, mempool, chain, config
    }, { sockets: {}, topics: {} }) 
    this.bindHandlers()
  }

  bindHandlers () {
    this._txHandler = this._txHandler.bind(this)
    this._blockHandler = this._blockHandler.bind(this)
  }

  open () { 
    const topics = Object.keys(ZeroMQ.TOPICS)
    const tasks = []

    Object.keys(ZeroMQ.TOPICS).forEach((topic) => {
      const address = this.config.get(ZeroMQ.TOPICS[topic])
      if (address) {
        if (!this.sockets[address]) {
          this.sockets[address] = zeromq.socket('pub')
          tasks.push(new Promise((resolve, reject) => {
            this.sockets[address].bind(address, (err) => {
              if (err) return reject(err)
              return resolve()
            })
          }))
        }
        this.topics[topic] = this.sockets[address]
      }
    })

    return Promise.all(tasks).then(() => {
      this.mempool.on('tx', this._txHandler)
      this.chain.on('block', this._blockHandler)
    })
  }

  close () {
    this.mempool.removeListener('tx', this._txHandler)
    this.chain.removeListener('block', this._blockHandler)

    const addresses = Object.keys(this.sockets)
    const tasks = []

    Object.keys(this.sockets).forEach((address) => {
      tasks.push(new Promise((resolve, reject) => {
        this.sockets[address].unbind(address, (err) => {
          if (err) return reject(err)
          return resolve()
        })
      }))
    })
    
    return Promise.all(tasks)
  }

  _txHandler (tx) {
    if (this.topics.pubHashTx)
      this.topics.pubHashTx.send(['hashtx', tx.rhash()])
    if (this.topics.pubRawTx)
      this.topics.pubRawTx.send(['rawtx', tx.toRaw()])
  }

  _blockHandler (block) {
    if (this.topics.pubHashBlock)
      this.topics.pubHashBlock.send(['hashblock', block.rhash()])
    if (this.topics.pubRawBlock)
      this.topics.pubRawBlock.send(['rawblock', block.toRaw()])
  } 
}

ZeroMQ.TOPICS = {
  pubHashTx: 'zmq-pub-hash-tx',
  pubHashBlock: 'zmq-pub-hash-block',
  pubRawTx: 'zmq-pub-raw-tx',
  pubRawBlock: 'zmq-pub-raw-block'
}

module.exports = ZeroMQ
