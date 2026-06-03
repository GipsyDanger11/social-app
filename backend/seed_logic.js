const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Post = require('./models/Post');
const Task = require('./models/Task');

// Comprehensive in-memory seed: 12 users, 22+ posts, follow graph
const seedLogic = async () => {
    try {
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

        const users = await User.insertMany(usersData.map((u) => ({ ...u, password: hashedPassword, followers: [], following: [] })));
        const usernameByIndex = (uname) => users.find((u) => u.username === uname);

        // Follow graph
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
            const follower = usernameByIndex(rel.follower);
            if (!follower) continue;
            follower.following = rel.follows;
            for (const followedName of rel.follows) {
                const u = usernameByIndex(followedName);
                if (u) u.followers.push(rel.follower);
            }
            await follower.save();
        }
        for (const u of users) await u.save();

        // Posts
        const postsData = [
            { author: 'johndoe', content: 'Just reached the summit! What a view 🏔️ The hike was tough but absolutely worth it. Nature is the best therapy. #hiking #adventure #nature', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', likes: ['janedoe', 'emily_travels', 'chris_photo', 'sara_designs', 'social_explorer'], comments: [{ username: 'janedoe', text: 'Wow! This is absolutely stunning! 🤩' }, { username: 'emily_travels', text: 'Adding this to my bucket list!' }, { username: 'chris_photo', text: 'The composition is incredible 📸' }], shares: ['sara_designs', 'social_explorer'] },
            { author: 'janedoe', content: 'Finally finished my latest project after weeks of work! 💻 The feeling when your code finally compiles without errors is unmatched. Coffee was my best friend through this journey ☕ #coding #developer #webdev', imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80', likes: ['mike_tech', 'sara_designs', 'lisa_artist', 'johndoe', 'nina_books'], comments: [{ username: 'mike_tech', text: 'Congrats! What tech stack did you use?' }, { username: 'sara_designs', text: 'Proud of you! 🎉' }, { username: 'lisa_artist', text: 'You deserve a celebration! 🎊' }], shares: ['mike_tech', 'sara_designs', 'lisa_artist'] },
            { author: 'emily_travels', content: 'Lost in the streets of Tokyo 🗼 Every corner tells a story. The blend of traditional and modern here is simply magical. Already planning my next visit! 🇯🇵 #travel #japan #wanderlust', imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80', likes: ['social_explorer', 'david_chef', 'johndoe', 'chris_photo', 'sara_designs', 'lisa_artist'], comments: [{ username: 'david_chef', text: 'The street food there is incredible! 🍜' }, { username: 'chris_photo', text: "Tokyo is a photographer's dream ✨" }, { username: 'social_explorer', text: 'Take me with you next time! 🙏' }], shares: ['social_explorer', 'david_chef', 'chris_photo'] },
            { author: 'david_chef', content: "Today's special: Pan-seared salmon with lemon butter sauce, asparagus, and roasted baby potatoes 🍣🍋 Cooking is not just a job, it's an art form. Bon appétit! #foodie #chef #cooking", imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80', likes: ['emily_travels', 'alex_fitness', 'social_explorer', 'janedoe', 'lisa_artist'], comments: [{ username: 'alex_fitness', text: 'This looks both healthy AND delicious! 😋' }, { username: 'emily_travels', text: 'You make me want to fly to your restaurant right now!' }, { username: 'lisa_artist', text: 'The plating is a work of art 🎨' }], shares: ['emily_travels', 'alex_fitness'] },
            { author: 'mike_tech', content: "Just deployed my first AI model to production! 🤖🎉 The journey from Jupyter notebook to scalable API was longer than I thought but incredibly rewarding. If you're starting out with ML, just keep pushing! #AI #MachineLearning #Tech", likes: ['janedoe', 'lisa_artist', 'tom_music', 'sara_designs', 'nina_books'], comments: [{ username: 'janedoe', text: 'Inspiring! What did you build?' }, { username: 'tom_music', text: 'Tech goals right here! 👏' }], shares: ['janedoe', 'tom_music'] },
            { author: 'sara_designs', content: '✨ New design system reveal ✨ Spent 3 months crafting this. Every pixel matters. Design is not just what it looks like, design is how it works. 🎨 #design #UI #UX #creative', imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80', likes: ['janedoe', 'lisa_artist', 'mike_tech', 'johndoe', 'tom_music', 'nina_books'], comments: [{ username: 'lisa_artist', text: "The color palette is chef's kiss 🤌" }, { username: 'janedoe', text: 'This is incredible work!' }, { username: 'mike_tech', text: 'Clean, modern, beautiful 👌' }], shares: ['lisa_artist', 'janedoe', 'mike_tech'] },
            { author: 'alex_fitness', content: 'Morning workout complete! 💪 Remember: the only bad workout is the one that didn\'t happen. Start small, stay consistent, and trust the process. Your body can do it, your mind just needs to believe! 🏋️ #fitness #motivation #health', imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', likes: ['david_chef', 'johndoe', 'emily_travels', 'lisa_artist'], comments: [{ username: 'david_chef', text: "That's the spirit! 🔥" }, { username: 'johndoe', text: 'Motivation Monday energy!' }], shares: ['johndoe'] },
            { author: 'lisa_artist', content: 'New digital art piece just finished 🎨✨ "Cosmic Dreams" - exploring the infinite possibilities of the universe through colors and shapes. What do you see in it? 👽🌌 #digitalart #art #creative', imageUrl: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&q=80', likes: ['sara_designs', 'mike_tech', 'janedoe', 'tom_music', 'nina_books', 'chris_photo'], comments: [{ username: 'sara_designs', text: 'Breathtaking! 😍' }, { username: 'tom_music', text: 'The vibes are immaculate ✨' }, { username: 'chris_photo', text: 'Stunning composition' }], shares: ['sara_designs', 'tom_music'] },
            { author: 'tom_music', content: 'Just dropped a new track! 🎵🔥 Been working on this beat for weeks. Let me know what you think in the comments. Link in bio! 🎧 #newmusic #producer #beats', imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80', likes: ['lisa_artist', 'mike_tech', 'sara_designs', 'janedoe'], comments: [{ username: 'lisa_artist', text: 'This goes hard! 🔥' }, { username: 'mike_tech', text: 'On repeat! 🎧' }], shares: ['lisa_artist'] },
            { author: 'nina_books', content: 'Currently reading "The Midnight Library" by Matt Haig 📚✨ Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. 📖 #bookworm #reading #booklover', likes: ['janedoe', 'lisa_artist', 'sara_designs', 'chris_photo'], comments: [{ username: 'lisa_artist', text: 'One of my favorites! Loved it 💕' }, { username: 'sara_designs', text: 'Adding to my list!' }], shares: ['lisa_artist'] },
            { author: 'chris_photo', content: 'Golden hour magic ✨📷 Sometimes the best photos happen when you least expect them. Stay patient, stay creative, stay inspired. #photography #goldenhour #nature', imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80', likes: ['emily_travels', 'johndoe', 'social_explorer', 'lisa_artist', 'sara_designs'], comments: [{ username: 'emily_travels', text: 'Pure magic! 🌅' }, { username: 'johndoe', text: 'Perfection!' }], shares: ['emily_travels', 'johndoe'] },
            { author: 'social_explorer', content: 'Paradise found 🏝️ The Maldives exceeded all expectations. Crystal clear water, white sand, and absolute peace. This is what dreams are made of! 🌊 #maldives #travel #paradise', imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80', likes: ['emily_travels', 'david_chef', 'chris_photo', 'johndoe', 'janedoe'], comments: [{ username: 'emily_travels', text: 'Living the dream! 😍' }, { username: 'david_chef', text: 'Bucket list activated!' }], shares: ['emily_travels', 'david_chef'] },
            { author: 'johndoe', content: 'Coffee + sunrise + mountains = Perfect morning ☕🏔️ Starting the day right! #morningmotivation #coffee #nature', imageUrl: 'https://images.unsplash.com/photo-1442975631115-c4f7b05b8a2c?w=800&q=80', likes: ['janedoe', 'emily_travels', 'sara_designs'], comments: [{ username: 'sara_designs', text: 'Goals! ✨' }], shares: ['janedoe'] },
            { author: 'janedoe', content: 'Throwback to that magical sunset in Santorini 🌅 Sometimes you just need to pause and appreciate the beauty around you. #throwback #greece #sunset', imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80', likes: ['emily_travels', 'social_explorer', 'lisa_artist', 'sara_designs', 'chris_photo'], comments: [{ username: 'emily_travels', text: 'Santorini is on my list!' }, { username: 'chris_photo', text: 'Postcard perfect 📸' }], shares: ['emily_travels', 'social_explorer'] },
            { author: 'david_chef', content: 'Fresh pasta from scratch today! 🍝 Nothing beats homemade. The secret is in the kneading - 10 minutes of love and patience. #pastalove #italianfood #cooking', imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80', likes: ['emily_travels', 'alex_fitness', 'social_explorer', 'lisa_artist'], comments: [{ username: 'alex_fitness', text: 'This is the way! 🙌' }], shares: ['emily_travels'] },
            { author: 'mike_tech', content: 'Hot take: The best code is the code you don\'t write. 🚀 Less is more. Simplicity wins. #programming #cleancode #softwareengineering', likes: ['janedoe', 'lisa_artist', 'tom_music', 'sara_designs'], comments: [{ username: 'janedoe', text: 'This should be a poster in every office 😂' }, { username: 'tom_music', text: 'Wisdom 💯' }], shares: ['janedoe'] },
            { author: 'sara_designs', content: 'Behind the scenes of my latest branding project 🎨✨ Every great brand starts with a great story. Excited to share the final result soon! #branding #design #creative', imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80', likes: ['janedoe', 'lisa_artist', 'mike_tech', 'tom_music', 'nina_books'], comments: [{ username: 'lisa_artist', text: 'The process is just as beautiful as the result 💕' }], shares: ['lisa_artist'] },
            { author: 'emily_travels', content: "Bali sunsets hit different 🌅✨ There's something about this place that heals the soul. Already counting days until I return 🇮🇩 #bali #travel #paradise", imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', likes: ['social_explorer', 'david_chef', 'chris_photo', 'johndoe', 'sara_designs'], comments: [{ username: 'social_explorer', text: 'Same energy every single time! 🌴' }, { username: 'david_chef', text: 'The food there is amazing too!' }], shares: ['social_explorer', 'chris_photo'] },
            { author: 'lisa_artist', content: 'Working on something special today 🎨 Sometimes you just need to follow your creative instincts and see where they take you ✨ #art #creativeflow #digitalart', likes: ['sara_designs', 'mike_tech', 'janedoe', 'tom_music'], comments: [{ username: 'sara_designs', text: 'Love this energy! 💫' }, { username: 'tom_music', text: 'Creativity on another level' }], shares: ['sara_designs'] },
            { author: 'alex_fitness', content: 'Healthy meal prep Sunday! 🥗 Prepped 5 days worth of meals in under 2 hours. Planning = success. Fuel your body right! #mealprep #healthyliving #fitness', imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80', likes: ['david_chef', 'johndoe', 'emily_travels', 'janedoe'], comments: [{ username: 'david_chef', text: 'Looking good! 👍' }], shares: ['david_chef'] },
            { author: 'chris_photo', content: "Northern Lights chasing complete! 🌌✨ Nature's most spectacular show. No filter needed - the sky painted itself. #aurora #northernlights #naturephotography", imageUrl: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=800&q=80', likes: ['emily_travels', 'social_explorer', 'johndoe', 'lisa_artist', 'sara_designs'], comments: [{ username: 'emily_travels', text: 'Bucket list moment! 🤩' }, { username: 'lisa_artist', text: 'This is ART 🎨' }], shares: ['emily_travels', 'social_explorer'] },
        ];

        for (const p of postsData) {
            const author = usernameByIndex(p.author);
            if (!author) continue;
            const post = new Post({
                content: p.content,
                imageUrl: p.imageUrl || '',
                type: 'post',
                author: author._id,
                authorUsername: p.author,
                likes: p.likes || [],
                shares: p.shares || [],
                comments: p.comments || [],
            });
            await post.save();
        }

        // ---- Tasks for the leaderboard ----
        // 3-12 tasks per user, ~70% of them completed so the leaderboard has visible rankings
        const taskTemplates = {
            johndoe: [
                { title: 'Plan weekend hike to Mt. Hood', description: 'Pack gear, check weather, plan route', status: 'completed', priority: 'high' },
                { title: 'Edit sunrise photo set', description: 'Lightroom presets and export', status: 'completed', priority: 'medium' },
                { title: 'Reply to follower comments', status: 'completed', priority: 'low' },
                { title: 'Book campsite for next month', status: 'in-progress', priority: 'medium' },
                { title: 'Print 2026 calendar photos', status: 'todo', priority: 'low' },
            ],
            janedoe: [
                { title: 'Ship v2.0 of the social app', description: 'WebSocket layer + feed pagination', status: 'completed', priority: 'high' },
                { title: 'Refactor auth middleware', status: 'completed', priority: 'medium' },
                { title: 'Write API documentation', status: 'completed', priority: 'medium' },
                { title: 'Set up CI/CD on Render', status: 'completed', priority: 'high' },
                { title: 'Add GraphQL endpoint', status: 'in-progress', priority: 'low' },
                { title: 'Configure Sentry error tracking', status: 'todo', priority: 'medium' },
            ],
            social_explorer: [
                { title: 'Renew passport', status: 'completed', priority: 'high' },
                { title: 'Book Maldives overwater villa', status: 'completed', priority: 'high' },
                { title: 'Write Bali travel blog post', status: 'in-progress', priority: 'medium' },
            ],
            mike_tech: [
                { title: 'Train sentiment-analysis model', status: 'completed', priority: 'high' },
                { title: 'Deploy ML model to production', status: 'completed', priority: 'high' },
                { title: 'Write technical blog post on transformers', status: 'completed', priority: 'medium' },
                { title: 'Optimize inference latency', status: 'in-progress', priority: 'high' },
                { title: 'Apply to GSoC 2026', status: 'todo', priority: 'low' },
            ],
            sara_designs: [
                { title: 'Finish branding project mockups', status: 'completed', priority: 'high' },
                { title: 'Create design system documentation', status: 'completed', priority: 'medium' },
                { title: 'Design app onboarding flow', status: 'completed', priority: 'high' },
                { title: 'Update portfolio website', status: 'in-progress', priority: 'medium' },
                { title: 'Record Figma tutorial for YouTube', status: 'todo', priority: 'low' },
            ],
            alex_fitness: [
                { title: 'Build 12-week hypertrophy program', status: 'completed', priority: 'high' },
                { title: 'Publish meal-prep video', status: 'completed', priority: 'medium' },
                { title: 'Plan online coaching funnel', status: 'in-progress', priority: 'medium' },
                { title: 'Get sports-nutrition certificate', status: 'todo', priority: 'low' },
            ],
            emily_travels: [
                { title: 'Edit Tokyo vlog', status: 'completed', priority: 'high' },
                { title: 'Publish Bali blog', status: 'completed', priority: 'medium' },
                { title: 'Plan Iceland itinerary for June', status: 'completed', priority: 'high' },
                { title: 'Negotiate hotel collab in Santorini', status: 'in-progress', priority: 'medium' },
                { title: 'Renew drone license', status: 'todo', priority: 'low' },
            ],
            david_chef: [
                { title: 'Test new pasta menu', status: 'completed', priority: 'high' },
                { title: 'Photograph new dishes for IG', status: 'completed', priority: 'medium' },
                { title: 'Source local produce suppliers', status: 'completed', priority: 'high' },
                { title: 'Plan summer tasting event', status: 'in-progress', priority: 'medium' },
                { title: 'Write cookbook proposal', status: 'todo', priority: 'low' },
            ],
            lisa_artist: [
                { title: 'Finish "Cosmic Dreams" series', status: 'completed', priority: 'high' },
                { title: 'Open Etsy print shop', status: 'completed', priority: 'medium' },
                { title: 'Apply to Art Basel booth', status: 'in-progress', priority: 'high' },
            ],
            tom_music: [
                { title: 'Mix and master new EP', status: 'completed', priority: 'high' },
                { title: 'Submit to Spotify editorial playlists', status: 'in-progress', priority: 'medium' },
                { title: 'Plan album-release party', status: 'todo', priority: 'low' },
            ],
            nina_books: [
                { title: 'Finish "The Midnight Library" review', status: 'completed', priority: 'medium' },
                { title: 'Write Q1 reading roundup', status: 'completed', priority: 'medium' },
                { title: 'Launch book-club newsletter', status: 'in-progress', priority: 'high' },
                { title: 'Apply to BEA 2026', status: 'todo', priority: 'low' },
            ],
            chris_photo: [
                { title: 'Edit aurora photo set', status: 'completed', priority: 'high' },
                { title: 'Build portfolio site', status: 'completed', priority: 'medium' },
                { title: 'Print 2026 wall calendar', status: 'in-progress', priority: 'medium' },
                { title: 'Plan Iceland photo tour', status: 'todo', priority: 'low' },
            ],
        };

        for (const [author, tasks] of Object.entries(taskTemplates)) {
            for (const t of tasks) {
                const dueDate = t.status === 'completed' ? null : new Date(Date.now() + (Math.random() * 14 - 3) * 24 * 60 * 60 * 1000);
                const task = new Task({
                    title: t.title,
                    description: t.description || '',
                    status: t.status,
                    priority: t.priority,
                    author,
                    dueDate,
                });
                await task.save();
            }
        }
    } catch (err) {
        console.error('Seeding error:', err);
    }
};

module.exports = seedLogic;
