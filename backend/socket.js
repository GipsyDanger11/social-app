/**
 * @file Socket.IO server + helpers.
 * @description Sets up the WebSocket layer, authenticates each socket
 *              using the same JWT as the REST API, joins each user to
 *              a private `user:<username>` room and exposes helper
 *              functions for the REST routes to broadcast / notify.
 *
 *  Exposed helpers:
 *    - initSocket(server)        Wire Socket.IO to a given HTTP server.
 *    - getIO()                    Return the active io instance.
 *    - isUserOnline(username)     Is the user currently connected?
 *    - getOnlineUsers()           Snapshot list of online usernames.
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

/** Map of `socketId -> username` for every currently-connected socket. */
const onlineUsers = new Map();

/** The active Socket.IO server (null until `initSocket` is called). */
let io = null;

/**
 * Initialize Socket.IO on the given HTTP server.
 *
 *  - Authenticates each socket using the JWT supplied by the client
 *    (anonymous sockets are allowed for global-only events).
 *  - On connect, joins the user to their `user:<username>` room and
 *    broadcasts a `presence:update` so the UI can mark them online.
 *  - Listens for `chat:join` / `chat:leave` / `chat:typing` events.
 *
 * @param   {import('http').Server} server   The HTTP server returned by `http.createServer`.
 * @returns {import('socket.io').Server}     The Socket.IO server instance.
 */
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

/**
 * Return the active Socket.IO server.
 * @returns {import('socket.io').Server}
 * @throws  {Error} If `initSocket` has not been called yet.
 */
const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

/**
 * Is the given username currently connected to at least one socket?
 * @param   {string}  username
 * @returns {boolean}
 */
const isUserOnline = (username) => {
    return Array.from(onlineUsers.values()).includes(username);
};

/**
 * De-duplicated snapshot of online usernames.
 * @returns {string[]}
 */
const getOnlineUsers = () => Array.from(new Set(onlineUsers.values()));

module.exports = { initSocket, getIO, isUserOnline, getOnlineUsers };
