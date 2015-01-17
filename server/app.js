var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var markdown = require( "markdown" ).markdown;
var fs = require('fs');
app.get('/', function(req, res){
        res.sendFile(__dirname + '/index.html');
        });
var users = 0;
io.on('connection', function(socket){
      users++;
      io.emit('connections', users);
      socket.on('chat message', function(msg){
                io.emit('chat message', markdown.toHTML(msg));
                });
      socket.on('users', function(){
                io.emit('connections', users);
                });
      socket.on('disconnect', function(){
                users--;
                io.emit('connections', users);
        });
      });
http.listen(3000, function(){
            console.log('listening on *:3000');
            });
