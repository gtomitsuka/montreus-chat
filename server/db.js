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
    message: String,
    room: String,
    sent: Date
});
var Message = mongoose.model('Message', UserSchema);
//
var findMessages = function(room) {
    Message.find({}).sort({date: -1}).exec(function(err, docs) {});
}
