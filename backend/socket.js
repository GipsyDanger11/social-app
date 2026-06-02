// Socket.IO setup and event broadcasting helpers
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Track online users: Map<socketId, username>
const onlineUsers = new Map();

let io = null;

const initSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Authenticate sockets using the token from the client
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                // allow anonymous sockets for global events
                return next();
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('username avatar');
            if (user) {
                socket.user = { id: user._id.toString(), username: user.username, avatar: user.avatar };
            }
            next();
        } catch (err) {
            // ignore auth errors, treat as anonymous
            next();
        }
    });

    io.on('connection', (socket) => {
        if (socket.user) {
            onlineUsers.set(socket.id, socket.user.username);
            socket.join(`user:${socket.user.username}`);
            io.emit('presence:update', {
                username: socket.user.username,
                online: true,
                onlineUsers: Array.from(new Set(onlineUsers.values())),
            });
        }

        // Client tells us they are viewing a chat with a given user
        socket.on('chat:join', ({ withUser }) => {
            if (withUser) socket.join(`chat:${[socket.user?.username, withUser].sort().join(':')}`);
        });

        socket.on('chat:leave', ({ withUser }) => {
            if (withUser) socket.leave(`chat:${[socket.user?.username, withUser].sort().join(':')}`);
        });

        socket.on('chat:typing', ({ to, typing }) => {
            if (!to || !socket.user) return;
            io.to(`user:${to}`).emit('chat:typing', {
                from: socket.user.username,
                typing: !!typing,
            });
        });

        socket.on('disconnect', () => {
            if (socket.user) {
                onlineUsers.delete(socket.id);
                io.emit('presence:update', {
                    username: socket.user.username,
                    online: false,
                    onlineUsers: Array.from(new Set(onlineUsers.values())),
                });
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

const isUserOnline = (username) => {
    return Array.from(onlineUsers.values()).includes(username);
};

const getOnlineUsers = () => Array.from(new Set(onlineUsers.values()));

module.exports = { initSocket, getIO, isUserOnline, getOnlineUsers };
