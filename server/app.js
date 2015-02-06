/*


*/
//APIs
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var moment = require('moment');
var markdown = require('markdown-it')({
    html: false,
    xhtmlOut: true,
    breaks: true,
    langPrefix: 'language-',
    linkify: true,
    typographer: true,
    quotes: '“”‘’',
    highlight: function() {return '';}
});
//Globals and Montreus APIs
var rooms = require("./rooms");

//Connection Handlers
app.get('/', function(req, res){
    res.status(200).sendFile(__dirname + '/index.html');
});
io.on('connection', function(socket){
      if(socketConnections().length <= 1024){
        socket.username = socket.handshake.query.username;
        socket.on('postName', function(username){
                socket.username = username;
                });
        var socketsConnected = socketConnections();
        io.emit('connections', socketsConnected.length);
        socket.on('chat message', function(msg){
            var markedMessage =  markdown.renderInline(msg.message);
            var messageDate = moment(msg.date).format("LT, D/M");
            var firstWord = markedMessage.substr(0, markedMessage.indexOf(" "));
            if(msg.message !== "/help"){
            if(firstWord === "/broadcast"){
            var finalMessage = markedMessage.substr(markedMessage.indexOf(" ") + 1);
             var messageToBeSent = '<p class="alignLeft"> BROADCAST: ' + finalMessage + '</p><p class="alignRight">' + messageDate + '</p>';
            }else if(firstWord === "/bot-say"){
                var finalMessage = markedMessage.substr(markedMessage.indexOf(" ") + 1);
                var messageToBeSent = '<p class="alignLeft"> Chat bot: ' + finalMessage + '</p><p class="alignRight">' + messageDate + '</p>';
            }else{
            var messageToBeSent = '<p class="alignLeft">' + html.escape(msg.username) + ': ' + markedMessage + '</p><p class="alignRight">' + messageDate + '</p>';
            }
            if(messageToBeSent.length <= 8192){
                  if(!verifyEmptyness(msg.message)){
                    io.emit('chat message', messageToBeSent);
                  }else{
                  socket.emit('chat message', 'PM: Sorry, you cannot send empty messages.');
                  }
                }else{
                  socket.emit('chat message', 'PM: Oops! You cannot send messages longer than 8192 characters. Sorry!');
                }
            }else{
                socket.emit('chat message', 'Montreus Chat - v1.3.3<br>Available commands:<br>/help - Display help commands<br>/bot-say &lt;message&gt; - Give something for the bot to say!<br>/broadcast &lt;message&gt; - Broadcast a message');
            }
        });
      socket.on('users', function(){
                var socketsConnected = socketConnections();
                io.emit('connections', socketsConnected.length);
                });
      socket.on('disconnect', function(){
                var socketsConnected = socketConnections();
                io.emit('connections', socketsConnected.length);
                });
      }else{
      socket.emit('chat message', 'PM: Sorry, we cannot allow more than 1024 connections in the server');
      socket.emit('chat message', 'PM: Disconnecting! Try again later.');
      socket.emit('connections', 'You are not connected.');
      socket.disconnect();
      }
});
var processMessage = function(message){
    var response = {};
    var time = moment(message.date).format("LT, D/M");
    if(messageToBeSent.length <= 8192){
    if(message.slice(0,1) !== "/"){
        response.message = generateMessage(message.message, time, true, message.username);
        response.sendToAll = true;
    }else{
        var command = firstWord(message.message);
        switch(command){
            case "/help":
                response.message = generateMessage("Montreus Chat - v1.4<br>Available commands:<br>/help - Display help commands<br>/bot-say &lt;message&gt; - Give something for the bot to say!<br>/broadcast &lt;message&gt; - Broadcast a message</p>", time, false);
                response.sendToAll = false;
            break;
            case "/bot-say":
                response.message = generateMessage(otherWords(message.message), time, true, "Chat bot");
                response.sendToAll = true;
            break;
            case "/broadcast":
                response.message = generateMessage(otherWords(message.message), time, true, "BROADCAST");
                response.sendToAll = true;
            break;
            case "/me":
                response.message = generateMessage("Montreus Chat - v1.4<br>Username: " + message.username, time, false);
                response.sendToAll = false;
            break;
            case "/version":
                response.message = generateMessage("Montreus Chat - v1.4", time, false);
                response.sendToAll = false;
            break;
            default:
                response.message = generateMessage("Invalid command", time, false);
                response.sendToAll = false;
        }
    }
    }else{
        response.message = generateMessage("Oh oh! Sorry, you cannot send messages longer than 8192 characters.", time, false, "PM");
        response.sendToAll = false;
    }
    return response;
}
var generateMessage = function(message, time, processMarkdown, username){
    var msg;
    var htmlMsg;
    var date = moment(message.date).format("LT, D/M");
    if(processMarkdown === true){
        msg = markdown.renderInline(message);
    } else{
        msg = message;
    }
    if(username != undefined){
        htmlMsg = '<p class="alignLeft">' + html.escape(username) + ': ' + msg + '</p><p class="alignRight">' + date + '</p>';
    }else{
        htmlMsg = '<p class="alignLeft">' + msg + '</p><p class="alignRight">' + date + '</p>';
    }
    return htmlMsg;
}
var firstWord = function(string){
    return string.substr(0, markedMessage.indexOf(" "));
}
var otherWords = function(string){
    return string.indexOf(" ") + 1;
}
http.listen(3030, function(){
            console.log('listening on *:3030');
            });
var verifyEmptyness = function(str) {
    return (str.length === 0 || !str.trim());
};
function socketConnections(roomId, namespace) {
    var res = [];
    var ns = io.of(namespace ||"/");

    if (ns) {
        for (var id in ns.connected) {
            if(roomId) {
                var index = ns.connected[id].rooms.indexOf(roomId);
                if(index !== -1) {
                    res.push(ns.connected[id]);
                }
            } else {
                res.push(ns.connected[id]);
            }
        }
    }
    return res;
}
var html = {
    escape: function(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
}
