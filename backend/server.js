const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

// Root route
app.get('/', (req, res) => {
    res.send('Social App API is running...');
});

// Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        if (err.message.includes('querySrv ECONNREFUSED')) {
            console.error('👉 TIP: This is likely a DNS issue or your firewall is blocking the MongoDB SRV record.');
            console.error('👉 TRY: Use the "Standard Connection String" (starts with mongodb:// instead of mongodb+srv://) from Atlas.');
        }
        process.exit(1);
    });
