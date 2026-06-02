import React from 'react';
import { Box } from '@mui/material';
import { useSocket } from '../context/SocketContext';

const OnlineIndicator = ({ username, size = 12, sx = {} }) => {
  const { onlineUsers } = useSocket();
  if (!username) return null;
  const isOnline = onlineUsers.includes(username);
  return (
    <Box
      title={isOnline ? 'Online' : 'Offline'}
      sx={{
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: isOnline ? '#31a24c' : '#b0b3b8',
        border: '2px solid #fff',
        boxShadow: isOnline ? '0 0 0 0 rgba(49,162,76,0.6)' : 'none',
        animation: isOnline ? 'online-pulse 1.6s infinite' : 'none',
        ...sx,
      }}
    />
  );
};

export default OnlineIndicator;
