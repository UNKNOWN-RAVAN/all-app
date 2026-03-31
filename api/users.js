const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserData = require('../models/UserData');
const { isOwner, isAdmin } = require('../middleware/auth');

// Get all users (admin/owner only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }, '-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user (admin/owner only)
router.post('/', isAdmin, async (req, res) => {
  const { userId, password, mobileNo, name, address, email, class: userClass, profileImage, role, allowedApps, allowedBatches, maxDevices, expiryDate } = req.body;
  
  try {
    // Check if user exists
    const existing = await User.findOne({ userId });
    if (existing) {
      return res.status(400).json({ error: 'User ID already exists' });
    }
    
    const user = new User({
      userId,
      password,
      mobileNo,
      name: name || '',
      address: address || '',
      email: email || '',
      class: userClass || '',
      profileImage: profileImage || '',
      role: role || 'user',
      allowedApps: allowedApps || [],
      allowedBatches: allowedBatches || [],
      maxDevices: maxDevices || 1,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdBy: req.user.userId,
      isActive: true
    });
    
    await user.save();
    
    // Create user data
    const userData = new UserData({ userId });
    await userData.save();
    
    res.json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin/owner only)
router.put('/:userId', isAdmin, async (req, res) => {
  const updates = req.body;
  delete updates._id;
  delete updates.userId;
  
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (owner only)
router.delete('/:userId', isOwner, async (req, res) => {
  try {
    await User.findOneAndDelete({ userId: req.params.userId });
    await UserData.findOneAndDelete({ userId: req.params.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user devices
router.get('/:userId/devices', isAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, devices: user.activeDevices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove user device
router.delete('/:userId/devices/:deviceId', isAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.activeDevices = user.activeDevices.filter(d => d.deviceId !== req.params.deviceId);
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;