# wire-protocol
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Travis](https://travis-ci.org/RationalCoding/wire-protocol.svg?branch=master)](https://travis-ci.org/RationalCoding/wire-protocol)

Easy and fast streaming wire protocols.

Lets you send messages over a binary stream without worrying about where one message begins and another ends. Uses [implicit length-prefix framing](#what-is-implicit-length-prefix-framing).

This module abstracts away the underlying parser, letting you forget about how your messages are buffered. Just serialize, send and forget!

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
  type: 'object',
  first: true,
  length: 13,
  done: function (data, next) {
    next('secondMessage', 11)
  }
}, {
  name: 'secondMessage',
  type: 'string'
}]

// This module turns your protocol spec into a fully-fledged wire protocol
var wire = new WireProtocol(protocol)

// send your messages!
wire.send('firstMessage', {a: 'hello'})
wire.send('secondMessage', 'hello world')

// The WireProtocol object is a Duplex stream
wire.pipe(net.Socket()).pipe(wire)

wire.on('firstMessage', function (data) { // listen for messages as events
  console.log(data) // {a: 'hello'}
})
```

## API

### `var wire = new WireProtocol(protocol)`
Creates a new endpoint to your wire protocol. This object is a Duplex stream.
- `protocol` is an array of [message definitions](#message-definitions).

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
  type: 'object' || 'string' || 'buffer', // Optional: Name of one of the default (de)serializers. (See Default Serializers below)
  first: Boolean,                         // Optional: true if this is the first message expected.
  length: Integer,                        // Optional*: The fixed length of this message (*required for the first message)
  done: function (data, next) {           // Function that is called when this message is done parsing.
    // data is the data of the message
    next(String, Integer) // next should be called with the name of the next expected message, and it's expected length
    // You may omit the length argument if the message has a specified fixed length
  },
  serializer: function (data) { // Optional: Provide your own serializer (See Custom Serializers below)
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
Does nothing. Expects message bodies to be `Buffer`s and outputs `Buffer`s. The default if no type is specified.

### `'string'`
Expects message bodies to be strings and outputs strings.

### `'object'`
Expects message bodies to be Javascript objects that can be serialized by `JSON.stringify` and outputs Javascript objects.

NOTE: To allow zero-length messages to be sent, `undefined` will be serialized to `null`.

## Custom Serializers
Custom serializers are easy to implement. See `src/serialize.js` for examples.

Specifying a serializer option will override the default serializer. You may override only one of the options.


## FAQ
### What is implicit length-prefix framing?
When you send multiple messages over a binary stream, you can't immediately know when each messages starts and ends.

One solution is to first send the length of the message, then the message itself.

<img src="https://github.com/RationalCoding/wire-protocol/raw/master/prefix.png" alt="Diagram of a Length Prefix" width=400/>

`wire-protocol` allows **implicit** length-prefixing, since it doesn't explicity write the length of each message. Message length can often be **derived from the previous message**, or is **fixed**, and no prefix needs to be sent at all.

### Why not use protobuf?
[Google's Protocol Buffers](https://github.com/google/protobuf) can also implement length-prefixed wire protocols. It's great if your application is cross-language or you need a complex serialization algorithm.

If you just want a Javascript wire protocol, are fine with using common serializers, don't want to spend time compiling and learning protobuf, and/or want to use a convenient stream API, use this module.

It's also perfectly reasonable to use protobuf for fast serialization and message definition, while using this module for "event-style" message handling.

