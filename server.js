const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB Connected');
}).catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
});

// ==================== MODELS ====================

// User Model
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobileNo: { type: String, required: true },
  profileImage: { type: String, default: '' },
  name: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  class: { type: String, default: '' },
  role: { type: String, enum: ['owner', 'admin', 'user'], default: 'user' },
  allowedApps: [{ type: String }],
  allowedBatches: [{ app: String, batchId: String, batchName: String }],
  maxDevices: { type: Number, default: 1 },
  activeDevices: [{ deviceId: String, lastActive: Date, deviceInfo: String }],
  expiryDate: { type: Date, default: null },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', UserSchema);

// Blocked Device Model
const BlockedDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  reason: { type: String, default: 'Blocked by Admin' },
  blockedBy: { type: String },
  blockedAt: { type: Date, default: Date.now }
});

const BlockedDevice = mongoose.model('BlockedDevice', BlockedDeviceSchema);

// User Data Model
const UserDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  favoriteBatches: [{
    app: String,
    batchId: String,
    batchName: String,
    addedAt: Date
  }],
  history: [{
    app: String,
    batchId: String,
    batchName: String,
    itemId: String,
    itemType: String,
    title: String,
    url: String,
    watchedAt: Date,
    completed: { type: Boolean, default: false }
  }],
  completedItems: [{
    app: String,
    batchId: String,
    itemId: String,
    itemType: String,
    completedAt: Date
  }],
  settings: {
    defaultQuality: { type: String, default: 'auto' },
    defaultSpeed: { type: Number, default: 1 },
    doubleTapSeconds: { type: Number, default: 10 },
    autoplay: { type: Boolean, default: true }
  },
  uploadedImages: [{
    url: String,
    deleteUrl: String,
    uploadedAt: Date,
    name: String
  }]
});

const UserData = mongoose.model('UserData', UserDataSchema);

// ==================== API ENDPOINTS ====================

// 1. Get All Batches from All Platforms
app.get('/api/batches/all', async (req, res) => {
  try {
    const platforms = ['CW', 'RWA', 'KGS', 'IQ', 'UTK'];
    const results = {};
    
    for (const platform of platforms) {
      try {
        let batches = [];
        
        if (platform === 'CW') {
          const response = await axios.get('https://tele-cw-a.vercel.app/api/batches', { timeout: 10000 });
          batches = Object.entries(response.data).map(([id, name]) => ({ id, name, platform }));
        }
        else if (platform === 'RWA') {
          const response = await axios.get('https://api.thescholarverse.site/rwa/batches', { timeout: 10000 });
          batches = response.data.map(b => ({ id: String(b.id), name: b.course_name, platform }));
        }
        else if (platform === 'KGS') {
          const response = await axios.get('https://kgs-dmaxx.vercel.app/api/courses', { timeout: 10000 });
          batches = response.data.courses.map(c => ({ id: String(c.id), name: c.title, platform, image: c.image }));
        }
        else if (platform === 'IQ') {
          const response = await axios.get('https://yy-pi-three.vercel.app/App/studyiq/batches.json', { timeout: 10000 });
          batches = response.data.map(b => ({ id: String(b.id), name: b.name, platform, slug: b.slug }));
        }
        else if (platform === 'UTK') {
          const response = await axios.get('https://agmaxxutkarsh.netlify.app/api/master_cat', {
            headers: { 'X-App-Security-Token': 'spidy-secure-2026' },
            timeout: 10000
          });
          batches = (response.data.data || []).map(c => ({ id: String(c.id), name: c.cat || c.cat_hindi, platform, image: c.image }));
        }
        
        results[platform] = batches.slice(0, 50); // Limit to 50 per platform
      } catch (err) {
        console.error(`Error fetching ${platform}:`, err.message);
        results[platform] = [];
      }
    }
    
    res.json({ success: true, batches: results });
  } catch (error) {
    console.error('Error in /api/batches/all:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Platform Specific Batches
app.get('/api/batches/:platform', async (req, res) => {
  const { platform } = req.params;
  
  try {
    let batches = [];
    
    if (platform === 'CW') {
      const response = await axios.get('https://tele-cw-a.vercel.app/api/batches');
      batches = Object.entries(response.data).map(([id, name]) => ({ id, name, platform }));
    }
    else if (platform === 'RWA') {
      const response = await axios.get('https://api.thescholarverse.site/rwa/batches');
      batches = response.data.map(b => ({ id: String(b.id), name: b.course_name, platform, price: b.price, thumbnail: b.course_thumbnail }));
    }
    else if (platform === 'KGS') {
      const response = await axios.get('https://kgs-dmaxx.vercel.app/api/courses');
      batches = response.data.courses.map(c => ({ id: String(c.id), name: c.title, platform, image: c.image }));
    }
    else if (platform === 'IQ') {
      const response = await axios.get('https://yy-pi-three.vercel.app/App/studyiq/batches.json');
      batches = response.data.map(b => ({ id: String(b.id), name: b.name, platform }));
    }
    else if (platform === 'UTK') {
      const response = await axios.get('https://agmaxxutkarsh.netlify.app/api/master_cat', {
        headers: { 'X-App-Security-Token': 'spidy-secure-2026' }
      });
      batches = (response.data.data || []).map(c => ({ id: String(c.id), name: c.cat || c.cat_hindi, platform, image: c.image }));
    }
    else {
      return res.status(400).json({ error: 'Invalid platform' });
    }
    
    res.json({ success: true, platform, batches });
  } catch (error) {
    console.error(`Error fetching ${platform}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Batch Details with Topics
app.get('/api/batches/:platform/:batchId', async (req, res) => {
  const { platform, batchId } = req.params;
  
  try {
    let data = null;
    
    if (platform === 'CW') {
      const response = await axios.get(`https://bypass-pearl-tau.vercel.app/api/proxy?url=https://jgxgc.vercel.app/api/batch/${batchId}`);
      data = response.data;
    }
    else if (platform === 'RWA') {
      const response = await axios.get(`https://api.thescholarverse.site/rwa/batches/${batchId}`);
      data = { batchId, subjects: response.data };
    }
    else if (platform === 'KGS') {
      const response = await axios.get(`https://kgs-dmaxx.vercel.app/api/subjects/${batchId}`);
      data = { batchId, subjects: response.data.subjects };
    }
    else {
      return res.status(400).json({ error: 'Platform not supported for details' });
    }
    
    res.json({ success: true, platform, batchId, data });
  } catch (error) {
    console.error('Error fetching batch details:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Topic Content (Videos/PDFs)
app.get('/api/batches/:platform/:batchId/:topicId', async (req, res) => {
  const { platform, batchId, topicId } = req.params;
  
  try {
    let data = null;
    
    if (platform === 'CW') {
      const response = await axios.get(`https://bypass-pearl-tau.vercel.app/api/proxy?url=https://jgxgc.vercel.app/api/batch?batchid=${batchId}&topicid=${topicId}&full=true`);
      data = response.data;
    }
    else if (platform === 'RWA') {
      const response = await axios.get(`https://api.thescholarverse.site/rwa/batches/${batchId}/subjects/${topicId}/topics`);
      data = { topicId, content: response.data.data };
    }
    else if (platform === 'KGS') {
      const response = await axios.get(`https://kgs-dmaxx.vercel.app/api/lessons/${topicId}`);
      data = { topicId, lessons: response.data.lessons };
    }
    else {
      return res.status(400).json({ error: 'Platform not supported' });
    }
    
    res.json({ success: true, platform, batchId, topicId, data });
  } catch (error) {
    console.error('Error fetching topic content:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Login/Register
app.post('/api/auth/login', async (req, res) => {
  const { userId, password, mobileNo, name, email, address, class: userClass, profileImage, deviceId, deviceInfo } = req.body;
  
  try {
    // Check if device is blocked
    const blocked = await BlockedDevice.findOne({ deviceId });
    if (blocked) {
      return res.status(403).json({ 
        error: 'BLOCKED', 
        message: 'Your device has been blocked by admin.',
        supportTelegram: 'https://t.me/UnknownRavan_bot',
        supportWhatsapp: 'https://whatsapp.com/channel/0029VbBxDoq8qIzk2YSTgL0j'
      });
    }
    
    // Find or create user
    let user = await User.findOne({ userId });
    
    if (!user) {
      // Create new user
      user = new User({
        userId,
        password,
        mobileNo,
        name: name || '',
        email: email || '',
        address: address || '',
        class: userClass || '',
        profileImage: profileImage || '',
        role: 'user',
        allowedApps: [],
        allowedBatches: [],
        maxDevices: 1,
        expiryDate: null,
        isActive: true
      });
      await user.save();
      
      // Create user data
      const userData = new UserData({ userId });
      await userData.save();
    } else {
      // Verify password for existing user
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account deactivated' });
      }
      
      // Check expiry
      if (user.expiryDate && new Date(user.expiryDate) < new Date()) {
        return res.status(403).json({ error: 'Account expired' });
      }
      
      // Check device limit
      if (user.maxDevices > 0) {
        const existingDevice = user.activeDevices.find(d => d.deviceId === deviceId);
        if (!existingDevice && user.activeDevices.length >= user.maxDevices) {
          return res.status(403).json({ 
            error: 'DEVICE_LIMIT', 
            message: `Maximum ${user.maxDevices} device(s) allowed.`
          });
        }
      }
    }
    
    // Update device info
    const deviceIndex = user.activeDevices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex >= 0) {
      user.activeDevices[deviceIndex].lastActive = new Date();
      user.activeDevices[deviceIndex].deviceInfo = deviceInfo;
    } else {
      user.activeDevices.push({ deviceId, lastActive: new Date(), deviceInfo });
    }
    
    await user.save();
    
    // Get user data
    const userData = await UserData.findOne({ userId });
    
    res.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        profileImage: user.profileImage,
        role: user.role,
        mobileNo: user.mobileNo,
        email: user.email,
        allowedApps: user.allowedApps,
        allowedBatches: user.allowedBatches,
        maxDevices: user.maxDevices,
        expiryDate: user.expiryDate,
        settings: userData?.settings || {}
      },
      favorites: userData?.favoriteBatches || [],
      history: userData?.history || [],
      completedItems: userData?.completedItems || []
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Logout
app.post('/api/auth/logout', async (req, res) => {
  const { userId, deviceId } = req.body;
  
  try {
    const user = await User.findOne({ userId });
    if (user) {
      user.activeDevices = user.activeDevices.filter(d => d.deviceId !== deviceId);
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Check Device
app.post('/api/auth/check-device', async (req, res) => {
  const { deviceId } = req.body;
  
  const blocked = await BlockedDevice.findOne({ deviceId });
  if (blocked) {
    return res.json({ blocked: true, reason: blocked.reason });
  }
  
  res.json({ blocked: false });
});

// 8. Mark Item Completed
app.post('/api/auth/complete', async (req, res) => {
  const { userId, app, batchId, batchName, itemId, itemType, title } = req.body;
  
  try {
    let userData = await UserData.findOne({ userId });
    if (!userData) {
      userData = new UserData({ userId });
    }
    
    const exists = userData.completedItems.some(item => item.itemId === String(itemId));
    
    if (!exists) {
      userData.completedItems.push({
        app,
        batchId,
        itemId: String(itemId),
        itemType,
        completedAt: new Date()
      });
      await userData.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Sync User Data
app.post('/api/auth/sync', async (req, res) => {
  const { userId, favorites, history, completedItems, settings } = req.body;
  
  try {
    let userData = await UserData.findOne({ userId });
    if (!userData) {
      userData = new UserData({ userId });
    }
    
    if (favorites) userData.favoriteBatches = favorites;
    if (history) userData.history = history.slice(0, 50);
    if (completedItems) userData.completedItems = completedItems;
    if (settings) userData.settings = { ...userData.settings, ...settings };
    
    await userData.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Get All Users (Admin)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Create User (Admin)
app.post('/api/users', async (req, res) => {
  const { userId, password, mobileNo, name, email, role, allowedApps, maxDevices, expiryDate } = req.body;
  
  try {
    const existing = await User.findOne({ userId });
    if (existing) {
      return res.status(400).json({ error: 'User ID already exists' });
    }
    
    const user = new User({
      userId,
      password,
      mobileNo,
      name: name || '',
      email: email || '',
      role: role || 'user',
      allowedApps: allowedApps || [],
      maxDevices: maxDevices || 1,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive: true
    });
    
    await user.save();
    
    const userData = new UserData({ userId });
    await userData.save();
    
    res.json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Update User
app.put('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  delete updates._id;
  delete updates.userId;
  
  try {
    const user = await User.findOneAndUpdate({ userId }, updates, { new: true });
    res.json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. Delete User
app.delete('/api/users/:userId', async (req, res) => {
  try {
    await User.findOneAndDelete({ userId: req.params.userId });
    await UserData.findOneAndDelete({ userId: req.params.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Block Device
app.post('/api/admin/block-device', async (req, res) => {
  const { deviceId, reason } = req.body;
  
  try {
    await BlockedDevice.findOneAndUpdate(
      { deviceId },
      { deviceId, reason, blockedAt: new Date() },
      { upsert: true }
    );
    
    await User.updateMany(
      { 'activeDevices.deviceId': deviceId },
      { $pull: { activeDevices: { deviceId } } }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15. Unblock Device
app.post('/api/admin/unblock-device', async (req, res) => {
  const { deviceId } = req.body;
  
  try {
    await BlockedDevice.findOneAndDelete({ deviceId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 16. Get Blocked Devices
app.get('/api/admin/blocked-devices', async (req, res) => {
  try {
    const devices = await BlockedDevice.find();
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 17. Admin Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const blockedDevices = await BlockedDevice.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      stats: { totalUsers, totalAdmins, blockedDevices, activeUsers }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 18. Clear Database (Owner Only)
app.delete('/api/admin/clear-database', async (req, res) => {
  try {
    await mongoose.connection.db.dropDatabase();
    
    // Recreate owner
    const owner = new User({
      userId: 'admin',
      password: 'Admin@123',
      mobileNo: '0000000000',
      name: 'Owner',
      role: 'owner',
      allowedApps: ['ALL'],
      maxDevices: 0,
      isActive: true
    });
    await owner.save();
    
    res.json({ success: true, message: 'Database cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 19. AI Models
app.get('/api/ai/models', (req, res) => {
  res.json({
    success: true,
    models: {
      openrouter: [
        { id: 'qwen/qwen3-next-80b-a3b-instruct:free', name: 'Qwen3 Next 80B' },
        { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B' },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' }
      ]
    }
  });
});

// 20. AI Chat
app.post('/api/ai/chat', async (req, res) => {
  const { model, messages, provider } = req.body;
  
  try {
    let response;
    
    if (provider === 'openrouter') {
      response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      res.json({
        success: true,
        response: response.data.choices[0].message.content
      });
    } else {
      res.json({ success: true, response: 'AI service not configured' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 21. Process Video
app.post('/api/content/process-video', async (req, res) => {
  const { url, platform } = req.body;
  
  try {
    let processedUrl = url;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('/').pop().split('?')[0];
      }
      processedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    
    res.json({ success: true, processedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});