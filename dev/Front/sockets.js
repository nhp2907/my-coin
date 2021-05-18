/*
 * Title: Blockchain Project
 * Description: sockets methods for the blockchain (pending transactions, chat, etc..)
 * Author: Mor Cohen
 * Date: 15/10/18
 */
//
var objForDupCheck = null;
// var socket = io();
//
// socket.on('connect', () => {
//     //console.log(socket);
//     document.getElementById("noMemberID").innerHTML = socket.id;
// });
let config;
console.log('socket.js')

function setupWS() {
    $.ajax({
        url: '/config',
        type: 'GET',
        success: data => {
            config = data;

            console.log('wsPort: ', config.wsPort)
                const ws = new WebSocket(`ws://localhost:${config.wsPort}`);
            ws.onopen = function () {
                console.log('onopen');
                ws.send('hello boss');
            }

            ws.onmessage = function (e) {

                const event = JSON.parse(e.data);
                switch (event.type) {
                    case 'new-pending-tx':
                        handleNewPt([event.data]);
                    case 'mine-success':
                        handleMineSuccess(event.data);
                        break;
                    default:
                        return;
                }
            }


        }

    })
}

setupWS();

function sendMessage(message) {
    if (!message.replace(/\s/g, '').length) {
        alert("An empty message could not be sent");
    } else {
        message = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        socket.emit('getNewMessage', {
            message: message,
            id: socket.id
        });
    }
};

const handleNewPt = (pt) => {
    console.log('pt', pt);
    var rows = document.getElementById("lastTransactionsTable").getElementsByTagName("tr").length;
    var row = document.getElementById("mineButton");

    if ((pt.length === 1) && (rows === 1) && (pt[0].sender === "system-reward")) {
        row.setAttribute("disabled", true);
    }


    for (let i = 0; i < pt.length; i++) {//i used JQuery to display the table
        if (objForDupCheck !== null)
            if (pt[i].transactionId === objForDupCheck.transactionId)
                continue;
        $('#lastTransactionsTable > tbody:last-child').append('<tr>' +
            '<td style="font-size:x-small; max-width: 100px;">' +
            pt[i].transactionId + '</td>' +
            '<td style="font-size:x-small; max-width: 220px;">' +
            pt[i].sender + '</td>' +
            '<td style="font-size:x-small; max-width: 220px;">' +
            pt[i].recipient + '</td>' +
            '<td>' +
            pt[i].amount + '</td>' +
            '</tr >');
        objForDupCheck = pt[i];
    }
    for (let i = 1; i < pt.length; i++) {//after mining keep the last row (miner reward).
        if (pt[i].sender === "system-reward") {
            $("#lastTransactionsTable td").remove();
            $('#lastTransactionsTable > tbody:last-child').append('<tr>' +
                '<td style="font-size:x-small; overflow: auto; max-width: 100px;">' +
                pt[pt.length - 1].transactionId + '</td>' +
                '<td style="font-size:x-small; max-width: 220px;">' +
                pt[pt.length - 1].sender + '</td>' +
                '<td style="font-size:x-small; max-width: 220px;">' +
                pt[pt.length - 1].recipient + '</td>' +
                '<td>' +
                pt[pt.length - 1].amount + '</td>' +
                '</tr >');
            $("#lastTransactionsTable td").remove();

        }
    }

}

const handleMineSuccess = (trueOrFalse) => {//after mining success - display a meassage to all users
    function removePopUp() {
        $("#alert").remove();
    }

    if (trueOrFalse === true) {//i could use JQuery
        var alert = document.createElement("div");
        alert.setAttribute("class", "alert alert-success");
        alert.setAttribute("id", "alert");
        alert.setAttribute("style", "position: fixed; bottom: 0; width: 100 %; z-index:1000;");
        alert.innerHTML = '<strong>' + "Global Post -" + '</strong>' + "One user successfully mined!";
        document.getElementsByTagName("body")[0].appendChild(alert);
        setTimeout(removePopUp, 5000);
    }
}