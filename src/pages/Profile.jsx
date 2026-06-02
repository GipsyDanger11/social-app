import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Avatar, Typography, Tabs, Tab, Button, Grid, Divider, CircularProgress } from '@mui/material';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Share from '@mui/icons-material/Share';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import moment from 'moment';
import * as api from '../api';

const Profile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const profileRes = await api.fetchProfile(username);
        setProfile(profileRes.data);
        const postsRes = await api.fetchUserPosts(username);
        setPosts(postsRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadProfileData();
  }, [username]);

  const handleLike = async (id) => {
    const updatedPosts = posts.map(p => {
      if (p._id === id) {
        const liked = p.likes.includes(currentUser.username);
        const newLikes = liked 
          ? p.likes.filter(u => u !== currentUser.username) 
          : [...p.likes, currentUser.username];
        return { ...p, likes: newLikes };
      }
      return p;
    });
    setPosts(updatedPosts);
    try {
      await api.likePost(id);
    } catch (err) {
      // Rollback logic could go here
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  if (!profile) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5">User not found</Typography>
      <Button variant="contained" onClick={() => window.history.back()} sx={{ mt: 2 }}>Go Back</Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <Navbar user={currentUser} />

      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 0, md: 2 } }}>
        <Paper elevation={0} sx={{ borderRadius: '12px', overflow: 'hidden', mb: 2 }}>
          {/* Banner */}
          <Box sx={{ height: 200, bgcolor: '#cccccc', position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
              <Button variant="contained" sx={{ bgcolor: 'rgba(255,255,255,0.8)', color: '#1877F2', borderRadius: '50%', minWidth: 40, width: 40, height: 40 }}>
                <Share fontSize="small" />
              </Button>
            </Box>
          </Box>

          {/* Profile Header */}
          <Box sx={{ px: 4, pb: 2, position: 'relative' }}>
            <Avatar 
              src={profile.avatar} 
              sx={{ width: 120, height: 120, border: '4px solid white', position: 'absolute', top: -60 }} 
            />
            
            <Box sx={{ pt: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {profile.username} <Box component="span" sx={{ color: '#1877F2' }}>💎</Box> 🇮🇳
                </Typography>
                <Typography variant="body1" color="textSecondary">@{profile.username}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1, color: '#65676b' }}>
                  <Typography variant="body2">Female • <CalendarMonth sx={{ fontSize: 16, verticalAlign: 'middle' }} /> Joined {moment(profile.joinedDate).format('MMM YYYY')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                  <Typography variant="body2"><strong>1</strong> Following</Typography>
                  <Typography variant="body2"><strong>31</strong> Followers</Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button variant="outlined" sx={{ borderRadius: '20px', textTransform: 'none' }}>Chat</Button>
                  <Button variant="contained" sx={{ borderRadius: '20px', textTransform: 'none', bgcolor: '#1877F2' }}>Follow</Button>
                </Box>
                <Typography variant="body2" color="textSecondary">Earned Points</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1877F2' }}>1,54,796</Typography>
                
                {/* Rank Widgets */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Paper variant="outlined" sx={{ p: 0.5, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ color: '#d4af37' }}>⭐</Box>
                    <Typography variant="caption">Rank: <strong>2</strong></Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 0.5, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ color: '#1877F2' }}>❓</Box>
                    <Typography variant="caption">Rank: <strong>1</strong></Typography>
                  </Paper>
                </Box>
              </Box>
            </Box>

            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mt: 3 }}>
              <Tab label={`Posts (${posts.length})`} sx={{ textTransform: 'none', fontWeight: 'bold' }} />
              <Tab label="Liked (0)" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
              <Tab label="Commented (550)" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            </Tabs>
          </Box>
        </Paper>

        <Box sx={{ maxWidth: 700, mx: 'auto', mt: 2 }}>
          {tab === 0 && posts.map(post => (
            <PostCard 
              key={post._id} 
              post={post} 
              currentUsername={currentUser?.username} 
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;
