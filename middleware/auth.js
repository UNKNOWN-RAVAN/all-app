const User = require('../models/User');

// Authenticate user from request headers
const authenticate = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const deviceId = req.headers['x-device-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const user = await User.findOne({ userId });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid user' });
    }
    
    // Check expiry
    if (user.expiryDate && new Date(user.expiryDate) < new Date()) {
      return res.status(403).json({ error: 'Account expired' });
    }
    
    // Check if device is active
    if (deviceId) {
      const deviceActive = user.activeDevices.some(d => d.deviceId === deviceId);
      if (!deviceActive && user.maxDevices > 0) {
        // Device not active, but allow if under limit
        if (user.activeDevices.length >= user.maxDevices) {
          return res.status(403).json({ error: 'Device limit reached' });
        }
      }
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  await authenticate(req, res, async () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'owner')) {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  });
};

// Check if user is owner
const isOwner = async (req, res, next) => {
  await authenticate(req, res, async () => {
    if (req.user && req.user.role === 'owner') {
      next();
    } else {
      res.status(403).json({ error: 'Owner access required' });
    }
  });
};

module.exports = { authenticate, isAdmin, isOwner };