import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Typography, Box, Avatar, Button, IconButton, Skeleton } from '@mui/material';
import Close from '@mui/icons-material/Close';
import OnlineIndicator from './OnlineIndicator';
import { useSocket } from '../context/SocketContext';
import * as api from '../api';

const SuggestedUser = ({ user, onFollow, onUnfollow, onOpen, isFollowing }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: '12px',
        border: '1px solid #e4e6eb',
        position: 'relative',
        textAlign: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
        <Avatar
          src={user.avatar}
          sx={{ width: 72, height: 72, mx: 'auto', cursor: 'pointer', border: '2px solid #1877F2' }}
          onClick={() => onOpen(user.username)}
        >
          {user.username?.[0]?.toUpperCase()}
        </Avatar>
        <OnlineIndicator username={user.username} />
      </Box>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, cursor: 'pointer' }}
        onClick={() => onOpen(user.username)}
      >
        {user.username}
      </Typography>
      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5, minHeight: 18 }}>
        {user.bio ? user.bio.substring(0, 40) + (user.bio.length > 40 ? '…' : '') : `@${user.username}`}
      </Typography>
      <Button
        variant={isFollowing ? 'outlined' : 'contained'}
        fullWidth
        size="small"
        onClick={() => (isFollowing ? onUnfollow(user.username) : onFollow(user.username))}
        sx={{
          borderRadius: '20px',
          textTransform: 'none',
          fontWeight: 600,
          ...(isFollowing
            ? { borderColor: '#e4e6eb', color: 'text.primary' }
            : { bgcolor: '#1877F2', '&:hover': { bgcolor: '#166fe5' } }),
        }}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    </Paper>
  );
};

const SidebarRight = () => {
  const [suggested, setSuggested] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    loadSuggested();
  }, []);

  const loadSuggested = async () => {
    setLoading(true);
    try {
      const { data } = await api.fetchSuggestedUsers();
      setSuggested(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Listen for real-time follow updates so the "Following" state reflects globally
  const { on } = useSocket();
  useEffect(() => {
    const off = on('user:follow', (payload) => {
      if (!payload) return;
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      if (payload.by === me.username) {
        setFollowing((prev) => {
          const next = new Set(prev);
          if (payload.action === 'follow') next.add(payload.target);
          else next.delete(payload.target);
          return next;
        });
        // If we just followed someone, remove them from the suggestions list
        if (payload.action === 'follow') {
          setSuggested((prev) => prev.filter((u) => u.username !== payload.target));
        } else {
          // re-add to suggestions when unfollowing
          loadSuggested();
        }
      }
    });
    return () => off && off();
  }, [on]);

  const handleFollow = async (username) => {
    setFollowing((prev) => new Set(prev).add(username));
    try {
      await api.toggleFollow(username);
    } catch (err) {
      setFollowing((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
      console.error(err);
    }
  };

  const handleUnfollow = async (username) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      next.delete(username);
      return next;
    });
    try {
      await api.toggleFollow(username);
    } catch (err) {
      setFollowing((prev) => new Set(prev).add(username));
      console.error(err);
    }
  };

  const handleOpen = (username) => navigate(`/profile/${username}`);

  return (
    <Box className="right-sidebar">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Suggested for you</Typography>
        <Typography variant="caption" color="text.secondary">
          {onlineUsers.length} online
        </Typography>
      </Box>
      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <Paper key={i} elevation={0} sx={{ p: 2, mb: 2, borderRadius: '12px', border: '1px solid #e4e6eb' }}>
              <Skeleton variant="circular" width={72} height={72} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" sx={{ mx: 'auto', width: '70%' }} />
              <Skeleton variant="text" sx={{ mx: 'auto', width: '50%' }} />
              <Skeleton variant="rounded" height={32} sx={{ mt: 1.5 }} />
            </Paper>
          ))
        : suggested.length === 0
        ? (
          <Paper elevation={0} sx={{ p: 3, textAlign: 'center', borderRadius: '12px', border: '1px solid #e4e6eb' }}>
            <Typography variant="body2" color="text.secondary">You're following everyone! 🎉</Typography>
          </Paper>
        )
        : suggested.map((user) => (
            <SuggestedUser
              key={user.username}
              user={user}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onOpen={handleOpen}
              isFollowing={following.has(user.username)}
            />
          ))}
    </Box>
  );
};

export default SidebarRight;
