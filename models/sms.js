const mongoose =  require('mongoose');

const smsSchema = new mongoose.Schema({
    owner: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    // recepient: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    message: String,
    phone: Number,
    sentBy: String,
    status: {type: Boolean, default: false},
    created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('SMS', smsSchema);