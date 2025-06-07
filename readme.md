# 📝 Postify - A Simple Post Sharing Web App

Postify is a full-stack web application where users can sign up, log in, share posts, like them, and manage their own content. Built using Node.js, Express, MongoDB, EJS, and TailwindCSS, it demonstrates full CRUD operations with authentication.

---

## 🔗 Live Demo

Coming soon...

---

## ⚙️ Features

- ✅ User Authentication (JWT with cookies)
- ✅ Create, Read, Update, and Delete Posts
- ✅ Like / Unlike Posts (toggle-based)
- ✅ See posts from all users
- ✅ "My Posts" section to view and manage your own content
- ✅ Modal for viewing post details
- ✅ Only post owners can see Edit & Delete buttons
- ✅ Alerts for unauthorized access (auto-hide after few seconds)

---

## 🧰 Tech Stack

**Frontend:**
- EJS Templates
- Tailwind CSS
- FontAwesome Icons

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT (JSON Web Tokens)

**Dev Tools:**
- nodemon
- dotenv

---

## 📂 Project Structure

project-root/
│
├── models/
│ └── user.js
│ └── post.js
│
├── routes/
│ └── auth.js
│ └── posts.js
│
├── views/
│ ├── partials/
│ │ └── navbar.ejs
│ ├── login.ejs
│ ├── register.ejs
│ ├── posts.ejs
│ └── myPosts.ejs
│
├── public/
│ └── css/
│ └── style.css
│
├── .env
├── app.js
├── package.json


---

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- MongoDB (local or Atlas)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/postify.git
cd postify
