const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { initSocket } = require('./socket');

// Load env vars
dotenv.config();

const app = express();
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
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route
app.get('/', (req, res) => {
    res.send('Social App API is running...');
});

// Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

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
