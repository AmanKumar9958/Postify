const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { storage: cloudinaryStorage } = require('../Cloudinary/cloudinary');

// Set up disk configuration for multer for uploading user profile images
const DP = multer.diskStorage({
    // set the destination to the uploads directory
    destination: function (req, file, cb) {
        cb(null, './public/uploads/avatar') // Ensure this path exists
    },
    // set the filename to a random string
    filename: function (req, file, cb) {
        crypto.randomBytes(12, (err, name) => {
            const fileName = name.toString("hex")+path.extname(file.originalname);
            cb(null, fileName) // Use the random name for the file
        })
    }
})


const uploadCloudinary = multer({ storage: cloudinaryStorage }); // For posts
const uploadLocal = multer({ storage: DP }); // For profile pics

module.exports = { uploadCloudinary, uploadLocal };