const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  userId: { type: String, ref: 'User' },
  userAgent: { type: String },
  ipAddress: { type: String },
  lastLogin: { type: Date, default: Date.now },
  isBlocked: { type: Boolean, default: false }
});

module.exports = mongoose.model('Device', deviceSchema);