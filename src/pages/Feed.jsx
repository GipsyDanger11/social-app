import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import Navbar from '../components/Navbar';
import SidebarLeft from '../components/SidebarLeft';
import SidebarRight from '../components/SidebarRight';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import * as api from '../api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data } = await api.fetchPosts(page);
      setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.currentPage < data.totalPages);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePostCreated = async (postData) => {
    // Optimistic UI update
    const tempId = Date.now().toString();
    const tempPost = {
      _id: tempId,
      content: postData.content,
      imageUrl: postData.imageUrl,
      type: postData.type,
      author: {
        _id: user.id,
        username: user.username,
        avatar: user.avatar
      },
      authorUsername: user.username,
      likes: [],
      comments: [],
      createdAt: new Date(),
      isOptimistic: true
    };
    
    setPosts([tempPost, ...posts]);

    try {
      const { data } = await api.createPost(postData);
      setPosts(prev => prev.map(p => p._id === tempId ? data : p));
    } catch (err) {
      console.error(err);
      setPosts(prev => prev.filter(p => p._id !== tempId));
    }
  };

  const handleLike = async (id) => {
    // Optimistic UI update
    const originalPosts = [...posts];
    const updatedPosts = posts.map(p => {
      if (p._id === id) {
        const liked = p.likes.includes(user.username);
        const newLikes = liked 
          ? p.likes.filter(u => u !== user.username) 
          : [...p.likes, user.username];
        return { ...p, likes: newLikes };
      }
      return p;
    });
    setPosts(updatedPosts);

    try {
      await api.likePost(id);
    } catch (err) {
      setPosts(originalPosts); // Rollback on error
    }
  };

  const handleDeletePost = async (id) => {
    try {
      await api.deletePost(id);
      setPosts(posts.filter(p => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePost = async (id, postData) => {
    try {
      const { data } = await api.updatePost(id, postData);
      setPosts(posts.map(p => p._id === id ? data : p));
    } catch (err) {
      console.error(err);
    }
  };

  const filterPills = ["All Post", "For You", "Most Liked", "Most Commented", "Most Shared"];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5' }}>
      <Navbar user={user} />
      
      <Box className="app-container">
        {/* Left Sidebar */}
        <SidebarLeft />

        {/* Center Feed */}
        <Box>
          <CreatePost user={user} onPostCreated={handlePostCreated} />

          <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'auto', pb: 1 }}>
            {filterPills.map((pill, idx) => (
              <button 
                key={pill} 
                className={`pill ${idx === 0 ? 'pill-active' : 'pill-inactive'}`}
              >
                {pill}
              </button>
            ))}
          </Box>

          {posts.map(post => (
            <PostCard 
              key={post._id} 
              post={post} 
              onLike={handleLike} 
              onDelete={handleDeletePost}
              onUpdate={handleUpdatePost}
              currentUsername={user?.username} 
            />
          ))}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {hasMore && !loading && (
            <Button 
              fullWidth 
              onClick={loadPosts}
              sx={{ mb: 4, bgcolor: 'white', color: '#1877F2', '&:hover': { bgcolor: '#e4e6eb' } }}
            >
              Load More
            </Button>
          )}
        </Box>

        {/* Right Sidebar */}
        <SidebarRight />
      </Box>
    </Box>
  );
};

export default Feed;
