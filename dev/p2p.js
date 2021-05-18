
const socketClient = require('socket.io-client')

const socket = io.connect('http://localhost:3000', {reconnect: true});

socket.on('connect', function (socket) {
    console.log('Connected!');
});
