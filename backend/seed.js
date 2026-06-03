/**
 * @file Standalone seed CLI.
 * @description Connect directly to `MONGO_URI`, wipe the database, and
 *              repopulate it with the same demo content as `seed_logic.js`.
 *              Run with `npm run seed` to rebuild the database from scratch
 *              (e.g. when you change the demo users or posts).
 *
 *              Differences from `seed_logic.js`:
 *                - Connects to MongoDB directly (no in-memory fallback).
 *                - Wipes ALL collections before seeding.
 *                - Includes notifications + sample messages in the output.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Post = require('./models/Post');
const Task = require('./models/Task');
const Notification = require('./models/Notification');
const Message = require('./models/Message');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Connect to MongoDB, wipe all collections, and repopulate with demo data.
 * Exits the process when finished.
 *
 * @returns {Promise<void>}
 */
const seedData = async () => {
    try {
        console.log('📡 Connecting to MongoDB for seeding...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            family: 4
        });
        console.log('✅ Connected Successfully!');

        // Clear all existing data
        await User.deleteMany({});
        await Post.deleteMany({});
        await Task.deleteMany({});
        await Notification.deleteMany({});
        await Message.deleteMany({});
        console.log('🗑️  Cleared old data');

        // Create test users with realistic profiles
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const usersData = [
            { username: 'johndoe', email: 'john@example.com', bio: '🏔️ Hiking enthusiast & 📸 photographer', avatar: 'https://i.pravatar.cc/300?u=john', coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop' },
            { username: 'janedoe', email: 'jane@example.com', bio: '☕ Full-stack developer | Tech lover', avatar: 'https://i.pravatar.cc/300?u=jane', coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=400&fit=crop' },
            { username: 'social_explorer', email: 'explorer@example.com', bio: '🌍 Digital nomad exploring the world', avatar: 'https://i.pravatar.cc/300?u=explorer', coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=400&fit=crop' },
            { username: 'mike_tech', email: 'mike@example.com', bio: '💻 Software engineer | AI enthusiast 🤖', avatar: 'https://i.pravatar.cc/300?u=mike', coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop' },
            { username: 'sara_designs', email: 'sara@example.com', bio: '🎨 UI/UX Designer | Creating beautiful things ✨', avatar: 'https://i.pravatar.cc/300?u=sara', coverImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=1200&h=400&fit=crop' },
            { username: 'alex_fitness', email: 'alex@example.com', bio: '💪 Personal trainer | Healthy living advocate 🥗', avatar: 'https://i.pravatar.cc/300?u=alex', coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=400&fit=crop' },
            { username: 'emily_travels', email: 'emily@example.com', bio: '✈️ Travel blogger | 50+ countries 🌍', avatar: 'https://i.pravatar.cc/300?u=emily', coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop' },
            { username: 'david_chef', email: 'david@example.com', bio: '👨‍🍳 Professional chef | Food is love ❤️', avatar: 'https://i.pravatar.cc/300?u=david', coverImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop' },
            { username: 'lisa_artist', email: 'lisa@example.com', bio: '🎭 Digital artist | Bringing imagination to life 🌟', avatar: 'https://i.pravatar.cc/300?u=lisa', coverImage: 'https://images.unsplash.com/photo-1513365296843-1b1f4d7a9d29?w=1200&h=400&fit=crop' },
            { username: 'tom_music', email: 'tom@example.com', bio: '🎵 Musician | Producer | Beats maker 🎧', avatar: 'https://i.pravatar.cc/300?u=tom', coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=400&fit=crop' },
            { username: 'nina_books', email: 'nina@example.com', bio: '📚 Avid reader | Book reviewer 📖', avatar: 'https://i.pravatar.cc/300?u=nina', coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=400&fit=crop' },
            { username: 'chris_photo', email: 'chris@example.com', bio: '📷 Professional photographer | Nature lover 🌿', avatar: 'https://i.pravatar.cc/300?u=chris', coverImage: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&h=400&fit=crop' }
        ];

        const users = await User.insertMany(usersData.map(u => ({
            ...u,
            password: hashedPassword,
            followers: [],
            following: []
        })));

        console.log(`👥 Created ${users.length} users`);

        // Create follower/following relationships (realistic network)
        const followRelations = [
            { follower: 'johndoe', follows: ['janedoe', 'emily_travels', 'chris_photo', 'sara_designs'] },
            { follower: 'janedoe', follows: ['johndoe', 'mike_tech', 'sara_designs', 'lisa_artist'] },
            { follower: 'social_explorer', follows: ['emily_travels', 'david_chef', 'chris_photo'] },
            { follower: 'mike_tech', follows: ['janedoe', 'lisa_artist', 'tom_music'] },
            { follower: 'sara_designs', follows: ['janedoe', 'lisa_artist', 'johndoe', 'mike_tech'] },
            { follower: 'alex_fitness', follows: ['david_chef', 'johndoe'] },
            { follower: 'emily_travels', follows: ['social_explorer', 'chris_photo', 'david_chef', 'johndoe'] },
            { follower: 'david_chef', follows: ['emily_travels', 'alex_fitness', 'social_explorer'] },
            { follower: 'lisa_artist', follows: ['sara_designs', 'tom_music', 'mike_tech'] },
            { follower: 'tom_music', follows: ['lisa_artist', 'mike_tech'] },
            { follower: 'nina_books', follows: ['janedoe', 'lisa_artist'] },
            { follower: 'chris_photo', follows: ['emily_travels', 'johndoe', 'social_explorer', 'lisa_artist'] }
        ];

        for (const rel of followRelations) {
            const follower = users.find(u => u.username === rel.follower);
            if (follower) {
                follower.following = rel.follows;
                for (const followedName of rel.follows) {
                    const followedUser = users.find(u => u.username === followedName);
                    if (followedUser) {
                        followedUser.followers.push(rel.follower);
                    }
                }
                await follower.save();
            }
        }
        // Save all users with updated followers
        for (const u of users) {
            await u.save();
        }
        console.log('🔗 Created follow relationships');

        // Get all usernames for easy reference
        const usernames = users.map(u => u.username);

        // Create realistic posts with varied content
        const postsData = [
            {
                author: 'johndoe',
                content: 'Just reached the summit! What a view 🏔️ The hike was tough but absolutely worth it. Nature is the best therapy. #hiking #adventure #nature',
                imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
                type: 'post',
                likes: ['janedoe', 'emily_travels', 'chris_photo', 'sara_designs', 'social_explorer'],
                comments: [
                    { username: 'janedoe', text: 'Wow! This is absolutely stunning! 🤩' },
                    { username: 'emily_travels', text: 'Adding this to my bucket list!' },
                    { username: 'chris_photo', text: 'The composition is incredible 📸' }
                ],
                shares: ['sara_designs', 'social_explorer']
            },
            {
                author: 'janedoe',
                content: 'Finally finished my latest project after weeks of work! 💻 The feeling when your code finally compiles without errors is unmatched. Coffee was my best friend through this journey ☕ #coding #developer #webdev',
                imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
                type: 'post',
                likes: ['mike_tech', 'sara_designs', 'lisa_artist', 'johndoe', 'nina_books'],
                comments: [
                    { username: 'mike_tech', text: 'Congrats! What tech stack did you use?' },
                    { username: 'sara_designs', text: 'Proud of you! 🎉' },
                    { username: 'lisa_artist', text: 'You deserve a celebration! 🎊' }
                ],
                shares: ['mike_tech', 'sara_designs', 'lisa_artist']
            },
            {
                author: 'emily_travels',
                content: 'Lost in the streets of Tokyo 🗼 Every corner tells a story. The blend of traditional and modern here is simply magical. Already planning my next visit! 🇯🇵 #travel #japan #wanderlust',
                imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
                type: 'post',
                likes: ['social_explorer', 'david_chef', 'johndoe', 'chris_photo', 'sara_designs', 'lisa_artist'],
                comments: [
                    { username: 'david_chef', text: 'The street food there is incredible! 🍜' },
                    { username: 'chris_photo', text: 'Tokyo is a photographer\'s dream ✨' },
                    { username: 'social_explorer', text: 'Take me with you next time! 🙏' }
                ],
                shares: ['social_explorer', 'david_chef', 'chris_photo']
            },
            {
                author: 'david_chef',
                content: 'Today\'s special: Pan-seared salmon with lemon butter sauce, asparagus, and roasted baby potatoes 🍣🍋 Cooking is not just a job, it\'s an art form. Bon appétit! #foodie #chef #cooking',
                imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'alex_fitness', 'social_explorer', 'janedoe', 'lisa_artist'],
                comments: [
                    { username: 'alex_fitness', text: 'This looks both healthy AND delicious! 😋' },
                    { username: 'emily_travels', text: 'You make me want to fly to your restaurant right now!' },
                    { username: 'lisa_artist', text: 'The plating is a work of art 🎨' }
                ],
                shares: ['emily_travels', 'alex_fitness']
            },
            {
                author: 'mike_tech',
                content: 'Just deployed my first AI model to production! 🤖🎉 The journey from Jupyter notebook to scalable API was longer than I thought but incredibly rewarding. If you\'re starting out with ML, just keep pushing! #AI #MachineLearning #Tech',
                type: 'post',
                likes: ['janedoe', 'lisa_artist', 'tom_music', 'sara_designs', 'nina_books'],
                comments: [
                    { username: 'janedoe', text: 'Inspiring! What did you build?' },
                    { username: 'tom_music', text: 'Tech goals right here! 👏' }
                ],
                shares: ['janedoe', 'tom_music']
            },
            {
                author: 'sara_designs',
                content: '✨ New design system reveal ✨ Spent 3 months crafting this. Every pixel matters. Design is not just what it looks like, design is how it works. 🎨 #design #UI #UX #creative',
                imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80',
                type: 'post',
                likes: ['janedoe', 'lisa_artist', 'mike_tech', 'johndoe', 'tom_music', 'nina_books'],
                comments: [
                    { username: 'lisa_artist', text: 'The color palette is chef\'s kiss 🤌' },
                    { username: 'janedoe', text: 'This is incredible work!' },
                    { username: 'mike_tech', text: 'Clean, modern, beautiful 👌' }
                ],
                shares: ['lisa_artist', 'janedoe', 'mike_tech']
            },
            {
                author: 'alex_fitness',
                content: 'Morning workout complete! 💪 Remember: the only bad workout is the one that didn\'t happen. Start small, stay consistent, and trust the process. Your body can do it, your mind just needs to believe! 🏋️ #fitness #motivation #health',
                imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
                type: 'post',
                likes: ['david_chef', 'johndoe', 'emily_travels', 'lisa_artist'],
                comments: [
                    { username: 'david_chef', text: 'That\'s the spirit! 🔥' },
                    { username: 'johndoe', text: 'Motivation Monday energy!' }
                ],
                shares: ['johndoe']
            },
            {
                author: 'lisa_artist',
                content: 'New digital art piece just finished 🎨✨ "Cosmic Dreams" - exploring the infinite possibilities of the universe through colors and shapes. What do you see in it? 👽🌌 #digitalart #art #creative',
                imageUrl: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&q=80',
                type: 'post',
                likes: ['sara_designs', 'mike_tech', 'janedoe', 'tom_music', 'nina_books', 'chris_photo'],
                comments: [
                    { username: 'sara_designs', text: 'Breathtaking! 😍' },
                    { username: 'tom_music', text: 'The vibes are immaculate ✨' },
                    { username: 'chris_photo', text: 'Stunning composition' }
                ],
                shares: ['sara_designs', 'tom_music']
            },
            {
                author: 'tom_music',
                content: 'Just dropped a new track! 🎵🔥 Been working on this beat for weeks. Let me know what you think in the comments. Link in bio! 🎧 #newmusic #producer #beats',
                imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
                type: 'post',
                likes: ['lisa_artist', 'mike_tech', 'sara_designs', 'janedoe'],
                comments: [
                    { username: 'lisa_artist', text: 'This goes hard! 🔥' },
                    { username: 'mike_tech', text: 'On repeat! 🎧' }
                ],
                shares: ['lisa_artist']
            },
            {
                author: 'nina_books',
                content: 'Currently reading "The Midnight Library" by Matt Haig 📚✨ Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. 📖 #bookworm #reading #booklover',
                type: 'post',
                likes: ['janedoe', 'lisa_artist', 'sara_designs', 'chris_photo'],
                comments: [
                    { username: 'lisa_artist', text: 'One of my favorites! Loved it 💕' },
                    { username: 'sara_designs', text: 'Adding to my list!' }
                ],
                shares: ['lisa_artist']
            },
            {
                author: 'chris_photo',
                content: 'Golden hour magic ✨📷 Sometimes the best photos happen when you least expect them. Stay patient, stay creative, stay inspired. #photography #goldenhour #nature',
                imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'johndoe', 'social_explorer', 'lisa_artist', 'sara_designs'],
                comments: [
                    { username: 'emily_travels', text: 'Pure magic! 🌅' },
                    { username: 'johndoe', text: 'Perfection!' }
                ],
                shares: ['emily_travels', 'johndoe']
            },
            {
                author: 'social_explorer',
                content: 'Paradise found 🏝️ The Maldives exceeded all expectations. Crystal clear water, white sand, and absolute peace. This is what dreams are made of! 🌊 #maldives #travel #paradise',
                imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'david_chef', 'chris_photo', 'johndoe', 'janedoe'],
                comments: [
                    { username: 'emily_travels', text: 'Living the dream! 😍' },
                    { username: 'david_chef', text: 'Bucket list activated!' }
                ],
                shares: ['emily_travels', 'david_chef']
            },
            {
                author: 'johndoe',
                content: 'Coffee + sunrise + mountains = Perfect morning ☕🏔️ Starting the day right! #morningmotivation #coffee #nature',
                imageUrl: 'https://images.unsplash.com/photo-1442975631115-c4f7b05b8a2c?w=800&q=80',
                type: 'post',
                likes: ['janedoe', 'emily_travels', 'sara_designs'],
                comments: [
                    { username: 'sara_designs', text: 'Goals! ✨' }
                ],
                shares: ['janedoe']
            },
            {
                author: 'janedoe',
                content: 'Throwback to that magical sunset in Santorini 🌅 Sometimes you just need to pause and appreciate the beauty around you. #throwback #greece #sunset',
                imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'social_explorer', 'lisa_artist', 'sara_designs', 'chris_photo'],
                comments: [
                    { username: 'emily_travels', text: 'Santorini is on my list!' },
                    { username: 'chris_photo', text: 'Postcard perfect 📸' }
                ],
                shares: ['emily_travels', 'social_explorer']
            },
            {
                author: 'david_chef',
                content: 'Fresh pasta from scratch today! 🍝 Nothing beats homemade. The secret is in the kneading - 10 minutes of love and patience. #pastalove #italianfood #cooking',
                imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'alex_fitness', 'social_explorer', 'lisa_artist'],
                comments: [
                    { username: 'alex_fitness', text: 'This is the way! 🙌' }
                ],
                shares: ['emily_travels']
            },
            {
                author: 'mike_tech',
                content: 'Hot take: The best code is the code you don\'t write. 🚀 Less is more. Simplicity wins. #programming #cleancode #softwareengineering',
                type: 'post',
                likes: ['janedoe', 'lisa_artist', 'tom_music', 'sara_designs'],
                comments: [
                    { username: 'janedoe', text: 'This should be a poster in every office 😂' },
                    { username: 'tom_music', text: 'Wisdom 💯' }
                ],
                shares: ['janedoe']
            },
            {
                author: 'sara_designs',
                content: 'Behind the scenes of my latest branding project 🎨✨ Every great brand starts with a great story. Excited to share the final result soon! #branding #design #creative',
                imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
                type: 'post',
                likes: ['janedoe', 'lisa_artist', 'mike_tech', 'tom_music', 'nina_books'],
                comments: [
                    { username: 'lisa_artist', text: 'The process is just as beautiful as the result 💕' }
                ],
                shares: ['lisa_artist']
            },
            {
                author: 'emily_travels',
                content: 'Bali sunsets hit different 🌅✨ There\'s something about this place that heals the soul. Already counting days until I return 🇮🇩 #bali #travel #paradise',
                imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
                type: 'post',
                likes: ['social_explorer', 'david_chef', 'chris_photo', 'johndoe', 'sara_designs'],
                comments: [
                    { username: 'social_explorer', text: 'Same energy every single time! 🌴' },
                    { username: 'david_chef', text: 'The food there is amazing too!' }
                ],
                shares: ['social_explorer', 'chris_photo']
            },
            {
                author: 'lisa_artist',
                content: 'Working on something special today 🎨 Sometimes you just need to follow your creative instincts and see where they take you ✨ #art #creativeflow #digitalart',
                type: 'post',
                likes: ['sara_designs', 'mike_tech', 'janedoe', 'tom_music'],
                comments: [
                    { username: 'sara_designs', text: 'Love this energy! 💫' },
                    { username: 'tom_music', text: 'Creativity on another level' }
                ],
                shares: ['sara_designs']
            },
            {
                author: 'alex_fitness',
                content: 'Healthy meal prep Sunday! 🥗 Prepped 5 days worth of meals in under 2 hours. Planning = success. Fuel your body right! #mealprep #healthyliving #fitness',
                imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
                type: 'post',
                likes: ['david_chef', 'johndoe', 'emily_travels', 'janedoe'],
                comments: [
                    { username: 'david_chef', text: 'Looking good! 👍' }
                ],
                shares: ['david_chef']
            },
            {
                author: 'chris_photo',
                content: 'Northern Lights chasing complete! 🌌✨ Nature\'s most spectacular show. No filter needed - the sky painted itself. #aurora #northernlights #naturephotography',
                imageUrl: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'social_explorer', 'johndoe', 'lisa_artist', 'sara_designs'],
                comments: [
                    { username: 'emily_travels', text: 'Bucket list moment! 🤩' },
                    { username: 'lisa_artist', text: 'This is ART 🎨' }
                ],
                shares: ['emily_travels', 'social_explorer']
            },
            {
                author: 'tom_music',
                content: 'Studio session vibes 🎵🎧 Working on something special. Music has the power to heal, inspire, and bring people together. What\'s your favorite genre? #music #studio #producer',
                imageUrl: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=800&q=80',
                type: 'post',
                likes: ['lisa_artist', 'mike_tech', 'sara_designs', 'janedoe', 'nina_books'],
                comments: [
                    { username: 'lisa_artist', text: 'Jazz always! 🎷' }
                ],
                shares: ['lisa_artist']
            },
            {
                author: 'nina_books',
                content: 'Bookstore heaven 📚✨ Found this gem today. Independent bookstores have a magic that Amazon can never replicate. Support local! #bookstore #indiebookstore #reading',
                imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
                type: 'post',
                likes: ['janedoe', 'lisa_artist', 'sara_designs', 'mike_tech'],
                comments: [
                    { username: 'janedoe', text: 'I could live in a place like this! 😍' }
                ],
                shares: ['lisa_artist']
            },
            {
                author: 'social_explorer',
                content: 'Northern Italy vibes 🇮🇹 Pasta, pizza, and the most charming streets I\'ve ever seen. Italy, you have my heart ❤️ #italy #travel #foodie',
                imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'david_chef', 'chris_photo', 'janedoe'],
                comments: [
                    { username: 'david_chef', text: 'The food! 😍' }
                ],
                shares: ['david_chef', 'emily_travels']
            },
            {
                author: 'janedoe',
                content: 'Clean code tip: Write comments for WHY, not WHAT. Your code should be self-explanatory. The reasoning behind decisions is what matters 💡 #cleancode #programming #developer',
                type: 'post',
                likes: ['mike_tech', 'lisa_artist', 'sara_designs', 'tom_music'],
                comments: [
                    { username: 'mike_tech', text: 'Facts 💯' }
                ],
                shares: ['mike_tech']
            },
            {
                author: 'johndoe',
                content: 'Forest therapy session today 🌲 Sometimes you just need to disconnect to reconnect. The forest doesn\'t need WiFi to be amazing. #forest #nature #mindfulness',
                imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'sara_designs', 'alex_fitness'],
                comments: [
                    { username: 'alex_fitness', text: 'Mental health is wealth! 🌿' }
                ],
                shares: ['emily_travels']
            },
            {
                author: 'mike_tech',
                content: '🚀 Just open-sourced my latest project! Check it out on GitHub. Building in public is scary but incredibly rewarding. Who else is working on side projects? #opensource #developer #github',
                type: 'post',
                likes: ['janedoe', 'lisa_artist', 'tom_music', 'sara_designs', 'nina_books'],
                comments: [
                    { username: 'janedoe', text: 'Going to check it out!' }
                ],
                shares: ['janedoe', 'tom_music']
            },
            {
                author: 'lisa_artist',
                content: 'Just got my new drawing tablet! 🎨 Time to create magic ✨ Any other digital artists here? What\'s your setup? #digitalart #tablet #artist',
                imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
                type: 'post',
                likes: ['sara_designs', 'mike_tech', 'tom_music', 'janedoe'],
                comments: [
                    { username: 'sara_designs', text: 'Excited to see what you create! 💕' }
                ],
                shares: ['sara_designs']
            },
            {
                author: 'david_chef',
                content: 'Today\'s market haul! 🥬🍅 Fresh, local, seasonal. The secret to great cooking starts with great ingredients. #farmersmarket #freshfood #cooking',
                imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
                type: 'post',
                likes: ['emily_travels', 'alex_fitness', 'social_explorer'],
                comments: [
                    { username: 'alex_fitness', text: 'Quality ingredients make all the difference!' }
                ],
                shares: ['emily_travels']
            },
            {
                author: 'emily_travels',
                content: 'Iceland\'s waterfalls are out of this world 💙 Mother Nature showing off again. The raw, untouched beauty here is humbling. #iceland #waterfalls #travel',
                imageUrl: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80',
                type: 'post',
                likes: ['social_explorer', 'chris_photo', 'johndoe', 'david_chef', 'sara_designs'],
                comments: [
                    { username: 'chris_photo', text: 'This is on my bucket list!' }
                ],
                shares: ['social_explorer', 'chris_photo']
            }
        ];

        // Create posts with proper author references
        const createdPosts = [];
        for (const postData of postsData) {
            const author = users.find(u => u.username === postData.author);
            if (!author) continue;

            const { author: _, ...postFields } = postData;
            const post = new Post({
                ...postFields,
                author: author._id,
                authorUsername: author.username,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
            });
            await post.save();
            createdPosts.push(post);
        }
        console.log(`📝 Created ${createdPosts.length} posts with likes, comments, and shares`);

        // Create tasks for various users
        const tasksData = [
            { title: 'Complete project documentation', description: 'Write the README and API docs for the new feature', status: 'in-progress', priority: 'high', author: 'janedoe' },
            { title: 'Review pull requests', description: 'Review and merge pending PRs on GitHub', status: 'todo', priority: 'medium', author: 'mike_tech' },
            { title: 'Design new landing page', description: 'Create wireframes and mockups for the new landing page', status: 'completed', priority: 'high', author: 'sara_designs' },
            { title: 'Plan Tokyo trip itinerary', description: 'Research must-visit places and restaurants', status: 'in-progress', priority: 'medium', author: 'emily_travels' },
            { title: 'Morning workout routine', description: 'Complete daily 30-minute workout', status: 'completed', priority: 'high', author: 'alex_fitness' },
            { title: 'Test new recipe', description: 'Try the new pasta recipe this weekend', status: 'todo', priority: 'low', author: 'david_chef' },
            { title: 'Finish digital art commission', description: 'Complete the portrait commission for the client', status: 'in-progress', priority: 'high', author: 'lisa_artist' },
            { title: 'Mix new track', description: 'Finish mixing the new song in the studio', status: 'completed', priority: 'high', author: 'tom_music' },
            { title: 'Read 30 pages', description: 'Daily reading goal for the book club', status: 'in-progress', priority: 'low', author: 'nina_books' },
            { title: 'Edit mountain photos', description: 'Edit the photos from the summit hike', status: 'todo', priority: 'medium', author: 'chris_photo' },
            { title: 'Learn React Hooks', description: 'Complete the advanced React course', status: 'completed', priority: 'high', author: 'janedoe' },
            { title: 'Client meeting prep', description: 'Prepare slides and demo for the client meeting', status: 'completed', priority: 'high', author: 'mike_tech' },
            { title: 'Update portfolio website', description: 'Add the latest projects to the portfolio', status: 'in-progress', priority: 'medium', author: 'sara_designs' },
            { title: 'Book accommodations', description: 'Book hotels for the upcoming Iceland trip', status: 'todo', priority: 'medium', author: 'emily_travels' },
            { title: 'Create meal plan', description: 'Plan healthy meals for the entire week', status: 'completed', priority: 'medium', author: 'alex_fitness' }
        ];

        await Task.insertMany(tasksData.map(t => ({
            ...t,
            dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
        })));
        console.log(`✅ Created ${tasksData.length} tasks`);

        // Create some notifications
        const notifications = [];
        for (let i = 0; i < 15; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomRecipient = users[Math.floor(Math.random() * users.length)];
            const types = ['like', 'comment', 'follow', 'share'];
            const type = types[Math.floor(Math.random() * types.length)];
            const messages = {
                like: 'liked your post',
                comment: 'commented on your post',
                follow: 'started following you',
                share: 'shared your post'
            };
            notifications.push({
                recipient: randomRecipient.username,
                sender: randomUser.username,
                type,
                message: `${randomUser.username} ${messages[type]}`,
                read: Math.random() > 0.5,
                createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
            });
        }
        await Notification.insertMany(notifications);
        console.log(`🔔 Created ${notifications.length} notifications`);

        // Create some sample messages between users
        const messages = [
            { sender: 'janedoe', receiver: 'mike_tech', text: 'Hey! Did you see the new design system Sarah posted? 🔥' },
            { sender: 'mike_tech', receiver: 'janedoe', text: 'Yes! It\'s absolutely stunning. Want to collaborate on something?' },
            { sender: 'janedoe', receiver: 'mike_tech', text: 'Definitely! Let\'s schedule a call this week.' },
            { sender: 'emily_travels', receiver: 'social_explorer', text: 'Your Maldives photos are making me so jealous! 😍' },
            { sender: 'social_explorer', receiver: 'emily_travels', text: 'You should come next time! We could plan a trip together ✈️' },
            { sender: 'david_chef', receiver: 'alex_fitness', text: 'Loved your meal prep post! Want some healthy recipe ideas?' },
            { sender: 'alex_fitness', receiver: 'david_chef', text: 'Always! Hit me up with your favorites 💪' },
            { sender: 'sara_designs', receiver: 'lisa_artist', text: 'Your latest piece gave me chills! 😍' },
            { sender: 'lisa_artist', receiver: 'sara_designs', text: 'Thank you so much! Your design work inspires me daily 💕' },
            { sender: 'johndoe', receiver: 'chris_photo', text: 'Those Northern Lights shots are unreal! How\'d you get them?' },
            { sender: 'chris_photo', receiver: 'johndoe', text: 'Patience and a lot of luck! Happy to share tips 📸' }
        ];
        await Message.insertMany(messages.map(m => ({
            ...m,
            createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
            read: true
        })));
        console.log(`💬 Created ${messages.length} messages`);

        console.log('\n🎉 ===== SEEDING COMPLETE ===== 🎉');
        console.log(`\n📊 Database Summary:`);
        console.log(`   👥 Users: ${users.length}`);
        console.log(`   📝 Posts: ${createdPosts.length}`);
        console.log(`   ✅ Tasks: ${tasksData.length}`);
        console.log(`   🔔 Notifications: ${notifications.length}`);
        console.log(`   💬 Messages: ${messages.length}`);
        console.log(`\n🔑 Test Account Credentials:`);
        console.log(`   Email: john@example.com`);
        console.log(`   Password: password123`);
        console.log(`\n   (Also try: jane@example.com, emily@example.com, etc.)`);
        console.log(`\n✨ All accounts use the same password: password123\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
};

seedData();
