import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Avatar, Typography, Tabs, Tab, Button, Grid, Divider, CircularProgress, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, ListItemText, TextField, InputAdornment,
} from '@mui/material';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Message from '@mui/icons-material/Message';
import Share from '@mui/icons-material/Share';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Search from '@mui/icons-material/Search';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import OnlineIndicator from '../components/OnlineIndicator';
import { useSocket } from '../context/SocketContext';
import moment from 'moment';
import * as api from '../api';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { on } = useSocket();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listDialog, setListDialog] = useState(null); // 'followers' | 'following' | null
  const [listData, setListData] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const currentUser = JSON.parse(localStorage.getItem('user'));

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profileRes = await api.fetchProfile(username);
      setProfile(profileRes.data);
      setIsFollowing((profileRes.data.followers || []).includes(currentUser?.username));
      setFollowerCount((profileRes.data.followers || []).length);
      setFollowingCount((profileRes.data.following || []).length);
      const postsRes = await api.fetchUserPosts(username);
      setPosts(postsRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Real-time follow updates
  useEffect(() => {
    const off = on('user:follow', (payload) => {
      if (!payload) return;
      if (payload.target === username) {
        setFollowerCount(payload.followersCount);
        setIsFollowing((payload.followers || []).includes(currentUser?.username));
      }
      if (payload.by === username) {
        setFollowingCount(payload.followingCount);
      }
    });
    return () => off && off();
  }, [on, username, currentUser?.username]);

  const handleLike = async (id) => {
    setPosts((prev) => prev.map((p) => {
      if (p._id !== id) return p;
      const liked = (p.likes || []).includes(currentUser.username);
      const newLikes = liked
        ? p.likes.filter((u) => u !== currentUser.username)
        : [...(p.likes || []), currentUser.username];
      return { ...p, likes: newLikes };
    }));
    try {
      await api.likePost(id);
    } catch (err) { /* ignore */ }
  };

  const handleFollow = async () => {
    if (!profile) return;
    // Optimistic
    setIsFollowing(true);
    setFollowerCount((c) => c + 1);
    try {
      await api.toggleFollow(profile.username);
    } catch (err) {
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    setIsFollowing(false);
    setFollowerCount((c) => Math.max(0, c - 1));
    try {
      await api.toggleFollow(profile.username);
    } catch (err) {
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  };

  const openList = async (type) => {
    if (!profile) return;
    setListDialog(type);
    setListLoading(true);
    setListSearch('');
    try {
      const { data } = await api.fetchProfile(profile.username);
      setListData(type === 'followers' ? data.followers || [] : data.following || []);
    } catch (err) { setListData([]); }
    setListLoading(false);
  };

  const closeList = () => { setListDialog(null); setListData([]); };

  const filteredList = listData.filter((u) => u.toLowerCase().includes(listSearch.toLowerCase()));

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  if (!profile) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5">User not found</Typography>
      <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>Go Home</Button>
    </Box>
  );

  const isMe = currentUser?.username === profile.username;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar user={currentUser} />

      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 0, md: 2 } }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 1, ml: 1 }}><ArrowBack /></IconButton>
        <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', mb: 2, border: '1px solid', borderColor: 'divider' }}>
          {/* Banner */}
          <Box
            sx={{
              height: 260,
              background: profile.coverImage
                ? `url(${profile.coverImage}) center/cover`
                : 'linear-gradient(135deg, #1877F2 0%, #42a5f5 50%, #7c4dff 100%)',
              position: 'relative',
            }}
          >
            <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
              <Button
                startIcon={<Share fontSize="small" />}
                variant="contained"
                sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'primary.main', borderRadius: '20px', textTransform: 'none' }}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: `@${profile.username}`, url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
              >
                Share
              </Button>
            </Box>
          </Box>

          {/* Profile Header */}
          <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, position: 'relative' }}>
            <Box sx={{ position: 'relative', display: 'inline-block', mt: -8, ml: { xs: 0, md: 3 } }}>
              <Avatar
                src={profile.avatar}
                sx={{ width: 140, height: 140, border: '5px solid', borderColor: 'background.paper', boxShadow: 3 }}
              >
                {profile.username?.[0]?.toUpperCase()}
              </Avatar>
              <OnlineIndicator username={profile.username} size={20} sx={{ position: 'absolute', bottom: 8, right: 8 }} />
            </Box>

            <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {profile.username}
                </Typography>
                <Typography variant="body1" color="textSecondary">@{profile.username}</Typography>
                {profile.bio && <Typography variant="body1" sx={{ mt: 1, color: 'text.primary' }}>{profile.bio}</Typography>}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, color: 'text.secondary' }}>
                  <CalendarMonth sx={{ fontSize: 16 }} />
                  <Typography variant="body2">Joined {moment(profile.joinedDate).format('MMMM YYYY')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                  <Button
                    onClick={() => openList('following')}
                    sx={{ p: 0, textTransform: 'none', '&:hover': { bgcolor: 'transparent' } }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                      <strong>{followingCount}</strong> <Box component="span" color="text.secondary">Following</Box>
                    </Typography>
                  </Button>
                  <Button
                    onClick={() => openList('followers')}
                    sx={{ p: 0, textTransform: 'none', '&:hover': { bgcolor: 'transparent' } }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                      <strong>{followerCount}</strong> <Box component="span" color="text.secondary">Followers</Box>
                    </Typography>
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{posts.length}</strong> Posts
                  </Typography>
                </Box>
              </Box>

              {!isMe && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<Message fontSize="small" />}
                    variant="outlined"
                    onClick={() => navigate('/chat')}
                    sx={{ borderRadius: '20px', textTransform: 'none' }}
                  >
                    Message
                  </Button>
                  {isFollowing ? (
                    <Button
                      variant="outlined"
                      onClick={handleUnfollow}
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600, minWidth: 120 }}
                    >
                      Following
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleFollow}
                      sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600, bgcolor: '#1877F2', '&:hover': { bgcolor: '#166fe5' }, minWidth: 120 }}
                    >
                      Follow
                    </Button>
                  )}
                </Box>
              )}
              {isMe && (
                <Button variant="outlined" onClick={() => navigate('/account')} sx={{ borderRadius: '20px', textTransform: 'none' }}>
                  Edit Profile
                </Button>
              )}
            </Box>

            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label={`Posts (${posts.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
              <Tab label="About" sx={{ textTransform: 'none', fontWeight: 700 }} />
            </Tabs>
          </Box>
        </Paper>

        <Box sx={{ maxWidth: 700, mx: 'auto', mt: 2 }}>
          {tab === 0 && (
            <>
              {posts.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: '12px' }} elevation={0}>
                  <Typography sx={{ fontSize: 48, mb: 1 }}>📝</Typography>
                  <Typography variant="h6">No posts yet</Typography>
                </Paper>
              ) : posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={handleLike}
                  currentUsername={currentUser?.username}
                  onProfileClick={(u) => navigate(`/profile/${u}`)}
                />
              ))}
            </>
          )}
          {tab === 1 && (
            <Paper sx={{ p: 3, borderRadius: '12px' }} elevation={0}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>About @{profile.username}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">USERNAME</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>@{profile.username}</Typography>
                </Box>
                {profile.bio && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">BIO</Typography>
                    <Typography variant="body1">{profile.bio}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">JOINED</Typography>
                  <Typography variant="body1">{moment(profile.joinedDate).format('MMMM D, YYYY')}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">STATS</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Chip label={`${posts.length} Posts`} />
                    <Chip label={`${followerCount} Followers`} />
                    <Chip label={`${followingCount} Following`} />
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Followers / Following Dialog */}
      <Dialog open={!!listDialog} onClose={closeList} fullWidth maxWidth="xs">
        <DialogTitle>{listDialog === 'followers' ? 'Followers' : 'Following'}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              }}
            />
          </Box>
          {listLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : filteredList.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No users to show</Typography>
            </Box>
          ) : (
            <List>
              {filteredList.map((uname) => (
                <ListItem
                  key={uname}
                  button
                  onClick={() => { closeList(); navigate(`/profile/${uname}`); }}
                >
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{uname[0]?.toUpperCase()}</Avatar>
                      <OnlineIndicator username={uname} size={10} />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText primary={uname} secondary={`@${uname}`} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Profile;
