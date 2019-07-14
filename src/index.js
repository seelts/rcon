const net = require('net');

const Packet = require('./packet');
const { isValidPacketId } = require('./packet');
const {
  SERVERDATA_AUTH,
  SERVERDATA_AUTH_RESPONSE,
  SERVERDATA_EXECCOMMAND,
  SERVERDATA_RESPONSE_VALUE,
} = require('./packet_types');

const instances = new WeakMap();

function connect(host, port, password) {
  const rcon = new RCON(host, port, password);

  return rcon.connect().then(() => {
    const handle = {};
    instances.set(handle, rcon);

    return handle;
  });
}

function send(handle, command) {
  const rcon = instances.get(handle);

  if (!rcon) {
    throw 'Invalid handle';
  }

  return rcon.sendCommand(command);
}

function disconnect(handle) {
  const rcon = instances.get(handle);

  instances.delete(handle);

  if (!rcon) {
    throw 'Invalid handle';
  }

  return rcon.disconnect();
}

class RCON {
  host;
  port;
  password;
  socket;
  nextPacketId = 1;
  lastPacketId;
  response = '';
  resolve;
  reject;
  emptyPacket = Packet.build(1, SERVERDATA_RESPONSE_VALUE, '');

  constructor(host, port, password) {
    this.host = host;
    this.port = port;
    this.password = password;
  }

  connect() {
    return this.createSocket().then(this.authenticate);
  }

  createSocket() {
    return new Promise((resolve, reject) => {
      this.reject = reject;
      this.socket = new net.Socket();
      this.socket.addListener('data', this.onData);
      this.socket.addListener('error', this.onError);

      const { host, port } = this;
      this.socket.connect({ host, port }, resolve);
    });
  }

  authenticate = () => {
    const packet = Packet.build(
      this.getPacketId(),
      SERVERDATA_AUTH,
      this.password
    );

    return this.send(packet);
  };

  disconnect() {
    return new Promise((resolve, reject) => {
      this.reject = reject;
      this.socket.end(resolve);
    });
  }

  getPacketId() {
    if (!isValidPacketId(this.nextPacketId)) {
      this.nextPacketId = 1;
    }

    return this.nextPacketId++;
  }

  send(packet) {
    return new Promise((resolve, reject) => {
      this.response = '';
      this.reject = reject;
      this.resolve = resolve;

      this.socket.write(new Uint8Array(packet));

      this.lastPacketId = this.getPacketId();
      Packet.setId(this.emptyPacket, this.lastPacketId);
      this.socket.write(new Uint8Array(this.emptyPacket));
    });
  }

  sendCommand = (command) => {
    const packet = Packet.build(
      this.getPacketId(),
      SERVERDATA_EXECCOMMAND,
      command
    );

    return this.send(packet);
  };

  onData = (data) => {
    const packet = Packet.fromByteArray(data.buffer);

    if (packet.type === SERVERDATA_AUTH_RESPONSE) {
      if (packet.body.length === 0) {
        // the actual resolving will happen in the next `if`
        // after response to the next (empty) packet will arrive
        this.response = undefined;
      } else {
        this.reject();
        this.disconnect();
      }
    }

    if (packet.type === SERVERDATA_RESPONSE_VALUE) {
      const packetId = packet.id;
      if (packetId === this.lastPacketId) {
        // this is an empty packet, thus the previous response is ready
        this.reject = null;
        this.resolve(this.response);
      } else {
        // this is the actual response
        // as it is ascii encoded,
        // there is no need to take care of wide characters
        this.response += packet.body.toString();
      }
    }
  };

  onError = () => {
    if (this.reject) {
      this.reject();
    }
  };
}

module.exports = { connect, send, disconnect };
