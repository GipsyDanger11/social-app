import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText, TextField, IconButton, Divider, Badge, CircularProgress,
} from '@mui/material';
import Send from '@mui/icons-material/Send';
import Navbar from '../components/Navbar';
import OnlineIndicator from '../components/OnlineIndicator';
import { useSocket } from '../context/SocketContext';
import * as api from '../api';
import moment from 'moment';

const Chat = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [typingFrom, setTypingFrom] = useState(null);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const { on, emit, onlineUsers, connected } = useSocket();

    useEffect(() => {
        loadChatUsers();
        loadConversations();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            emit('chat:join', { withUser: selectedUser });
            loadMessages(selectedUser);
        }
        return () => {
            if (selectedUser) emit('chat:leave', { withUser: selectedUser });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser]);

    // Real-time: new messages
    useEffect(() => {
        const off = on('message:new', (msg) => {
            if (!msg) return;
            // If this is the open chat, append
            if (selectedUser && (msg.sender === selectedUser || msg.receiver === selectedUser)) {
                setMessages((prev) => {
                    const exists = prev.some((m) => m._id === msg._id);
                    if (exists) return prev;
                    // Replace optimistic message with same text+author
                    const filtered = prev.filter(
                        (m) => !(m.isOptimistic && m.sender === msg.sender && m.text === msg.text)
                    );
                    return [...filtered, msg];
                });
            }
            // Refresh conversations
            loadConversations();
        });
        return () => off && off();
    }, [on, selectedUser]);

    // Real-time: typing indicator
    useEffect(() => {
        const off = on('chat:typing', ({ from, typing }) => {
            if (!from || from !== selectedUser) return;
            setTypingFrom(typing ? from : null);
            if (typing) {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingFrom(null), 3000);
            }
        });
        return () => off && off();
    }, [on, selectedUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingFrom]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadChatUsers = async () => {
        try {
            const { data } = await api.fetchChatUsers();
            setUsers(data);
        } catch (err) { console.error(err); }
    };

    const loadConversations = async () => {
        try {
            const { data } = await api.fetchConversations();
            setConversations(data);
        } catch (err) { console.error(err); }
    };

    const loadMessages = async (username) => {
        setLoading(true);
        try {
            const { data } = await api.fetchMessages(username);
            setMessages(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSelectUser = (username) => {
        setSelectedUser(username);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedUser) return;
        const text = newMessage;
        setNewMessage('');

        // Optimistic update
        const tempMsg = {
            _id: `tmp-${Date.now()}`,
            sender: currentUser.username,
            receiver: selectedUser,
            text,
            createdAt: new Date(),
            isOptimistic: true,
        };
        setMessages((prev) => [...prev, tempMsg]);
        emit('chat:typing', { to: selectedUser, typing: false });

        try {
            const { data } = await api.sendMessage(selectedUser, text);
            setMessages((prev) => prev.map((m) => (m._id === tempMsg._id ? data : m)));
        } catch (err) {
            setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (selectedUser) emit('chat:typing', { to: selectedUser, typing: !!e.target.value });
    };

    const sortedConversations = [...conversations].sort((a, b) =>
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    const userList = [...new Set([...sortedConversations.map((c) => c.partner), ...users.map((u) => u.username)])]
        .filter((u) => u !== currentUser.username);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar user={currentUser} />
            <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
                <Paper elevation={0} sx={{ display: 'flex', height: 'calc(100vh - 120px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    {/* Users List */}
                    <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', overflow: 'auto', bgcolor: 'background.paper' }}>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>Chats</Typography>
                            <Box className={`live-dot ${connected ? 'live-dot-on' : 'live-dot-off'}`} />
                            <Typography variant="caption" color="text.secondary">
                                {connected ? 'Live' : 'Offline'}
                            </Typography>
                        </Box>
                        <List>
                            {userList.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: 36, mb: 1 }}>💬</Typography>
                                    <Typography color="text.secondary">No conversations yet</Typography>
                                </Box>
                            ) : userList.map((username) => {
                                const userObj = users.find((u) => u.username === username);
                                const lastMsg = sortedConversations.find((c) => c.partner === username)?.lastMessage;
                                return (
                                    <ListItem
                                        key={username}
                                        button
                                        selected={selectedUser === username}
                                        onClick={() => handleSelectUser(username)}
                                        sx={{
                                            '&.Mui-selected': { bgcolor: 'action.selected' },
                                            '&:hover': { bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Box sx={{ position: 'relative' }}>
                                                <Badge
                                                    color="error"
                                                    variant="dot"
                                                    invisible={!lastMsg || lastMsg.sender === username || lastMsg.read || lastMsg.sender === currentUser.username}
                                                >
                                                    <Avatar src={userObj?.avatar}>{username[0]?.toUpperCase()}</Avatar>
                                                </Badge>
                                                <OnlineIndicator username={username} />
                                            </Box>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{username}</Typography>
                                                    {onlineUsers.includes(username) && <Typography variant="caption" color="primary.main">●</Typography>}
                                                </Box>
                                            }
                                            secondary={lastMsg ? (lastMsg.text.substring(0, 30) + (lastMsg.text.length > 30 ? '…' : '')) : 'Start a conversation'}
                                            secondaryTypographyProps={{
                                                fontSize: 12,
                                                color: lastMsg && lastMsg.sender === username && !lastMsg.read ? 'primary' : 'text.secondary',
                                                fontWeight: lastMsg && lastMsg.sender === username && !lastMsg.read ? 700 : 400,
                                            }}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>

                    {/* Chat Window */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
                        {selectedUser ? (
                            <>
                                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.paper' }}>
                                    <Box sx={{ position: 'relative' }}>
                                        <Avatar src={users.find((u) => u.username === selectedUser)?.avatar} sx={{ width: 44, height: 44 }}>
                                            {selectedUser[0]?.toUpperCase()}
                                        </Avatar>
                                        <OnlineIndicator username={selectedUser} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>@{selectedUser}</Typography>
                                        <Typography variant="caption" color={onlineUsers.includes(selectedUser) ? 'primary.main' : 'text.secondary'}>
                                            {onlineUsers.includes(selectedUser) ? '● Active now' : 'Offline'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                                    {loading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                            <CircularProgress />
                                        </Box>
                                    ) : messages.length === 0 ? (
                                        <Box sx={{ textAlign: 'center', mt: 4 }}>
                                            <Typography sx={{ fontSize: 48, mb: 1 }}>👋</Typography>
                                            <Typography color="text.secondary">No messages yet. Say hello to @{selectedUser}!</Typography>
                                        </Box>
                                    ) : (
                                        <>
                                            {messages.map((msg) => {
                                                const isMine = msg.sender === currentUser.username;
                                                return (
                                                    <Box
                                                        key={msg._id}
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                                                            mb: 1.5,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                maxWidth: '70%',
                                                                bgcolor: isMine ? 'primary.main' : 'background.paper',
                                                                color: isMine ? 'white' : 'text.primary',
                                                                px: 2, py: 1,
                                                                borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                                border: isMine ? 'none' : '1px solid',
                                                                borderColor: 'divider',
                                                                opacity: msg.isOptimistic ? 0.7 : 1,
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                            }}
                                                        >
                                                            <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>
                                                            <Typography variant="caption" sx={{ opacity: 0.7, fontSize: 10, display: 'block', mt: 0.3, textAlign: 'right' }}>
                                                                {moment(msg.createdAt).format('HH:mm')}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                            {typingFrom && (
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                                                    <Box sx={{ px: 2, py: 1, borderRadius: '16px 16px 16px 4px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                            <Box className="typing-dot" />
                                                            <Box className="typing-dot typing-dot-2" />
                                                            <Box className="typing-dot typing-dot-3" />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </>
                                    )}
                                </Box>

                                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, bgcolor: 'background.paper' }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Type a message…"
                                        value={newMessage}
                                        onChange={handleTyping}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '24px' } }}
                                    />
                                    <IconButton
                                        color="primary"
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        sx={{
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'primary.dark' },
                                            '&.Mui-disabled': { bgcolor: 'action.hover', color: 'text.disabled' },
                                        }}
                                    >
                                        <Send fontSize="small" />
                                    </IconButton>
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: 64, mb: 2 }}>💬</Typography>
                                    <Typography variant="h6" sx={{ mb: 0.5 }}>Your Messages</Typography>
                                    <Typography color="text.secondary" variant="body2">Select a chat to start messaging</Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default Chat;
