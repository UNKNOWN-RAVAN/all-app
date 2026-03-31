const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

// Decrypt function for RWA/CW encrypted links
function decrypt(encrypted, key, iv) {
  try {
    if (!encrypted) return '';
    
    // Handle URL-safe base64
    let encData = encrypted.includes(':') ? encrypted.split(':')[0] : encrypted;
    encData = encData.replace(/-/g, '+').replace(/_/g, '/');
    
    const decoded = Buffer.from(encData, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
    let decrypted = decipher.update(decoded);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (e) {
    console.error('Decrypt error:', e);
    return encrypted;
  }
}

// Get decrypted video URL
router.post('/decrypt', async (req, res) => {
  const { encrypted, key = '638udh3829162018', iv = 'fedcba9876543210' } = req.body;
  
  try {
    const decrypted = decrypt(encrypted, key, iv);
    res.json({ success: true, url: decrypted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process video URL for playback
router.post('/process-video', async (req, res) => {
  const { url, platform } = req.body;
  
  try {
    let processedUrl = url;
    
    // Handle different platforms
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // Extract video ID
      let videoId = '';
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('/').pop().split('?')[0];
      }
      processedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    } else if (url.includes('.mpd')) {
      // DASH MPD - needs DRM player
      processedUrl = { type: 'dash', url };
    } else if (url.includes('.m3u8')) {
      // HLS - needs HLS player
      processedUrl = { type: 'hls', url };
    } else if (url.includes('.mp4')) {
      // Direct MP4
      processedUrl = { type: 'mp4', url };
    }
    
    res.json({ success: true, processedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;