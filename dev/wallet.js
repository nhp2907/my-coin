const uuid = require("uuid");
const sha256 = require('sha256');
const fs = require('fs');


function createNewWallet() {
    const privateKey = uuid().split('-').join(''); //privateKey
    const publicKey = sha256(privateKey); //publicKey

    fs.appendFileSync('masterKeysForDelete.txt', '\nprivateKey: ' + privateKey);
    fs.appendFileSync('masterKeysForDelete.txt', '\npublicKey: ' + publicKey);

    return {
        privateKey, publicKey
    }
}

module.exports = {
    createNewWallet
}