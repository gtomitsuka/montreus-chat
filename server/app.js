var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var markdown = require('markdown-it')({
                                      html:         true,
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
var userArray = [];
io.on('connection', function(socket){
      socket.on('auth_details', function(details){
                socket.username = details.username;
                socket.toString = function(){return this.name};
                });
      socket.on('postName', function(username){
                socket.username = username;
                });
      var socketsConnected = socketConnections();
      io.emit('connections', socketsConnected.length);
      socket.on('chat message', function(msg){
                var escapedMessage = escapeHTML(msg.message);
                var markedMessage =  markdown.renderInline(escapedMessage);
                var messageToBeSent = "<p>" + escapeHTML(msg.username) + ": " + markedMessage + "</p>";
                if(messageToBeSent.length <= 8192){
                if(!verifyEmptyness(msg.message)){
                io.emit('chat message', messageToBeSent);
                }else{
                socket.emit('chat message', 'PM: Sorry, you cannot send empty messages.');
                }
                }else{
                socket.emit('chat message', 'PM: Oops! You cannot send messages longer than 8192 characters. Sorry!');
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
