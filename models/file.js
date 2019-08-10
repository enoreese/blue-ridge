const mongoose =  require('mongoose');

const fileSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    caption: String,
    name: String,
    created: { type: Date, default: Date.now}
});

module.exports = mongoose.model('File', fileSchema);