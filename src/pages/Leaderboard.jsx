import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText, Chip, CircularProgress, Grid } from '@mui/material';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Star from '@mui/icons-material/Star';
import Whatshot from '@mui/icons-material/Whatshot';
import Groups from '@mui/icons-material/Groups';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Navbar from '../components/Navbar';
import BackToHome from '../components/BackToHome';
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
        if (rank === 0) return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
        if (rank === 1) return 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)';
        if (rank === 2) return 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)';
        return 'transparent';
    };

    const medalTextColor = (rank) => (rank < 3 ? 'white' : 'text.primary');
    const totalCompletions = entries.reduce((sum, e) => sum + e.completedTasks, 0);
    const topThree = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar user={currentUser} />

            {/* Hero header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #ff7a18 0%, #ffd200 100%)',
                    color: 'white',
                    py: 5,
                    px: 3,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)' }} />
                <Box sx={{ position: 'absolute', bottom: -60, left: '15%', width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ position: 'absolute', top: 30, right: '20%', fontSize: 80, opacity: 0.18 }}>🏆</Box>
                <Box sx={{ maxWidth: 1100, mx: 'auto', position: 'relative', zIndex: 1 }}>
                    <Box sx={{ mb: 2 }}>
                        <BackToHome
                            label="Back"
                            showHomeIcon={false}
                            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', color: 'white', borderColor: 'rgba(255,255,255,0.5)' } }}
                        />
                    </Box>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', mb: 2 }}>
                            <Box className="live-dot live-dot-on" />
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>
                                LIVE · updates in real-time
                            </Typography>
                        </Box>
                        <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1, mb: 1, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
                            🏆 Leaderboard
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.95, maxWidth: 600, mx: 'auto' }}>
                            Top performers ranked by completed tasks. Climb the ranks by shipping more work.
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, mt: -4, position: 'relative', zIndex: 2 }}>
                {/* Stats summary */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {[
                        { label: 'Active Performers', value: entries.length, color: '#1877F2', icon: <Groups /> },
                        { label: 'Total Completions', value: totalCompletions, color: '#31a24c', icon: <CheckCircle /> },
                        { label: 'Online Now', value: onlineUsers.length, color: '#ff7a18', icon: <Whatshot /> },
                    ].map((stat) => (
                        <Grid item xs={12} sm={4} key={stat.label}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' },
                                }}
                            >
                                <Avatar sx={{ bgcolor: stat.color, width: 52, height: 52, boxShadow: `0 4px 16px ${stat.color}40` }}>
                                    {stat.icon}
                                </Avatar>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        {stat.label.toUpperCase()}
                                    </Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
                                        {stat.value}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : entries.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '14px', border: '1px dashed', borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: 72, mb: 1 }}>🎯</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>No completed tasks yet</Typography>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            Complete tasks to claim your spot at the top!
                        </Typography>
                        <Chip
                            label="Go to Tasks"
                            clickable
                            onClick={() => navigate('/tasks')}
                            sx={{ bgcolor: '#1877F2', color: 'white', fontWeight: 700, borderRadius: '20px', px: 1 }}
                        />
                    </Paper>
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        {topThree.length >= 1 && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    mb: 3,
                                    background: 'linear-gradient(180deg, rgba(255,215,0,0.05) 0%, rgba(255,255,255,0) 100%)',
                                }}
                            >
                                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 1.5 }}>
                                    🏅 Hall of Fame
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                                    {/* Reorder so 2nd place shows on the left, 1st in middle, 3rd on the right */}
                                    {[1, 0, 2].map((rank) => {
                                        const entry = topThree[rank];
                                        if (!entry) return null;
                                        const heights = [120, 160, 90];
                                        const medalSize = rank === 0 ? 60 : 50;
                                        const isFirst = rank === 0;
                                        return (
                                            <Box
                                                key={entry.username}
                                                onClick={() => navigate(`/profile/${entry.username}`)}
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s',
                                                    '&:hover': { transform: 'translateY(-4px)' },
                                                }}
                                            >
                                                <Box sx={{ position: 'relative', mb: 1.5 }}>
                                                    <Avatar
                                                        src={entry.avatar}
                                                        sx={{
                                                            width: medalSize,
                                                            height: medalSize,
                                                            border: `3px solid ${rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : '#CD7F32'}`,
                                                            boxShadow: isFirst ? '0 0 24px rgba(255,215,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                                                        }}
                                                    >
                                                        {entry.username[0]?.toUpperCase()}
                                                    </Avatar>
                                                    <OnlineIndicator username={entry.username} size={12} />
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: -8,
                                                            right: -8,
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            background: medalColor(rank),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: 800,
                                                            fontSize: 12,
                                                            border: '2px solid white',
                                                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                                        }}
                                                    >
                                                        {rank + 1}
                                                    </Box>
                                                </Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                                                    {entry.username}
                                                </Typography>
                                                <Chip
                                                    label={`${entry.completedTasks} done`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: rank === 0 ? 'rgba(255,215,0,0.15)' : rank === 1 ? 'rgba(192,192,192,0.15)' : 'rgba(205,127,50,0.15)',
                                                        color: rank === 0 ? '#B8860B' : rank === 1 ? '#757575' : '#8B4513',
                                                        fontWeight: 700,
                                                        mb: 1.5,
                                                    }}
                                                />
                                                {/* Podium bar */}
                                                <Box
                                                    sx={{
                                                        width: 80,
                                                        height: heights[rank],
                                                        background: medalColor(rank),
                                                        borderRadius: '8px 8px 0 0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: rank < 3 ? 'white' : 'text.primary',
                                                        fontWeight: 800,
                                                        fontSize: 20,
                                                        boxShadow: rank === 0 ? '0 -4px 16px rgba(255,215,0,0.3)' : '0 -2px 8px rgba(0,0,0,0.08)',
                                                    }}
                                                >
                                                    {rank === 0 && '👑'}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Paper>
                        )}

                        {/* Rest of the rankings */}
                        {rest.length > 0 && (
                            <Paper elevation={0} sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                <List disablePadding>
                                    {rest.map((entry, idx) => {
                                        const rank = idx + 3;
                                        return (
                                            <ListItem
                                                key={entry.username}
                                                button
                                                onClick={() => navigate(`/profile/${entry.username}`)}
                                                sx={{
                                                    borderBottom: idx < rest.length - 1 ? '1px solid' : 'none',
                                                    borderColor: 'divider',
                                                    transition: 'background-color 0.2s',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                    py: 1.5,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: '50%',
                                                        bgcolor: 'action.hover',
                                                        color: 'text.primary',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 800,
                                                        fontSize: 14,
                                                        mr: 2,
                                                    }}
                                                >
                                                    #{rank + 1}
                                                </Box>
                                                <ListItemAvatar>
                                                    <Box sx={{ position: 'relative' }}>
                                                        <Avatar src={entry.avatar} sx={{ width: 44, height: 44, border: '2px solid', borderColor: 'divider' }}>
                                                            {entry.username[0]?.toUpperCase()}
                                                        </Avatar>
                                                        <OnlineIndicator username={entry.username} size={10} />
                                                    </Box>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                                {entry.username}
                                                            </Typography>
                                                            {entry.username === currentUser?.username && (
                                                                <Chip label="You" size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'primary.main', color: 'white', fontWeight: 700 }} />
                                                            )}
                                                            {onlineUsers.includes(entry.username) && <Star sx={{ fontSize: 14, color: '#31a24c' }} />}
                                                        </Box>
                                                    }
                                                    secondary={`${entry.completedTasks} task${entry.completedTasks !== 1 ? 's' : ''} completed`}
                                                />
                                                <Chip
                                                    label={`#${rank + 1}`}
                                                    color="default"
                                                    sx={{ fontWeight: 700, ml: 1 }}
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </Paper>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default Leaderboard;
