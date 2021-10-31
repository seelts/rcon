const { connect } = require('./src');

connect(
  '147.135.177.107',
  6305,
  'd9$8aAt},{9y6w'
).then((rcon) => {
  return Promise.all([/*rcon.send('list'), */rcon.send('help')])
    .then(console.log)
    .then(() => {
      rcon.disconnect();
    });
});
