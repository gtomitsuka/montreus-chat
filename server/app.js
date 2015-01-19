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
      var currentUser = {};
      socket.on('auth_details', function(details){
                currentUser.username = details.username;
                currentUser.toString = function(){return this.name};
                currentUser.location = userArray.length;
                userArray.push(currentUser);
                });
      socket.on('postName', function(username){
                currentUser.username = username;
                });
      io.emit('connections', userArray.join("<br>"));
      socket.on('chat message', function(msg){
                var escapedMessage = escapeHTML(msg.message);
                var markedMessage =  markdown.renderInline(escapedMessage);
                var messageToBeSent = "<p>" + escapeHTML(msg.username) + ": " + markedMessage + "</p>";
                if(messageToBeSent.length <= 2048){
                    if(!verifyEmptyness(msg.message)){
                        io.emit('chat message', messageToBeSent);
                    }else{
                        socket.emit('chat message', 'PM: Sorry, you cannot send empty messages.');
                    }
                }else{
                    socket.emit('chat message', 'PM: Oops! You cannot send messages longer than 2048 characters. Sorry!');
                }
                });
      socket.on('users', function(){
                    io.emit('connections', userArray.join("<br>"));
                });
      socket.on('disconnect', function(){
                userArray.splice(currentUser.location, 1);
                io.emit('connections', userArray.join("<br>"));
        });
      });
http.listen(3000, function(){
            console.log('listening on *:3000');
            });
var verifyEmptyness = function(str) {
    return (str.length === 0 || !str.trim());
};
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
