import React, { useState } from 'react';
import { Paper, Box, Avatar, Typography, Button, IconButton, Divider, Menu, MenuItem, Modal, TextField } from '@mui/material';
import Favorite from '@mui/icons-material/Favorite';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutlineOutlined';
import Share from '@mui/icons-material/Share';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import PushPin from '@mui/icons-material/PushPin';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import moment from 'moment';

const PostCard = ({ post, onLike, onDelete, onUpdate, currentUsername }) => {
  const isLiked = post.likes.includes(currentUsername);
  const isAuthor = post.authorUsername === currentUsername;
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  
  // Edit Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleEditOpen = () => {
    setEditOpen(true);
    handleMenuClose();
  };

  const handleUpdate = () => {
    onUpdate(post._id, { content: editContent });
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete(post._id);
    }
    handleMenuClose();
  };

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', mb: 2, border: '1px solid #e4e6eb', position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Avatar src={post.author?.avatar} sx={{ width: 45, height: 45 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              {post.authorUsername} <Box component="span" sx={{ color: '#65676b', fontWeight: 'normal', fontSize: '14px' }}>@{post.authorUsername}</Box>
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {moment(post.createdAt).format('MMM D')}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button variant="contained" size="small" sx={{ borderRadius: '20px', bgcolor: '#1877F2', textTransform: 'none' }}>
            Follow
          </Button>
          
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

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 400, bgcolor: 'background.paper', borderRadius: '12px', p: 4, boxShadow: 24
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Edit Post</Typography>
          <TextField
            fullWidth multiline rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdate} sx={{ bgcolor: '#1877F2' }}>Save Changes</Button>
          </Box>
        </Box>
      </Modal>

      {post.type === 'promotion' && (
        <Button variant="outlined" size="small" sx={{ mb: 2, borderRadius: '20px', color: '#d4af37', borderColor: '#d4af37', textTransform: 'none' }}>
          Post & Earn
        </Button>
      )}

      <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
        {post.content}
      </Typography>

      {post.imageUrl && (
        <Box component="img" src={post.imageUrl} sx={{ width: '100%', borderRadius: '8px', mb: 2 }} />
      )}

      <Divider sx={{ mb: 1 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
        <Button 
          startIcon={<Favorite color={isLiked ? 'error' : 'inherit'} />} 
          onClick={() => onLike(post._id)}
          sx={{ color: isLiked ? '#f02849' : '#65676b', textTransform: 'none' }}
        >
          {post.likes.length}
        </Button>
        <Button 
          startIcon={<ChatBubbleOutline />} 
          sx={{ color: '#65676b', textTransform: 'none' }}
        >
          {post.comments.length}
        </Button>
        <Button 
          startIcon={<Share />} 
          sx={{ color: '#65676b', textTransform: 'none' }}
        >
          0
        </Button>
      </Box>
    </Paper>
  );
};

export default PostCard;
