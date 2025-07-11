const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require("./Multer/multer");
const crypto = require('crypto');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err);
})


// for otp..
const sendOTP = require('./OTP/sendOTP');
const { uploadCloudinary } = require('./Multer/multer');
const { uploadLocal } = require('./Multer/multer');

// to render pages using EJS..
app.set('view engine', 'ejs');

// for parsing JSON and URL-encoded data (like form submissions)..
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// for setting up cookies..
app.use(cookieParser());

// for serving static files like CSS, JS, images, etc.
app.use(express.static(path.join(__dirname, 'public')));

// our landing page route..
app.get('/', async (req, res) => {
    const token = req.cookies.token;
    let user = null;
    if (token) {
        try {
            const data = jwt.verify(token, "secretKey");
            user = await userModel.findById(data.userid);
        } catch (err) {
            console.error(err);
            res.clearCookie('token');
        }
    }
    const totalUsers = await userModel.countDocuments();
    const totalPosts = await postModel.countDocuments();
    res.render('landingPage', { user, req, totalUsers, totalPosts });
})

// our home route..
app.get('/home', isLoggedIn, async(req, res) => {
    let user = null;
    let isLoggedIn = false;

    // Check if the user is logged in by checking the token cookie..
    const token = req.cookies.token;
    if(token){
        try{
            const data = jwt.verify(token, "secretKey");
            user = await userModel.findById(data.userid);
            isLoggedIn = true;
        } catch(err) {
            console.error(err);
            res.clearCookie('token'); // Clear the cookie if verification fails
            return res.redirect('/login');
        }
    }
    const totalUsers = await userModel.countDocuments();
    const totalPosts = await postModel.countDocuments();
    const posts = await postModel.find().populate('user', 'username').sort({ createdAt: -1 });

    res.render('home', {
        isLoggedIn,
        user,
        posts,
        req,
        totalUsers,
        totalPosts
    });
});

// login page route..
app.get('/login', (req, res) => {
    res.render('login');
});

// Register page route..
app.get('/register', async(req, res) => {
    res.render("register")
});

// our register route..
app.post('/register', async(req, res) => {
    // Check if the request body has all required fields..
    let { username, email, password, age } = req.body;
    if(!username || !email || !password || !age){
        return res.redirect('/register?error=user_exists');
    }

    // Check if user already exists..
    let user = await userModel.findOne({ $or: [{email}, {username}] });
    if(user){
        return res.redirect('/register?error=user_exists');
    }

    // Hash the password before saving it to the database..
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async(err, hash) => {
            if(err) {
                return res.status(500).send('Error hashing password');
            }

            // Generate a OTP and set its expiration time..
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

            // Send the OTP to the user's email..
            try {
                await sendOTP(email, otp);
            } catch (error) {
                console.error('Error sending OTP:', error);
                return res.status(500).send('Error sending OTP');
            }
            
            // Create a new user instance..
            let user = await userModel.create({
                username,
                email,
                password: hash,
                age,
                otp,
                otpExpiresAt
            });

            // Generate a JWT token for the user..
            let token = jwt.sign({email: user.email, userid: user._id}, "secretKey");

            // Send the token as a cookie in the response..
            res.cookie("token", token, {
                httpOnly: true,
                secure: false, // Set to true if using HTTPS
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });
            res.redirect(`/verifyOTP?email=${email}`);
        })
    })
})

// OTP verification page route..
app.get('/verifyOTP', (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.redirect('/register?error=missing_email');
    }
    res.render('verifyOTP', { email });
});

// OTP verification route..
app.post('/verifyOTP', async(req, res) => {
    const { email, otp } = req.body;

    // Check if the request body has all required fields..
    if (!email || !otp) {
        return res.redirect(`/verifyOTP?email=${email}&error=missing_fields`);
    }

    // Find the user by email and check the OTP..
    let user = await userModel.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpiresAt) {
        return res.redirect(`/verifyOTP?email=${email}&error=invalid_otp`);
    }

    // OTP is valid, clear it and save the user..
    user.otp = null;
    user.otpExpiresAt = null;
    user.isVerified = true; // Mark the user as verified
    await user.save();

    // Redirect to the profile page after successful verification..
    res.redirect('/login');
});

// our login route..
app.post('/login', async(req, res) => {
    // Check if the request body has all required fields..
    let { username, password } = req.body;
    if (!username || !password) {
        return res.redirect('/login?error=true');
    }

    // Check if the user exists in the database..
    let user = await userModel.findOne({ username });
    if (!user) {
        return res.redirect('/login?error=true');
    }

    // Compare the provided password with the hashed password in the database..
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: user.email, userid: user._id }, "secretKey");
            // Send the token as a cookie in the response..
            res.cookie("token", token, {
                httpOnly: true,
                secure: false, // Set to true if using HTTPS
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });
            res.redirect('/profile');
        } else {
            return res.redirect('/login?error=true');
        }
    });
});

// our logout route..
app.get('/logout', (req, res) => {
    // Clear the token cookie to log out the user..
    res.clearCookie('token');
    res.redirect('/');
});

// Checking for protected routes..
function isLoggedIn(req, res, next){
    const token = req.cookies.token;
    if(!token){
        return res.redirect('/login');
    }
    try{
        const data = jwt.verify(token, "secretKey");
        req.user = data;
        next();
    } catch(err){
        console.error(err);
        return res.redirect('/login');
    }
}

// Our profile page route..
app.get('/profile', isLoggedIn, async(req, res) => {
    // Fetch the user data from the database using the user ID from the JWT token..
    let user = await userModel.findById(req.user.userid);
    if(!user){
        return res.redirect('/login');
    }
    // Fetch only posts created by the logged-in user
    const posts = await postModel.find({ user: user._id }).populate('user', 'username').sort({ createdAt: -1 });
    res.render('profile', { user, posts, req });
});

// All Posts page route..
app.get('/posts', isLoggedIn, async(req, res) => {
    // Fetch all posts from the database..
    const posts = await postModel.find().populate('user', 'username').sort({ createdAt: -1 });
    const user = await userModel.findById(req.user.userid);
    res.render('posts', { posts, user, req });
});

// Create Post route..
app.post('/create-post', isLoggedIn, uploadCloudinary.single('image'), async(req, res) => {
    try{
        let { title, content } = req.body;
        const image = req.file ? req.file.path : null; // Cloudinary gives public URL here
        let user = await userModel.findOne({email: req.user.email});
        let post = await postModel.create({
            user: user._id,
            title,
            content,
            image,
        })
        user.posts.push(post._id);
        await user.save();  
        res.redirect('/posts')
    } catch(err){
        console.error("Post creation error:", err);
        res.status(500).send("Internal Server Error");
    }
})

// Route for uploading a profile picture..
app.post('/upload-avatar', uploadLocal.single("avatar"), isLoggedIn, async(req, res) => {
    let user = await userModel.findOne({email: req.user.email})
    user.profilePicture = req.file.filename;
    await user.save();
    res.redirect('/profile');
})

// Route for like/unlike..
app.get('/like/:id', isLoggedIn, async(req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect('/posts');
})

// Route for deleting a post..
app.get('/delete-post/:id', isLoggedIn, async(req, res) => {
    // Check if the user is the owner of the post..
    let post = await postModel.findOne({_id: req.params.id});
    if(!post || post.user.toString() !== req.user.userid) {
        return res.redirect('/posts?error=you_are_not_user');
    }
    // Delete the post from the database..
    await postModel.deleteOne({_id: req.params.id});
    // Remove the post reference from the user's posts array..
    let user = await userModel.findById(req.user.userid);
    user.posts = user.posts.filter(p => p.toString() !== req.params.id);
    await user.save();
    res.redirect('/posts');
})

// Route for deleting post for my posts page..
app.get('/delete-my-post/:id', isLoggedIn, async(req, res) => {
    // Check if the user is the owner of the post..
    let post = await postModel.findOne({_id: req.params.id});
    if(!post || post.user.toString() !== req.user.userid) {
        return res.redirect('/posts?error=you_are_not_user');
    }
    // Delete the post from the database..
    await postModel.deleteOne({_id: req.params.id});
    // Remove the post reference from the user's posts array..
    let user = await userModel.findById(req.user.userid);
    user.posts = user.posts.filter(p => p.toString() !== req.params.id);
    await user.save();
    res.redirect('/myPosts');
})

// Route for showing the edit post page..
app.get('/edit-post/:id', isLoggedIn, async(req, res) =>{
    let post = await postModel.findOne({_id: req.params.id});
    if(!post){
        return res.redirect('/posts?error=post_not_found');
    } else{
        res.render('editPost', { post, req });
    }
})

// Route for updating a post..
app.post('/update-post/:id', isLoggedIn, async(req, res) => {
    // Check if the user is the owner of the post..
    let posts = await postModel.findOne({_id: req.params.id});
    if (!posts || posts.user.toString() !== req.user.userid) {
        return res.redirect('/posts?error=not_authorized');
    }
    // Check if the request body has all required fields..
    if (!req.body.content || !req.body.title) {
        return res.redirect(`/edit-post/${req.params.id}?error=missing_fields`);
    }
    // Find the post by ID and update it with the new content and title..
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content, title: req.body.title}, {new: true});
    if(!post){
        return res.redirect('/posts?error=post_not_found');
    }
    res.redirect('/posts');
})

// Getting current user all posts route..
app.get('/myPosts', async(req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        const data = jwt.verify(token, "secretKey");
        const user = await userModel.findById(data.userid).populate('posts');
        if (!user) {
            return res.redirect('/login');
        }
        res.render('myPosts', { user, posts: user.posts, req });
    } catch (err) {
        console.error(err);
        res.clearCookie('token'); // Clear the cookie if verification fails
        return res.redirect('/login');
    }
})

// Route of showing a profile picture upload page..
app.get('/avatar', isLoggedIn, (req, res) => {
    res.render('avatar', { user: req.user });
});

// Route for showing forgot password page..
app.get('/forgot-password', (req, res) => {
    res.render('forgotPassword');
});

// Route for handling forgot password request..
app.post('/forgot-password', async(req, res) => {
    const { email } = req.body;
    if (!email) return res.redirect('/forgot-password?error=missing_email');

    const user = await userModel.findOne({ email });
    if (!user) return res.redirect('/forgot-password?error=email_not_found');

    // Generate token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with reset link
    const resetLink = `http://localhost:3000/reset-password/${token}`;
    await sendOTP(email, `Reset your password: ${resetLink}`);

    res.render('forgotPassword', { message: 'Reset link sent to your email.' });
});

// Show reset password form
app.get('/reset-password/:token', async (req, res) => {
    const user = await userModel.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.send('Invalid or expired token.');
    res.render('resetPassword', { token: req.params.token });
});


// Handle new password submission
app.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    const user = await userModel.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.send('Invalid or expired token.');

    // Hash new password
    const hash = await bcrypt.hash(password, 10);
    user.password = hash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.redirect('/login');
});

// Our port..
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});

module.exports = app;