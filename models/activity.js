const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const NotificationsSchema = new Schema({
//   image: String,
  owner: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  action: String,
  content: String,
  color: String,
  status: String,
  message: String,
  sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  subscription: {type: mongoose.Schema.Types.ObjectId, ref: "Subscription"},
  read: {type:Boolean, default: false},
  created: {type:Date, default: Date.now()},
});

module.exports = mongoose.model('Activity', NotificationsSchema);