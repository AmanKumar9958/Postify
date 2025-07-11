const mongoose = require('mongoose');

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
    otpExpiresAt: Date,
    profilePicture: {
        type: String,
        default: 'default_dp.png' // Default avatar image
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});


module.exports = mongoose.model('User', userSchema);