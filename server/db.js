/* server/db.js
 * MongoDB communicator for Montreus Chat. Optional module!
 */
 
 //APIs
 var mongoose = require("mongoose");
 
//Globals
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId; 

//Startup Routines
mongoose.connect('mongodb://localhost/chat-db', function (error) {
  if (error) {
      console.warn(error);
    }else{
      console.log("Connection to MongoDB established");
    }
});

//MongoDB Globals
var MessageSchema = new Schema({
    result :  {},
    room : String
});
var Message = mongoose.model('Message', MessageSchema);
//
var findMessages = function(room) {
    return new Promise(function (resolve, decline){
        Message.find({room: room}).sort({sent: 'ascending'}).limit(30).exec(function(error, messages) {
            if(!error){
                resolve(messages);
            }else{
                console.error(error.message);
                decline(error);
            }
        });
    });
}

var addNewMessage = function(result, room){
    return new Promise(function (resolve, decline){
        var newMessage = new Message({
            result: result,
            room: room
        });
        newMessage.save(function(error){
            if(!error){
                resolve();
            }else{
                console.error(error);
                decline(error);
            }
        });
    });
}

//Exporting methods
exports.find = findMessages;
exports.add = addNewMessage;
