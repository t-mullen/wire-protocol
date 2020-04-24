var Buffer = require('safe-buffer').Buffer

var serializers = {}
var deserializers = {}

serializers.object = function (data) {
  return Buffer.from(JSON.stringify(data), 'utf8')
}
deserializers.object = function (buffer) {
  if (buffer.length === 0) { // deserialize empty messages to null
    return null
  } else {
    return JSON.parse(buffer.toString('utf8'))
  }
}

serializers.buffer = function (data) { return data }
deserializers.buffer = function (buffer) { return buffer }

serializers.string = function (data) { return Buffer.from(data, 'utf8') }
deserializers.string = function (buffer) { return buffer.toString('utf8') }

module.exports.serializers = serializers
module.exports.deserializers = deserializers
