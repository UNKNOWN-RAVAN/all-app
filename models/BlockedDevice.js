const mongoose = require('mongoose');

const blockedDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  reason: { type: String, default: 'Blocked by Admin' },
  blockedBy: { type: String },
  blockedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlockedDevice', blockedDeviceSchema);