// Utility functions
const Utils = {
    // Device ID generation
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    },
    
    // Get device info
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenSize: `${window.screen.width}x${window.screen.height}`
        };
    },
    
    // Show toast message
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },
    
    // Format time ago
    timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + ' years ago';
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + ' months ago';
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + ' days ago';
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + ' hours ago';
        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + ' minutes ago';
        return 'just now';
    },
    
    // Truncate text
    truncate(text, length = 50) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },
    
    // Base64 to blob
    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    },
    
    // Download file
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },
    
    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            Utils.showToast('Failed to copy', 'error');
        });
    },
    
    // Debounce
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Local storage helpers
    storage: {
        set(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        },
        get(key, defaultValue = null) {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        },
        remove(key) {
            localStorage.removeItem(key);
        },
        clear() {
            localStorage.clear();
        }
    }
};

// API Service
const API = {
    baseUrl: window.location.origin,
    
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'X-User-Id': localStorage.getItem('userId') || '',
            'X-Device-Id': Utils.getDeviceId(),
            ...options.headers
        };
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.error === 'BLOCKED') {
                Utils.storage.clear();
                showBlockedModal(data);
            }
            throw new Error(data.error || data.message || 'Request failed');
        }
        
        return data;
    },
    
    // Auth
    checkDevice(deviceId) {
        return this.request('/api/auth/check-device', {
            method: 'POST',
            body: JSON.stringify({ deviceId })
        });
    },
    
    login(data) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    logout(userId, deviceId) {
        return this.request('/api/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ userId, deviceId })
        });
    },
    
    syncUserData(data) {
        return this.request('/api/auth/sync', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    markComplete(data) {
        return this.request('/api/auth/complete', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Batches
    getAllBatches() {
        return this.request('/api/batches/all');
    },
    
    getPlatformBatches(platform) {
        return this.request(`/api/batches/${platform}`);
    },
    
    getBatchDetails(platform, batchId) {
        return this.request(`/api/batches/${platform}/${batchId}`);
    },
    
    getTopicContent(platform, batchId, topicId) {
        return this.request(`/api/batches/${platform}/${batchId}/${topicId}`);
    },
    
    getVideo(platform, videoId, batchId, additionalData) {
        return this.request('/api/batches/video', {
            method: 'POST',
            body: JSON.stringify({ platform, videoId, batchId, ...additionalData })
        });
    },
    
    // Content
    decryptUrl(data) {
        return this.request('/api/content/decrypt', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    processVideo(url, platform) {
        return this.request('/api/content/process-video', {
            method: 'POST',
            body: JSON.stringify({ url, platform })
        });
    },
    
    // Upload
    uploadImages(images, userId) {
        return this.request('/api/upload/image', {
            method: 'POST',
            body: JSON.stringify({ images, userId })
        });
    },
    
    deleteImage(deleteUrl, userId, imageUrl) {
        return this.request('/api/upload/image/delete', {
            method: 'POST',
            body: JSON.stringify({ deleteUrl, userId, imageUrl })
        });
    },
    
    getUserImages(userId) {
        return this.request(`/api/upload/images/${userId}`);
    },
    
    // AI
    getAIModels() {
        return this.request('/api/ai/models');
    },
    
    aiChat(model, messages, provider) {
        return this.request('/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ model, messages, provider })
        });
    },
    
    aiCommand(command, userData) {
        return this.request('/api/ai/command', {
            method: 'POST',
            body: JSON.stringify({ command, userData })
        });
    },
    
    getLastVideo(history) {
        return this.request('/api/ai/last-video', {
            method: 'POST',
            body: JSON.stringify({ history })
        });
    },
    
    // Admin
    getAdminStats() {
        return this.request('/api/admin/stats');
    },
    
    getAllUsers() {
        return this.request('/api/users');
    },
    
    createUser(data) {
        return this.request('/api/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    updateUser(userId, data) {
        return this.request(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    deleteUser(userId) {
        return this.request(`/api/users/${userId}`, {
            method: 'DELETE'
        });
    },
    
    blockDevice(deviceId, reason) {
        return this.request('/api/admin/block-device', {
            method: 'POST',
            body: JSON.stringify({ deviceId, reason })
        });
    },
    
    unblockDevice(deviceId) {
        return this.request('/api/admin/unblock-device', {
            method: 'POST',
            body: JSON.stringify({ deviceId })
        });
    },
    
    getBlockedDevices() {
        return this.request('/api/admin/blocked-devices');
    },
    
    clearDatabase() {
        return this.request('/api/admin/clear-database', {
            method: 'DELETE'
        });
    },
    
    exportData() {
        return this.request('/api/admin/export');
    },
    
    importData(data) {
        return this.request('/api/admin/import', {
            method: 'POST',
            body: JSON.stringify({ data })
        });
    }
};

// Global functions
let currentUser = null;
let userData = {
    favorites: [],
    history: [],
    completedItems: [],
    settings: {}
};

// Save to local storage
function saveUserData() {
    Utils.storage.set('userData', userData);
}

// Load from local storage
function loadUserData() {
    const saved = Utils.storage.get('userData');
    if (saved) {
        userData = saved;
    }
}

// Check if device is blocked
async function checkDeviceBlocked() {
    try {
        const result = await API.checkDevice(Utils.getDeviceId());
        if (result.blocked) {
            showBlockedModal(result);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Device check failed:', error);
        return false;
    }
}

// Show blocked modal
function showBlockedModal(data) {
    const modal = document.getElementById('blockedModal');
    const message = document.getElementById('blockedMessage');
    message.textContent = data.message || 'Your device has been blocked by admin.';
    modal.classList.add('show');
    
    // Disable all interactions
    document.body.style.pointerEvents = 'none';
}

// Hide blocked modal
function hideBlockedModal() {
    const modal = document.getElementById('blockedModal');
    modal.classList.remove('show');
    document.body.style.pointerEvents = 'auto';
}

// Check session expiry
function checkSessionExpiry() {
    const expiryDate = Utils.storage.get('expiryDate');
    if (expiryDate && new Date(expiryDate) < new Date()) {
        Utils.storage.clear();
        Utils.showToast('Session expired. Please login again.', 'warning');
        window.location.reload();
        return false;
    }
    return true;
}

// Auto logout checker (every 5 seconds)
setInterval(() => {
    if (currentUser && !checkSessionExpiry()) {
        // Session expired, force logout
        currentUser = null;
        Utils.storage.clear();
        window.location.reload();
    }
}, 5000);