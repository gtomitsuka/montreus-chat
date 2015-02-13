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
var notifier = require('node-notifier');
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


//Connection Handlers
app.get('/', function(req, res){
    res.status(200).sendFile(__dirname + '/index.html');
});
app.post('/notification',urlencodedParser, function(req, res){
    if (!req.body) return res.sendStatus(400);
    var name = req.body.name;
    var message = req.body.message;
    notifier
        .notify({
            title: 'Message from ' + name,
            message: message,
            wait: false
        });
    res.end();
});
//Uses EJS
var roomRouter = express.Router();
roomRouter.get('/room/:id/', function(req, res){
    var id = req.params.id;
    var roomName;
    var roomId;
    for(var i = 0; i < rooms.length; i++){
      var room = rooms[i];
        if(room.number == id){
            roomName = room.name;
            roomId = room.roomId;
        }
    }
    if(roomName == null){
        res.status(404).sendFile(__dirname + '/error.html');
    }else{
        db.find(roomId).then(function(messages){
            res.set('Content-Type', 'text/html');
        res.status(200).send(ejs.render(indexEJS, {title: roomName, id: roomId, messages: messages}));
        }, function(error){
            res.status(500).send("Uh oh! An error ocurred: " + error.message);
        });
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
                socket.emit('chat message', generateMessage("You may not send empty messages", time, false));
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
      socket.emit('chat message', 'PM: Sorry, we cannot allow more than 1024 connections in the server');
      socket.emit('chat message', 'PM: Disconnecting! Try again later.');
      socket.emit('connections', 'You are not connected.');
      socket.disconnect();
      }
});

var processMessage = function(message){
    var time = moment(message.date).format("LT, D/M");
    var response;
    if(message.message.length <= 8192){
    if(message.message.slice(0,1) !== "/"){
        response = createResponse(message.username, message.message,time, true,true);
    }else{
        var command = firstWord(message.message);
        switch(command){
            case "/help":
                response = createResponse('',"Montreus Chat - v1.4<br>Available commands:<br>/help - Display help commands<br>/bot-say &lt;message&gt; - Give something for the bot to say!<br>/broadcast &lt;message&gt; - Broadcast a message</p>", time, false,false);
       
            break;
            case "/bot-say":
                response = createResponse('Chat bot',otherWords(message.message), time, true, true);
            break;
            case "/broadcast":
                response = createResponse('BROADCAST',otherWords(message.message), time, true, true);
            break;
            case "/me":
                response = createResponse(message.username, 'Montreus Chat - v1.4<br>Username: ', time, false, false);
            break;
            case "/version":
                response = createResponse('', 'Montreus Chat - v1.4', time, false, false);
            break;
            default:
                response = createResponse('', 'Invalid command', time, false, false);
        }
    }
    }else{
        response = createResponse('PM', 'Uh oh! Sorry, you cannot send messages longer than 8192 characters.', time, false, false);
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

var createResponse = function(username, message, time, processMarkdown, sendToAll){
  
    var response = {
        username : html.escape(username),
        message : message,
        processMarkdown : processMarkdown,
        time : time,
        usernameMessageSperator : ': ',
        sendToAll : sendToAll
    };
    if(processMarkdown === true){
        msg = markdown.renderInline(message);
        response.message = msg;
    }
    return(response);
};
var firstWord = function(string){
    return string.substr(0, string.indexOf(" "));
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
