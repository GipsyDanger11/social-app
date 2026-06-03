import React, { useState, useEffect, useRef } from 'react';
import {
  Paper, Box, Avatar, Typography, Button, IconButton, Divider, Menu, MenuItem, Modal, TextField, Collapse, List, ListItem, ListItemAvatar, ListItemText, Tooltip,
} from '@mui/material';
import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import ModeComment from '@mui/icons-material/ModeComment';
import Share from '@mui/icons-material/Share';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Send from '@mui/icons-material/Send';
import moment from 'moment';
import * as api from '../api';
import { useSocket } from '../context/SocketContext';
import { resolveImageUrl } from '../utils/imageUrl';

const PostCard = ({ post, onLike, onDelete, onUpdate, currentUsername, onProfileClick }) => {
  const isLiked = (post.likes || []).includes(currentUsername);
  const isAuthor = post.authorUsername === currentUsername;
  const { on } = useSocket();

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editImage, setEditImage] = useState(post.imageUrl || '');
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [heartBurst, setHeartBurst] = useState(false);
  const [likeCount, setLikeCount] = useState((post.likes || []).length);
  const [commentCount, setCommentCount] = useState((post.comments || []).length);

  useEffect(() => {
    setComments(post.comments || []);
    setCommentCount((post.comments || []).length);
    setLikeCount((post.likes || []).length);
  }, [post._id]);

  useEffect(() => {
    setLikeCount((post.likes || []).length);
  }, [post.likes]);

  // Real-time: per-post live updates (so this post's data stays in sync even if the parent is slow)
  useEffect(() => {
    const offLike = on('post:like', ({ postId, likes }) => {
      if (postId !== post._id) return;
      setLikeCount(likes.length);
    });
    const offComment = on('post:comment', ({ postId, comment, commentsCount }) => {
      if (postId !== post._id) return;
      setComments((prev) => {
        const filtered = prev.filter(
          (c) => !(c.isOptimistic && c.username === comment.username && c.text === comment.text)
        );
        return [comment, ...filtered];
      });
      setCommentCount(commentsCount);
    });
    return () => {
      offLike && offLike();
      offComment && offComment();
    };
  }, [on, post._id]);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleEditOpen = () => {
    setEditContent(post.content);
    setEditImage(post.imageUrl || '');
    setEditOpen(true);
    handleMenuClose();
  };

  const handleUpdate = () => {
    onUpdate(post._id, { content: editContent, imageUrl: editImage });
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete(post._id);
    }
    handleMenuClose();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${post.authorUsername}`,
          text: post.content,
          url: window.location.href,
        });
      } catch (e) { /* user cancelled */ }
    }
    try {
      await api.sharePost(post._id);
    } catch (err) { console.error(err); }
  };

  const handleLikeClick = () => {
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 600);
    onLike(post._id);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const text = newComment;
    setNewComment('');

    // Optimistic update
    const tempComment = {
      _id: `tmp-${Date.now()}`,
      username: currentUsername,
      text,
      createdAt: new Date(),
      isOptimistic: true,
    };
    setComments((prev) => [tempComment, ...prev]);
    setCommentCount((c) => c + 1);

    try {
      const { data } = await api.commentPost(post._id, { text });
      setComments(data);
      setCommentCount(data.length);
    } catch (err) {
      setComments((prev) => prev.filter((c) => c._id !== tempComment._id));
      setCommentCount((c) => Math.max(0, c - 1));
    }
  };

  const shareCount = (post.shares || []).length;
  const isShared = (post.shares || []).includes(currentUsername);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: '16px',
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{ display: 'flex', gap: 1.5, cursor: 'pointer', alignItems: 'center' }}
          onClick={() => onProfileClick && onProfileClick(post.authorUsername)}
        >
          <Avatar src={post.author?.avatar} sx={{ width: 48, height: 48, border: '2px solid #1877F2' }}>
            {post.author?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
              {post.author?.username || post.authorUsername}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{post.authorUsername} • {moment(post.createdAt).fromNow()}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isAuthor && (
            <>
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreHoriz />
              </IconButton>
              <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
                <MenuItem onClick={handleEditOpen} sx={{ gap: 1 }}>
                  <Edit fontSize="small" /> Edit
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ gap: 1, color: 'error.main' }}>
                  <Delete fontSize="small" /> Delete
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>

      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <Box
          sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 480 }, bgcolor: 'background.paper', borderRadius: '12px', p: 4, boxShadow: 24,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Edit Post</Typography>
          <TextField
            fullWidth multiline rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Image URL (optional)"
            value={editImage}
            onChange={(e) => setEditImage(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdate} sx={{ bgcolor: '#1877F2' }}>Save Changes</Button>
          </Box>
        </Box>
      </Modal>

      {post.content && (
        <Typography
          variant="body1"
          sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'text.primary', fontSize: '0.95rem', lineHeight: 1.5 }}
        >
          {post.content}
        </Typography>
      )}

      {post.imageUrl && (
        <Box
          component="img"
          src={resolveImageUrl(post.imageUrl)}
          onDoubleClick={handleLikeClick}
          sx={{ width: '100%', borderRadius: '12px', mb: 2, maxHeight: 500, objectFit: 'cover', cursor: 'pointer' }}
        />
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {likeCount > 0 && `👍 ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={() => setShowComments(true)}>
          {commentCount > 0 && `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
        </Typography>
      </Box>

      <Divider sx={{ mb: 1 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-around', position: 'relative' }}>
        <Tooltip title={isLiked ? 'Unlike' : 'Like'}>
          <Button
            startIcon={
              <Box sx={{ position: 'relative' }}>
                {isLiked ? (
                  <Favorite sx={{ color: '#f02849' }} className={heartBurst ? 'heart-burst' : ''} />
                ) : (
                  <FavoriteBorder />
                )}
                {heartBurst && <Favorite className="heart-burst-particle" sx={{ color: '#f02849', position: 'absolute', top: 0, left: 0 }} />}
              </Box>
            }
            onClick={handleLikeClick}
            sx={{ color: isLiked ? '#f02849' : 'text.secondary', textTransform: 'none', flex: 1, fontWeight: 600 }}
          >
            {isLiked ? 'Liked' : 'Like'}
          </Button>
        </Tooltip>
        <Button
          startIcon={<ModeComment />}
          onClick={() => setShowComments(!showComments)}
          sx={{ color: showComments ? 'primary.main' : 'text.secondary', textTransform: 'none', flex: 1, fontWeight: 600 }}
        >
          Comment
        </Button>
        <Button
          startIcon={<Share sx={{ color: isShared ? '#1877F2' : 'inherit' }} />}
          onClick={handleShare}
          sx={{ color: isShared ? '#1877F2' : 'text.secondary', textTransform: 'none', flex: 1, fontWeight: 600 }}
        >
          {isShared ? 'Shared' : 'Share'}
        </Button>
      </Box>

      <Collapse in={showComments}>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
          <Avatar src={null} sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {currentUsername?.[0]?.toUpperCase()}
          </Avatar>
          <TextField
            fullWidth
            size="small"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
          />
          <IconButton color="primary" onClick={handleAddComment} disabled={!newComment.trim()}>
            <Send fontSize="small" />
          </IconButton>
        </Box>
        {comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            No comments yet. Be the first to comment!
          </Typography>
        ) : (
          <List dense disablePadding>
            {comments.map((comment) => (
              <ListItem key={comment._id} alignItems="flex-start" disableGutters sx={{ py: 0.5 }}>
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar
                    sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                    src={null}
                  >
                    {comment.username?.[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ fontWeight: 700, mr: 1, color: 'text.primary' }}
                      >
                        {comment.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {moment(comment.createdAt).fromNow()}
                      </Typography>
                    </Box>
                  }
                  secondary={comment.text}
                  secondaryTypographyProps={{
                    component: 'div',
                    sx: { opacity: comment.isOptimistic ? 0.6 : 1, color: 'text.primary' },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Collapse>
    </Paper>
  );
};

export default PostCard;
