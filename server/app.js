var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var moment = require('moment');
var markdown = require('markdown-it')({
                                      html:         false,
                                      xhtmlOut:     true,
                                      breaks:       true,
                                      langPrefix:   'language-',
                                      linkify:      true,
                                      typographer:  true,
                                      quotes: '“”‘’',
                                      highlight: function() {return '';}
                                      });
app.get('/', function(req, res){
        res.sendFile(__dirname + '/index.html');
        });
io.on('connection', function(socket){
      if(socketConnections().length <= 1024){
        socket.username = socket.handshake.query.username;
        socket.toString = function(){return this.name};
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
            var messageToBeSent = '<p class="alignLeft">' + escapeHTML(msg.username) + ': ' + markedMessage + '</p><p class="alignRight">' + messageDate + '</p>';
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
                socket.emit('chat message', 'Montreus Chat - v1.3.2<br>Available commands:<br>/help - Display help commands<br>/bot-say &lt;message&gt; - Give something for the bot to say!<br>/broadcast &lt;message&gt; - Broadcast a message');
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
http.listen(3030, function(){
            console.log('listening on *:3030');
            });
var verifyEmptyness = function(str) {
    return (str.length === 0 || !str.trim());
};
function socketConnections(roomId, namespace) {
    var res = []
    , ns = io.of(namespace ||"/");    // the default namespace is "/"
    
    if (ns) {
        for (var id in ns.connected) {
            if(roomId) {
                var index = ns.connected[id].rooms.indexOf(roomId) ;
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
function escapeHTML(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
