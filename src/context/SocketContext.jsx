import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Backend URL: same as REST API but on Socket.IO path
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const socketRef = useRef(null);
    const listenersRef = useRef(new Map()); // event -> Set of callbacks

    // Subscribe a callback to an event. Returns an unsubscribe function.
    const on = useCallback((event, callback) => {
        if (!listenersRef.current.has(event)) listenersRef.current.set(event, new Set());
        listenersRef.current.get(event).add(callback);
        return () => {
            const set = listenersRef.current.get(event);
            if (set) {
                set.delete(callback);
                if (set.size === 0) listenersRef.current.delete(event);
            }
        };
    }, []);

    // Emit an event
    const emit = useCallback((event, payload) => {
        const sock = socketRef.current;
        if (sock && sock.connected) sock.emit(event, payload);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const sock = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });
        socketRef.current = sock;

        sock.on('connect', () => setConnected(true));
        sock.on('disconnect', () => setConnected(false));
        sock.on('connect_error', () => setConnected(false));

        sock.onAny((event, ...args) => {
            const set = listenersRef.current.get(event);
            if (set) set.forEach((cb) => { try { cb(...args); } catch (e) { /* ignore */ } });
        });

        // Track online users from the server
        const handlePresence = (payload) => {
            if (Array.isArray(payload?.onlineUsers)) {
                setOnlineUsers(payload.onlineUsers);
            }
        };
        sock.on('presence:update', handlePresence);

        return () => {
            try { sock.disconnect(); } catch (e) { /* ignore */ }
            socketRef.current = null;
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected, onlineUsers, on, emit }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
    return ctx;
};
