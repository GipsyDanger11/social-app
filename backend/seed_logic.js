const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Post = require('./models/Post');

const seedLogic = async () => {
    try {
        // Create test users
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const users = await User.insertMany([
            {
                username: 'johndoe',
                email: 'john@example.com',
                password: hashedPassword,
                avatar: 'https://i.pravatar.cc/150?u=john',
                bio: 'Love hiking and photography 📸'
            },
            {
                username: 'janedoe',
                email: 'jane@example.com',
                password: hashedPassword,
                avatar: 'https://i.pravatar.cc/150?u=jane',
                bio: 'Full-stack developer and coffee enthusiast ☕'
            },
            {
                username: 'social_explorer',
                email: 'explorer@example.com',
                password: hashedPassword,
                avatar: 'https://i.pravatar.cc/150?u=explorer',
                bio: 'Exploring the world of social networking!'
            }
        ]);

        // Create test posts
        await Post.insertMany([
            {
                content: 'Just joined this awesome social platform! Hello world! 👋',
                author: users[0]._id,
                authorUsername: users[0].username,
                likes: [users[1].username],
                comments: [
                    { username: users[1].username, text: 'Welcome John! Glad to have you here.' }
                ]
            },
            {
                content: 'Check out this beautiful sunset from my hike today!',
                imageUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80',
                author: users[0]._id,
                authorUsername: users[0].username,
                likes: [users[2].username]
            },
            {
                content: 'Working on a new React project. Coding is life! 💻✨',
                author: users[1]._id,
                authorUsername: users[1].username,
                likes: [users[0].username, users[2].username]
            }
        ]);
    } catch (err) {
        console.error('Seeding error:', err);
    }
};

module.exports = seedLogic;
