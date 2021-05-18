const uuid = require("uuid");
const sha256 = require('sha256');
const fs = require('fs');
const {randomBytes} = require('crypto')
const secp256k1 = require('secp256k1')
const crypto = require('crypto')


function createNewWallet() {

    const privateKey = uuid().split('-').join(''); //privateKey
    const publicKey = sha256(privateKey); //publicKey

    fs.appendFileSync('masterKeysForDelete.txt', '\nprivateKey: ' + privateKey);
    fs.appendFileSync('masterKeysForDelete.txt', '\npublicKey: ' + publicKey);

    return {
        privateKey, publicKey
    }
}

function verifyKey(privateKey, publicKey) {
    console.log('verifyKey: ', privateKey, publicKey)
    return publicKey == sha256(privateKey);
}

module.exports = {
    createNewWallet,
    verifyKey
}