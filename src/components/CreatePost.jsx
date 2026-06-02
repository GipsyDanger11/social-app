import React, { useState, useRef } from 'react';
import { Paper, Typography, Box, Avatar, InputBase, Divider, IconButton, Button, ToggleButtonGroup, ToggleButton, Popover } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import EmojiEmotions from '@mui/icons-material/EmojiEmotions';
import Menu from '@mui/icons-material/Menu';
import Campaign from '@mui/icons-material/Campaign';
import EmojiPicker from 'emoji-picker-react';

const CreatePost = ({ user, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageUrl, setShowImageUrl] = useState(false);
  const [type, setType] = useState('all');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const inputRef = useRef(null);

  const handlePost = () => {
    if (!content.trim()) return;
    onPostCreated({ content, imageUrl, type: type === 'all' ? 'post' : 'promotion' });
    setContent('');
    setImageUrl('');
    setShowImageUrl(false);
  };

  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiSelect = (emojiData) => {
    setContent(prev => prev + emojiData.emoji);
    setEmojiAnchorEl(null);
    inputRef.current?.focus();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', mb: 3, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Create Post</Typography>
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={(e, newType) => newType && setType(newType)}
          sx={{ 
            bgcolor: 'action.hover', 
            borderRadius: '20px', 
            p: 0.5,
            '& .MuiToggleButton-root': { 
              borderRadius: '20px', 
              px: 3, 
              py: 0.5, 
              border: 'none',
              textTransform: 'none',
              fontWeight: 'bold',
              color: 'text.secondary',
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
            inputRef={inputRef}
            placeholder="What's on your mind?"
            multiline
            fullWidth
            value={content}
            onChange={(e) => setContent(e.target.value)}
            sx={{ fontSize: '18px', color: 'text.primary' }}
          />
          {showImageUrl && (
            <Box sx={{ mt: 1 }}>
              <TextFieldWrapper
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                handleImageUpload={handleImageUpload}
              />
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setShowImageUrl(!showImageUrl)} sx={{ color: '#1877F2' }} title="Add Image">
            <PhotoCamera />
          </IconButton>
          <IconButton onClick={handleEmojiClick} sx={{ color: '#1877F2' }} title="Add Emoji">
            <EmojiEmotions />
          </IconButton>
          <IconButton sx={{ color: '#1877F2' }} title="More">
            <Menu />
          </IconButton>
          <Button 
            startIcon={<Campaign />} 
            sx={{ color: '#1877F2', textTransform: 'none', fontWeight: 'bold' }}
            onClick={() => setType('promotions')}
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
            bgcolor: content.trim() ? '#1877F2' : 'action.hover', 
            color: content.trim() ? 'white' : 'text.secondary', 
            '&:hover': { bgcolor: content.trim() ? '#166fe5' : 'action.hover' }, 
            textTransform: 'none', 
            px: 4,
            fontWeight: 'bold'
          }}
        >
          Post
        </Button>
      </Box>

      {/* Emoji Picker */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <EmojiPicker onEmojiClick={handleEmojiSelect} />
      </Popover>
    </Paper>
  );
};

// Helper component for image URL/file input
const TextFieldWrapper = ({ imageUrl, setImageUrl, handleImageUpload }) => {
    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button variant="outlined" component="label" size="small" sx={{ textTransform: 'none' }}>
                    Upload Image
                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                </Button>
                <Box sx={{ flex: 1, fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {imageUrl ? (imageUrl.startsWith('data:') ? '📷 Image uploaded' : '🔗 Image URL set') : 'Or paste a URL below'}
                </Box>
            </Box>
            <input
                type="text"
                placeholder="Or paste image URL here..."
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    marginTop: 8,
                    borderRadius: 20, 
                    border: '1px solid #ccc',
                    fontSize: 14,
                    outline: 'none'
                }}
            />
            {imageUrl && (
                <Box sx={{ mt: 1 }}>
                    <Box component="img" src={imageUrl} sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 1 }} />
                </Box>
            )}
        </Box>
    );
};

export default CreatePost;
