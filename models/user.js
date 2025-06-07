const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/miniProject');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        min: 0
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: String,
    otpExpiresAt: Date
});


module.exports = mongoose.model('User', userSchema);