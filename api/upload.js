const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const UserData = require('../models/UserData');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Upload images to ImgBB
router.post('/image', async (req, res) => {
  const { images, userId } = req.body; // images: array of base64 strings or URLs
  
  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' });
  }
  
  try {
    const uploaded = [];
    
    for (const image of images) {
      const formData = new FormData();
      formData.append('key', IMGBB_API_KEY);
      
      // Check if it's base64 or URL
      if (image.startsWith('data:image') || image.match(/^[A-Za-z0-9+/=]+$/)) {
        // Remove data:image prefix if present
        const base64 = image.replace(/^data:image\/\w+;base64,/, '');
        formData.append('image', base64);
      } else {
        formData.append('image', image);
      }
      
      const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
        headers: formData.getHeaders()
      });
      
      if (response.data.success) {
        uploaded.push({
          url: response.data.data.url,
          deleteUrl: response.data.data.delete_url,
          displayUrl: response.data.data.display_url,
          thumb: response.data.data.thumb.url,
          name: response.data.data.image.filename
        });
      }
    }
    
    // Save to user data
    if (userId) {
      let userData = await UserData.findOne({ userId });
      if (!userData) {
        userData = new UserData({ userId });
      }
      
      uploaded.forEach(img => {
        userData.uploadedImages.push({
          ...img,
          uploadedAt: new Date()
        });
      });
      
      await userData.save();
    }
    
    res.json({ success: true, images: uploaded });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete image from ImgBB
router.post('/image/delete', async (req, res) => {
  const { deleteUrl, userId, imageUrl } = req.body;
  
  try {
    // Delete from ImgBB
    if (deleteUrl) {
      await axios.delete(deleteUrl);
    }
    
    // Remove from user data
    if (userId && imageUrl) {
      await UserData.updateOne(
        { userId },
        { $pull: { uploadedImages: { url: imageUrl } } }
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user uploaded images
router.get('/images/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const userData = await UserData.findOne({ userId });
    res.json({ success: true, images: userData?.uploadedImages || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;