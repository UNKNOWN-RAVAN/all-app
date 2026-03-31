const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const UserData = require('../models/UserData');
const Device = require('../models/Device');
const BlockedDevice = require('../models/BlockedDevice');
const { isOwner, isAdmin } = require('../middleware/auth');

// Get dashboard stats (owner only)
router.get('/stats', isOwner, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalDevices = await Device.countDocuments();
    const blockedDevices = await BlockedDevice.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        totalDevices,
        blockedDevices,
        activeUsers,
        pendingExpiry: await User.countDocuments({ 
          expiryDate: { $lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), $gt: new Date() } 
        })
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block device (admin/owner)
router.post('/block-device', isAdmin, async (req, res) => {
  const { deviceId, reason } = req.body;
  
  try {
    await BlockedDevice.findOneAndUpdate(
      { deviceId },
      { deviceId, reason, blockedBy: req.user.userId, blockedAt: new Date() },
      { upsert: true }
    );
    
    // Logout user from this device
    await User.updateMany(
      { 'activeDevices.deviceId': deviceId },
      { $pull: { activeDevices: { deviceId } } }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unblock device (admin/owner)
router.post('/unblock-device', isAdmin, async (req, res) => {
  const { deviceId } = req.body;
  
  try {
    await BlockedDevice.findOneAndDelete({ deviceId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blocked devices (admin/owner)
router.get('/blocked-devices', isAdmin, async (req, res) => {
  try {
    const devices = await BlockedDevice.find();
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear entire database (owner only)
router.delete('/clear-database', isOwner, async (req, res) => {
  try {
    // Delete all collections
    await mongoose.connection.db.dropDatabase();
    
    // Recreate admin user
    const admin = new User({
      userId: process.env.OWNER_ID,
      password: process.env.OWNER_PASS,
      mobileNo: '0000000000',
      name: 'Owner',
      role: 'owner',
      allowedApps: ['ALL'],
      maxDevices: 0,
      isActive: true
    });
    await admin.save();
    
    res.json({ success: true, message: 'Database cleared successfully' });
  } catch (error) {
    console.error('Clear database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export data (owner only)
router.get('/export', isOwner, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    const userData = await UserData.find();
    const devices = await Device.find();
    const blockedDevices = await BlockedDevice.find();
    
    const exportData = {
      users,
      userData,
      devices,
      blockedDevices,
      exportedAt: new Date()
    };
    
    res.json({ success: true, data: exportData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import data (owner only)
router.post('/import', isOwner, async (req, res) => {
  const { data } = req.body;
  
  try {
    // Clear existing data
    await mongoose.connection.db.dropDatabase();
    
    // Import users
    if (data.users && data.users.length) {
      await User.insertMany(data.users);
    }
    
    // Import user data
    if (data.userData && data.userData.length) {
      await UserData.insertMany(data.userData);
    }
    
    // Import devices
    if (data.devices && data.devices.length) {
      await Device.insertMany(data.devices);
    }
    
    // Import blocked devices
    if (data.blockedDevices && data.blockedDevices.length) {
      await BlockedDevice.insertMany(data.blockedDevices);
    }
    
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;