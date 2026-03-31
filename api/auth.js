const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Device = require('../models/Device');
const BlockedDevice = require('../models/BlockedDevice');
const UserData = require('../models/UserData');

// Check if device is blocked
router.post('/check-device', async (req, res) => {
  const { deviceId } = req.body;
  
  const blocked = await BlockedDevice.findOne({ deviceId });
  if (blocked) {
    return res.json({ blocked: true, reason: blocked.reason });
  }
  
  res.json({ blocked: false });
});

// Login
router.post('/login', async (req, res) => {
  const { userId, password, mobileNo, name, address, email, class: userClass, profileImage, deviceId, deviceInfo } = req.body;
  
  try {
    // Check if device is blocked
    const blocked = await BlockedDevice.findOne({ deviceId });
    if (blocked) {
      return res.status(403).json({ 
        error: 'BLOCKED', 
        message: 'Your device has been blocked by admin. Contact support.',
        supportTelegram: 'https://t.me/UnknownRavan_bot',
        supportWhatsapp: 'https://whatsapp.com/channel/0029VbBxDoq8qIzk2YSTgL0j'
      });
    }
    
    // Find or create user
    let user = await User.findOne({ userId });
    
    if (!user) {
      // Create new user (guest)
      user = new User({
        userId,
        password,
        mobileNo,
        name: name || '',
        address: address || '',
        email: email || '',
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
            message: `Maximum ${user.maxDevices} device(s) allowed. Remove other devices to login.`
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
      user.activeDevices.push({
        deviceId,
        lastActive: new Date(),
        deviceInfo
      });
    }
    
    await user.save();
    
    // Save/update device record
    await Device.findOneAndUpdate(
      { deviceId },
      { userId: user.userId, userAgent: deviceInfo, lastLogin: new Date() },
      { upsert: true }
    );
    
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

// Logout
router.post('/logout', async (req, res) => {
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

// Update user data (favorites, history, completed)
router.post('/sync', async (req, res) => {
  const { userId, favorites, history, completedItems, settings } = req.body;
  
  try {
    let userData = await UserData.findOne({ userId });
    
    if (!userData) {
      userData = new UserData({ userId });
    }
    
    if (favorites) userData.favoriteBatches = favorites;
    if (history) {
      // Keep only last 50 history items
      userData.history = history.slice(0, 50);
    }
    if (completedItems) userData.completedItems = completedItems;
    if (settings) userData.settings = { ...userData.settings, ...settings };
    
    userData.updatedAt = new Date();
    await userData.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark item completed
router.post('/complete', async (req, res) => {
  const { userId, app, batchId, batchName, itemId, itemType, title, url } = req.body;
  
  try {
    let userData = await UserData.findOne({ userId });
    if (!userData) {
      userData = new UserData({ userId });
    }
    
    // Check if already completed
    const exists = userData.completedItems.some(
      item => item.itemId === itemId && item.app === app
    );
    
    if (!exists) {
      userData.completedItems.push({
        app,
        batchId,
        itemId,
        itemType,
        completedAt: new Date()
      });
      
      // Update history to mark as completed
      const historyItem = userData.history.find(h => h.itemId === itemId);
      if (historyItem) {
        historyItem.completed = true;
      }
      
      await userData.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;