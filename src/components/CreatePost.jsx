import React, { useState } from 'react';
import { Paper, Typography, Box, Avatar, InputBase, Divider, IconButton, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import EmojiEmotions from '@mui/icons-material/EmojiEmotions';
import Menu from '@mui/icons-material/Menu';
import Campaign from '@mui/icons-material/Campaign';
import Send from '@mui/icons-material/Send';

const CreatePost = ({ user, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageUrl, setShowImageUrl] = useState(false);
  const [type, setType] = useState('all');

  const handlePost = () => {
    if (!content.trim()) return;
    onPostCreated({ content, imageUrl, type: type === 'all' ? 'post' : 'promotion' });
    setContent('');
    setImageUrl('');
    setShowImageUrl(false);
  };

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Create Post</Typography>
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={(e, newType) => newType && setType(newType)}
          sx={{ 
            bgcolor: '#f0f2f5', 
            borderRadius: '20px', 
            p: 0.5,
            '& .MuiToggleButton-root': { 
              borderRadius: '20px', 
              px: 3, 
              py: 0.5, 
              border: 'none',
              textTransform: 'none',
              fontWeight: 'bold',
              '&.Mui-selected': { bgcolor: '#1877F2', color: 'white', '&:hover': { bgcolor: '#166fe5' } }
            } 
          }}
        >
          <ToggleButton value="all">All Posts</ToggleButton>
          <ToggleButton value="promotions">Promotions</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Avatar src={user?.avatar} />
        <Box sx={{ flex: 1 }}>
          <InputBase
            placeholder="What's on your mind?"
            multiline
            fullWidth
            value={content}
            onChange={(e) => setContent(e.target.value)}
            sx={{ fontSize: '18px', color: '#65676b' }}
          />
          {showImageUrl && (
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="📷 Paste Image URL here..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setShowImageUrl(!showImageUrl)} sx={{ color: '#1877F2' }}>
            <PhotoCamera />
          </IconButton>
          <IconButton sx={{ color: '#1877F2' }}><EmojiEmotions /></IconButton>
          <IconButton sx={{ color: '#1877F2' }}><Menu /></IconButton>
          <Button 
            startIcon={<Campaign />} 
            sx={{ color: '#1877F2', textTransform: 'none', fontWeight: 'bold' }}
          >
            Promote
          </Button>
        </Box>
        <Button 
          variant="contained" 
          onClick={handlePost}
          disabled={!content.trim()}
          sx={{ 
            borderRadius: '20px', 
            bgcolor: content.trim() ? '#1877F2' : '#e4e6eb', 
            color: content.trim() ? 'white' : '#65676b', 
            '&:hover': { bgcolor: content.trim() ? '#166fe5' : '#d8dadf' }, 
            textTransform: 'none', 
            px: 4,
            fontWeight: 'bold'
          }}
        >
          Post
        </Button>
      </Box>
    </Paper>
  );
};

export default CreatePost;
