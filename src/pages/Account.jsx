import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Avatar, Container, Divider, Grid } from '@mui/material';
import Navbar from '../components/Navbar';
import * as api from '../api';

const Account = () => {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    avatar: '',
    coverImage: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.fetchMe();
        setProfile(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.updateProfile(profile);
      setProfile(data);
      localStorage.setItem('user', JSON.stringify({
        id: data._id,
        username: data.username,
        email: data.email,
        avatar: data.avatar
      }));
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error updating profile');
    }
  };

  if (loading) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <Navbar user={profile} />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: '12px' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Account Settings</Typography>
          
          {message && (
            <Typography color={message.includes('Error') ? 'error' : 'primary'} sx={{ mb: 2 }}>
              {message}
            </Typography>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sx={{ textAlign: 'center', mb: 2 }}>
                <Avatar 
                  src={profile.avatar} 
                  sx={{ width: 100, height: 100, mx: 'auto', mb: 2, border: '2px solid #1877F2' }} 
                />
                <Button variant="outlined" size="small" component="label" sx={{ textTransform: 'none' }}>
                  Change Avatar URL
                  <input type="text" hidden />
                </Button>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth label="Username"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth label="Email"
                  value={profile.email}
                  disabled
                  helperText="Email cannot be changed"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth label="Bio"
                  multiline rows={3}
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth label="Avatar URL"
                  value={profile.avatar}
                  onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth label="Cover Image URL"
                  value={profile.coverImage}
                  onChange={(e) => setProfile({ ...profile, coverImage: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button variant="outlined" sx={{ borderRadius: '20px' }}>Cancel</Button>
                  <Button type="submit" variant="contained" sx={{ borderRadius: '20px', bgcolor: '#1877F2' }}>
                    Save Changes
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default Account;
