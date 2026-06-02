import React from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography, Box } from '@mui/material';
import Home from '@mui/icons-material/Home';
import Assignment from '@mui/icons-material/Assignment';
import Public from '@mui/icons-material/Public';
import Leaderboard from '@mui/icons-material/Leaderboard';
import Chat from '@mui/icons-material/Chat';
import Settings from '@mui/icons-material/Settings';
import { useLocation, useNavigate } from 'react-router-dom';

const SidebarLeft = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Home Feed', icon: <Home />, path: '/' },
    { text: 'Tasks', icon: <Assignment />, path: '/tasks' },
    { text: 'Social Feed', icon: <Public />, path: '/' },
    { text: 'Leaderboard', icon: <Leaderboard />, path: '/leaderboard' },
    { text: 'Chat', icon: <Chat />, path: '/chat' },
  ];

  return (
    <Box className="left-sidebar" sx={{ width: '100%' }}>
      <Paper elevation={0} sx={{ borderRadius: '8px', overflow: 'hidden', bgcolor: 'transparent' }}>
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
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: '#1877F2',
                      color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                    '&:hover': {
                      bgcolor: isActive ? '#1877F2' : '#e4e6eb',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'white' : '#65676b' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
};

export default SidebarLeft;
