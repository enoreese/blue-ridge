const mongoose = require("mongoose");
const deepPopulate = require('mongoose-deep-populate')(mongoose)
const bcrypt = require("bcrypt-nodejs");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema({
    email: {type: String, unique: true, lowercase: true},
    fullname: String,
    isVerified: {type: Boolean, default: false},
    password: String,
    phonenumber: {type: Number},
    location: String,
    addresses: [{
        house_number: String,
        address: String,
        landmark: String,
        city: String,
        state: String,
        country: String
    }],
    address: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    photo: String,
    twitter_id: String,
    twitter: String,
    twitter_object: {
        id: String,
        display_name: String,
        name: {
            family_name: String,
            given_name: String,
            middle_ame: String
        },
        emails: [{
            value: String,
            type: String
        }],
        photos: [{
            value: String
        }]
    },
    facebook_id: String,
    facebook_object: {
        id: String,
        display_name: String,
        name: {
            familyName: String,
            givenName: String,
            middleName: String
        },
        emails: [{
            value: String,
            type: String
        }],
        photos: [{
            value: String
        }]
    },
    facebook: String,
    instagram: String,
    kureenScore: {type: Number, default: 100},
    // hasApplied: {type: Boolean, default: false},
    // hasPaid: {type: Boolean, default: false},
    role: Number,
    hasRated: {type: Boolean, default: false},
    createdAt: {type: Date, default: Date.now()},
    updatedAt: {type: Date, default: Date.now()},
    subscriptions: [{
        type: mongoose.Schema.Types.ObjectId, ref: "Subscription"
    }],
    
    cards:[{
        type: mongoose.Schema.Types.ObjectId, ref: "Cards"
    }],
    file:[{
        type: mongoose.Schema.Types.ObjectId, ref: "File"
    }],
    review:[{
        type: mongoose.Schema.Types.ObjectId, ref: "Review"
    }],
    sms:[{
        type: mongoose.Schema.Types.ObjectId, ref: "SMS"
    }]
});

UserSchema.pre("save", function (next) {
    var user = this;
    if(!user.isModified("password")) return next();
    if(user.password){
        bcrypt.genSalt(10, function(err, salt) {
            if(err) return next();
            bcrypt.hash(user.password, salt, null, function(err, hash) {
                if(err) return next();
                user.password = hash;
                next(err);
            });
        });
    }
});

//Schema to associate user image to email
UserSchema.methods.gravatar = function(size) {
    if(!size) size = 200;
    return '/files/1548154303513-file.png'
    // if(!this.email) return "https://gravatar.com/avatar/?s=" + size + "&d=retro";
    // var md5 = crypto.createHash("md5").update(this.email).digest("hex");
    // return "https://gravatar.com/avatar/" + md5 + "?s=" + size + "&d=retro";
};

//Schema to comparing user inputed Password and the passsword in the DB
UserSchema.methods.comparePassword = function(password) {
    return bcrypt.compareSync(password, this.password);
}
//Populates schema to any level
UserSchema.plugin(deepPopulate)
module.exports = mongoose.model("User", UserSchema);