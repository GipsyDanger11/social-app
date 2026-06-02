import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SidebarLeft from '../components/SidebarLeft';
import SidebarRight from '../components/SidebarRight';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { useSocket } from '../context/SocketContext';
import * as api from '../api';

const Feed = () => {
  const navigate = useNavigate();
  const { on, connected } = useSocket();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    loadPosts(true);
  }, [filter]);

  // Real-time: new post from any user → prepend
  useEffect(() => {
    const offNew = on('post:new', (post) => {
      if (!post || !post._id) return;
      setPosts((prev) => {
        if (prev.some((p) => p._id === post._id)) return prev;
        // If the new post is mine, don't show toast (we already optimistically added it)
        if (user && post.author && post.author._id === user.id) return [post, ...prev.filter((p) => p.isOptimistic)];
        setToast({ type: 'info', message: `New post from @${post.authorUsername}` });
        return [post, ...prev];
      });
    });
    const offDelete = on('post:delete', ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    });
    const offLike = on('post:like', ({ postId, likes }) => {
      setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, likes } : p)));
    });
    const offShare = on('post:share', ({ postId, shares }) => {
      setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, shares } : p)));
    });
    const offComment = on('post:comment', ({ postId, comment, commentsCount }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id !== postId) return p;
          // Avoid duplicating an optimistic comment with the same text + author
          const filtered = (p.comments || []).filter(
            (c) => !(c.isOptimistic && c.username === comment.username && c.text === comment.text)
          );
          return { ...p, comments: [comment, ...filtered], _commentsCount: commentsCount };
        })
      );
    });
    return () => {
      offNew && offNew();
      offDelete && offDelete();
      offLike && offLike();
      offShare && offShare();
      offComment && offComment();
    };
  }, [on, user]);

  const loadPosts = async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const { data } = await api.fetchPosts(currentPage, filter);
      if (reset) {
        setPosts(data.posts);
        setPage(2);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
        setPage((prev) => prev + 1);
      }
      setHasMore(data.currentPage < data.totalPages);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePostCreated = async (postData) => {
    // Optimistic UI update
    const tempId = `tmp-${Date.now()}`;
    const tempPost = {
      _id: tempId,
      content: postData.content,
      imageUrl: postData.imageUrl,
      type: postData.type,
      author: {
        _id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      authorUsername: user.username,
      likes: [],
      shares: [],
      comments: [],
      createdAt: new Date(),
      isOptimistic: true,
    };

    setPosts([tempPost, ...posts]);

    try {
      const { data } = await api.createPost(postData);
      setPosts((prev) => prev.map((p) => (p._id === tempId ? data : p)));
    } catch (err) {
      console.error(err);
      setPosts((prev) => prev.filter((p) => p._id !== tempId));
    }
  };

  const handleLike = async (id) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== id) return p;
        const liked = p.likes.includes(user.username);
        const newLikes = liked
          ? p.likes.filter((u) => u !== user.username)
          : [...p.likes, user.username];
        return { ...p, likes: newLikes };
      })
    );

    try {
      await api.likePost(id);
    } catch (err) {
      // Rollback by reloading
      console.error(err);
    }
  };

  const handleDeletePost = async (id) => {
    try {
      await api.deletePost(id);
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePost = async (id, postData) => {
    try {
      const { data } = await api.updatePost(id, postData);
      setPosts((prev) => prev.map((p) => (p._id === id ? data : p)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (newFilter) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
  };

  const filterPills = [
    { label: 'For You', value: 'all' },
    { label: '🔥 Trending', value: 'most-liked' },
    { label: '💬 Discussed', value: 'most-commented' },
    { label: '🔄 Shared', value: 'most-shared' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar user={user} />

      <Box className="app-container">
        {/* Left Sidebar */}
        <SidebarLeft />

        {/* Center Feed */}
        <Box>
          <CreatePost user={user} onPostCreated={handlePostCreated} />

          <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 1 }}>
            {filterPills.map((pill) => (
              <button
                key={pill.value + pill.label}
                className={`pill ${filter === pill.value ? 'pill-active' : 'pill-inactive'}`}
                onClick={() => handleFilterChange(pill.value)}
              >
                {pill.label}
              </button>
            ))}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                className={`live-dot ${connected ? 'live-dot-on' : 'live-dot-off'}`}
                title={connected ? 'Live updates connected' : 'Reconnecting…'}
              />
              <Typography variant="caption" color="text.secondary">
                {connected ? 'Live' : 'Offline'}
              </Typography>
            </Box>
          </Box>

          {posts.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', p: 5, bgcolor: 'background.paper', borderRadius: '12px' }}>
              <Typography variant="h5" sx={{ mb: 1 }}>📭</Typography>
              <Typography variant="h6">No posts yet</Typography>
              <Typography variant="body2" color="text.secondary">Be the first to share something!</Typography>
            </Box>
          )}

          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onDelete={handleDeletePost}
              onUpdate={handleUpdatePost}
              currentUsername={user?.username}
              onProfileClick={(username) => navigate(`/profile/${username}`)}
            />
          ))}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {hasMore && !loading && posts.length > 0 && (
            <Button
              fullWidth
              onClick={() => loadPosts()}
              sx={{
                mb: 4,
                bgcolor: 'background.paper',
                color: 'primary.main',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '20px',
                py: 1.2,
                fontWeight: 600,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              Load More Posts
            </Button>
          )}
        </Box>

        {/* Right Sidebar */}
        <SidebarRight />
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToast(null)} severity={toast?.type || 'info'} sx={{ borderRadius: 2 }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Feed;
