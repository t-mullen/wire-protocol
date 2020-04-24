var test = require('tape')
var WireProtocol = require('../src/browser-nostream')
var Buffer = require('safe-buffer').Buffer

test('basic', function (t) {
  t.plan(3)

  var protocol = [{
    name: 'header', // name of message
    type: 'object',
    first: true,
    length: 9, // length in bytes)
    done: (data, next) => {
      // tell the parser the next expected message
      next('body', 11)
    }
  }, {
    name: 'body',
    type: 'string',
    done: (_, next) => {
      next('endM', 0)
    }
  }, {
    name: 'endM'
  }]

  var wire1 = new WireProtocol(protocol)
  var wire2 = new WireProtocol(protocol)

  wire1.on('data', (chunk) => { wire2.write(chunk) })
  wire2.on('data', (chunk) => { wire1.write(chunk) })

  wire2.on('header', function (data) {
    t.equals(data, 'NOTDONE')
  })
  wire2.on('body', function (data) {
    t.equals(data, 'hello world')
  })
  wire2.on('endM', function (data) {
    t.equals(Buffer.compare(data, Buffer.alloc(0)), 0)
  })

  wire1.send('header', 'NOTDONE')
  wire1.send('body', 'hello world')
  wire1.send('endM')
})

test('cyclic', function (t) {
  t.plan(8)

  var state = { cycle: 0 }
  var protocol = [{
    first: true,
    type: 'string',
    name: 'cycle',
    length: 3,
    done: function (_, next) {
      state.cycle++
      if (state.cycle < 8) {
        next('cycle', 3)
      } else {
        next(null)
      }
    }
  }]

  var wire1 = new WireProtocol(protocol)
  var wire2 = new WireProtocol(protocol)
  wire1.on('data', (chunk) => { wire2.write(chunk) })
  wire2.on('data', (chunk) => { wire1.write(chunk) })

  wire1.on('cycle', (data) => {
    t.equals(data, 'abc')
  })
  wire2.on('cycle', (data) => {
    t.equals(data, 'abc')
  })

  for (var i = 0; i < 4; i++) {
    wire1.send('cycle', 'abc')
    wire2.send('cycle', 'abc')
  }
})

test('variant length on message', function (t) {
  t.plan(4)

  var protocol = [{
    name: 'length',
    first: true,
    type: 'object',
    length: 2, // note all payload sizes must be of length 2. (10-99) Normally you would use a fixed-length buffer instead of an object 
    done: function (data, next) {
      next('payload', data)
    }
  }, {
    name: 'payload',
    type: 'object',
    done: function (_, next) {
      next('length', 2)
    },
    serialize: function (data) { // disable the builtin object serialization
      return data
    }
  }]

  var wire1 = new WireProtocol(protocol)
  var wire2 = new WireProtocol(protocol)
  wire1.on('data', (chunk) => { wire2.write(chunk) })
  wire2.on('data', (chunk) => { wire1.write(chunk) })

  wire2.once('length', function (data) {
    t.equals(data, payload.length)
    wire2.once('length', function (data) {
      t.equals(data, payload2.length)
    })
  })
  wire2.once('payload', function (data) {
    t.equals(data.a, 'hello world')

    wire2.once('payload', function (data) {
      t.equals(data.a, 'test')
    })
  })

  // serialize it ourselves so we can see the true payload length
  var payload = Buffer.from(JSON.stringify({ a: 'hello world' }))
  wire1.send('length', payload.length)
  wire1.send('payload', payload)

  var payload2 = Buffer.from(JSON.stringify({ a: 'test' }))
  wire1.send('length', payload2.length)
  wire1.send('payload', payload2)

})
