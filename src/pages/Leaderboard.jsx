import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText, Chip, CircularProgress } from '@mui/material';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Star from '@mui/icons-material/Star';
import Navbar from '../components/Navbar';
import OnlineIndicator from '../components/OnlineIndicator';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';

const Leaderboard = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const { on, onlineUsers } = useSocket();
    const navigate = useNavigate();

    const loadLeaderboard = async () => {
        try {
            const { data } = await api.fetchLeaderboard();
            setEntries(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => {
        loadLeaderboard();
    }, []);

    // Real-time: refresh when any task is completed
    useEffect(() => {
        const off = on('leaderboard:update', () => {
            loadLeaderboard();
        });
        return () => off && off();
    }, [on]);

    const medalColor = (rank) => {
        if (rank === 0) return '#FFD700';
        if (rank === 1) return '#C0C0C0';
        if (rank === 2) return '#CD7F32';
        return 'transparent';
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar user={currentUser} />
            <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #1877F2, #7c4dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        🏆 Leaderboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Top performers based on completed tasks · updates in real-time
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1, px: 1.5, py: 0.3, borderRadius: 20, bgcolor: 'rgba(49,162,76,0.1)' }}>
                        <Box className="live-dot live-dot-on" />
                        <Typography variant="caption" sx={{ color: '#31a24c', fontWeight: 600 }}>Live</Typography>
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : (
                    <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                        {entries.length === 0 ? (
                            <Box sx={{ p: 5, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 48, mb: 1 }}>🎯</Typography>
                                <Typography variant="h6">No completed tasks yet</Typography>
                                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                                  Complete tasks to climb the leaderboard!
                                </Typography>
                            </Box>
                        ) : entries.map((entry, index) => (
                            <ListItem
                                key={entry.username}
                                button
                                onClick={() => navigate(`/profile/${entry.username}`)}
                                sx={{
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: index < 3 ? 'action.hover' : 'transparent',
                                    transition: 'background-color 0.2s',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    py: 1.5,
                                }}
                            >
                                <Box sx={{
                                    width: 44, height: 44,
                                    borderRadius: '50%',
                                    bgcolor: medalColor(index),
                                    color: index < 3 ? 'white' : 'text.primary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 16,
                                    mr: 2,
                                    border: index < 3 ? 'none' : '2px solid',
                                    borderColor: 'divider',
                                    boxShadow: index === 0 ? '0 0 12px rgba(255,215,0,0.4)' : 'none',
                                }}>
                                    {index < 3 ? <EmojiEvents /> : `#${index + 1}`}
                                </Box>
                                <ListItemAvatar>
                                    <Box sx={{ position: 'relative' }}>
                                        <Avatar src={entry.avatar} sx={{ width: 48, height: 48, border: '2px solid', borderColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'transparent' }}>
                                            {entry.username[0]?.toUpperCase()}
                                        </Avatar>
                                        <OnlineIndicator username={entry.username} size={10} />
                                    </Box>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body1" sx={{ fontWeight: index < 3 ? 700 : 500, color: 'text.primary' }}>
                                                {entry.username}
                                            </Typography>
                                            {onlineUsers.includes(entry.username) && <Star sx={{ fontSize: 12, color: '#31a24c' }} />}
                                        </Box>
                                    }
                                    secondary={`${entry.completedTasks} task${entry.completedTasks !== 1 ? 's' : ''} completed`}
                                />
                                <Chip
                                    label={`#${index + 1}`}
                                    color={index === 0 ? 'primary' : 'default'}
                                    sx={{ fontWeight: 700, ml: 1 }}
                                />
                            </ListItem>
                        ))}
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default Leaderboard;
