/* server/app.js
 * Main Server File
 * Open-source! Free for all
*/
//APIs
var express = require("express"); //Express.js - Serve pages
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var moment = require('moment');
var ejs = require('ejs');
var fs = require("fs");
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

var bodyParser = require('body-parser')
// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

//Globals
var day = 86400000;
var rooms = require("./room"); //JSON with Rooms
var db = require("./db");

//Init EJS
var indexEJS;
fs.readFile('./index.ejs', 'utf8', function (error, data) {
  if(error){
    console.log(error)
  }else{
  indexEJS = data;
  }
});

var loginEJS;
fs.readFile('./login.ejs', 'utf8', function (error, data) {
  if(error){
    console.log(error)
  }else{
  loginEJS = data;
  }
});


var errorEJS;
fs.readFile('./error.ejs', 'utf8', function (error, data) {
  if(error){
    console.log(error)
  }else{
  errorEJS = data;
  }
});

//Connection Handlers
app.get('/', function(req, res){
    res.status(200).sendFile(__dirname + '/index.html');
});
//Uses EJS
var roomRouter = express.Router();
roomRouter.post('/room/:id/',urlencodedParser, function(req, res,next){
    if (!req.body) return res.sendStatus(400);
    var id = req.params.id;
    var roomName;
    var roomId;
    var roomPassword;
    var postUsername = req.body.username;
    var postPassword = req.body.password;
    for(var i = 0; i < rooms.length; i++){
      var room = rooms[i];
        if(room.number == id){
            roomName = room.name;
            roomId = room.roomId;
            roomPassword = room.password;
        }
    }
    if(roomName == null){
        res.status(404).sendFile(__dirname + '/error.html');
    }else{
        if(roomPassword + '' == postPassword){
            db.find(roomId).then(function(messages){
                res.set('Content-Type', 'text/html');
                res.status(200).send(ejs.render(indexEJS, {title: roomName, id: roomId, username: postUsername, messages: messages}));
            }, function(error){
                res.status(500).send("Uh oh! An error ocurred: " + error.message);
            });
        }else{
            res.status(404).send(ejs.render(errorEJS, {title: 'Montreus Chat', error: 'The required password was false'}));
        }
    }
});


roomRouter.get('/room/:id/', function(req, res,next){
    var id = req.params.id;
    var roomName;
    var roomId;
    var roomPassword;
    for(var i = 0; i < rooms.length; i++){
      var room = rooms[i];
        if(room.number == id){
            roomName = room.name;
            roomId = room.roomId;
            roomPassword = room.password;
        }
    }
    if(roomName == null){
        res.status(404).send(ejs.render(errorEJS, {title: 'Montreus Chat', error: "Anyway the room name doesn't exist"}));
    }else{
        res.set('Content-Type', 'text/html');
        if(roomPassword != null){
            res.status(200).send(ejs.render(loginEJS, {title: roomName, id: id, usePassword: true}));
        }else{
            res.status(200).send(ejs.render(loginEJS, {title: roomName, id: id, usePassword: false}));
        }
      
    }
});

app.use(roomRouter);

//Public Folder
var pagesRouter = express.Router();
pagesRouter.use(express.static(__dirname + '/public', { maxAge: day }));
app.use('/', pagesRouter);


//Sockets
io.on('connection', function(socket){
      if(socketConnections().length <= 1024){
        socket.username = socket.handshake.query.username;
        socket.join(socket.handshake.query.room);
        socket.on('postName', function(username){
                socket.username = username;
                });
        var socketsConnected = socketConnections(socket.handshake.query.room);
        io.in(socket.handshake.query.room).emit('connections', socketsConnected.length + 1);
        socket.on('chat message', function(msg){
            if(!verifyEmptyness(msg.message)){
                var result = processMessage(msg);
                if(result.sendToAll === true){
                    io.in(socket.handshake.query.room).emit('chat message', result);
                    db.add(result, socket.handshake.query.room);
                }else{
                    socket.emit('chat message', result);
                }
            }else{
                var time = moment(msg.date).format("LT, D/M");
                socket.emit('chat message', createResponse('','You may not send empty messages',time, '', true,false, false));
            }
        });
      socket.on('users', function(){
                var socketsConnected = socketConnections(socket.handshake.query.room);
                io.in(socket.handshake.query.room).emit('connections', socketsConnected.length + 1);
                });
      socket.on('disconnect', function(){
                var socketsConnected = socketConnections(socket.handshake.query.room);
                io.in(socket.handshake.query.room).emit('connections', socketsConnected.length + 1);
                });
      }else{
      socket.emit('chat message', createResponse('PM','Sorry, we cannot allow more than 1024 connections in the server',time, ': ', true,false, false));
      socket.emit('chat message',  createResponse('PM','Disconnecting! Try again later.',time, ': ', true,false, false));
      socket.emit('connections', 'You are not connected.');
      socket.disconnect();
      }
});

var processMessage = function(message){
    var time = moment(message.date).format("LT, D/M");
    var response;
    if(message.message.length <= 8192){
    if(message.message.slice(0,1) !== "/"){
        response = createResponse(message.username, message.message,time, ': ', true,true, true);
    }else{
        var command = firstWord(message.message);
        switch(command.toLowerCase()){ // As example /HELP, /helP, /HeLp
            case "/help":
                response = createResponse('',"Montreus Chat - v1.4<br>Available commands:<br>/help - Display help commands<br>/bot-say &lt;message&gt; - Give something for the bot to say!<br>/broadcast &lt;message&gt; - Broadcast a message</p>", time, '', false,false, false);
       
            break;
            case "/bot-say":
                var msg = otherWords(message.message);
                if(msg.length <= 0){
                    response = createResponse('PM','Uh oh! You forgot the message: /Bot-say message', time, ': ', true, false, true);
                }else{
                    response = createResponse('Chat bot',msg, time, ': ', true, true, true);
                }
            break;
            case "/broadcast":
                var msg = otherWords(message.message);
                if(msg.length <= 0){
                    response = createResponse('PM','Uh oh! You forgot the message: /Broadcast message', time, ': ', true, false, true);
                }else{
                    response = createResponse('BROADCAST',msg, time, ': ', true, true, true);
                }
            break;
            case "/me":
                response = createResponse('', 'Montreus Chat - v1.4<br>Username: ' + message.username, time, '', false, false, true);
            break;
            case "/version":
                response = createResponse('', 'Montreus Chat - v1.4', time, '', false, false, false);
            break;
            default:
                response = createResponse('', 'Invalid command', time, '', false, false, false);
        }
    }
    }else{
        response = createResponse('PM', 'Uh oh! Sorry, you cannot send messages longer than 8192 characters.', time, '', false, false, false);
    }
    return response;
}

var createResponse = function(username, message, time, usernameMessageSperator, processMarkdown, sendToAll, notify){
  
    var response = {
        username : html.escape(username),
        message : message,
        processMarkdown : processMarkdown,
        time : time,
        usernameMessageSperator : usernameMessageSperator,
        sendToAll : sendToAll,
        notify: notify
    };
    if(processMarkdown === true){
        msg = markdown.renderInline(message);
        response.message = msg;
    }
    return(response);
};
var firstWord = function(string){
    if(string.indexOf(" ") == -1){
        return string;
    }
    return string.substr(0, string.indexOf(" "));
}
var otherWords = function(string){
      if(string.indexOf(" ") == -1){
        return '';
    }
    return string.substr(string.indexOf(" ") + 1,string.length);
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
