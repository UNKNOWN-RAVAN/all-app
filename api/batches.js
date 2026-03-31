const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

// API endpoints for different platforms
const API_ENDPOINTS = {
  CW: {
    batches: 'https://tele-cw-a.vercel.app/api/batches',
    batchDetails: (batchId) => `https://bypass-pearl-tau.vercel.app/api/proxy?url=https://jgxgc.vercel.app/api/batch/${batchId}`,
    topicDetails: (batchId, topicId) => `https://bypass-pearl-tau.vercel.app/api/proxy?url=https://jgxgc.vercel.app/api/batch?batchid=${batchId}&topicid=${topicId}&full=true`,
    videoDetails: (name) => `https://bypass-pearl-tau.vercel.app/api/proxy?url=https://jgxgc.vercel.app/api/get_video_details?name=${encodeURIComponent(name)}`
  },
  SW: {
    courses: 'https://newbackend.multistreaming.site/api/courses/',
    courseDetails: (courseId) => `https://newbackend.multistreaming.site/api/courses/${courseId}/`,
    classes: (courseId) => `https://newbackend.multistreaming.site/api/courses/${courseId}/classes?populate=full`,
    pdfs: (courseId) => `https://newbackend.multistreaming.site/api/courses/${courseId}/pdfs?groupBy=topic`
  },
  RWA: {
    batches: 'https://api.thescholarverse.site/rwa/batches',
    batchDetails: (batchId) => `https://api.thescholarverse.site/rwa/batches/${batchId}`,
    subjects: (batchId) => `https://api.thescholarverse.site/rwa/batches/${batchId}/subjects`,
    topics: (batchId, subjectId) => `https://api.thescholarverse.site/rwa/batches/${batchId}/subjects/${subjectId}/topics`,
    content: (batchId, subjectId, topicId) => `https://api.thescholarverse.site/rwa/batches/${batchId}/subjects/${subjectId}/topics/${topicId}`,
    video: (batchId, videoId) => `https://api.thescholarverse.site/rwa/batches/${batchId}/video/${videoId}`
  },
  KGS: {
    courses: 'https://kgs-dmaxx.vercel.app/api/courses',
    subjects: (courseId) => `https://kgs-dmaxx.vercel.app/api/subjects/${courseId}`,
    lessons: (subjectId) => `https://kgs-dmaxx.vercel.app/api/lessons/${subjectId}`
  },
  IQ: {
    batches: 'https://yy-pi-three.vercel.app/App/studyiq/batches.json',
    content: 'https://spidyiq.vercel.app/api/content'
  },
  UTK: {
    categories: 'https://agmaxxutkarsh.netlify.app/api/master_cat',
    catTypes: (masterId) => `https://agmaxxutkarsh.netlify.app/api/cat_type?master_id=${masterId}`,
    subCats: (masterId, typeId) => `https://agmaxxutkarsh.netlify.app/api/get_cat?master_id=${masterId}&type_id=${typeId}`,
    courses: (typeId, subTypeId) => `https://agmaxxutkarsh.netlify.app/api/get_courses?type_id=${typeId}&sub_type_id=${subTypeId}&page=1`,
    tiles: (courseId) => `https://agmaxxutkarsh.netlify.app/api/get_tiles?course_id=${courseId}`,
    content: (courseId, subjectId, topicId) => `https://agmaxxutkarsh.netlify.app/api/get_layer_three_content?course_id=${courseId}&subject_id=${subjectId}&topic_id=${topicId}`,
    videoMeta: (itemId, courseId, tileId) => `https://agmaxxutkarsh.netlify.app/api/get_video_meta?userid=1&item_id=${itemId}&course_id=${courseId}&tile_id=${tileId}`
  }
};

// Get all batches from all platforms
router.get('/all', async (req, res) => {
  try {
    const allBatches = {};
    
    // Fetch from all platforms in parallel
    const promises = Object.entries(API_ENDPOINTS).map(async ([platform, endpoints]) => {
      try {
        let batches = [];
        
        if (platform === 'CW') {
          const response = await axios.get(endpoints.batches);
          batches = Object.entries(response.data).map(([id, name]) => ({ id, name, platform }));
        } else if (platform === 'RWA') {
          const response = await axios.get(endpoints.batches);
          batches = response.data.map(b => ({ id: b.id, name: b.course_name, platform, data: b }));
        } else if (platform === 'KGS') {
          const response = await axios.get(endpoints.courses);
          batches = response.data.courses.map(c => ({ id: c.id, name: c.title, platform, image: c.image }));
        } else if (platform === 'IQ') {
          const response = await axios.get(endpoints.batches);
          batches = response.data.map(b => ({ id: b.id, name: b.name, platform, slug: b.slug }));
        } else if (platform === 'UTK') {
          const response = await axios.get(endpoints.categories, {
            headers: { 'X-App-Security-Token': 'spidy-secure-2026' }
          });
          // UTK has hierarchical structure
          batches = response.data.data.map(c => ({ id: c.id, name: c.cat, platform, hindiName: c.cat_hindi }));
        }
        
        return { platform, batches };
      } catch (err) {
        console.error(`Error fetching ${platform} batches:`, err.message);
        return { platform, batches: [] };
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ platform, batches }) => {
      allBatches[platform] = batches;
    });
    
    res.json({ success: true, batches: allBatches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get batches for a specific platform
router.get('/:platform', async (req, res) => {
  const { platform } = req.params;
  const endpoints = API_ENDPOINTS[platform.toUpperCase()];
  
  if (!endpoints) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  
  try {
    let batches = [];
    
    if (platform === 'CW') {
      const response = await axios.get(endpoints.batches);
      batches = Object.entries(response.data).map(([id, name]) => ({ id, name, platform }));
    } else if (platform === 'RWA') {
      const response = await axios.get(endpoints.batches);
      batches = response.data.map(b => ({ id: b.id, name: b.course_name, platform, ...b }));
    } else if (platform === 'KGS') {
      const response = await axios.get(endpoints.courses);
      batches = response.data.courses.map(c => ({ id: c.id, name: c.title, platform, image: c.image }));
    } else if (platform === 'IQ') {
      const response = await axios.get(endpoints.batches);
      batches = response.data.map(b => ({ id: b.id, name: b.name, platform, slug: b.slug }));
    } else if (platform === 'UTK') {
      const response = await axios.get(endpoints.categories, {
        headers: { 'X-App-Security-Token': 'spidy-secure-2026' }
      });
      batches = response.data.data.map(c => ({ id: c.id, name: c.cat, platform, hindiName: c.cat_hindi, image: c.image }));
    }
    
    res.json({ success: true, platform, batches });
  } catch (error) {
    console.error(`Error fetching ${platform} batches:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get batch details with topics
router.get('/:platform/:batchId', async (req, res) => {
  const { platform, batchId } = req.params;
  const endpoints = API_ENDPOINTS[platform.toUpperCase()];
  
  if (!endpoints) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  
  try {
    let data = null;
    
    if (platform === 'CW') {
      const response = await axios.get(endpoints.batchDetails(batchId));
      data = response.data;
    } else if (platform === 'RWA') {
      const response = await axios.get(endpoints.batchDetails(batchId));
      data = response.data;
    } else if (platform === 'KGS') {
      const response = await axios.get(endpoints.subjects(batchId));
      data = { batchId, subjects: response.data.subjects };
    } else if (platform === 'IQ') {
      const response = await axios.post(endpoints.content, { courseId: batchId }, {
        headers: { 'Content-Type': 'application/json' }
      });
      data = response.data.data;
    } else if (platform === 'UTK') {
      const response = await axios.get(endpoints.catTypes(batchId), {
        headers: { 'X-App-Security-Token': 'spidy-secure-2026' }
      });
      data = { batchId, categories: response.data.data };
    }
    
    res.json({ success: true, platform, batchId, data });
  } catch (error) {
    console.error(`Error fetching batch details:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get topic content (videos/pdfs)
router.get('/:platform/:batchId/:topicId', async (req, res) => {
  const { platform, batchId, topicId } = req.params;
  const endpoints = API_ENDPOINTS[platform.toUpperCase()];
  
  if (!endpoints) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  
  try {
    let data = null;
    
    if (platform === 'CW') {
      const response = await axios.get(endpoints.topicDetails(batchId, topicId));
      data = response.data;
    } else if (platform === 'RWA') {
      const response = await axios.get(endpoints.content(batchId, null, topicId));
      data = response.data.data;
    } else if (platform === 'KGS') {
      const response = await axios.get(endpoints.lessons(topicId));
      data = response.data.lessons;
    } else if (platform === 'IQ') {
      // IQ content is already structured
      data = { content: [] };
    } else if (platform === 'UTK') {
      // Need to get layer three content
      const response = await axios.get(endpoints.content(batchId, null, topicId), {
        headers: { 'X-App-Security-Token': 'spidy-secure-2026' }
      });
      data = response.data.data.data.list;
    }
    
    res.json({ success: true, platform, batchId, topicId, data });
  } catch (error) {
    console.error(`Error fetching topic content:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get video details with streaming URL
router.post('/video', async (req, res) => {
  const { platform, videoId, batchId, additionalData } = req.body;
  const endpoints = API_ENDPOINTS[platform.toUpperCase()];
  
  if (!endpoints) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  
  try {
    let videoData = null;
    
    if (platform === 'CW') {
      const response = await axios.get(endpoints.videoDetails(videoId));
      videoData = response.data;
    } else if (platform === 'RWA') {
      const response = await axios.get(endpoints.video(batchId, videoId));
      videoData = response.data;
    } else if (platform === 'KGS') {
      // KGS video URLs are directly in the lesson data
      videoData = { data: { link: { file_url: videoId } } };
    } else if (platform === 'IQ') {
      // IQ video URLs are directly in the content
      videoData = { data: { link: { file_url: videoId } } };
    } else if (platform === 'UTK') {
      const response = await axios.get(endpoints.videoMeta(videoId, batchId, additionalData?.tileId), {
        headers: { 'X-App-Security-Token': 'spidy-secure-2026' }
      });
      videoData = response.data;
    }
    
    res.json({ success: true, videoData });
  } catch (error) {
    console.error(`Error fetching video:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;