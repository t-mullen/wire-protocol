# wire-protocol

Easy, fast streaming wire protocols.

Uses length-prefix framing to ensure messages that may be split by the underlying transport are always processed in full by your application.

Abstracts away the underlying state machine, allowing you to just listen to events.

## Install
```
npm install --save wire-protocol
```
or, without Browserify:
```html
<script src="dist/wire-protocol.js"></script>
```

## Usage

```javascript

// A protocol is just a set of messages we can send
var protocol = [{
  name: 'firstMessage', // name of message
  first: true,
  length: 0,
  done: function (data, next) {
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

wire2.on('firstMessage', function (data) { // listen for messages as events
  console.log(data) // null
})
```

## API

### `var wire = new WireProtocol(protocol)`
Creates a new endpoint to your wire protocol. This object is a Duplex stream.
- `protocol` is an array of message definitions. See below.

### `wire.send(name, body)`
Sends a message with the specified name and body.
- `name` is the name of the message.
- `body` is the unserialized data to send.

### `wire.on(name)`
Listen for a message by name.
- `name` is the name of the message.

## Message Definitions
The constructor of `WireProtocol` expects an array of these definition objects.

They have the following form:
```javascript
{
  name: String,                           // Name of the message.
  type: 'object' || 'string' || 'buffer', // Optional: Name of one of the default (de)serializers. (See below).
  first: Boolean,                         // Optional: true if this is the first message expected.
  length: Integer,                        // Optional*: The fixed length of this message (*required for the first message)
  done: function (data, next) {           // Function that is called when this message is done parsing.
    // data is the data of the message
    next(String, Integer) // next should be called with the name of the next expected message, and it's expected length
  },
  serializer: function (data) { // Optional: Provide your own serializer
    return mySerializer(data) // MUST return a Buffer
  },
  deserializer: function (buffer) { // Optional: Provide your own deserializer
    return myDeserializer(buffer)
  }
}
```

## Default Serializers
`WireProtocol` provides you with a few simple serializers. You can use them by specifying `type` in your message definition.

### `'buffer'`
Does nothing. Expects message bodies to be `Buffer`s and outputs `Buffer`s.

### `'string'`
Expects message bodies to be strings and outputs strings.

### `'object'`
Expects message bodies to be Javascript objects that can be serialized by `JSON.stringify` and outputs Javascript objects.

NOTE: To allow zero-length messages to be sent, `undefined` will be serialized to `null`.

## Custom Serializers
Custom serializers are easy to implement. See `src/serialize.js` for examples.

## Why not use protobuf?
Google's Protocol Buffers also implement length-prefixed wire protocols. It's great if your application is cross-language or you need a complex serialization algorithm.

If you just want a Javascript wire protocol and are fine with using common serializers, use this and save yourself from compiling protobuf.
