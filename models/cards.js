const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CardsSchema = new Schema({
    //   image: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    last4: String,
    expMonth: Number,
    authorization_code: String,
    expYear: { type: Number },
    brand: { type: String },
    channel: { type: String },
    card_type: String,
    bank: String,
    country_code: String,
    brand: String,
    reusable: Boolean,
    signature: String,
    customer: {
        id: Number,
        first_name: String,
        last_name: String,
        email: String,
        customer_code: String,
        phone: String,
        metadata: String,
        risk_action: String
    }
});

module.exports = mongoose.model('Cards', CardsSchema);