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
var bodyParser = require('body-parser');
var compression = require('compression');
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

//Globals
var day = 86400000;
var rooms = require("./room"); //JSON with Rooms
var db = require("./db");
var urlencodedParser = bodyParser.urlencoded({ extended: false });

//Init EJS
var roomEJS;
fs.readFile('./views/room.ejs', 'utf8', function (error, data) {
  if(error)
    console.log(error)
  else
    roomEJS = data;
});

var loginEJS;
fs.readFile('./views/login.ejs', 'utf8', function (error, data) {
  if(error)
    console.error(error);
  else
    loginEJS = data;
});

var errorEJS;
fs.readFile('./views/error.ejs', 'utf8', function (error, data) {
  if(error)
    console.error(error);
  else
    errorEJS = data;
});

var indexEJS;
fs.readFile('./views/list.ejs', 'utf8', function (error, data) {
  if(error)
    console.error(error);
  else
    indexEJS = data;
});

//Init Room List
var publicRooms = [];
for(i = 0; i < rooms.length; i++){
    var roomAtIndex = rooms[i];
    if(roomAtIndex.public == true){
        publicRooms.push(roomAtIndex);
    }
}

//Connection Handlers
app.get('/', function(req, res){
    res.set('Content-Type', 'text/html');
    res.status(200).send(ejs.render(indexEJS, {rooms: publicRooms}));
});
//Uses EJS
var roomRouter = express.Router();
roomRouter.post('/room/:id/', urlencodedParser, function(req, res,next){
    if (!req.body) return res.sendStatus(400);
    //Room Parameters
    var roomName;
    var roomId;
    var roomPassword;
    var isPublic;
    
    //Request Parameters
    var id = req.params.id;
    var postUsername = req.body.username;
    var postPassword = req.body.password;
    
    //Search for room with the name
    for(var i = 0; i < rooms.length; i++){
      var room = rooms[i];
        if(room.number == id){
            roomName = room.name;
            roomId = room.roomId;
            roomPassword = room.password;
            isPublic = room.public;
        }
    }
    if(roomName == null){
        res.status(404).sendFile(__dirname + '/error.html');
    }else{
        if(!isPublic) {
        if(roomPassword + '' == postPassword){
            db.find(roomId).then(function(messages){
                res.set('Content-Type', 'text/html');
                res.status(200).send(ejs.render(roomEJS, {title: roomName, id: roomId, username: postUsername, messages: messages}));
            }, function(error){
                res.status(500).send("Uh oh! An error ocurred: " + error.message);
            });
        }else{
            res.status(400).send(ejs.render(errorEJS, {title: 'Montreus Chat', error: 'Incorrect Password.'}));
        }
        }else{
            db.find(roomId).then(function(messages){
                res.set('Content-Type', 'text/html');
                res.status(200).send(ejs.render(roomEJS, {title: roomName, id: roomId, username: postUsername, messages: messages}));
            }, function(error){
                res.status(500).send("Uh oh! An error ocurred: " + error.message);
            });
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
        res.status(404).send(ejs.render(errorEJS, {title: 'Montreus Chat', error: "Uh oh! This room sadly doesn't exist."}));
    }else{
        res.set('Content-Type', 'text/html');
        if(roomPassword != null){
            res.status(200).send(ejs.render(loginEJS, {title: roomName, id: id, isPasswordProtected: true}));
        }else{
            res.status(200).send(ejs.render(loginEJS, {title: roomName, id: id, isPasswordProtected: false}));
        }
      
    }
});
roomRouter.use(compression({ threshold: 512 }));
app.use(roomRouter);

//Public Folder
var pagesRouter = express.Router();
pagesRouter.use(express.static(__dirname + '/public', { maxAge: day }));
pagesRouter.use(compression({ threshold: 512 }));
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
                var time = moment(time).format("LT, D/M");
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
    var time = moment(new Date()).format("LT, D/M");
    var response;
    if(message.message.length <= 8192){
    if(message.message.slice(0,1) !== "/"){
        response = createResponse(message.username, message.message,time, ': ', true,true, true);
    }else{
        var command = firstWord(message.message);
        switch(command.toLowerCase()){
            case "/help":
                response = createResponse('',"Montreus Chat - v2.0<br>Available commands:<br>/help - Display help commands<br>/bot-say &lt;message&gt; - Give something for the bot to say!<br>/broadcast &lt;message&gt; - Broadcast a message</p>", time, '', false,false, false);
       
            break;
            case "/bot-say":
                var msg = otherWords(message.message);
                if(msg.length <= 0){
                    response = createResponse('PM','Uh oh! You forgot the message: /bot-say &lt;message&gt;', time, ': ', true, false, true);
                }else{
                    response = createResponse('Chat bot',msg, time, ': ', true, true, true);
                }
            break;
            case "/broadcast":
                var msg = otherWords(message.message);
                if(msg.length <= 0){
                    response = createResponse('PM','Uh oh! You forgot the message: /broadcast &lt;message&gt;', time, ': ', true, false, true);
                }else{
                    response = createResponse('BROADCAST',msg, time, ': ', true, true, true);
                }
            break;
            case "/me":
                response = createResponse('', 'Montreus Chat - v2.0<br>Username: ' + message.username, time, '', false, false, true);
            break;
            case "/version":
                response = createResponse('', 'Montreus Chat - v2.0', time, '', false, false, false);
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
        message : html.escape(message),
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
