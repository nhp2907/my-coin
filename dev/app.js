const {NEW_PENDING_TX, COPY} = require("./eventType");

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
var path = require('path');
const Blockchain = require('./blockchain');
const {createNewWallet, verifyKey} = require("./wallet");

const WebSocket = require('ws');
const {NEW_BLOCK} = require("./eventType");

const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'Front'))); //public
app.use("/styles", express.static(__dirname + '/Front/assets'));//allow css in invitation page (public)
// app.use('/', require('./api'));

const port = process.env.PORT || process.argv[2];
let main = new Blockchain('null');

function initialize() {
    const {privateKey, publicKey} = createNewWallet();
    console.log(privateKey, ', ', publicKey);
    if (port == 3000) {
        const master = main.createNewTransaction(1000000, "system-reward", publicKey);
        main.chain[0].transactions.push(master);
    }
}

initialize();

//<editor-fold desc="WebSocket client">
let ws;
// nếu không phải là server root thì kết nối tới root theo địa chỉ cố định là ws://localhost:40567
if (port != 3000) {
    ws = new WebSocket('ws://localhost:40567');
    ws.on('open', () => {
        console.log('Connected to root server to via websocket ');
    })

    ws.onmessage = (socketEvent) => {
        console.log('websocket client receive message: ', socketEvent.data);
        const event = JSON.parse(socketEvent.data);
        console.log('event: ', event);
        switch (event.type) {
            case NEW_PENDING_TX:
                main.addTransactionToPendingTransactions(event.data);
                break;
            case COPY:
                main = Object.setPrototypeOf(event.data, Blockchain.prototype);
                break;
            case NEW_BLOCK:
                console.log('new block is broadcast to current node');
                main.chain.push(event.data);
                main.pendingTransactions = [];
                break;
            default:
                return;
        }
    }

    ws.addEventListener('PT', (pt) => {
        console.log('ws pending tx: ', pt);
    })

    ws.on('error', (err) => {
        console.log('Websocket Error: ', err);
    })
}
//</editor-fold>

let socketServer;
const WS_PORT = process.env.PORT || process.argv[4];

if (!socketServer) {
    socketServer = new WebSocket.Server({
        port: WS_PORT
    });

    console.log(`WebSocket Server is running at port ${WS_PORT}`);

    function emitAll(event, msg) {
        for (const client of socketServer.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.emit(event, msg);
            }
        }
    }

    function sendMessageAll(msg) {
        for (const client of socketServer.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        }
    }

    socketServer.on('PT', (pt) => {
        console.log('server pt: ', pt);
    })

    socketServer.on('connection', function (client) {
        console.log('client connects successfully.');
        client.send(JSON.stringify({
            type: COPY,
            data: main
        }))
        client.on('message', function (msg) {
            console.log(`received: ${msg}`);
        })

        client.on('PT', function (msg) {
            console.log(`pending tx event: ${msg}`);
        })


    })

    app.post("/wallet", (req, res) => {
        const wallet = createNewWallet();
        console.log('createNewWallet: ',wallet)
        res.send(wallet)
    })

    app.get('/blockchain', (req, res) => {
        res.send(main);
    })

    app.post('/newTransaction', (req, res) => {
        const {privateKey, publicKey, recipient, amount} = req.body;
        if (!amount || amount < 0 || !publicKey || !recipient) {
            res.json({
                note: 'invalid input data'
            });
        }
        if ((publicKey !== "system-reward") && (publicKey !== "system-reward: new user") && (publicKey !== "system-reward: invitation confirmed")) {
            const privateKeyValid = verifyKey(privateKey, publicKey);
            console.log("privateKey isValid", privateKeyValid)
            if (!privateKeyValid) {
                res.json({
                    note: false
                });
                return;
            }
            /*  -Authentication: check if user have the require amount of coins for current transaction && if user exist in the blockchain-  */
            const senderAddress = main.getAddressData(publicKey);
            const recipientAddress = main.getAddressData(recipient);
            console.log('senderAddress: ', senderAddress)
            console.log('recipientAddress: ', recipientAddress)
            if (!senderAddress || senderAddress.addressBalance < amount) {
                res.json({
                    note: 'sender address not found'
                });
                return;
            }
        }

        // create new tx -> add to pending tx;
        const newTx = main.createNewTransaction(amount, publicKey, recipient);
        main.addTransactionToPendingTransactions(newTx);

        // send to all node connected to current node
        sendMessageAll(JSON.stringify({
            type: NEW_PENDING_TX,
            data: newTx
        }));

        // send to node that current node connected
        if (port != 3000) {
            ws.send(JSON.stringify({
                type: NEW_PENDING_TX,
                data: newTx
            }))
        }

        res.send({
            message: 'ok'
        })
    })

    app.post('/mine', (req, res) => {
        console.log('start mining: ', req.body);
        const {privateKey, publicKey} = req.body;

        const lastBlock = main.getLastBlock();
        const previousBlockHash = lastBlock['hash'];

        const rewardTx = main.createNewTransaction(12, 'system-reward', publicKey);
        main.addTransactionToPendingTransactions(rewardTx);

        const currentBlockData = {
            transactions: main.pendingTransactions,
            index: lastBlock['index'] + 1
        }

        const nonce = main.proofOfWork(previousBlockHash, currentBlockData);//doing a proof of work
        const blockHash = main.hashBlock(previousBlockHash, currentBlockData, nonce);//hash the block
        const newBlock = main.createNewBlock(nonce, previousBlockHash, blockHash);//create a new block with params

        res.send(newBlock);


        // send to all node connected to current node
        sendMessageAll(JSON.stringify({
            type: NEW_BLOCK,
            data: newBlock
        }));

        // send to node that current node connected
        if (port != 3000) {
            ws.send(JSON.stringify({
                type: NEW_BLOCK,
                data: newBlock
            }))
        }

        main.pendingTransactions = [];
    })

    app.post('/hashKeys', (req, res) => {
        const privateKey = req.body.key1;

        //const k1 = keyPair.privateKey.decrypt(req.body.k1);
        //console.log(k1);

        const publicKey = req.body.key2;
        const privateKey_Is_Valid = verifyKey(privateKey, publicKey);

        const addressData = main.getAddressData(publicKey);
        if (addressData === false) {
            res.json({
                note: false
            });
        } else if (!privateKey_Is_Valid) {
            res.json({
                note: false
            });
        } else {
            res.json({
                note: true
            });
        }

    });

    app.get('/address/:address', (req, res) => {
        const address = req.params.address;
        const addressData = main.getAddressData(address);
        if (addressData.addressTransactions.length == 0) {
            res.status(404).send({
                message: 'address not found'
            })
        } else {
            res.json(addressData);
        }
    });

    app.get('/pendingTransactions', (req, res) => {
        const transactionsData = main.getPendingTransactions();
        res.json({
            pendingTransactions: transactionsData
        });
    });

    app.get('/config', (req, res) => {
        res.send({
            port,
            wsPort: WS_PORT
        })
    })
}

// const port = process.env.PORT || process.argv[2];
app.listen(port, () => {
    console.log(`Blockchain is running on port ${port}`);
})