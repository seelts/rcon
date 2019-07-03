const packetTypes = require('./packet_types');

const MAX_INT32_VALUE = 2 ** 31 - 1;
const packetTypesSet = new Set(Object.values(packetTypes));
const nullRegExp = /\0/g;

const sizeFieldLength = 4; // int32
const idFieldLength = 4; // int32
const typeFieldLength = 4; // int32
const emptyBodyFieldLength = 1; // 1 null character
const emptyStringLength = 1; // 1 null character

const emptyPacketSize =
  idFieldLength + typeFieldLength + emptyBodyFieldLength + emptyStringLength;
const emptyPacketByteLength = emptyPacketSize + sizeFieldLength;

function build(id, type, body) {
  if (
    !isValidPacketId(id) ||
    !isValidPacketType(type) ||
    !isValidPacketBody(body)
  ) {
    throw 'IllegalArgument';
  }

  const bodyUint8Array = new Uint8Array(Buffer.from(body, 'ascii'));
  const bodyByteLength = bodyUint8Array.length;
  const packetByteLength = emptyPacketByteLength + bodyByteLength;
  const byteArray = new ArrayBuffer(packetByteLength);
  const dataView = new DataView(byteArray);
  dataView.setInt32(0, emptyPacketSize + bodyByteLength, true);
  dataView.setInt32(4, id, true);
  dataView.setInt32(8, type, true);
  const uint8Array = new Uint8Array(byteArray);
  uint8Array.set(bodyUint8Array, 12);

  return fromByteArray(byteArray);
}

function fromByteArray(byteArray) {
  const dataView = new DataView(byteArray);

  const size = dataView.getInt32(0, true);
  if (size !== byteArray.byteLength - sizeFieldLength) {
    throw 'Invalid packet';
  }

  byteArray.id = dataView.getInt32(4, true);
  byteArray.type = dataView.getInt32(8, true);
  byteArray.body = Buffer.from(byteArray, 12, size - emptyPacketSize);

  return byteArray;
}

function setId(byteArray, id) {
  if (!isValidPacketId(id)) {
    throw 'IllegalArgument';
  }

  byteArray.id = id;

  const dataView = new DataView(byteArray);
  dataView.setInt32(4, id, true);
}

function isValidPacketType(value) {
  return packetTypesSet.has(value);
}

function isValidPacketId(value) {
  return Number.isInteger(value) && value > 0 && value <= MAX_INT32_VALUE;
}

function isValidPacketBody(value) {
  return !nullRegExp.test(value);
}

module.exports = { build, fromByteArray, setId, isValidPacketId };
