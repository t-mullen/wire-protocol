# wire-protocol

Easy, fast streaming wire protocols.

Uses length-prefix framing to ensure messages that may be split by the underlying transport are always processed in full by your application.

## Usage

```javascript

// A protocol is just a set of messages we can send
var protocol = [{
  name: 'firstMessage', // name of message
  first: true,
  length: 0,
  done: function (data, state, next) {
    // Tell the parser what message to expect next, and how long that message will be
    next('body', 11)
  }
}, {
  name: 'secondMessage',
  type: 'string' // the serialization type of the message
}]

// This module turns your protocol spec into a fully-fledged wire protocol
var wire = new WireProtocol(protocol)

// send your messages!
wire.send('firstMessage')
wire.send('secondMessage', 'hello world')

// The WireProtocol object is a Duplex stream
var wire2 = new WireProtocol(protocol)
wire.pipe(wire2).pipe(wire)

wire2.on('firstMessage', function (data) {
  console.log(data) // null
})
wire2.on('secondMessage', function (data) {
  console.log(data) // 'hello world'
})
```

## Why not use protobuf?
Google's Protocol Buffers also implement length-prefixed wire protocols. It's great if your application is cross-language or you need a complex serialization algorithm.

If you just want a Javascript wire protocol and are fine with using common serializers, use this and save yourself from compiling protobuf.