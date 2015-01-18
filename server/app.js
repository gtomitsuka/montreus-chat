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
var fs = require('fs');
app.get('/', function(req, res){
        res.sendFile(__dirname + '/chat.html');
        });
var userArray = [];
io.on('connection', function(socket){
      var currentUser = new Object();
      socket.on('auth_details', function(username){
                currentUser.username = username;
                currentUser.index = userArray.length;
                userArray.push(currentUser);
                socket.emit('chat message', username + ' joined the chat');
                });
      socket.on('postName', function(username){
                socket.emit('chat message', currentUser.username + ' changed his username to ' + username);
                currentUser.username = username;
                });
      io.emit('connections', userArray);
      socket.on('chat message', function(msg){
                var messageToBeSent = "<p>" + currentUser.username + ": " + markdown.renderInline(msg) + "</p>";
                if(messageToBeSent.length <= 2048){
                if(!verifyEmptyness(msg)){
        io.emit('chat message', messageToBeSent);
                }else{
                    socket.emit('chat message', 'PM: Sorry, you cannot send empty messages.');
                }
                }else{
                    socket.emit('chat message', 'PM: Oops! You cannot send messages longer than 2048 characters. Sorry!');
                }
                });
      socket.on('users', function(){
                
                    io.emit('connections', userArray);
                });
      socket.on('disconnect', function(){
                socket.emit('chat message', currentUser.username + ' left the chat');
                io.emit('connections', userArray);
        });
      });
http.listen(3000, function(){
            console.log('listening on *:3000');
            });
var verifyEmptyness = function(str) {
    return (str.length === 0 || !str.trim());
};
