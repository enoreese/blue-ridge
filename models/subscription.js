const mongoose = require('mongoose');
const deepPopulate = require('mongoose-deep-populate')(mongoose)

const subscriptionSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    kureener: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    unique_id: String,
    payment_reference: String,
    amount: Number,
    bedroom: Number,
    housemates: String,
    plan: String,
    meter_number: Number,
    pref_window: { type: Number },
    day: String,
    cleans: { type: Number, default: 0.0 },
    power: { type: Number, default: 0.0 },
    gas: { type: Number, default: 0.0 },
    message: String,
    house_number: String,
    delivered: { type: Number, default: 0.0 },
    last_delivered: Date,
    first_delivered: Date,
    address: String,
    landmark: String,
    city: String,
    state: String,
    country: String,
    addons: [{ type: String }],
    status: { type: String, default: "created" },
    disbursed: { type: Boolean, default: false },
    declined: { type: Boolean, default: false },
    hasPaid: { type: Boolean, default: false },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
});

//Populates schema to any level
subscriptionSchema.plugin(deepPopulate)
module.exports = mongoose.model('Subscription', subscriptionSchema);