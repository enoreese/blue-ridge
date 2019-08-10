const mongoose =  require('mongoose');

const reviewSchema = new mongoose.Schema({
    owner: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    rating: String,
    review: String,
    created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Review', reviewSchema);