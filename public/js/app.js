// Main Application
let currentTab = 'batches';
let currentPlatform = 'ALL';
let allBatches = {};
let currentBatchContent = null;
let currentTopicContent = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const closeSidebar = document.getElementById('closeSidebar');
const contentContainer = document.getElementById('contentContainer');
const pageTitle = document.getElementById('pageTitle');
const searchBtn = document.getElementById('searchBtn');
const searchBar = document.getElementById('searchBar');
const closeSearch = document.getElementById('closeSearch');
const searchInput = document.getElementById('searchInput');
const profileBtn = document.getElementById('profileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminDashboardBtn = document.getElementById('adminDashboardBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');

// Initialize app
async function init() {
    // Check if device is blocked
    const blocked = await checkDeviceBlocked();
    if (blocked) return;
    
    // Check saved session
    const savedUser = Utils.storage.get('currentUser');
    if (savedUser && checkSessionExpiry()) {
        currentUser = savedUser;
        loadUserData();
        updateUserUI();
        updateAdminButton();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Load batches
    loadBatches();
    
    // Start session checker
    startSessionChecker();
}

function setupEventListeners() {
    // Sidebar
    menuBtn.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));
    
    // Navigation
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Search
    searchBtn.addEventListener('click', () => {
        searchBar.style.display = 'flex';
        searchInput.focus();
    });
    closeSearch.addEventListener('click', () => {
        searchBar.style.display = 'none';
        searchInput.value = '';
        if (currentTab === 'batches') {
            renderBatches();
        }
    });
    searchInput.addEventListener('input', Utils.debounce(handleSearch, 300));
    
    // Profile
    profileBtn.addEventListener('click', () => {
        if (currentUser) {
            showProfileModal();
        } else {
            showLoginModal();
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Admin dashboard
    adminDashboardBtn.addEventListener('click', showAdminDashboard);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('show');
        });
    });
    
    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function switchTab(tab) {
    currentTab = tab;
    pageTitle.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
    
    // Update active nav
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Render content
    switch (tab) {
        case 'batches':
            renderBatches();
            break;
        case 'favorites':
            renderFavorites();
            break;
        case 'history':
            renderHistory();
            break;
        case 'completed':
            renderCompleted();
            break;
        case 'images':
            renderImageGallery();
            break;
        case 'ai':
            if (aiAssistant) aiAssistant.render();
            break;
        case 'settings':
            renderSettings();
            break;
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

// Load batches from all platforms
async function loadBatches() {
    try {
        contentContainer.innerHTML = '<div class="loading-container"><div class="loader"></div><p>Loading batches...</p></div>';
        
        const result = await API.getAllBatches();
        allBatches = result.batches;
        
        renderBatches();
        
    } catch (error) {
        console.error('Failed to load batches:', error);
        contentContainer.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load batches. Please try again.</p>
                <button class="btn btn-primary" onclick="loadBatches()">Retry</button>
            </div>
        `;
    }
}

// Render batches with platform tabs
function renderBatches() {
    const platforms = ['ALL', ...Object.keys(allBatches)];
    
    let html = `
        <div class="platform-tabs">
            ${platforms.map(p => `
                <button class="platform-tab ${currentPlatform === p ? 'active' : ''}" data-platform="${p}">
                    ${p === 'ALL' ? '📚 All Batches' : p}
                </button>
            `).join('')}
        </div>
        <div class="batches-grid">
    `;
    
    let batchesToShow = [];
    
    if (currentPlatform === 'ALL') {
        for (const [platform, batches] of Object.entries(allBatches)) {
            batchesToShow.push(...batches.map(b => ({ ...b, platform })));
        }
    } else {
        batchesToShow = (allBatches[currentPlatform] || []).map(b => ({ ...b, platform: currentPlatform }));
    }
    
    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        batchesToShow = batchesToShow.filter(b => 
            (b.name || '').toLowerCase().includes(searchTerm) ||
            (b.id || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (batchesToShow.length === 0) {
        html += '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No batches found</p></div>';
    } else {
        batchesToShow.forEach(batch => {
            const isFavorite = userData.favorites.some(f => f.batchId === batch.id && f.app === batch.platform);
            
            html += `
                <div class="batch-card" data-platform="${batch.platform}" data-batch-id="${batch.id}" data-batch-name="${escapeHtml(batch.name)}">
                    <div class="batch-card-image">
                        ${batch.image ? `<img src="${batch.image}" alt="${escapeHtml(batch.name)}">` : `<i class="fas fa-chalkboard-user"></i>`}
                        <button class="favorite-star ${isFavorite ? 'active' : ''}" data-batch-id="${batch.id}" data-platform="${batch.platform}" data-batch-name="${escapeHtml(batch.name)}">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <div class="batch-card-content">
                        <h3>${escapeHtml(batch.name)}</h3>
                        <p>ID: ${batch.id}</p>
                        <span class="batch-platform">${batch.platform}</span>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    contentContainer.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentPlatform = tab.dataset.platform;
            renderBatches();
        });
    });
    
    document.querySelectorAll('.batch-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-star')) {
                const platform = card.dataset.platform;
                const batchId = card.dataset.batchId;
                const batchName = card.dataset.batchName;
                openBatch(platform, batchId, batchName);
            }
        });
    });
    
    document.querySelectorAll('.favorite-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const batchId = star.dataset.batchId;
            const platform = star.dataset.platform;
            const batchName = star.dataset.batchName;
            toggleFavorite(platform, batchId, batchName);
            star.classList.toggle('active');
        });
    });
}

// Open batch and load topics
async function openBatch(platform, batchId, batchName) {
    try {
        contentContainer.innerHTML = '<div class="loading-container"><div class="loader"></div><p>Loading content...</p></div>';
        pageTitle.innerText = batchName;
        
        const result = await API.getBatchDetails(platform, batchId);
        currentBatchContent = result.data;
        
        renderTopics(platform, batchId, batchName, currentBatchContent);
        
    } catch (error) {
        console.error('Failed to load batch:', error);
        contentContainer.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load batch content: ${error.message}</p>
                <button class="btn btn-primary" onclick="openBatch('${platform}', '${batchId}', '${escapeHtml(batchName)}')">Retry</button>
                <button class="btn" onclick="switchTab('batches')">Back to Batches</button>
            </div>
        `;
    }
}

// Render topics hierarchy
function renderTopics(platform, batchId, batchName, data) {
    let topics = [];
    
    // Parse different platform formats
    if (platform === 'CW') {
        topics = data.topics || [];
    } else if (platform === 'RWA') {
        topics = data.subjects || [];
    } else if (platform === 'KGS') {
        topics = data.subjects || [];
    } else if (platform === 'IQ') {
        topics = data.data || [];
    } else if (platform === 'UTK') {
        topics = data.categories || [];
    }
    
    if (topics.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No content available for this batch</p>
                <button class="btn" onclick="switchTab('batches')">Back to Batches</button>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="topic-container">
            <div class="batch-header" style="padding: 15px 20px; background: rgba(102,126,234,0.1);">
                <button class="btn" onclick="switchTab('batches')" style="margin-bottom: 10px;">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <h2>${escapeHtml(batchName)}</h2>
            </div>
    `;
    
    topics.forEach((topic, index) => {
        const topicId = topic.id || topic.topicid || topic._id;
        const topicName = topic.topicName || topic.subject_name || topic.name || topic.Title || 'Untitled';
        const hasContent = topic.classes || topic.videos > 0 || topic.notes > 0;
        
        html += `
            <div class="topic-item">
                <div class="topic-header" data-topic-id="${topicId}" data-topic-name="${escapeHtml(topicName)}">
                    <h3>
                        <i class="fas fa-chevron-right"></i>
                        ${escapeHtml(topicName)}
                        ${topic.cls_count ? `<span class="topic-badge">${topic.cls_count} videos</span>` : ''}
                        ${topic.notes_count ? `<span class="topic-badge">${topic.notes_count} notes</span>` : ''}
                    </h3>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="topic-content" id="topic-${topicId}">
                    <div class="loading-container" style="padding: 20px;">
                        <div class="loader" style="width: 20px; height: 20px;"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    contentContainer.innerHTML = html;
    
    // Load content for each topic on expand
    document.querySelectorAll('.topic-header').forEach(header => {
        header.addEventListener('click', async (e) => {
            const topicId = header.dataset.topicId;
            const topicName = header.dataset.topicName;
            const contentDiv = document.getElementById(`topic-${topicId}`);
            
            // Toggle open
            if (contentDiv.classList.contains('open')) {
                contentDiv.classList.remove('open');
                header.querySelector('.fa-chevron-down').style.transform = 'rotate(0deg)';
                return;
            }
            
            contentDiv.classList.add('open');
            header.querySelector('.fa-chevron-down').style.transform = 'rotate(180deg)';
            
            // Load content if not already loaded
            if (contentDiv.innerHTML.includes('loading-container')) {
                await loadTopicContent(platform, batchId, topicId, topicName, contentDiv);
            }
        });
    });
}

// Load topic content (videos/pdfs)
async function loadTopicContent(platform, batchId, topicId, topicName, container) {
    try {
        const result = await API.getTopicContent(platform, batchId, topicId);
        let lessons = [];
        
        // Parse different formats
        if (platform === 'CW') {
            const data = result.data;
            const classes = data.classes || [];
            const notes = data.notes || [];
            lessons = [
                ...classes.map(c => ({ ...c, type: 'video', id: c.id, title: c.title, url: c.video_url })),
                ...notes.map(n => ({ ...n, type: 'pdf', id: n.id, title: n.title, url: n.view_url, downloadUrl: n.download_url }))
            ];
        } else if (platform === 'RWA') {
            const data = result.data || [];
            lessons = data.map(item => ({
                id: item.id,
                title: item.Title,
                type: item.material_type === 'VIDEO' ? 'video' : 'pdf',
                url: item.video_url || item.pdf_link,
                duration: item.duration
            }));
        } else if (platform === 'KGS') {
            const data = result.data || [];
            lessons = data.map(item => ({
                id: item.id,
                title: item.name,
                type: item.video_url ? 'video' : 'pdf',
                url: item.video_url || (item.pdfs?.url),
                duration: item.duration
            }));
        }
        
        if (lessons.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No content available</p></div>';
            return;
        }
        
        let html = '<div class="lesson-list">';
        lessons.forEach(lesson => {
            const isCompleted = userData.completedItems.some(i => i.itemId === String(lesson.id));
            
            html += `
                <div class="lesson-item ${isCompleted ? 'completed' : ''}" data-item-id="${lesson.id}" data-item-type="${lesson.type}" data-item-title="${escapeHtml(lesson.title)}" data-item-url="${escapeHtml(lesson.url)}" data-item-duration="${lesson.duration || ''}">
                    <div class="lesson-title">
                        <i class="fas ${lesson.type === 'video' ? 'fa-play-circle' : 'fa-file-pdf'}"></i>
                        <span>${escapeHtml(Utils.truncate(lesson.title, 60))}</span>
                        ${lesson.duration ? `<span class="lesson-duration">${Math.floor(lesson.duration / 60)}:${(lesson.duration % 60).toString().padStart(2, '0')}</span>` : ''}
                        <span class="lesson-type ${lesson.type}">${lesson.type.toUpperCase()}</span>
                    </div>
                    <div class="lesson-actions">
                        <button class="play-btn" data-type="${lesson.type}" data-url="${escapeHtml(lesson.url)}" data-id="${lesson.id}" data-title="${escapeHtml(lesson.title)}" data-download="${escapeHtml(lesson.downloadUrl || '')}">
                            <i class="fas ${lesson.type === 'video' ? 'fa-play' : 'fa-eye'}"></i>
                        </button>
                        ${lesson.type === 'pdf' ? `
                            <button class="download-btn" data-url="${escapeHtml(lesson.downloadUrl || lesson.url)}" data-title="${escapeHtml(lesson.title)}">
                                <i class="fas fa-download"></i>
                            </button>
                        ` : ''}
                        <button class="complete-btn ${isCompleted ? 'completed' : ''}" data-id="${lesson.id}" data-type="${lesson.type}">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                const type = btn.dataset.type;
                const id = btn.dataset.id;
                const title = btn.dataset.title;
                
                playContent(url, type, {
                    id,
                    title,
                    type,
                    app: platform,
                    batchId,
                    batchName: topicName
                });
            });
        });
        
        container.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                const title = btn.dataset.title;
                Utils.downloadFile(url, `${title}.pdf`);
            });
        });
        
        container.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                
                await markItemCompleted(platform, batchId, topicName, id, type, btn.closest('.lesson-item').querySelector('.lesson-title span').textContent);
                
                btn.classList.add('completed');
                btn.closest('.lesson-item').classList.add('completed');
            });
        });
        
    } catch (error) {
        console.error('Failed to load topic content:', error);
        container.innerHTML = `<div class="error-container"><p>Failed to load: ${error.message}</p><button onclick="location.reload()">Retry</button></div>`;
    }
}

// Play video or view PDF
async function playContent(url, type, item) {
    if (!currentUser) {
        Utils.showToast('Please login to play content', 'warning');
        showLoginModal();
        return;
    }
    
    // Check if user has access to this batch
    if (currentUser.allowedApps.length > 0 && !currentUser.allowedApps.includes('ALL') && !currentUser.allowedApps.includes(item.app)) {
        Utils.showToast('You don\'t have access to this batch. Please purchase it.', 'warning');
        showPurchaseModal(item);
        return;
    }
    
    if (type === 'video') {
        // Get video URL if encrypted
        let videoUrl = url;
        
        if (url && (url.includes('encrypted') || url.includes(':'))) {
            try {
                const decrypted = await API.decryptUrl({ encrypted: url });
                videoUrl = decrypted.url;
            } catch (error) {
                console.error('Decryption failed:', error);
            }
        }
        
        // Process video for playback
        const processed = await API.processVideo(videoUrl, item.app);
        const finalUrl = processed.processedUrl.url || processed.processedUrl;
        
        // Play with universal player
        universalPlayer.play(finalUrl, item, item.app);
        universalPlayer.addToHistory(item);
        
        // Show player modal
        document.getElementById('playerTitle').innerText = item.title;
        document.getElementById('playerModal').classList.add('show');
        
    } else if (type === 'pdf') {
        viewPdf(url, item.title, item);
    }
}

// View PDF using PDF.js
async function viewPdf(url, title, item) {
    if (!currentUser) {
        Utils.showToast('Please login to view PDF', 'warning');
        showLoginModal();
        return;
    }
    
    const modal = document.getElementById('pdfModal');
    const canvas = document.getElementById('pdfCanvas');
    const pdfTitle = document.getElementById('pdfTitle');
    const prevBtn = document.getElementById('pdfPrev');
    const nextBtn = document.getElementById('pdfNext');
    const downloadBtn = document.getElementById('pdfDownloadBtn');
    const currentPageSpan = document.getElementById('pdfCurrentPage');
    const totalPagesSpan = document.getElementById('pdfTotalPages');
    
    pdfTitle.innerText = title;
    modal.classList.add('show');
    
    let pdfDoc = null;
    let currentPage = 1;
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
    pdfDoc = await loadingTask.promise;
    totalPagesSpan.innerText = pdfDoc.numPages;
    
    // Render page
    async function renderPage(pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        currentPageSpan.innerText = pageNum;
    }
    
    await renderPage(1);
    
    // Navigation
    prevBtn.onclick = async () => {
        if (currentPage > 1) {
            currentPage--;
            await renderPage(currentPage);
        }
    };
    
    nextBtn.onclick = async () => {
        if (currentPage < pdfDoc.numPages) {
            currentPage++;
            await renderPage(currentPage);
        }
    };
    
    downloadBtn.onclick = () => {
        Utils.downloadFile(url, `${title}.pdf`);
    };
    
    // Add to history
    universalPlayer.addToHistory(item);
    
    // Mark as completed
    await markItemCompleted(item.app, item.batchId, item.batchName, item.id, 'pdf', title);
}

// Mark item as completed
async function markItemCompleted(app, batchId, batchName, itemId, type, title) {
    if (!currentUser) return;
    
    // Check if already completed
    if (userData.completedItems.some(i => i.itemId === String(itemId))) {
        return;
    }
    
    try {
        await API.markComplete({
            userId: currentUser.userId,
            app,
            batchId,
            batchName,
            itemId: String(itemId),
            itemType: type,
            title
        });
        
        userData.completedItems.push({
            app,
            batchId,
            itemId: String(itemId),
            itemType: type,
            completedAt: new Date()
        });
        saveUserData();
        
        Utils.showToast('Marked as completed!', 'success');
        
    } catch (error) {
        console.error('Failed to mark completed:', error);
    }
}

// Toggle favorite batch
function toggleFavorite(app, batchId, batchName) {
    const index = userData.favorites.findIndex(f => f.batchId === batchId && f.app === app);
    
    if (index >= 0) {
        userData.favorites.splice(index, 1);
        Utils.showToast('Removed from favorites', 'info');
    } else {
        userData.favorites.push({ app, batchId, batchName, addedAt: new Date() });
        Utils.showToast('Added to favorites', 'success');
    }
    
    saveUserData();
    
    // Sync with server
    if (currentUser) {
        API.syncUserData({ userId: currentUser.userId, favorites: userData.favorites });
    }
    
    // Refresh if on favorites tab
    if (currentTab === 'favorites') {
        renderFavorites();
    }
}

// Render favorites
function renderFavorites() {
    if (userData.favorites.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <p>No favorites yet. Star batches you like!</p>
                <button class="btn btn-primary" onclick="switchTab('batches')">Browse Batches</button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="batches-grid">';
    userData.favorites.forEach(fav => {
        html += `
            <div class="batch-card" data-platform="${fav.app}" data-batch-id="${fav.batchId}" data-batch-name="${escapeHtml(fav.batchName)}">
                <div class="batch-card-image">
                    <i class="fas fa-chalkboard-user"></i>
                    <button class="favorite-star active" data-batch-id="${fav.batchId}" data-platform="${fav.app}" data-batch-name="${escapeHtml(fav.batchName)}">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
                <div class="batch-card-content">
                    <h3>${escapeHtml(fav.batchName)}</h3>
                    <p>Added: ${Utils.formatDate(fav.addedAt)}</p>
                    <span class="batch-platform">${fav.app}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    contentContainer.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.batch-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-star')) {
                const platform = card.dataset.platform;
                const batchId = card.dataset.batchId;
                const batchName = card.dataset.batchName;
                openBatch(platform, batchId, batchName);
            }
        });
    });
    
    document.querySelectorAll('.favorite-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const batchId = star.dataset.batchId;
            const platform = star.dataset.platform;
            const batchName = star.dataset.batchName;
            toggleFavorite(platform, batchId, batchName);
            star.remove();
            renderFavorites();
        });
    });
}

// Render history
function renderHistory() {
    if (userData.history.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No watch history yet. Start watching videos!</p>
                <button class="btn btn-primary" onclick="switchTab('batches')">Browse Batches</button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="history-list">';
    userData.history.forEach(item => {
        html += `
            <div class="history-item" data-item-id="${item.itemId}" data-item-type="${item.itemType}" data-item-url="${escapeHtml(item.url)}">
                <div class="history-item-content">
                    <div class="history-item-title">
                        <i class="fas ${item.itemType === 'video' ? 'fa-play-circle' : 'fa-file-pdf'}"></i>
                        <span>${escapeHtml(item.title)}</span>
                    </div>
                    <div class="history-item-meta">
                        <span class="batch-name">${escapeHtml(item.batchName)}</span>
                        <span class="time-ago">${Utils.timeAgo(item.watchedAt)}</span>
                        ${item.completed ? '<span class="completed-badge">✓ Completed</span>' : ''}
                    </div>
                </div>
                <button class="replay-btn" data-url="${escapeHtml(item.url)}" data-type="${item.itemType}" data-item='${JSON.stringify(item)}'>
                    <i class="fas fa-redo-alt"></i> Replay
                </button>
            </div>
        `;
    });
    html += '</div>';
    
    contentContainer.innerHTML = html;
    
    document.querySelectorAll('.replay-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            const type = btn.dataset.type;
            const item = JSON.parse(btn.dataset.item);
            playContent(url, type, item);
        });
    });
}

// Render completed items
function renderCompleted() {
    if (userData.completedItems.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No completed items yet. Complete videos and PDFs!</p>
                <button class="btn btn-primary" onclick="switchTab('batches')">Browse Batches</button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="completed-list">';
    userData.completedItems.slice().reverse().forEach(item => {
        html += `
            <div class="completed-item">
                <div class="completed-item-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="completed-item-content">
                    <div class="completed-item-title">${escapeHtml(item.title || 'Item')}</div>
                    <div class="completed-item-meta">
                        <span>${escapeHtml(item.batchName || '')}</span>
                        <span>Completed: ${Utils.formatDate(item.completedAt)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    contentContainer.innerHTML = html;
}

// Render image gallery
async function renderImageGallery() {
    let images = userData.uploadedImages || [];
    
    if (currentUser) {
        try {
            const result = await API.getUserImages(currentUser.userId);
            images = result.images;
            userData.uploadedImages = images;
            saveUserData();
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    }
    
    let html = `
        <div class="upload-area" id="uploadArea">
            <i class="fas fa-cloud-upload-alt" style="font-size: 48px;"></i>
            <p>Click or drag images here to upload</p>
            <small>Supports JPG, PNG, GIF (Max 32MB per image)</small>
            <input type="file" id="imageUploadInput" multiple accept="image/*" style="display: none;">
        </div>
        <div class="image-gallery" id="imageGallery">
    `;
    
    if (images.length === 0) {
        html += '<div class="empty-state"><p>No images uploaded yet</p></div>';
    } else {
        images.forEach(img => {
            html += `
                <div class="gallery-item" data-url="${escapeHtml(img.url)}">
                    <img src="${img.thumb || img.url}" alt="${escapeHtml(img.name)}">
                    <div class="gallery-item-actions">
                        <button class="copy-image-btn" data-url="${img.url}"><i class="fas fa-copy"></i></button>
                        <button class="delete-image-btn" data-url="${img.url}" data-delete-url="${img.deleteUrl || ''}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    contentContainer.innerHTML = html;
    
    // Upload area
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('imageUploadInput');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'rgba(255,255,255,0.3)';
    });
    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'rgba(255,255,255,0.3)';
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        await uploadImages(files);
    });
    
    fileInput.addEventListener('change', async (e) => {
        await uploadImages(Array.from(e.target.files));
        fileInput.value = '';
    });
    
    // Image actions
    document.querySelectorAll('.copy-image-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            Utils.copyToClipboard(url);
        });
    });
    
    document.querySelectorAll('.delete-image-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            const deleteUrl = btn.dataset.deleteUrl;
            
            if (confirm('Delete this image?')) {
                try {
                    await API.deleteImage(deleteUrl, currentUser?.userId, url);
                    userData.uploadedImages = userData.uploadedImages.filter(i => i.url !== url);
                    saveUserData();
                    renderImageGallery();
                    Utils.showToast('Image deleted', 'success');
                } catch (error) {
                    Utils.showToast('Failed to delete', 'error');
                }
            }
        });
    });
}

// Upload images
async function uploadImages(files) {
    if (!currentUser) {
        Utils.showToast('Please login to upload images', 'warning');
        showLoginModal();
        return;
    }
    
    const imagePromises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    });
    
    const base64Images = await Promise.all(imagePromises);
    
    try {
        Utils.showToast('Uploading images...', 'info');
        const result = await API.uploadImages(base64Images, currentUser.userId);
        
        userData.uploadedImages = [...(userData.uploadedImages || []), ...result.images];
        saveUserData();
        
        renderImageGallery();
        Utils.showToast(`${result.images.length} image(s) uploaded!`, 'success');
        
    } catch (error) {
        Utils.showToast('Upload failed: ' + error.message, 'error');
    }
}

// Render settings
function renderSettings() {
    const settings = userData.settings || {
        defaultQuality: 'auto',
        defaultSpeed: 1,
        doubleTapSeconds: 10,
        autoplay: true,
        subtitles: false,
        theme: 'dark'
    };
    
    let html = `
        <div class="settings-container">
            <h3>Player Settings</h3>
            <div class="settings-group">
                <label>Default Quality</label>
                <select id="settingQuality">
                    <option value="auto" ${settings.defaultQuality === 'auto' ? 'selected' : ''}>Auto</option>
                    <option value="144" ${settings.defaultQuality === '144' ? 'selected' : ''}>144p</option>
                    <option value="240" ${settings.defaultQuality === '240' ? 'selected' : ''}>240p</option>
                    <option value="360" ${settings.defaultQuality === '360' ? 'selected' : ''}>360p</option>
                    <option value="480" ${settings.defaultQuality === '480' ? 'selected' : ''}>480p</option>
                    <option value="720" ${settings.defaultQuality === '720' ? 'selected' : ''}>720p</option>
                    <option value="1080" ${settings.defaultQuality === '1080' ? 'selected' : ''}>1080p</option>
                </select>
            </div>
            
            <div class="settings-group">
                <label>Default Speed</label>
                <select id="settingSpeed">
                    <option value="0.5" ${settings.defaultSpeed === 0.5 ? 'selected' : ''}>0.5x</option>
                    <option value="0.75" ${settings.defaultSpeed === 0.75 ? 'selected' : ''}>0.75x</option>
                    <option value="1" ${settings.defaultSpeed === 1 ? 'selected' : ''}>1x</option>
                    <option value="1.25" ${settings.defaultSpeed === 1.25 ? 'selected' : ''}>1.25x</option>
                    <option value="1.5" ${settings.defaultSpeed === 1.5 ? 'selected' : ''}>1.5x</option>
                    <option value="2" ${settings.defaultSpeed === 2 ? 'selected' : ''}>2x</option>
                </select>
            </div>
            
            <div class="settings-group">
                <label>Double Tap Seek (seconds)</label>
                <input type="number" id="settingDoubleTap" value="${settings.doubleTapSeconds}" min="1" max="30">
            </div>
            
            <div class="settings-group">
                <label>
                    <input type="checkbox" id="settingAutoplay" ${settings.autoplay ? 'checked' : ''}>
                    Autoplay next video
                </label>
            </div>
            
            <div class="settings-group">
                <label>
                    <input type="checkbox" id="settingSubtitles" ${settings.subtitles ? 'checked' : ''}>
                    Show subtitles (if available)
                </label>
            </div>
            
            <div class="settings-group">
                <label>Theme</label>
                <select id="settingTheme">
                    <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                    <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                </select>
            </div>
            
            <div class="settings-group">
                <button class="btn btn-primary" id="saveSettings">Save Settings</button>
                <button class="btn" id="clearHistoryBtn">Clear Watch History</button>
                <button class="btn" id="clearCompletedBtn">Clear Completed Items</button>
                <button class="btn" id="exportDataBtn">Export My Data</button>
            </div>
        </div>
    `;
    
    contentContainer.innerHTML = html;
    
    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
        userData.settings = {
            defaultQuality: document.getElementById('settingQuality').value,
            defaultSpeed: parseFloat(document.getElementById('settingSpeed').value),
            doubleTapSeconds: parseInt(document.getElementById('settingDoubleTap').value),
            autoplay: document.getElementById('settingAutoplay').checked,
            subtitles: document.getElementById('settingSubtitles').checked,
            theme: document.getElementById('settingTheme').value
        };
        saveUserData();
        
        // Apply theme
        if (userData.settings.theme === 'light') {
            document.body.style.background = '#f5f5f5';
            document.body.style.color = '#333';
        } else {
            document.body.style.background = 'var(--dark)';
            document.body.style.color = 'var(--light)';
        }
        
        Utils.showToast('Settings saved', 'success');
        
        if (currentUser) {
            API.syncUserData({ userId: currentUser.userId, settings: userData.settings });
        }
    });
    
    // Clear history
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (confirm('Clear all watch history?')) {
            userData.history = [];
            saveUserData();
            Utils.showToast('History cleared', 'success');
            if (currentUser) {
                API.syncUserData({ userId: currentUser.userId, history: [] });
            }
        }
    });
    
    // Clear completed
    document.getElementById('clearCompletedBtn').addEventListener('click', () => {
        if (confirm('Clear all completed items?')) {
            userData.completedItems = [];
            saveUserData();
            Utils.showToast('Completed items cleared', 'success');
            if (currentUser) {
                API.syncUserData({ userId: currentUser.userId, completedItems: [] });
            }
        }
    });
    
    // Export data
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        const exportData = {
            favorites: userData.favorites,
            history: userData.history,
            completedItems: userData.completedItems,
            settings: userData.settings,
            exportedAt: new Date()
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        Utils.downloadFile(url, 'careerwill_data.json');
        URL.revokeObjectURL(url);
    });
}

// Handle search
function handleSearch() {
    if (currentTab === 'batches') {
        renderBatches();
    }
}

// Show login modal
function showLoginModal() {
    document.getElementById('loginModal').classList.add('show');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const userId = document.getElementById('loginUserId').value.trim();
    const password = document.getElementById('loginPassword').value;
    const mobileNo = document.getElementById('loginMobile').value;
    const name = document.getElementById('loginName').value;
    const email = document.getElementById('loginEmail').value;
    const address = document.getElementById('loginAddress').value;
    const userClass = document.getElementById('loginClass').value;
    
    // Get profile image if uploaded
    let profileImage = '';
    const profileInput = document.getElementById('profileImageInput');
    if (profileInput.files && profileInput.files[0]) {
        const reader = new FileReader();
        const imageData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(profileInput.files[0]);
        });
        
        // Upload to ImgBB
        const uploadResult = await API.uploadImages([imageData]);
        if (uploadResult.images && uploadResult.images[0]) {
            profileImage = uploadResult.images[0].url;
        }
    }
    
    try {
        const result = await API.login({
            userId,
            password,
            mobileNo,
            name,
            email,
            address,
            class: userClass,
            profileImage,
            deviceId: Utils.getDeviceId(),
            deviceInfo: JSON.stringify(Utils.getDeviceInfo())
        });
        
        if (result.success) {
            currentUser = result.user;
            userData.favorites = result.favorites || [];
            userData.history = result.history || [];
            userData.completedItems = result.completedItems || [];
            userData.settings = result.user.settings || {};
            
            saveUserData();
            Utils.storage.set('currentUser', currentUser);
            Utils.storage.set('expiryDate', currentUser.expiryDate);
            
            updateUserUI();
            updateAdminButton();
            
            document.getElementById('loginModal').classList.remove('show');
            Utils.showToast(`Welcome ${currentUser.name || currentUser.userId}!`, 'success');
            
            // Refresh current tab
            switchTab(currentTab);
        }
        
    } catch (error) {
        Utils.showToast('Login failed: ' + error.message, 'error');
    }
}

// Handle logout
async function handleLogout() {
    if (currentUser) {
        try {
            await API.logout(currentUser.userId, Utils.getDeviceId());
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    currentUser = null;
    Utils.storage.clear();
    userData = { favorites: [], history: [], completedItems: [], settings: {} };
    updateUserUI();
    updateAdminButton();
    Utils.showToast('Logged out successfully', 'success');
    switchTab('batches');
}

// Update user UI in sidebar
function updateUserUI() {
    if (currentUser) {
        userName.innerText = currentUser.name || currentUser.userId;
        userRole.innerText = currentUser.role.toUpperCase();
        
        if (currentUser.profileImage) {
            userAvatar.innerHTML = `<img src="${currentUser.profileImage}" alt="Profile">`;
        } else {
            userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
        }
        
        logoutBtn.style.display = 'flex';
    } else {
        userName.innerText = 'Guest User';
        userRole.innerText = 'Not Logged In';
        userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
        logoutBtn.style.display = 'none';
    }
}

// Update admin button visibility
function updateAdminButton() {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner')) {
        adminDashboardBtn.style.display = 'flex';
    } else {
        adminDashboardBtn.style.display = 'none';
    }
}

// Show admin dashboard
async function showAdminDashboard() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        Utils.showToast('Admin access required', 'error');
        return;
    }
    
    const modal = document.getElementById('adminModal');
    modal.classList.add('show');
    
    // Load admin content
    await loadAdminContent('users');
    
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAdminContent(tab.dataset.adminTab);
        });
    });
}

// Load admin content
async function loadAdminContent(tab) {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loader"></div>';
    
    try {
        if (tab === 'users') {
            const result = await API.getAllUsers();
            const users = result.users;
            
            let html = '<table class="admin-table"><thead><tr><th>User ID</th><th>Name</th><th>Role</th><th>Mobile</th><th>Devices</th><th>Expiry</th><th>Actions</th></tr></thead><tbody>';
            
            users.forEach(user => {
                html += `
                    <tr>
                        <td>${escapeHtml(user.userId)}</td>
                        <td>${escapeHtml(user.name || '-')}</td>
                        <td>${user.role}</td>
                        <td>${user.mobileNo}</td>
                        <td>${user.activeDevices?.length || 0}/${user.maxDevices === 0 ? '∞' : user.maxDevices}</td>
                        <td>${user.expiryDate ? Utils.formatDate(user.expiryDate) : 'Never'}</td>
                        <td>
                            <button class="btn-small" onclick="editUser('${user.userId}')">Edit</button>
                            ${currentUser.role === 'owner' ? `<button class="btn-small danger" onclick="deleteUser('${user.userId}')">Delete</button>` : ''}
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
            
        } else if (tab === 'devices') {
            const [blockedResult, usersResult] = await Promise.all([
                API.getBlockedDevices(),
                API.getAllUsers()
            ]);
            
            let html = `
                <h4>Blocked Devices</h4>
                <table class="admin-table">
                    <thead><tr><th>Device ID</th><th>Reason</th><th>Blocked By</th><th>Blocked At</th><th>Actions</th></tr></thead>
                    <tbody>
            `;
            
            blockedResult.devices.forEach(device => {
                html += `
                    <tr>
                        <td><code>${escapeHtml(device.deviceId)}</code></td>
                        <td>${escapeHtml(device.reason)}</td>
                        <td>${escapeHtml(device.blockedBy)}</td>
                        <td>${Utils.formatDate(device.blockedAt)}</td>
                        <td><button class="btn-small" onclick="unblockDevice('${device.deviceId}')">Unblock</button></td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            
            html += '<h4 style="margin-top: 20px;">All Active Devices</h4>';
            html += '<table class="admin-table"><thead><tr><th>User</th><th>Device ID</th><th>Last Active</th><th>Actions</th></tr></thead><tbody>';
            
            usersResult.users.forEach(user => {
                (user.activeDevices || []).forEach(device => {
                    html += `
                        <tr>
                            <td>${escapeHtml(user.userId)}</td>
                            <td><code>${escapeHtml(device.deviceId)}</code></td>
                            <td>${device.lastActive ? Utils.timeAgo(device.lastActive) : 'Never'}</td>
                            <td><button class="btn-small danger" onclick="blockDevice('${device.deviceId}')">Block</button></td>
                        </tr>
                    `;
                });
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
            
        } else if (tab === 'create') {
            const platforms = ['CW', 'SW', 'RWA', 'KGS', 'IQ', 'UTK', 'ALL'];
            
            container.innerHTML = `
                <form id="createUserForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>User ID *</label>
                            <input type="text" id="newUserId" required>
                        </div>
                        <div class="form-group">
                            <label>Password *</label>
                            <input type="text" id="newPassword" required>
                        </div>
                        <div class="form-group">
                            <label>Mobile Number *</label>
                            <input type="tel" id="newMobile" required pattern="[0-9]{10}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="newName">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="newEmail">
                        </div>
                        <div class="form-group">
                            <label>Class</label>
                            <input type="text" id="newClass">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Allowed Apps</label>
                            <select id="newApps" multiple size="5">
                                ${platforms.map(p => `<option value="${p}">${p}</option>`).join('')}
                            </select>
                            <small>Hold Ctrl/Cmd to select multiple</small>
                        </div>
                        <div class="form-group">
                            <label>Max Devices (0 = unlimited)</label>
                            <input type="number" id="newMaxDevices" value="1" min="0">
                        </div>
                        <div class="form-group">
                            <label>Expiry Date</label>
                            <input type="date" id="newExpiry">
                            <small>Leave empty for never expire</small>
                        </div>
                    </div>
                    ${currentUser.role === 'owner' ? `
                    <div class="form-group">
                        <label>Role</label>
                        <select id="newRole">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    ` : ''}
                    <button type="submit" class="btn btn-primary">Create User</button>
                </form>
            `;
            
            document.getElementById('createUserForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const userData = {
                    userId: document.getElementById('newUserId').value,
                    password: document.getElementById('newPassword').value,
                    mobileNo: document.getElementById('newMobile').value,
                    name: document.getElementById('newName').value,
                    email: document.getElementById('newEmail').value,
                    class: document.getElementById('newClass').value,
                    allowedApps: Array.from(document.getElementById('newApps').selectedOptions).map(opt => opt.value),
                    maxDevices: parseInt(document.getElementById('newMaxDevices').value),
                    expiryDate: document.getElementById('newExpiry').value || null
                };
                
                if (currentUser.role === 'owner') {
                    userData.role = document.getElementById('newRole').value;
                }
                
                try {
                    await API.createUser(userData);
                    Utils.showToast('User created successfully', 'success');
                    document.querySelector('.admin-tab[data-admin-tab="users"]').click();
                } catch (error) {
                    Utils.showToast('Failed to create user: ' + error.message, 'error');
                }
            });
            
        } else if (tab === 'stats') {
            const stats = await API.getAdminStats();
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <i class="fas fa-users"></i>
                        <h3>${stats.stats.totalUsers}</h3>
                        <p>Total Users</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-user-shield"></i>
                        <h3>${stats.stats.totalAdmins}</h3>
                        <p>Admins</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-mobile-alt"></i>
                        <h3>${stats.stats.totalDevices}</h3>
                        <p>Active Devices</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-ban"></i>
                        <h3>${stats.stats.blockedDevices}</h3>
                        <p>Blocked Devices</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-user-check"></i>
                        <h3>${stats.stats.activeUsers}</h3>
                        <p>Active Users</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-clock"></i>
                        <h3>${stats.stats.pendingExpiry}</h3>
                        <p>Expiring Soon</p>
                    </div>
                </div>
                ${currentUser.role === 'owner' ? `
                    <div class="danger-zone">
                        <h3>⚠️ Danger Zone</h3>
                        <button class="btn danger" id="clearDatabaseBtn" onclick="confirmClearDatabase()">Clear All Database</button>
                    </div>
                ` : ''}
            `;
            
        } else if (tab === 'backup') {
            container.innerHTML = `
                <div class="backup-actions">
                    <button class="btn btn-primary" id="exportDataBtn">Export All Data</button>
                    <div class="import-section">
                        <label>Import Data (JSON file)</label>
                        <input type="file" id="importFile" accept=".json">
                        <button class="btn" id="importDataBtn">Import Data</button>
                    </div>
                </div>
            `;
            
            document.getElementById('exportDataBtn').addEventListener('click', async () => {
                const result = await API.exportData();
                const dataStr = JSON.stringify(result.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                Utils.downloadFile(url, 'careerwill_backup.json');
                URL.revokeObjectURL(url);
            });
            
            document.getElementById('importDataBtn').addEventListener('click', async () => {
                const file = document.getElementById('importFile').files[0];
                if (!file) {
                    Utils.showToast('Select a JSON file first', 'warning');
                    return;
                }
                
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (confirm('This will replace all existing data. Continue?')) {
                    await API.importData(data);
                    Utils.showToast('Data imported successfully', 'success');
                }
            });
        }
        
    } catch (error) {
        console.error('Admin error:', error);
        container.innerHTML = `<div class="error">Failed to load: ${error.message}</div>`;
    }
}

// Show profile modal
function showProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>My Profile</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="profile-info">
                    <div class="profile-avatar">
                        ${currentUser.profileImage ? `<img src="${currentUser.profileImage}" alt="Profile">` : `<i class="fas fa-user-circle" style="font-size: 80px;"></i>`}
                    </div>
                    <p><strong>User ID:</strong> ${escapeHtml(currentUser.userId)}</p>
                    <p><strong>Name:</strong> ${escapeHtml(currentUser.name || 'Not set')}</p>
                    <p><strong>Mobile:</strong> ${currentUser.mobileNo}</p>
                    <p><strong>Email:</strong> ${escapeHtml(currentUser.email || 'Not set')}</p>
                    <p><strong>Class:</strong> ${escapeHtml(currentUser.class || 'Not set')}</p>
                    <p><strong>Role:</strong> ${currentUser.role}</p>
                    <p><strong>Max Devices:</strong> ${currentUser.maxDevices === 0 ? 'Unlimited' : currentUser.maxDevices}</p>
                    <p><strong>Expiry:</strong> ${currentUser.expiryDate ? Utils.formatDate(currentUser.expiryDate) : 'Never'}</p>
                    <p><strong>Active Devices:</strong> ${currentUser.activeDevices?.length || 0}</p>
                    <button class="btn btn-primary" id="editProfileBtn">Edit Profile</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('editProfileBtn').addEventListener('click', async () => {
        const newName = prompt('Enter new name:', currentUser.name || '');
        const newEmail = prompt('Enter new email:', currentUser.email || '');
        const newClass = prompt('Enter class:', currentUser.class || '');
        
        if (newName !== null || newEmail !== null) {
            const updates = {};
            if (newName !== null) updates.name = newName;
            if (newEmail !== null) updates.email = newEmail;
            if (newClass !== null) updates.class = newClass;
            
            try {
                await API.updateUser(currentUser.userId, updates);
                currentUser = { ...currentUser, ...updates };
                Utils.storage.set('currentUser', currentUser);
                updateUserUI();
                Utils.showToast('Profile updated', 'success');
                modal.remove();
            } catch (error) {
                Utils.showToast('Update failed: ' + error.message, 'error');
            }
        }
    });
}

// Show purchase modal
function showPurchaseModal(item) {
    const price = item.price || 'Contact admin';
    const message = `HELLO ADMIN PLEASE YAAR YE BATCH DEDO

APP_NAME: ${item.app}
BATCH_NAME: ${item.batchName}
BATCH_REAL_PRICE: ${price}
MY_NAME: ${currentUser?.name || currentUser?.userId || 'Guest'}
MY_PASS: ${currentUser?.userId || 'Not registered'}

MAI AAPKO ${typeof price === 'number' ? Math.max(100, price * 0.3) : '100'} RUPYA DE DUNGA
FINAL PRICE: ${typeof price === 'number' ? Math.max(100, price * 0.3) : 'Contact'}`;
    
    const telegramUrl = `https://t.me/UnknownRavan_bot?text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
    
    Utils.showToast('Redirecting to Telegram support...', 'info');
}

// Block device
window.blockDevice = async function(deviceId) {
    const reason = prompt('Reason for blocking:', 'Violation of terms');
    if (reason) {
        await API.blockDevice(deviceId, reason);
        Utils.showToast('Device blocked', 'success');
        loadAdminContent('devices');
    }
};

// Unblock device
window.unblockDevice = async function(deviceId) {
    await API.unblockDevice(deviceId);
    Utils.showToast('Device unblocked', 'success');
    loadAdminContent('devices');
};

// Edit user
window.editUser = async function(userId) {
    const user = (await API.getAllUsers()).users.find(u => u.userId === userId);
    if (!user) return;
    
    const newMaxDevices = prompt('Max Devices (0 = unlimited):', user.maxDevices);
    const newExpiry = prompt('Expiry Date (YYYY-MM-DD, leave empty for never):', user.expiryDate?.split('T')[0] || '');
    const newRole = currentUser.role === 'owner' ? prompt('Role (user/admin):', user.role) : null;
    
    const updates = {};
    if (newMaxDevices !== null) updates.maxDevices = parseInt(newMaxDevices);
    if (newExpiry !== null) updates.expiryDate = newExpiry || null;
    if (newRole && currentUser.role === 'owner') updates.role = newRole;
    
    if (Object.keys(updates).length) {
        await API.updateUser(userId, updates);
        Utils.showToast('User updated', 'success');
        loadAdminContent('users');
    }
};

// Delete user
window.deleteUser = async function(userId) {
    if (confirm(`Delete user ${userId}? This action cannot be undone.`)) {
        await API.deleteUser(userId);
        Utils.showToast('User deleted', 'success');
        loadAdminContent('users');
    }
};

// Clear database (owner only)
window.confirmClearDatabase = async function() {
    if (confirm('⚠️ DANGER: This will delete ALL data from the database! This action cannot be undone.\n\nType "CONFIRM" to proceed.')) {
        const confirmText = prompt('Type "CONFIRM" to delete all data:');
        if (confirmText === 'CONFIRM') {
            try {
                await API.clearDatabase();
                Utils.showToast('Database cleared. Logging out...', 'warning');
                setTimeout(() => {
                    handleLogout();
                    window.location.reload();
                }, 2000);
            } catch (error) {
                Utils.showToast('Failed to clear database: ' + error.message, 'error');
            }
        }
    }
};

// Start session checker
function startSessionChecker() {
    setInterval(() => {
        if (currentUser && currentUser.expiryDate && new Date(currentUser.expiryDate) < new Date()) {
            Utils.showToast('Your account has expired. Please contact admin.', 'warning');
            handleLogout();
        }
    }, 60000); // Check every minute
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Start app
init();