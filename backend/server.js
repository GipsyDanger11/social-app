/**
 * @file Express + Socket.IO entry point.
 * @description Boots the HTTP server, mounts every API route, serves
 *              uploaded images as static assets, and tries to connect
 *              to MongoDB Atlas. If Atlas is unreachable, the server
 *              transparently falls back to an in-memory MongoDB
 *              (mongodb-memory-server) so the app is always usable
 *              for local demos and tests.
 */

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { initSocket } = require('./socket');

// Load env vars
dotenv.config();

/** Express application instance. */
const app = express();

/** Raw HTTP server (needed so Socket.IO can attach). */
const server = http.createServer(app);

// Initialize Socket.IO (real-time)
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/messages', require('./routes/messages'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/uploads', require('./routes/uploads'));

// Serve uploaded files (images) as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route
app.get('/', (req, res) => {
    res.send('Social App API is running...');
});

// Database connection
/** Port to listen on. Render injects its own; we default to 5000 locally. */
const PORT = process.env.PORT || 5000;

/** MongoDB connection string from the environment. */
const MONGO_URI = process.env.MONGO_URI;

/**
 * Attempt to connect to MongoDB Atlas. On success, seed the database
 * with demo content if it's empty. On failure, retry once and then
 * fall back to an in-memory MongoDB so the API is still usable in dev.
 *
 * @param   {number} [retryCount=0]   Internal retry counter (max 1)
 * @returns {Promise<void>}
 */
const connectDB = async (retryCount = 0) => {
    try {
        // 1. First, try to connect to the real MongoDB Atlas
        console.log(`📡 [Attempt ${retryCount + 1}] Connecting to MongoDB Atlas...`);
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            family: 4,
        });
        console.log('✅ MongoDB Connected Successfully');

        // 2. Check if we need to seed default data (only if DB is empty)
        const userCount = await mongoose.model('User').countDocuments();
        if (userCount === 0) {
            console.log('🌱 Database is empty. Seeding default data...');
            const seedScript = require('./seed_logic'); // Separate file to keep server.js clean
            await seedScript();
            console.log('✅ Default data seeded to Atlas!');
        }
    } catch (err) {
        console.error('❌ Atlas Connection Error:', err.message);

        if (retryCount < 1) { // Try once, then switch to Local Memory DB
            console.log('🔄 Retrying Atlas once more...');
            setTimeout(() => connectDB(retryCount + 1), 2000);
        } else {
            console.log('🚀 SWITCHING TO LOCAL IN-MEMORY DATABASE...');
            try {
                const { MongoMemoryServer } = require('mongodb-memory-server');
                const mongoServer = await MongoMemoryServer.create();
                await mongoose.connect(mongoServer.getUri());
                console.log('✅ Local In-Memory Database Started!');

                // Seed data into memory DB as well
                const seedScript = require('./seed_logic');
                await seedScript();
                console.log('🌱 Memory Database Seeded with Default Data!');
            } catch (localErr) {
                console.error('❌ Could not start Local DB:', localErr.message);
            }
        }
    }

    if (!server.listening) {
        server.listen(PORT, () => console.log(`🚀 Server (REST + Socket.IO) running on port ${PORT}`));
    }
};

// We try to connect to a real database. If it fails, we still start the server
// (some routes will return errors, but signup/login will surface the DB issue).
connectDB().catch((err) => {
    console.error('Database connection failed:', err.message);
    if (!server.listening) {
        server.listen(PORT, () => console.log(`🚀 Server (REST + Socket.IO) running on port ${PORT} (DB OFFLINE)`));
    }
});
