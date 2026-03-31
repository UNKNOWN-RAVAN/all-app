const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobileNo: { type: String, required: true },
  profileImage: { type: String, default: '' },
  name: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  class: { type: String, default: '' },
  role: { type: String, enum: ['owner', 'admin', 'user', 'guest'], default: 'user' },
  
  // App and Batch Permissions
  allowedApps: [{ type: String }], // ['CW', 'SW', 'RWA', 'KGS', 'IQ', 'UTK', 'ALL']
  allowedBatches: [{ 
    app: String,
    batchId: String,
    batchName: String
  }],
  
  // Device Management
  maxDevices: { type: Number, default: 1 }, // 0 = unlimited
  activeDevices: [{ 
    deviceId: String,
    lastActive: Date,
    deviceInfo: String
  }],
  
  // Expiry
  expiryDate: { type: Date, default: null },
  
  // Metadata
  createdBy: { type: String }, // adminId who created this user
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('User', userSchema);