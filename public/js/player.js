// Universal Video Player
class UniversalPlayer {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.container = document.getElementById('playerContainer');
        this.currentUrl = null;
        this.currentItem = null;
        this.qualities = [];
        this.currentQuality = 'auto';
        this.speed = 1;
        this.hls = null;
        this.shaka = null;
        
        this.init();
    }
    
    init() {
        // Speed control
        const speedBtns = document.querySelectorAll('.speed-menu button');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSpeed(parseFloat(btn.dataset.speed));
                document.querySelector('.speed-btn').textContent = `${this.speed}x`;
            });
        });
        
        // PIP
        document.getElementById('pipBtn').addEventListener('click', () => this.togglePIP());
        
        // Rotate
        let rotation = 0;
        document.getElementById('rotateBtn').addEventListener('click', () => {
            rotation = (rotation + 90) % 360;
            this.video.style.transform = `rotate(${rotation}deg)`;
        });
        
        // Download
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadVideo());
        
        // Copy link
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            if (this.currentUrl) {
                Utils.copyToClipboard(this.currentUrl);
            }
        });
        
        // Complete
        document.getElementById('completeBtn').addEventListener('click', () => this.markCompleted());
        
        // Double tap
        this.initDoubleTap();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.video.paused) {
                if (e.key === 'ArrowLeft') {
                    this.video.currentTime -= 10;
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    this.video.currentTime += 10;
                    e.preventDefault();
                } else if (e.key === ' ') {
                    this.togglePlay();
                    e.preventDefault();
                }
            }
        });
    }
    
    initDoubleTap() {
        let lastTap = 0;
        this.video.addEventListener('click', (e) => {
            const now = Date.now();
            const doubleTapDelay = userData.settings?.doubleTapSeconds || 10;
            
            if (now - lastTap < 300) {
                // Double tap detected
                const rect = this.video.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const width = rect.width;
                
                if (x < width / 2) {
                    this.video.currentTime -= doubleTapDelay;
                    Utils.showToast(`Rewind ${doubleTapDelay}s`, 'info');
                } else {
                    this.video.currentTime += doubleTapDelay;
                    Utils.showToast(`Forward ${doubleTapDelay}s`, 'info');
                }
            }
            lastTap = now;
        });
    }
    
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }
    
    setSpeed(speed) {
        this.speed = speed;
        this.video.playbackRate = speed;
    }
    
    async togglePIP() {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (this.video) {
            await this.video.requestPictureInPicture();
        }
    }
    
    async play(url, item, platform) {
        this.currentItem = item;
        this.currentUrl = url;
        
        // Hide video initially
        this.video.style.display = 'none';
        
        // Clean up existing players
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        if (this.shaka) {
            this.shaka.destroy();
            this.shaka = null;
        }
        
        try {
            let processedUrl = url;
            
            // Process URL based on type
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                let videoId = '';
                if (url.includes('youtube.com/watch?v=')) {
                    videoId = url.split('v=')[1].split('&')[0];
                } else if (url.includes('youtu.be/')) {
                    videoId = url.split('/').pop().split('?')[0];
                }
                processedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
                this.loadYouTube(processedUrl);
                return;
            }
            
            if (url.includes('.mpd')) {
                await this.loadDash(url, platform);
            } else if (url.includes('.m3u8')) {
                await this.loadHLS(url);
            } else if (url.includes('.mp4')) {
                this.loadMP4(url);
            } else {
                this.loadMP4(url);
            }
            
        } catch (error) {
            console.error('Play error:', error);
            Utils.showToast('Failed to load video: ' + error.message, 'error');
        }
    }
    
    loadYouTube(url) {
        this.video.style.display = 'none';
        
        // Check if iframe exists
        let iframe = this.container.querySelector('iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            this.container.appendChild(iframe);
        }
        
        iframe.src = url;
        iframe.style.display = 'block';
        this.video.style.display = 'none';
    }
    
    loadMP4(url) {
        this.video.style.display = 'block';
        this.video.src = url;
        this.video.load();
        this.video.play().catch(e => console.log('Play failed:', e));
        
        // Remove iframe if exists
        const iframe = this.container.querySelector('iframe');
        if (iframe) iframe.style.display = 'none';
    }
    
    async loadHLS(url) {
        this.video.style.display = 'block';
        
        if (Hls.isSupported()) {
            this.hls = new Hls();
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.video.play().catch(e => console.log('Play failed:', e));
            });
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.addEventListener('loadedmetadata', () => {
                this.video.play().catch(e => console.log('Play failed:', e));
            });
        } else {
            throw new Error('HLS not supported in this browser');
        }
        
        // Remove iframe
        const iframe = this.container.querySelector('iframe');
        if (iframe) iframe.style.display = 'none';
    }
    
    async loadDash(url, platform) {
        this.video.style.display = 'block';
        
        if (!window.shaka) {
            throw new Error('Shaka Player not loaded');
        }
        
        if (!window.shaka.Player.isBrowserSupported()) {
            throw new Error('Browser does not support DRM playback');
        }
        
        this.shaka = new window.shaka.Player(this.video);
        
        // Configure DRM
        this.shaka.configure({
            drm: {
                servers: {
                    'com.widevine.alpha': 'https://license.videocrypt.com/validateLicense'
                },
                retryParameters: {
                    maxAttempts: 5,
                    baseDelay: 1000,
                    backoffFactor: 2
                }
            }
        });
        
        // Add token to license requests
        const netEngine = this.shaka.getNetworkingEngine();
        netEngine.registerRequestFilter((type, request) => {
            if (type === window.shaka.net.NetworkingEngine.RequestType.LICENSE) {
                if (platform === 'CW' && this.currentItem?.token) {
                    request.headers['pallycon-customdata-v2'] = this.currentItem.token;
                }
            }
        });
        
        await this.shaka.load(url);
        this.video.play().catch(e => console.log('Play failed:', e));
        
        // Get available qualities
        this.shaka.addEventListener('trackschanged', () => {
            const tracks = this.shaka.getVariantTracks();
            this.qualities = [...new Set(tracks.map(t => t.height).filter(h => h))];
            this.updateQualityMenu();
        });
        
        // Remove iframe
        const iframe = this.container.querySelector('iframe');
        if (iframe) iframe.style.display = 'none';
    }
    
    updateQualityMenu() {
        const menu = document.getElementById('qualityMenu');
        menu.innerHTML = '<button data-quality="auto">Auto</button>';
        
        this.qualities.sort((a, b) => b - a);
        this.qualities.forEach(quality => {
            const btn = document.createElement('button');
            btn.textContent = `${quality}p`;
            btn.dataset.quality = quality;
            btn.addEventListener('click', () => this.setQuality(quality));
            menu.appendChild(btn);
        });
        
        // Auto quality button
        document.querySelector('[data-quality="auto"]')?.addEventListener('click', () => this.setQuality('auto'));
    }
    
    setQuality(quality) {
        if (!this.shaka) return;
        
        this.currentQuality = quality;
        const tracks = this.shaka.getVariantTracks();
        
        if (quality === 'auto') {
            this.shaka.configure({ abr: { enabled: true } });
            document.querySelector('.quality-btn').textContent = 'Auto';
        } else {
            this.shaka.configure({ abr: { enabled: false } });
            const track = tracks.find(t => t.height === quality);
            if (track) {
                this.shaka.selectVariantTrack(track, true);
                document.querySelector('.quality-btn').textContent = `${quality}p`;
            }
        }
    }
    
    downloadVideo() {
        if (this.currentUrl) {
            // Get quality from settings
            const quality = userData.settings?.defaultQuality || 'auto';
            let downloadUrl = this.currentUrl;
            
            // For DASH/HLS, we need to get the best quality
            if (this.currentUrl.includes('.mpd') || this.currentUrl.includes('.m3u8')) {
                // Try to get highest quality from manifest
                if (this.qualities.length > 0) {
                    const bestQuality = Math.max(...this.qualities);
                    downloadUrl = this.currentUrl.replace(/\.(mpd|m3u8)$/, `_${bestQuality}p.mp4`);
                }
            }
            
            const title = this.currentItem?.title || 'video';
            const downloadLink = `https://vishal-tools.vercel.app/downloader/${encodeURIComponent(downloadUrl)}&${encodeURIComponent(title)}&${encodeURIComponent(quality)}`;
            window.open(downloadLink, '_blank');
        }
    }
    
    async markCompleted() {
        if (!this.currentItem || !currentUser) {
            Utils.showToast('Please login to mark completed', 'warning');
            return;
        }
        
        try {
            await API.markComplete({
                userId: currentUser.userId,
                app: this.currentItem.app,
                batchId: this.currentItem.batchId,
                batchName: this.currentItem.batchName,
                itemId: this.currentItem.id,
                itemType: this.currentItem.type,
                title: this.currentItem.title,
                url: this.currentUrl
            });
            
            // Update local data
            if (!userData.completedItems.find(i => i.itemId === this.currentItem.id)) {
                userData.completedItems.push({
                    app: this.currentItem.app,
                    batchId: this.currentItem.batchId,
                    itemId: this.currentItem.id,
                    itemType: this.currentItem.type,
                    completedAt: new Date()
                });
                saveUserData();
            }
            
            Utils.showToast('Marked as completed!', 'success');
            document.getElementById('completeBtn').style.color = '#48bb78';
            
            // Update UI if visible
            const lessonElement = document.querySelector(`[data-item-id="${this.currentItem.id}"]`);
            if (lessonElement) {
                lessonElement.classList.add('completed');
            }
            
        } catch (error) {
            Utils.showToast('Failed to mark completed', 'error');
        }
    }
    
    addToHistory(item) {
        // Add to history
        const historyItem = {
            ...item,
            watchedAt: new Date(),
            url: this.currentUrl
        };
        
        // Remove duplicate if exists
        userData.history = userData.history.filter(h => h.itemId !== item.id);
        userData.history.unshift(historyItem);
        
        // Keep only last 50
        if (userData.history.length > 50) {
            userData.history = userData.history.slice(0, 50);
        }
        
        saveUserData();
        
        // Sync with server
        if (currentUser) {
            API.syncUserData({ userId: currentUser.userId, history: userData.history });
        }
    }
}

// Initialize player
let universalPlayer;

document.addEventListener('DOMContentLoaded', () => {
    universalPlayer = new UniversalPlayer();
});

// Export for use in app
window.universalPlayer = universalPlayer;