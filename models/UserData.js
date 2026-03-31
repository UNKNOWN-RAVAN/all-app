const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  // Favorites
  favoriteBatches: [{
    app: String,
    batchId: String,
    batchName: String,
    addedAt: Date
  }],
  
  // Watch History (max 50)
  history: [{
    app: String,
    batchId: String,
    batchName: String,
    itemId: String,
    itemType: { type: String, enum: ['video', 'pdf'] },
    title: String,
    url: String,
    watchedAt: Date,
    progress: Number, // percentage
    completed: { type: Boolean, default: false }
  }],
  
  // Completed Items
  completedItems: [{
    app: String,
    batchId: String,
    itemId: String,
    itemType: String,
    completedAt: Date
  }],
  
  // User Settings
  settings: {
    defaultQuality: { type: String, default: 'auto' },
    defaultSpeed: { type: Number, default: 1 },
    doubleTapSeconds: { type: Number, default: 10 },
    autoplay: { type: Boolean, default: true },
    subtitles: { type: Boolean, default: false },
    theme: { type: String, default: 'dark' }
  },
  
  // Uploaded Images
  uploadedImages: [{
    url: String,
    deleteUrl: String,
    uploadedAt: Date,
    name: String
  }],
  
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserData', userDataSchema);