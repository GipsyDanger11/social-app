import React from 'react';
import { AppBar, Toolbar, Typography, InputBase, Box, IconButton, Avatar, Badge } from '@mui/material';
import Search from '@mui/icons-material/Search';
import Notifications from '@mui/icons-material/Notifications';
import DarkMode from '@mui/icons-material/DarkMode';
import Menu from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ user }) => {
  const navigate = useNavigate();

  return (
    <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: 'white' }}>
      <Toolbar sx={{ justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Left: Logo */}
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ fontWeight: 'bold', color: '#050505', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          Social
        </Typography>

        {/* Center: Search Bar */}
        <Box sx={{ 
          display: { xs: 'none', md: 'flex' }, 
          alignItems: 'center', 
          bgcolor: '#f0f2f5', 
          borderRadius: '20px', 
          px: 2,
          width: '40%'
        }}>
          <InputBase
            placeholder="Search promotions, users, posts..."
            sx={{ ml: 1, flex: 1, fontSize: '14px' }}
          />
          <IconButton sx={{ bgcolor: '#1877F2', color: 'white', '&:hover': { bgcolor: '#166fe5' }, p: 0.5, my: 0.5 }}>
            <Search fontSize="small" />
          </IconButton>
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ bgcolor: '#f0f2f5' }}>
            <Badge badgeContent={4} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <IconButton size="small" sx={{ bgcolor: '#f0f2f5' }}>
            <DarkMode />
          </IconButton>

          <Avatar 
            src={user?.avatar || "https://via.placeholder.com/40"} 
            sx={{ width: 40, height: 40, cursor: 'pointer' }}
            onClick={() => navigate('/account')}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
