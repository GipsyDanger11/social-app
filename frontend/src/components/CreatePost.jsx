import React, { useState, useRef } from 'react';
import { Paper, Typography, Box, Avatar, InputBase, Divider, IconButton, Button, ToggleButtonGroup, ToggleButton, Popover, CircularProgress, Alert } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import EmojiEmotions from '@mui/icons-material/EmojiEmotions';
import Menu from '@mui/icons-material/Menu';
import Campaign from '@mui/icons-material/Campaign';
import Close from '@mui/icons-material/Close';
import EmojiPicker from 'emoji-picker-react';
import * as api from '../api';

const CreatePost = ({ user, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageUrl, setShowImageUrl] = useState(false);
  const [type, setType] = useState('all');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const inputRef = useRef(null);

  const handlePost = () => {
    if (!content.trim() && !imageUrl) return;
    onPostCreated({ content, imageUrl, type: type === 'all' ? 'post' : 'promotion' });
    setContent('');
    setImageUrl('');
    setShowImageUrl(false);
    setUploadError(null);
  };

  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiSelect = (emojiData) => {
    setContent(prev => prev + emojiData.emoji);
    setEmojiAnchorEl(null);
    inputRef.current?.focus();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    // Show a local preview while uploading (object URL is cheap & disposable)
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);

    setUploading(true);
    try {
      const { data } = await api.uploadImage(file);
      // Replace preview with the real server URL
      setImageUrl(data.url);
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.message || 'Upload failed. Try again or paste a URL.');
      setImageUrl('');
    } finally {
      setUploading(false);
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
                uploading={uploading}
                onClear={() => { setImageUrl(''); setUploadError(null); }}
              />
              {uploadError && (
                <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }} onClose={() => setUploadError(null)}>
                  {uploadError}
                </Alert>
              )}
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
          disabled={uploading || (!content.trim() && !imageUrl)}
          sx={{
            borderRadius: '20px',
            bgcolor: (content.trim() || imageUrl) && !uploading ? '#1877F2' : 'action.hover',
            color: (content.trim() || imageUrl) && !uploading ? 'white' : 'text.secondary',
            '&:hover': { bgcolor: (content.trim() || imageUrl) && !uploading ? '#166fe5' : 'action.hover' },
            textTransform: 'none',
            px: 4,
            fontWeight: 'bold'
          }}
        >
          {uploading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Post'}
        </Button>
      </Box>

      {/* Emoji Picker */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
      >
        <EmojiPicker onEmojiClick={handleEmojiSelect} />
      </Popover>
    </Paper>
  );
};

// Helper component for image URL/file input
const TextFieldWrapper = ({ imageUrl, setImageUrl, handleImageUpload, uploading, onClear }) => {
    const isLocalPreview = imageUrl && imageUrl.startsWith('blob:');
    const isServerImage = imageUrl && imageUrl.startsWith('/uploads/');
    const isUrl = imageUrl && !isLocalPreview && !isServerImage;

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="outlined" component="label" size="small" sx={{ textTransform: 'none' }} disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload Image'}
                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                </Button>
                <Box sx={{ flex: 1, fontSize: 12, color: 'text.secondary' }}>
                    {uploading && 'Uploading your image…'}
                    {isServerImage && !uploading && `📷 ${imageUrl.split('/').pop()}`}
                    {isLocalPreview && !uploading && '📷 Preview (uploading…)'}
                    {!imageUrl && !uploading && 'Or paste a URL below'}
                    {isUrl && !uploading && '🔗 Image URL set'}
                </Box>
                {imageUrl && !uploading && (
                    <IconButton size="small" onClick={onClear} title="Remove image">
                        <Close fontSize="small" />
                    </IconButton>
                )}
            </Box>
            <input
                type="text"
                placeholder="Or paste image URL here..."
                value={isLocalPreview || isServerImage ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={uploading}
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
                <Box sx={{ mt: 1, position: 'relative' }}>
                    <Box
                        component="img"
                        src={imageUrl.startsWith('/uploads/')
                            ? `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}${imageUrl}`
                            : imageUrl}
                        sx={{ maxWidth: '100%', maxHeight: 240, borderRadius: 1, objectFit: 'cover' }}
                    />
                </Box>
            )}
        </Box>
    );
};

export default CreatePost;
