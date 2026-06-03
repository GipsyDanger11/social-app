import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, Typography, InputBase, Box, IconButton, Avatar, Badge, List, ListItem, ListItemText, Divider, Menu, MenuItem, Tooltip, CircularProgress, Popper, ClickAwayListener, Paper, Popover,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Notifications from '@mui/icons-material/Notifications';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import Logout from '@mui/icons-material/Logout';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import OnlineIndicator from './OnlineIndicator';
import * as api from '../api';
import moment from 'moment';

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const { on, onlineUsers, connected } = useSocket();
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userMenu, setUserMenu] = useState(null);
  const [searchResults, setSearchResults] = useState({ posts: [], users: [] });
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Initial unread count
  useEffect(() => {
    refreshUnread();
  }, []);

  // Real-time: subscribe to new notifications
  useEffect(() => {
    const off = on('notification:new', (n) => {
      if (!n) return;
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    });
    return () => off && off();
  }, [on]);

  const refreshUnread = async () => {
    try {
      const { data } = await api.fetchUnreadCount();
      setUnreadCount(data.count);
    } catch (err) { /* ignore */ }
  };

  const handleNotificationOpen = async (event) => {
    setAnchorEl(event.currentTarget);
    try {
      const { data } = await api.fetchNotifications();
      setNotifications(data);
      await api.markNotificationsRead();
      setUnreadCount(0);
    } catch (err) { /* ignore */ }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearch(query);
    if (query.trim().length === 0) {
      setSearchResults({ posts: [], users: [] });
      return;
    }
    // Debounce API calls
    if (handleSearchChange._t) clearTimeout(handleSearchChange._t);
    handleSearchChange._t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [postsRes, usersRes] = await Promise.all([
          api.searchPosts(query).catch(() => ({ data: [] })),
          api.searchUsers(query).catch(() => ({ data: [] })),
        ]);
        setSearchResults({ posts: postsRes.data || [], users: usersRes.data || [] });
      } catch (err) { /* ignore */ }
      setSearchLoading(false);
    }, 150);
  };

  const clearSearch = () => {
    setSearch('');
    setSearchResults({ posts: [], users: [] });
    searchInputRef.current?.focus();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserMenu(null);
    navigate('/auth');
    window.location.reload();
  };

  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar sx={{ justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Left: Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #1877F2 0%, #42a5f5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 18, cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            S
          </Box>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 800, color: 'text.primary', cursor: 'pointer', display: { xs: 'none', sm: 'block' } }}
            onClick={() => navigate('/')}
          >
            Social
          </Typography>
          <Box
            className={`live-dot ${connected ? 'live-dot-on' : 'live-dot-off'}`}
            title={connected ? 'Connected (real-time)' : 'Reconnecting…'}
            sx={{ display: { xs: 'none', md: 'inline-block' }, ml: 1 }}
          />
        </Box>

        {/* Center: Search Bar */}
        <Box
          ref={searchContainerRef}
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            bgcolor: mode === 'light' ? '#f0f2f5' : '#3a3b3c',
            borderRadius: '20px',
            px: 2,
            width: '40%',
            position: 'relative',
          }}
        >
          <Search fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <InputBase
            inputRef={searchInputRef}
            placeholder="Search posts, people..."
            sx={{ ml: 0, flex: 1, fontSize: '14px', color: 'text.primary' }}
            value={search}
            onChange={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            autoComplete="off"
          />
          {searchLoading && <CircularProgress size={14} thickness={5} sx={{ color: 'text.secondary' }} />}

          {/* Search Results - uses Popper so it never steals input focus */}
          <Popper
            open={searchFocused && (searchResults.posts.length > 0 || searchResults.users.length > 0 || searchLoading)}
            anchorEl={searchContainerRef.current}
            placement="bottom-start"
            disablePortal={false}
            modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
            sx={{ zIndex: 1500, width: searchContainerRef.current?.offsetWidth || 400 }}
          >
            <ClickAwayListener
              onClickAway={(e) => {
                // Don't close if the click is inside the search bar
                if (searchContainerRef.current && searchContainerRef.current.contains(e.target)) return;
                setSearchFocused(false);
              }}
            >
              <Paper elevation={8} sx={{ width: '100%', maxHeight: 480, overflow: 'auto', borderRadius: '12px', p: 1 }}>
                {searchLoading && searchResults.posts.length === 0 && searchResults.users.length === 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                )}
                {searchResults.users.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ p: 1, color: 'text.secondary', fontWeight: 700 }}>
                      PEOPLE
                    </Typography>
                    {searchResults.users.slice(0, 5).map((u) => (
                      <Box
                        key={u.username}
                        sx={{ p: 1.2, borderRadius: 1, cursor: 'pointer', display: 'flex', gap: 1, alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { navigate(`/profile/${u.username}`); setSearchFocused(false); clearSearch(); }}
                      >
                        <Box sx={{ position: 'relative' }}>
                          <Avatar src={u.avatar} sx={{ width: 36, height: 36 }}>{u.username[0]?.toUpperCase()}</Avatar>
                          <OnlineIndicator username={u.username} size={10} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{u.username}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{u.bio || `@${u.username}`}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                {searchResults.posts.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ p: 1, color: 'text.secondary', fontWeight: 700 }}>
                      POSTS
                    </Typography>
                    {searchResults.posts.slice(0, 5).map((post) => (
                      <Box
                        key={post._id}
                        sx={{ p: 1.2, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { navigate('/'); setSearchFocused(false); clearSearch(); }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          @{post.authorUsername}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {post.content}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {!searchLoading && searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No results for "{search}"
                  </Typography>
                )}
              </Paper>
            </ClickAwayListener>
          </Popper>
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={connected ? 'Live updates active' : 'Reconnecting…'}>
            <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5, mr: 1, px: 1.2, py: 0.5, borderRadius: 20, bgcolor: connected ? 'rgba(49,162,76,0.1)' : 'action.hover' }}>
              <Box className={`live-dot ${connected ? 'live-dot-on' : 'live-dot-off'}`} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: connected ? '#31a24c' : 'text.secondary' }}>
                {connected ? 'Live' : 'Offline'}
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton size="small" sx={{ bgcolor: mode === 'light' ? '#f0f2f5' : '#3a3b3c' }} onClick={handleNotificationOpen}>
              <Badge badgeContent={unreadCount} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            disableAutoFocus
            disableEnforceFocus
            disableRestoreFocus
          >
            <Box sx={{ width: 360, maxHeight: 480, overflow: 'auto' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #e4e6eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Notifications</Typography>
                <Typography variant="caption" color="text.secondary">{unreadCount} new</Typography>
              </Box>
              {notifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 32, mb: 1 }}>🔔</Typography>
                  <Typography color="text.secondary">No notifications yet</Typography>
                  <Typography variant="caption" color="text.secondary">Interact with posts to see updates here</Typography>
                </Box>
              ) : (
                <List dense disablePadding>
                  {notifications.map((notif) => (
                    <ListItem key={notif._id} sx={{ borderBottom: '1px solid #f0f2f5', alignItems: 'flex-start' }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: notif.type === 'like' ? '#fef0f0' : notif.type === 'comment' ? '#e7f3ff' : notif.type === 'follow' ? '#e7f3ff' : notif.type === 'share' ? '#f0fff4' : '#fef0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5, mt: 0.5, fontSize: 18, flexShrink: 0 }}>
                        {notif.type === 'like' ? '❤️' : notif.type === 'comment' ? '💬' : notif.type === 'share' ? '🔄' : notif.type === 'follow' ? '👤' : '✉️'}
                      </Box>
                      <ListItemText
                        primary={notif.message}
                        secondary={moment(notif.createdAt).fromNow()}
                        primaryTypographyProps={{ fontSize: 13 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Popover>

          <Tooltip title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
            <IconButton size="small" sx={{ bgcolor: mode === 'light' ? '#f0f2f5' : '#3a3b3c' }} onClick={toggleTheme}>
              {mode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Tooltip>

          <Box sx={{ position: 'relative' }}>
            <IconButton
              size="small"
              onClick={(e) => setUserMenu(e.currentTarget)}
              sx={{ p: 0.5 }}
            >
              <Avatar src={user?.avatar} sx={{ width: 36, height: 36, border: '2px solid #1877F2' }}>
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
            <OnlineIndicator username={user?.username} size={10} sx={{ position: 'absolute', bottom: 0, right: 0 }} />
            <Menu anchorEl={userMenu} open={Boolean(userMenu)} onClose={() => setUserMenu(null)}>
              <MenuItem onClick={() => { setUserMenu(null); navigate('/account'); }}>
                <AccountCircle fontSize="small" style={{ marginRight: 8 }} /> Account
              </MenuItem>
              <MenuItem onClick={() => { setUserMenu(null); navigate(`/profile/${user?.username}`); }}>
                <Avatar src={user?.avatar} sx={{ width: 24, height: 24, mr: 1 }} /> My Profile
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <Logout fontSize="small" style={{ marginRight: 8 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
