var Duplex = require('readable-stream').Duplex
var inherits = require('inherits')
var Buffer = require('safe-buffer').Buffer

var serializers = require('./serialize').serializers
var deserializers = require('./serialize').deserializers

inherits(WireProtocol, Duplex)

function WireProtocol (defs) {
  var self = this
  if (!(self instanceof WireProtocol)) return new WireProtocol(defs)

  Duplex.call(self)

  self._buffer = []
  self._bufferSize = 0
  self._currentDef = null

  self._defs = {}
  defs.forEach(self._addDef.bind(self))
}

WireProtocol.prototype._write = function (chunk, enc, next) {
  var self = this

  self._bufferSize += chunk.length
  self._buffer.push(chunk)

  self._continueParse(function () {
    next(null) // signal that we are ready for more data
  })
}

WireProtocol.prototype._continueParse = function (callback) {
  var self = this

  if (self._bufferSize >= self._parserSize) { // whilte we have enough to parse
    var buffer = (self._buffer.length === 1) // concat the buffer
      ? this._buffer[0]
      : Buffer.concat(self._buffer)

    self._bufferSize -= self._parserSize  // subtract the parse size

    self._buffer = self._bufferSize // slice the to-be-parsed data from the buffer
      ? [buffer.slice(self._parserSize)]
      : []

    self._parser(buffer.slice(0, self._parserSize), function () {
      self._continueParse(callback)
    }) // parse the sliced data
  } else {
    callback() // done parsing, get more data
  }
}

WireProtocol.prototype._read = function () { /* we will write when ready */ }

WireProtocol.prototype._parser = function (data, callback) {
  var self = this

  var deserializedData = self._currentDef.deserialize(data)
  self.emit(self._currentDef.name, deserializedData)
  self._currentDef.done(deserializedData, function (nextDefName, nextLength) {
    if (nextDefName != null) {
      self._currentDef = self._defs[nextDefName]
      self._parserSize = nextLength != null ? nextLength : self._currentDef.length
      callback()
    } else {
      self._end()
    }
  })
}

WireProtocol.prototype.send = function (message, data) {
  var self = this

  var def = self._defs[message]

  if (!def) throw new Error(message + ' is not a known message definition.')

  if (data != null) {
    var serializedData = def.serialize(data)
    self.push(serializedData)
  }
}

WireProtocol.prototype._end = function () {
  var self = this
  self.push(null)

  self._buffer = null
  self._bufferSize = null
  self._currentDef = null
  self._defs = null
}

var RESERVED_EVENTS = ['close', 'drain', 'error', 'finish', 'pipe', 'unpipe', 'data', 'end', 'readable', 'writable']

WireProtocol.prototype._addDef = function (def) {
  var self = this

  def.type = def.type || 'buffer'
  if (def.type) {
    def.serialize = def.serialize || serializers[def.type]
    def.deserialize = def.deserialize || deserializers[def.type]
  }

  def.done = def.done || self._end.bind(self)

  if (def.name.indexOf(RESERVED_EVENTS) !== -1) {
    throw new Error('Reserved event name ' + def.name + ' cannot be used.')
  }

  if (def.first) {
    if (def.length == null) throw new Error('First message must specify a length!')
    self._currentDef = def
    self._parserSize = self._currentDef.length
  }

  self._defs[def.name] = def
}

module.exports = WireProtocol
