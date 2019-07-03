const RCON = require('./rcon');

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

module.exports = { connect, send, disconnect };
