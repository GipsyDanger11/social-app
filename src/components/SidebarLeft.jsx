import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography, Box, Divider, Chip, Button, Tooltip } from '@mui/material';
import Home from '@mui/icons-material/Home';
import Assignment from '@mui/icons-material/Assignment';
import Public from '@mui/icons-material/Public';
import Leaderboard from '@mui/icons-material/Leaderboard';
import Chat from '@mui/icons-material/Chat';
import Campaign from '@mui/icons-material/Campaign';
import RocketLaunch from '@mui/icons-material/RocketLaunch';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

// Rotating promotions that show live counters (e.g. active users, posts today)
const PROMOTIONS = [
  {
    title: '🎯 TaskPlanet Replica',
    description: 'Built for the 3W Full-Stack Internship Round 1 — explore every feature live.',
    cta: 'See Features',
    gradient: 'linear-gradient(135deg, #1877F2 0%, #42a5f5 100%)',
  },
  {
    title: '🚀 Go Live with Real-Time',
    description: 'Likes, comments, follows, chat and notifications update instantly — no refresh needed.',
    cta: 'Watch it Work',
    gradient: 'linear-gradient(135deg, #7c4dff 0%, #ff4d8d 100%)',
  },
  {
    title: '🏆 Climb the Leaderboard',
    description: 'Complete tasks to earn your spot at the top. Updates the moment you cross the line.',
    cta: 'View Rankings',
    gradient: 'linear-gradient(135deg, #ff7a18 0%, #ffd200 100%)',
  },
  {
    title: '💬 Chat with Anyone',
    description: 'Real-time messaging with typing indicators, online status and instant delivery.',
    cta: 'Open Chat',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
];

const SidebarLeft = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { onlineUsers } = useSocket();
  const [promoIndex, setPromoIndex] = useState(0);

  // Auto-rotate promotions every 6 seconds
  useEffect(() => {
    const t = setInterval(() => {
      setPromoIndex((i) => (i + 1) % PROMOTIONS.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const menuItems = [
    { text: 'Home Feed', icon: <Home />, path: '/' },
    { text: 'Tasks', icon: <Assignment />, path: '/tasks' },
    { text: 'Social Feed', icon: <Public />, path: '/' },
    { text: 'Leaderboard', icon: <Leaderboard />, path: '/leaderboard' },
    { text: 'Chat', icon: <Chat />, path: '/chat' },
  ];

  const promotion = PROMOTIONS[promoIndex];

  return (
    <Box className="left-sidebar" sx={{ width: '100%' }}>
      {/* Navigation menu */}
      <Paper elevation={0} sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <List>
          {menuItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: '8px',
                    mx: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: '#1877F2',
                      color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                    '&:hover': {
                      bgcolor: isActive ? '#1877F2' : 'action.hover',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'white' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Live activity / presence card */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          mb: 2,
          background: 'linear-gradient(135deg, rgba(24,119,242,0.08) 0%, rgba(124,77,255,0.08) 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box className={`live-dot ${onlineUsers.length > 0 ? 'live-dot-on' : 'live-dot-off'}`} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: onlineUsers.length > 0 ? '#31a24c' : 'text.secondary' }}>
            {onlineUsers.length > 0 ? `${onlineUsers.length} ONLINE NOW` : 'BE THE FIRST ONLINE'}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          Real-time is live 🚀
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Posts, likes, comments, follows & messages update instantly across all tabs.
        </Typography>
      </Paper>

      {/* Promotions section */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Campaign sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
            Promotions
          </Typography>
          <Tooltip title="Sponsored">
            <Chip label="Ad" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
          </Tooltip>
        </Box>

        {/* Rotating promotion card */}
        <Box
          key={promoIndex}
          sx={{
            m: 1.5,
            borderRadius: '10px',
            p: 2,
            color: 'white',
            background: promotion.gradient,
            position: 'relative',
            animation: 'post-slide-in 0.4s ease-out',
            minHeight: 130,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5, lineHeight: 1.2 }}>
            {promotion.title}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1.5, opacity: 0.92, lineHeight: 1.4 }}>
            {promotion.description}
          </Typography>
          <Button
            size="small"
            onClick={() => {
              if (promotion.title.includes('Leaderboard')) navigate('/leaderboard');
              else if (promotion.title.includes('Chat')) navigate('/chat');
              else if (promotion.title.includes('Real-Time')) navigate('/');
              else if (promotion.title.includes('Task')) navigate('/tasks');
            }}
            sx={{
              bgcolor: 'rgba(255,255,255,0.25)',
              color: 'white',
              textTransform: 'none',
              fontWeight: 700,
              backdropFilter: 'blur(6px)',
              borderRadius: '20px',
              px: 2,
              fontSize: 12,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' },
            }}
            startIcon={<RocketLaunch sx={{ fontSize: 16 }} />}
          >
            {promotion.cta}
          </Button>
        </Box>

        {/* Pagination dots */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, pb: 1.2 }}>
          {PROMOTIONS.map((_, i) => (
            <Box
              key={i}
              onClick={() => setPromoIndex(i)}
              sx={{
                width: i === promoIndex ? 16 : 6,
                height: 6,
                borderRadius: '3px',
                bgcolor: i === promoIndex ? 'primary.main' : 'action.hover',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </Box>

        <Divider />

        {/* Static promo links */}
        <List dense disablePadding>
          {[
            { label: '⭐ Try the Live Demo', action: () => navigate('/') },
            { label: '🎯 Take on Tasks', action: () => navigate('/tasks') },
            { label: '🏆 See Top Performers', action: () => navigate('/leaderboard') },
            { label: '💬 Start a Chat', action: () => navigate('/chat') },
          ].map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton onClick={item.action} sx={{ py: 1 }}>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Footer */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2, px: 1 }}>
        © 2026 Social · 3W Internship
      </Typography>
    </Box>
  );
};

export default SidebarLeft;
