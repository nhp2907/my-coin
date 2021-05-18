const WebSocket = require('ws');

const WS_PORT = process.env.PORT || process.argv[4];

let socketServer;

if (!socketServer) {
    socketServer = new WebSocket.Server({
        port: WS_PORT
    });

    socketServer.on('connection', function (client) {
        console.log('client connects successfully.');

        // client.on('message', function (msg) {
        //     console.log(`received: ${msg}`);
        // })
    })

    console.log(`WebSocket Server is running at port ${WS_PORT}`);
}

function broadcastAll(msg) {
    for (const client of socketServer.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}

function emitAll(event, msg) {
    for (const client of socketServer.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.emit(event, msg);
        }
    }
}

module.exports = {
    socketServer,
    broadcastAll,
    emitAll
};
