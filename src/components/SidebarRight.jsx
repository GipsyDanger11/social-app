import React from 'react';
import { Paper, Typography, Box, Avatar, Button, IconButton } from '@mui/material';
import Close from '@mui/icons-material/Close';

const SuggestedUser = ({ name, username, avatar }) => (
  <Paper 
    elevation={0} 
    sx={{ 
      p: 2, 
      mb: 2, 
      borderRadius: '12px', 
      border: '1px solid #e4e6eb',
      position: 'relative',
      textAlign: 'center'
    }}
  >
    <IconButton size="small" sx={{ position: 'absolute', top: 5, right: 5 }}>
      <Close fontSize="small" />
    </IconButton>
    <Avatar src={avatar} sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }} />
    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{name}</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>@{username}</Typography>
    <Button variant="contained" fullWidth sx={{ borderRadius: '20px', bgcolor: '#1877F2', textTransform: 'none' }}>
      Follow
    </Button>
  </Paper>
);

const SidebarRight = () => {
  const suggested = [
    { name: 'Sunil Pandey', username: 'sunilpande', avatar: 'https://i.pravatar.cc/150?u=sunil' },
    { name: 'Tejas Kumar', username: 'kumaryddc', avatar: 'https://i.pravatar.cc/150?u=tejas' },
  ];

  return (
    <Box className="right-sidebar">
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Suggested for you</Typography>
      {suggested.map((user) => (
        <SuggestedUser key={user.username} {...user} />
      ))}
    </Box>
  );
};

export default SidebarRight;
