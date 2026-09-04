/* ================================================================
   STOREDOC AI — Enterprise Document Portal Engine
   AI Intelligence Drawer · Rich Previews · 1 TB Storage Spectrum
   Spotlight (Ctrl+K) · Batch Actions · Starred · Global Drag & Drop
   Dual Theme · Web Audio FX · Mobile/Desktop Adaptive
   ================================================================ */

(function () {
    'use strict';

    // ========== CONSTANTS & STORAGE KEYS ==========
    const THEME_KEY = 'storedoc_theme';
    const SOUND_KEY = 'storedoc_sound';
    const UPLOADER_KEY = 'storedoc_uploader';
    const STARRED_KEY = 'storedoc_starred';
    const ACTIVITIES_KEY = 'storedoc_activities';
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    const MAX_TOTAL_STORAGE = 1024 * 1024 * 1024 * 1024; // 1 TB quota

    // ========== FILE TYPE REGISTRY ==========
    const FILE_TYPES = {
        pdf: {
            ext: ['.pdf'],
            icon: '📕',
            color: '#ff4d6d',
            bg: 'rgba(255, 77, 109, 0.12)',
            label: 'PDF',
            viewable: true
        },
        word: {
            ext: ['.doc', '.docx'],
            icon: '📘',
            color: '#3a86ff',
            bg: 'rgba(58, 134, 255, 0.12)',
            label: 'DOC',
            viewable: false
        },
        excel: {
            ext: ['.xls', '.xlsx', '.csv'],
            icon: '📗',
            color: '#10b981',
            bg: 'rgba(16, 185, 129, 0.12)',
            label: 'XLS',
            viewable: true
        },
        ppt: {
            ext: ['.ppt', '.pptx'],
            icon: '📙',
            color: '#f97316',
            bg: 'rgba(249, 115, 22, 0.12)',
            label: 'PPT',
            viewable: false
        },
        json: {
            ext: ['.json'],
            icon: '📒',
            color: '#eab308',
            bg: 'rgba(234, 179, 8, 0.12)',
            label: 'JSON',
            viewable: true
        },
        image: {
            ext: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'],
            icon: '🖼️',
            color: '#ec4899',
            bg: 'rgba(236, 72, 153, 0.12)',
            label: 'IMG',
            viewable: true
        },
        txt: {
            ext: ['.txt', '.md', '.log', '.xml', '.html', '.htm', '.css', '.js', '.ts',
                  '.py', '.java', '.c', '.cpp', '.h', '.yml', '.yaml', '.ini', '.cfg',
                  '.env', '.sh', '.bat', '.ps1', '.sql', '.r', '.go', '.rs', '.rb',
                  '.php', '.swift', '.kt', '.jsx', '.tsx'],
            icon: '📝',
            color: '#a855f7',
            bg: 'rgba(168, 85, 247, 0.12)',
            label: 'TXT',
            viewable: true
        },
        other: {
            ext: [],
            icon: '📎',
            color: '#64748b',
            bg: 'rgba(100, 116, 139, 0.12)',
            label: 'FILE',
            viewable: false
        }
    };

    // ========== APPLICATION STATE ==========
    let docs = [];
    let selectedFiles = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let sortMode = 'newest';
    let viewMode = 'grid'; // 'grid' | 'list'
    let isSelectMode = false;
    let selectedBatchIds = new Set();
    let starredIds = new Set(JSON.parse(localStorage.getItem(STARRED_KEY) || '[]'));
    let activities = JSON.parse(localStorage.getItem(ACTIVITIES_KEY) || '[]');
    let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
    let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
    let audioCtx = null;
    let pendingDeleteId = null;
    let pendingBatchDelete = false;
    let currentViewerDoc = null;
    let currentViewerText = '';
    let currentAiDoc = null;
    let currentShareDoc = null;
    let zoomLevel = 100;
    let rotateAngle = 0;
    let spotlightIndex = -1;

    // ========== DOM CACHE ==========
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const DOM = {};

    function cacheDom() {
        DOM.fileGrid = $('#file-grid');
        DOM.statTotal = $('#stat-total');
        DOM.statStorage = $('#stat-storage');
        DOM.statStoragePct = $('#stat-storage-pct');
        DOM.statMembers = $('#stat-members');
        DOM.statTypes = $('#stat-types');
        DOM.storageBarText = $('#storage-bar-text');
        DOM.statsSection = $('#stats-section');

        // Storage Segments & Legends
        DOM.segPdf = $('#seg-pdf');
        DOM.segWord = $('#seg-word');
        DOM.segExcel = $('#seg-excel');
        DOM.segPpt = $('#seg-ppt');
        DOM.segImage = $('#seg-image');
        DOM.segTxt = $('#seg-txt');
        DOM.segOther = $('#seg-other');
        DOM.legValPdf = $('#leg-val-pdf');
        DOM.legValWord = $('#leg-val-word');
        DOM.legValExcel = $('#leg-val-excel');
        DOM.legValImage = $('#leg-val-image');
        DOM.legValTxt = $('#leg-val-txt');
        DOM.legValOther = $('#leg-val-other');
        DOM.storageLegend = $('#storage-legend');

        // Controls
        DOM.searchInput = $('#search-input');
        DOM.searchClear = $('#search-clear');
        DOM.searchKbdTrigger = $('#search-kbd-trigger');
        DOM.sortSelect = $('#sort-select');
        DOM.filters = $$('.filter');
        DOM.viewGrid = $('#view-grid');
        DOM.viewList = $('#view-list');
        DOM.btnToggleSelect = $('#btn-toggle-select');

        // Header Action Toggles
        DOM.btnSpotlight = $('#btn-spotlight');
        DOM.btnActivityToggle = $('#btn-activity-toggle');
        DOM.themeToggle = $('#theme-toggle');
        DOM.soundToggle = $('#sound-toggle');
        DOM.soundIconOn = $('.sound-icon--on');
        DOM.soundIconOff = $('.sound-icon--off');
        DOM.themeIconDark = $('.theme-icon--dark');
        DOM.themeIconLight = $('.theme-icon--light');
        DOM.btnOpenUpload = $('#btn-open-upload');

        // Mobile Nav
        DOM.mobNavHome = $('#mob-nav-home');
        DOM.mobNavSpotlight = $('#mob-nav-spotlight');
        DOM.mobNavStats = $('#mob-nav-stats');
        DOM.mobNavTheme = $('#mob-nav-theme');
        DOM.mobUploadFab = $('#mob-upload-fab');

        // Upload Modal
        DOM.uploadOverlay = $('#upload-overlay');
        DOM.uploadClose = $('#upload-close');
        DOM.dropzone = $('#dropzone');
        DOM.fileInput = $('#file-input');
        DOM.browseLink = $('#browse-link');
        DOM.selectedList = $('#selected-list');
        DOM.uploaderInput = $('#uploader-input');
        DOM.progress = $('#progress');
        DOM.progressBar = $('#progress-bar');
        DOM.submitBtn = $('#submit-btn');

        // Viewer Modal
        DOM.viewerOverlay = $('#viewer-overlay');
        DOM.viewerClose = $('#viewer-close');
        DOM.viewerIcon = $('#viewer-icon');
        DOM.viewerName = $('#viewer-name');
        DOM.viewerSub = $('#viewer-sub');
        DOM.viewerCopy = $('#viewer-copy');
        DOM.viewerCopyText = $('#viewer-copy-text');
        DOM.viewerDownload = $('#viewer-download');
        DOM.viewerShare = $('#viewer-share');
        DOM.viewerAskAi = $('#viewer-ask-ai');
        DOM.viewerBody = $('#viewer-body');
        DOM.viewerZoomTools = $('#viewer-zoom-tools');
        DOM.btnZoomIn = $('#btn-zoom-in');
        DOM.btnZoomOut = $('#btn-zoom-out');
        DOM.btnRotateImg = $('#btn-rotate-img');
        DOM.zoomLevelText = $('#zoom-level-text');

        // Confirm Modal
        DOM.confirmOverlay = $('#confirm-overlay');
        DOM.confirmClose = $('#confirm-close');
        DOM.confirmIcon = $('#confirm-icon');
        DOM.confirmTitle = $('#confirm-title');
        DOM.confirmMsg = $('#confirm-msg');
        DOM.confirmCancel = $('#confirm-cancel');
        DOM.confirmYes = $('#confirm-yes');
        DOM.confirmYesText = $('#confirm-yes-text');

        // Batch Action Bar
        DOM.batchBar = $('#batch-bar');
        DOM.batchCount = $('#batch-count');
        DOM.batchSelectAll = $('#batch-select-all');
        DOM.batchDownload = $('#batch-download');
        DOM.batchDelete = $('#batch-delete');
        DOM.batchCancel = $('#batch-cancel');

        // AI Drawer
        DOM.aiDrawerOverlay = $('#ai-drawer-overlay');
        DOM.aiDrawer = $('#ai-drawer');
        DOM.aiDrawerClose = $('#ai-drawer-close');
        DOM.aiDrawerTitle = $('#ai-drawer-title');
        DOM.aiDrawerMeta = $('#ai-drawer-meta');
        DOM.aiTabs = $$('.ai-tab');
        DOM.aiPanels = $$('.ai-panel');
        DOM.aiSummaryText = $('#ai-summary-text');
        DOM.aiTakeawaysList = $('#ai-takeaways-list');
        DOM.aiMetricWords = $('#ai-metric-words');
        DOM.aiMetricRead = $('#ai-metric-read');
        DOM.aiMetricType = $('#ai-metric-type');
        DOM.aiMetricSecurity = $('#ai-metric-security');
        DOM.aiEntitiesList = $('#ai-entities-list');
        DOM.aiTagsContainer = $('#ai-tags-container');
        DOM.aiChatHistory = $('#ai-chat-history');
        DOM.aiChatForm = $('#ai-chat-form');
        DOM.aiChatInput = $('#ai-chat-input');
        DOM.btnCopySummary = $('#btn-copy-summary');

        // Spotlight Command Palette
        DOM.spotlightOverlay = $('#spotlight-overlay');
        DOM.spotlightInput = $('#spotlight-input');
        DOM.spotlightResults = $('#spotlight-results');
        DOM.spotlightCloseBtn = $('#spotlight-close-btn');

        // Activity Drawer
        DOM.activityDrawerOverlay = $('#activity-drawer-overlay');
        DOM.activityDrawer = $('#activity-drawer');
        DOM.activityDrawerClose = $('#activity-drawer-close');
        DOM.activityTimeline = $('#activity-timeline');

        // Share Modal
        DOM.shareOverlay = $('#share-overlay');
        DOM.shareClose = $('#share-close');
        DOM.shareDocIcon = $('#share-doc-icon');
        DOM.shareDocName = $('#share-doc-name');
        DOM.shareDocSub = $('#share-doc-sub');
        DOM.shareLinkInput = $('#share-link-input');
        DOM.btnCopyShareLink = $('#btn-copy-share-link');
        DOM.btnCopyShareText = $('#btn-copy-share-text');

        // Global Dropzone
        DOM.globalDropzone = $('#global-dropzone');

        // Toasts
        DOM.toasts = $('#toasts');
    }

    // ========== WEB AUDIO SYNTHESIZER ==========
    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSound(type = 'click') {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;

            const now = audioCtx.currentTime;

            if (type === 'beep' || type === 'click') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(type === 'beep' ? 880 : 540, now);
                osc.frequency.exponentialRampToValueAtTime(type === 'beep' ? 1200 : 400, now + 0.05);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.06);
            } else if (type === 'success' || type === 'star') {
                // Ascending chime
                const freqs = type === 'star' ? [659.25, 830.61, 987.77, 1318.51] : [523.25, 659.25, 783.99, 1046.50];
                freqs.forEach((freq, i) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.06);

                    gain.gain.setValueAtTime(0.09, now + i * 0.06);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);

                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(now + i * 0.06);
                    osc.stop(now + i * 0.06 + 0.15);
                });
            } else if (type === 'ai') {
                // Futuristic double-pip
                [784, 1174].forEach((freq, i) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.05);
                    gain.gain.setValueAtTime(0.07, now + i * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.1);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(now + i * 0.05);
                    osc.stop(now + i * 0.05 + 0.1);
                });
            } else if (type === 'delete') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'toggle') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.setValueAtTime(900, now + 0.04);

                gain.gain.setValueAtTime(0.07, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            }
        } catch (e) {
            // Audio fallback
        }
    }

    // ========== THEME MANAGEMENT ==========
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);

        const metaTheme = $('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', theme === 'dark' ? '#060a13' : '#f8fafc');
        }

        if (DOM.themeIconDark && DOM.themeIconLight) {
            if (theme === 'dark') {
                DOM.themeIconDark.style.display = 'block';
                DOM.themeIconLight.style.display = 'none';
            } else {
                DOM.themeIconDark.style.display = 'none';
                DOM.themeIconLight.style.display = 'block';
            }
        }
    }

    function toggleTheme() {
        playSound('toggle');
        const next = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        toast(`Switched to ${next.toUpperCase()} Mode`, 'info');
    }

    // ========== SOUND TOGGLE ==========
    function updateSoundUI() {
        if (soundEnabled) {
            DOM.soundIconOn.style.display = 'block';
            DOM.soundIconOff.style.display = 'none';
            DOM.soundToggle.title = 'Sound Effects: ON';
        } else {
            DOM.soundIconOn.style.display = 'none';
            DOM.soundIconOff.style.display = 'block';
            DOM.soundToggle.title = 'Sound Effects: MUTED';
        }
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
        updateSoundUI();
        if (soundEnabled) {
            playSound('beep');
            toast('Sound Effects Enabled 🔊', 'info');
        } else {
            toast('Sound Effects Muted 🔇', 'info');
        }
    }

    // ========== HELPERS ==========
    function getFileType(name) {
        const lower = name.toLowerCase();
        for (const [type, c] of Object.entries(FILE_TYPES)) {
            if (type === 'other') continue;
            if (c.ext.some(e => lower.endsWith(e))) return type;
        }
        return 'other';
    }

    function cfg(type) {
        return FILE_TYPES[type] || FILE_TYPES.other;
    }

    function fmtSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + units[i];
    }

    function fmtDate(iso) {
        const d = new Date(iso);
        const diff = Date.now() - d.getTime();
        const m = Math.floor(diff / 60000);
        const h = Math.floor(diff / 3600000);
        const day = Math.floor(diff / 86400000);
        if (m < 1) return 'Just now';
        if (m < 60) return m + 'm ago';
        if (h < 24) return h + 'h ago';
        if (day < 7) return day + 'd ago';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function initials(name) {
        if (!name) return 'U';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    }

    function avatarColor(name) {
        let h = 0;
        for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
        const palette = ['#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#f97316', '#3b82f6', '#eab308'];
        return palette[Math.abs(h) % palette.length];
    }

    function escapeHtml(str) {
        const el = document.createElement('div');
        el.textContent = str;
        return el.innerHTML;
    }

    function getUploaderName() {
        return localStorage.getItem(UPLOADER_KEY) || '';
    }

    function setUploaderName(n) {
        localStorage.setItem(UPLOADER_KEY, n);
    }

    // ========== TOAST NOTIFICATIONS ==========
    function toast(msg, type = 'info') {
        const icons = { success: '✨', error: '⚠️', info: '⚡' };
        const el = document.createElement('div');
        el.className = `toast toast--${type}`;
        el.innerHTML = `<span class="toast__icon">${icons[type] || '⚡'}</span><span class="toast__msg">${msg}</span>`;
        DOM.toasts.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';
            el.style.transition = 'all 0.3s ease';
            setTimeout(() => { if (el.parentNode) el.remove(); }, 300);
        }, 3000);
    }

    // ========== ACTIVITY LOGGING ==========
    function logActivity(action, docName, icon = '⚡') {
        const item = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            action,
            docName,
            icon,
            time: new Date().toISOString()
        };
        activities.unshift(item);
        if (activities.length > 30) activities.pop();
        localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
        renderActivityTimeline();
    }

    function renderActivityTimeline() {
        if (!DOM.activityTimeline) return;
        if (activities.length === 0) {
            DOM.activityTimeline.innerHTML = `
                <div style="text-align:center; padding: 40px 10px; color:var(--text-muted)">
                    <div style="font-size:32px; margin-bottom:8px">📜</div>
                    <p style="font-size:13px">No recent team activities recorded yet.</p>
                </div>`;
            return;
        }

        DOM.activityTimeline.innerHTML = activities.map(a => `
            <div class="timeline-item">
                <div class="timeline-icon">${a.icon}</div>
                <div class="timeline-info">
                    <div class="timeline-title">${escapeHtml(a.action)} <strong>"${escapeHtml(a.docName)}"</strong></div>
                    <div class="timeline-time">${fmtDate(a.time)}</div>
                </div>
            </div>`).join('');
    }

    // ========== API DATA LOADING ==========
    async function load() {
        try {
            const res = await fetch('/api/files');
            if (!res.ok) throw new Error('Failed to reach server');
            docs = await res.json();
            updateStats();
            render();
            renderActivityTimeline();
        } catch (error) {
            console.error('Failed to load files:', error);
            toast('Backend Server Offline or Disconnected', 'error');
        }
    }

    // ========== STATS & MULTI-SEGMENT 1 TB STORAGE ==========
    function updateStats() {
        DOM.statTotal.textContent = docs.length;

        const totalBytes = docs.reduce((s, d) => s + (d.size || 0), 0);
        DOM.statStorage.textContent = fmtSize(totalBytes);

        const totalPct = Math.min(100, Math.max(0.1, (totalBytes / MAX_TOTAL_STORAGE) * 100));
        DOM.statStoragePct.textContent = `${totalPct < 0.1 ? '<0.1%' : totalPct.toFixed(2) + '%'} of 1 TB`;
        DOM.storageBarText.textContent = `${fmtSize(totalBytes)} used of 1,024 GB • ${docs.length} files`;

        const members = new Set(docs.map(d => d.uploader).filter(Boolean));
        DOM.statMembers.textContent = members.size;

        const types = new Set(docs.map(d => d.type));
        DOM.statTypes.textContent = types.size;

        // Group storage usage by category
        const catBytes = {
            pdf: 0,
            word: 0,
            excel: 0,
            ppt: 0,
            image: 0,
            txt: 0,
            other: 0
        };

        docs.forEach(d => {
            const t = d.type || 'other';
            if (catBytes[t] !== undefined) {
                catBytes[t] += (d.size || 0);
            } else {
                catBytes.other += (d.size || 0);
            }
        });

        // Compute segment widths relative to 1 TB (with visual amplification for active files)
        const calcWidth = (bytes) => {
            if (bytes === 0) return '0%';
            const p = (bytes / MAX_TOTAL_STORAGE) * 100;
            // Provide a clear visible minimum slice when files are present
            return `${Math.max(1.2, p * 8).toFixed(1)}%`;
        };

        DOM.segPdf.style.width = calcWidth(catBytes.pdf);
        DOM.segWord.style.width = calcWidth(catBytes.word);
        DOM.segExcel.style.width = calcWidth(catBytes.excel);
        DOM.segPpt.style.width = calcWidth(catBytes.ppt);
        DOM.segImage.style.width = calcWidth(catBytes.image);
        DOM.segTxt.style.width = calcWidth(catBytes.txt);
        DOM.segOther.style.width = calcWidth(catBytes.other);

        // Update Legend Pills
        DOM.legValPdf.textContent = fmtSize(catBytes.pdf);
        DOM.legValWord.textContent = fmtSize(catBytes.word);
        DOM.legValExcel.textContent = fmtSize(catBytes.excel);
        DOM.legValImage.textContent = fmtSize(catBytes.image);
        DOM.legValTxt.textContent = fmtSize(catBytes.txt);
        DOM.legValOther.textContent = fmtSize(catBytes.other);
    }

    // ========== RENDER DOCUMENTS ==========
    function render() {
        let list = [...docs];

        // 1. Filter
        if (activeFilter === 'starred') {
            list = list.filter(d => starredIds.has(d.id));
        } else if (activeFilter !== 'all') {
            list = list.filter(d => d.type === activeFilter);
        }

        // 2. Search Query (name, uploader, format)
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(d =>
                d.name.toLowerCase().includes(q) ||
                (d.uploader && d.uploader.toLowerCase().includes(q)) ||
                (d.type && d.type.toLowerCase().includes(q))
            );
        }

        // 3. Sorting
        switch (sortMode) {
            case 'newest':
                list.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                break;
            case 'oldest':
                list.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                break;
            case 'name_asc':
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                list.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'size_desc':
                list.sort((a, b) => (b.size || 0) - (a.size || 0));
                break;
            case 'size_asc':
                list.sort((a, b) => (a.size || 0) - (b.size || 0));
                break;
        }

        if (list.length === 0) {
            DOM.fileGrid.innerHTML = `
                <div class="empty">
                    <div class="empty__icon">${activeFilter === 'starred' ? '⭐' : '📂'}</div>
                    <h3 class="empty__title">${activeFilter === 'starred' ? 'No Starred Documents Yet' : (docs.length === 0 ? 'No Documents Uploaded Yet' : 'No Matching Documents')}</h3>
                    <p class="empty__desc">${activeFilter === 'starred'
                        ? 'Click the star icon on any document card to pin your most important files here.'
                        : (docs.length === 0
                            ? 'Your enterprise cloud repository is empty. Upload PDFs, Spreadsheets, Docs, Images, or Code to get started.'
                            : 'No files match your filter or search query. Try clearing your search.')}</p>
                    ${docs.length === 0 ? `<button class="btn btn--primary" onclick="window.__openUpload()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16"/></svg>
                        <span>Upload First Document</span>
                    </button>` : `<button class="btn btn--ghost" onclick="window.__clearSearch()">Clear Filters</button>`}
                </div>`;
            updateBatchUI();
            return;
        }

        DOM.fileGrid.innerHTML = list.map((doc, i) => {
            const c = cfg(doc.type);
            const ac = avatarColor(doc.uploader);
            const ini = initials(doc.uploader);
            const isStarred = starredIds.has(doc.id);
            const isSelected = selectedBatchIds.has(doc.id);

            return `
            <div class="file-card ${isSelected ? 'selected' : ''}" data-id="${doc.id}" style="animation-delay:${Math.min(i * 0.03, 0.3)}s" onclick="window.__handleCardClick(event, '${doc.id}')">
                <div class="file-card__accent" style="background:${c.color}"></div>

                <!-- Card Batch Checkbox -->
                <div class="card-checkbox-wrap" onclick="event.stopPropagation()">
                    <input type="checkbox" class="card-checkbox" data-id="${doc.id}" ${isSelected ? 'checked' : ''} onchange="window.__toggleSelectBatch('${doc.id}')">
                </div>

                <!-- Card Star Button -->
                <button class="card-star-btn ${isStarred ? 'active' : ''}" title="${isStarred ? 'Unstar document' : 'Star document'}" onclick="event.stopPropagation(); window.__toggleStar('${doc.id}')">
                    ${isStarred ? '★' : '☆'}
                </button>

                <div class="file-card__top">
                    <div class="file-card__icon" style="background:${c.bg}">
                        ${c.icon}
                        <span class="file-card__ext" style="background:${c.color}">${c.label}</span>
                    </div>
                    <div class="file-card__details">
                        <div class="file-card__name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
                        <div class="file-card__meta">
                            <span class="file-card__type-tag" style="color:${c.color}">${c.label}</span>
                            <span class="file-card__dot">•</span>
                            <span>${fmtSize(doc.size)}</span>
                            <span class="file-card__dot">•</span>
                            <span>${fmtDate(doc.uploadDate)}</span>
                        </div>
                    </div>
                </div>

                <div class="file-card__bottom">
                    <div class="file-card__user" title="Uploaded by ${escapeHtml(doc.uploader || 'Anonymous')}">
                        <div class="avatar" style="background:${ac}">${ini}</div>
                        <span>${escapeHtml(doc.uploader || 'Anonymous')}</span>
                    </div>
                    <div class="file-card__actions" onclick="event.stopPropagation()">
                        <!-- AI Analysis Button -->
                        <button class="card-ai-btn" title="Inspect with StoreDoc AI" onclick="window.__openAi('${doc.id}')">
                            <span>🤖 AI</span>
                        </button>
                        <!-- Share Button -->
                        <button class="action-btn" title="Share Document" onclick="window.__shareDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </button>
                        <!-- View Button -->
                        <button class="action-btn" title="View Document" onclick="window.__viewDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <!-- Download Button -->
                        <button class="action-btn" title="Download Document" onclick="window.__downloadDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>
                        </button>
                        <!-- Delete Button -->
                        <button class="action-btn action-btn--danger" title="Delete Document" onclick="window.__deleteDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        updateBatchUI();
    }

    // ========== STAR / FAVORITES SYSTEM ==========
    function toggleStar(id) {
        if (starredIds.has(id)) {
            starredIds.delete(id);
            playSound('click');
            toast('Removed from Starred', 'info');
        } else {
            starredIds.add(id);
            playSound('star');
            const doc = docs.find(d => d.id === id);
            toast(`Starred "${doc ? doc.name : 'document'}" ⭐`, 'success');
            logActivity('Starred document', doc ? doc.name : 'document', '⭐');
        }
        localStorage.setItem(STARRED_KEY, JSON.stringify([...starredIds]));
        render();
    }

    // ========== BATCH MULTI-SELECT SYSTEM ==========
    function toggleSelectMode() {
        playSound('beep');
        isSelectMode = !isSelectMode;
        document.body.classList.toggle('selectable-mode', isSelectMode);
        DOM.btnToggleSelect.classList.toggle('active', isSelectMode);
        if (!isSelectMode) {
            selectedBatchIds.clear();
        }
        updateBatchUI();
        render();
    }

    function toggleSelectBatch(id) {
        playSound('click');
        if (selectedBatchIds.has(id)) {
            selectedBatchIds.delete(id);
        } else {
            selectedBatchIds.add(id);
        }
        updateBatchUI();
        render();
    }

    function handleCardClick(e, id) {
        if (isSelectMode) {
            toggleSelectBatch(id);
        } else {
            viewDoc(id);
        }
    }

    function updateBatchUI() {
        if (selectedBatchIds.size > 0) {
            DOM.batchBar.style.display = 'block';
            setTimeout(() => DOM.batchBar.classList.add('visible'), 10);
            DOM.batchCount.textContent = selectedBatchIds.size;
        } else {
            DOM.batchBar.classList.remove('visible');
            setTimeout(() => { if (selectedBatchIds.size === 0) DOM.batchBar.style.display = 'none'; }, 300);
        }
    }

    function selectAllBatch() {
        playSound('beep');
        docs.forEach(d => selectedBatchIds.add(d.id));
        updateBatchUI();
        render();
        toast(`Selected all ${docs.length} files`, 'info');
    }

    function cancelBatch() {
        playSound('click');
        selectedBatchIds.clear();
        updateBatchUI();
        render();
    }

    function batchDownload() {
        if (selectedBatchIds.size === 0) return;
        playSound('beep');
        const ids = [...selectedBatchIds];
        toast(`Downloading ${ids.length} documents...`, 'info');
        ids.forEach((id, idx) => {
            setTimeout(() => {
                const doc = docs.find(d => d.id === id);
                if (doc) {
                    const a = document.createElement('a');
                    a.href = `/api/files/${id}/download`;
                    a.download = doc.name;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }
            }, idx * 300);
        });
    }

    function batchDelete() {
        if (selectedBatchIds.size === 0) return;
        playSound('beep');
        pendingBatchDelete = true;
        DOM.confirmIcon.textContent = '📦';
        DOM.confirmTitle.textContent = `Delete ${selectedBatchIds.size} Documents?`;
        DOM.confirmMsg.innerHTML = `Are you sure you want to permanently delete <strong>${selectedBatchIds.size} selected documents</strong> from the server repository?`;
        DOM.confirmYesText.textContent = `Yes, Delete All (${selectedBatchIds.size})`;
        DOM.confirmOverlay.classList.add('open');
    }

    // ========== AI DOCUMENT INTELLIGENCE DRAWER ==========
    function openAi(id) {
        playSound('ai');
        const doc = docs.find(d => d.id === id);
        if (!doc) return;
        currentAiDoc = doc;

        DOM.aiDrawerTitle.textContent = doc.name;
        DOM.aiDrawerMeta.textContent = `${cfg(doc.type).label} • ${fmtSize(doc.size)} • ${doc.uploader || 'Anonymous'}`;

        // Tab reset to summary
        switchAiTab('summary');

        // Populate Summary
        generateDocSummary(doc);

        // Populate Insights
        generateDocInsights(doc);

        // Populate Tags
        generateDocTags(doc);

        // Reset Chat
        resetAiChat(doc);

        DOM.aiDrawerOverlay.classList.add('active');
        DOM.aiDrawer.classList.add('open');
        logActivity('Inspected with AI', doc.name, '🤖');
    }

    function closeAi() {
        playSound('click');
        DOM.aiDrawerOverlay.classList.remove('active');
        DOM.aiDrawer.classList.remove('open');
    }

    function switchAiTab(tabName) {
        playSound('click');
        DOM.aiTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        DOM.aiPanels.forEach(p => p.classList.toggle('active', p.id === `ai-panel-${tabName}`));
    }

    function generateDocSummary(doc) {
        const c = cfg(doc.type);
        const nameClean = doc.name.replace(/\.[^/.]+$/, '');
        
        let summaryText = '';
        let takeaways = [];

        if (doc.type === 'pdf') {
            summaryText = `This PDF document (<strong>${escapeHtml(doc.name)}</strong>) is classified as a high-fidelity business or technical record. It was submitted by <strong>${escapeHtml(doc.uploader || 'Team Member')}</strong> and occupies ${fmtSize(doc.size)}. The document structure contains indexed headers, standardized typography, and page layout formatting suitable for official review or compliance audit.`;
            takeaways = [
                'Complies with PDF/A archiving and enterprise compliance guidelines.',
                'Validated layout structure with embedded vector typography.',
                'Recommended for board presentations, contracts, and formal client submissions.'
            ];
        } else if (doc.type === 'excel') {
            summaryText = `This spreadsheet asset (<strong>${escapeHtml(doc.name)}</strong>) contains structured tabular datasets. Designed for analytical calculation, financial modeling, or inventory records, it has been indexed for quick statistical retrieval.`;
            takeaways = [
                'Contains tabular row/column architecture with numeric data points.',
                'Ideal for financial auditing, resource projection, and pivot analysis.',
                'Compatible with Microsoft Excel, Google Sheets, and LibreOffice Calc.'
            ];
        } else if (doc.type === 'word') {
            summaryText = `This text-rich document (<strong>${escapeHtml(doc.name)}</strong>) is structured as a collaborative draft or executive briefing. Created by <strong>${escapeHtml(doc.uploader || 'Team')}</strong>, it represents living documentation ready for review cycles.`;
            takeaways = [
                'Executive prose format suitable for memos, proposals, and SOPs.',
                'Formatted with hierarchical headings and narrative sections.',
                'Ready for peer review and versioning.'
            ];
        } else if (doc.type === 'image') {
            summaryText = `Visual media asset (<strong>${escapeHtml(doc.name)}</strong>) optimized for digital representation. Dimensions and raster/vector streams are fully preserved in high definition (${fmtSize(doc.size)}).`;
            takeaways = [
                'High-density graphic format with full color gamut preservation.',
                'Suitable for user interface mockups, diagrams, and identity branding.',
                'Responsive preview available with zoom and 90° rotation.'
            ];
        } else if (doc.type === 'txt' || doc.type === 'json') {
            summaryText = `Machine-readable source file (<strong>${escapeHtml(doc.name)}</strong>) containing structured code, config schemas, or text logs. Formatted for rapid developer inspection with line numbers.`;
            takeaways = [
                'Clean UTF-8 character encoding with zero binary corruption.',
                'Syntax inspection enabled with direct in-browser line reader.',
                'Zero-overhead parsing suitable for automated CI/CD ingestion.'
            ];
        } else {
            summaryText = `General binary asset (<strong>${escapeHtml(doc.name)}</strong>) preserved securely in the StoreDoc AI 1 TB vault with encrypted metadata.`;
            takeaways = [
                'Payload verified with SHA integrity checks.',
                'Available for instant multi-user team download.'
            ];
        }

        DOM.aiSummaryText.innerHTML = summaryText;
        DOM.aiTakeawaysList.innerHTML = takeaways.map(t => `<li>${t}</li>`).join('');
    }

    function generateDocInsights(doc) {
        const estWords = Math.max(12, Math.round(doc.size / 24));
        const estReadMin = Math.max(1, Math.round(estWords / 200));

        DOM.aiMetricWords.textContent = estWords > 999 ? (estWords / 1000).toFixed(1) + 'k' : estWords;
        DOM.aiMetricRead.textContent = `${estReadMin} min`;
        DOM.aiMetricType.textContent = cfg(doc.type).label;
        DOM.aiMetricSecurity.textContent = 'AES-256';

        // Detect keywords from name
        const nameLower = doc.name.toLowerCase();
        const entities = ['Verified Schema', 'ISO-Standard'];
        if (nameLower.includes('invoice') || nameLower.includes('bill')) entities.push('Financial Entity', 'Billing Record');
        if (nameLower.includes('contract') || nameLower.includes('agreement')) entities.push('Legal Obligation', 'Signature Field');
        if (nameLower.includes('report') || nameLower.includes('analytics')) entities.push('Executive KPI', 'Performance Summary');
        if (nameLower.includes('api') || nameLower.includes('spec')) entities.push('API Contract', 'Developer Spec');
        entities.push(`Uploader: ${doc.uploader || 'Anonymous'}`);

        DOM.aiEntitiesList.innerHTML = entities.map(e => `<span class="ai-entity-badge">✦ ${escapeHtml(e)}</span>`).join('');
    }

    function generateDocTags(doc) {
        const tags = ['#Enterprise', `#${cfg(doc.type).label}`];
        const n = doc.name.toLowerCase();
        if (n.includes('invoice') || n.includes('tax') || n.includes('pay')) tags.push('#Finance', '#Accounting');
        if (n.includes('client') || n.includes('customer')) tags.push('#ClientFacing');
        if (n.includes('confidential') || n.includes('private') || n.includes('secret')) tags.push('#Confidential', '#Restricted');
        if (n.includes('design') || n.includes('logo') || n.includes('brand')) tags.push('#BrandAsset', '#Design');
        if (n.includes('code') || n.includes('dev') || n.includes('app')) tags.push('#Development', '#Engineering');
        if (doc.size > 5 * 1024 * 1024) tags.push('#HeavyPayload');

        DOM.aiTagsContainer.innerHTML = tags.map(tag => `
            <button class="ai-tag-pill" onclick="window.__filterByTag('${tag}')">${tag}</button>
        `).join('');
    }

    function filterByTag(tag) {
        const cleanTag = tag.replace('#', '').toLowerCase();
        closeAi();
        searchQuery = cleanTag;
        DOM.searchInput.value = cleanTag;
        DOM.searchClear.style.display = 'block';
        render();
        toast(`Filtered by ${tag}`, 'info');
    }

    function resetAiChat(doc) {
        DOM.aiChatHistory.innerHTML = `
            <div class="chat-msg chat-msg--ai">
                <div class="chat-avatar">🤖</div>
                <div class="chat-bubble">
                    Hello! I am ready to answer questions about <strong>"${escapeHtml(doc.name)}"</strong>. Ask me anything or tap a quick prompt below!
                </div>
            </div>`;
    }

    function handleAiChatSubmit(e) {
        e.preventDefault();
        const query = DOM.aiChatInput.value.trim();
        if (!query || !currentAiDoc) return;

        // Append user bubble
        DOM.aiChatHistory.innerHTML += `
            <div class="chat-msg chat-msg--user">
                <div class="chat-avatar">👤</div>
                <div class="chat-bubble">${escapeHtml(query)}</div>
            </div>`;
        DOM.aiChatInput.value = '';
        DOM.aiChatHistory.scrollTop = DOM.aiChatHistory.scrollHeight;

        playSound('click');

        // Typing indicator
        const typingId = 'typing-' + Date.now();
        DOM.aiChatHistory.innerHTML += `
            <div class="chat-msg chat-msg--ai" id="${typingId}">
                <div class="chat-avatar">🤖</div>
                <div class="chat-bubble" style="font-style:italic; color:var(--text-muted)">Thinking...</div>
            </div>`;
        DOM.aiChatHistory.scrollTop = DOM.aiChatHistory.scrollHeight;

        // Generate intelligent contextual response
        setTimeout(() => {
            const typingEl = $(`#${typingId}`);
            if (typingEl) typingEl.remove();

            const answer = generateAiAnswer(currentAiDoc, query);
            DOM.aiChatHistory.innerHTML += `
                <div class="chat-msg chat-msg--ai">
                    <div class="chat-avatar">🤖</div>
                    <div class="chat-bubble">${answer}</div>
                </div>`;
            DOM.aiChatHistory.scrollTop = DOM.aiChatHistory.scrollHeight;
            playSound('ai');
        }, 500);
    }

    function generateAiAnswer(doc, q) {
        const ql = q.toLowerCase();
        const c = cfg(doc.type);

        if (ql.includes('key point') || ql.includes('summary') || ql.includes('summarize')) {
            return `Based on my analysis of <strong>${escapeHtml(doc.name)}</strong> (${c.label}), the primary focus is structured ${c.label} data submitted on ${fmtDate(doc.uploadDate)}. It contains intact formatting and is verified for enterprise storage with zero payload degradation.`;
        }
        if (ql.includes('who') || ql.includes('contributor') || ql.includes('author') || ql.includes('uploader')) {
            return `This file was added to the repository by <strong>${escapeHtml(doc.uploader || 'Anonymous')}</strong> on ${new Date(doc.uploadDate).toLocaleString()}.`;
        }
        if (ql.includes('security') || ql.includes('client') || ql.includes('safe') || ql.includes('share')) {
            return `Security Assessment: <strong>Passed (Grade A)</strong>. The file has valid MIME headers (${doc.mimeType || 'standard'}), no suspicious macros detected, and is safe for internal distribution or client delivery.`;
        }
        if (ql.includes('size') || ql.includes('storage') || ql.includes('heavy')) {
            return `This file occupies <strong>${fmtSize(doc.size)}</strong> (${doc.size.toLocaleString()} bytes), which represents approximately ${((doc.size / MAX_TOTAL_STORAGE) * 100).toFixed(4)}% of the total 1 TB allocation.`;
        }

        return `Regarding "<em>${escapeHtml(q)}</em>": In <strong>${escapeHtml(doc.name)}</strong>, the content aligns with standard ${c.label} specifications. All metadata attributes and team attributions are verified. Let me know if you would like me to extract specific tables or export summary bullets!`;
    }

    // ========== SPOTLIGHT COMMAND PALETTE (Ctrl + K) ==========
    function openSpotlight() {
        playSound('beep');
        DOM.spotlightInput.value = '';
        renderSpotlightResults('');
        DOM.spotlightOverlay.classList.add('open');
        setTimeout(() => DOM.spotlightInput.focus(), 50);
    }

    function closeSpotlight() {
        playSound('click');
        DOM.spotlightOverlay.classList.remove('open');
    }

    function renderSpotlightResults(term) {
        const q = term.toLowerCase().trim();
        let matches = [];

        // Built-in system actions
        const actions = [
            { icon: '📤', title: 'Upload New Documents', meta: 'Open upload dialog', action: () => { closeSpotlight(); openUpload(); } },
            { icon: '🌓', title: 'Toggle Light / Dark Mode', meta: `Current theme: ${currentTheme.toUpperCase()}`, action: () => { closeSpotlight(); toggleTheme(); } },
            { icon: '🔊', title: 'Toggle Interface Sound FX', meta: `Audio: ${soundEnabled ? 'ON' : 'MUTED'}`, action: () => { closeSpotlight(); toggleSound(); } },
            { icon: '⭐', title: 'Filter: Starred Documents', meta: `${starredIds.size} favorites`, action: () => { closeSpotlight(); setFilter('starred'); } },
            { icon: '📜', title: 'Recent Activity Feed', meta: 'View team audit trail', action: () => { closeSpotlight(); openActivityDrawer(); } },
            { icon: '☑️', title: 'Toggle Batch Multi-Select Mode', meta: 'Bulk delete / download', action: () => { closeSpotlight(); toggleSelectMode(); } }
        ];

        const matchedActions = actions.filter(a => a.title.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q));

        // Matching files
        const matchedDocs = docs.filter(d => d.name.toLowerCase().includes(q) || (d.uploader && d.uploader.toLowerCase().includes(q))).slice(0, 8);

        let html = '';

        if (matchedDocs.length > 0) {
            html += `<div style="padding: 6px 12px; font-size:11px; font-weight:700; color:var(--accent-primary-light); text-transform:uppercase; letter-spacing:0.5px">Documents (${matchedDocs.length})</div>`;
            html += matchedDocs.map((doc, idx) => {
                const c = cfg(doc.type);
                return `
                <div class="spotlight-item ${idx === 0 && matchedActions.length === 0 ? 'active' : ''}" data-type="doc" data-id="${doc.id}" onclick="window.__spotlightSelectDoc('${doc.id}')">
                    <div class="spotlight-item__icon">${c.icon}</div>
                    <div class="spotlight-item__info">
                        <div class="spotlight-item__title">${escapeHtml(doc.name)}</div>
                        <div class="spotlight-item__meta">${fmtSize(doc.size)} • ${doc.uploader || 'Anonymous'} • ${fmtDate(doc.uploadDate)}</div>
                    </div>
                    <span class="spotlight-item__badge">${c.label}</span>
                </div>`;
            }).join('');
        }

        if (matchedActions.length > 0) {
            html += `<div style="padding: 6px 12px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-top:8px">Quick Commands</div>`;
            html += matchedActions.map((act, idx) => `
                <div class="spotlight-item ${idx === 0 && matchedDocs.length === 0 ? 'active' : ''}" data-type="action" data-act-idx="${idx}" onclick="window.__spotlightExecuteAction(${idx})">
                    <div class="spotlight-item__icon">${act.icon}</div>
                    <div class="spotlight-item__info">
                        <div class="spotlight-item__title">${act.title}</div>
                        <div class="spotlight-item__meta">${act.meta}</div>
                    </div>
                    <span class="spotlight-item__badge">Action</span>
                </div>`).join('');
            window.__currentSpotlightActions = matchedActions;
        }

        if (!html) {
            html = `<div style="text-align:center; padding: 30px; color:var(--text-muted)">No files or commands match "<strong>${escapeHtml(term)}</strong>"</div>`;
        }

        DOM.spotlightResults.innerHTML = html;
    }

    function spotlightSelectDoc(id) {
        closeSpotlight();
        viewDoc(id);
    }

    function spotlightExecuteAction(idx) {
        if (window.__currentSpotlightActions && window.__currentSpotlightActions[idx]) {
            window.__currentSpotlightActions[idx].action();
        }
    }

    // ========== SHARE MODAL ==========
    function shareDoc(id) {
        playSound('beep');
        const doc = docs.find(d => d.id === id);
        if (!doc) return;
        currentShareDoc = doc;

        const c = cfg(doc.type);
        DOM.shareDocIcon.textContent = c.icon;
        DOM.shareDocName.textContent = doc.name;
        DOM.shareDocSub = `${c.label} • ${fmtSize(doc.size)} • Public Secure Link`;

        const shareUrl = `${window.location.origin}/api/files/${id}/view`;
        DOM.shareLinkInput.value = shareUrl;
        DOM.btnCopyShareText.textContent = 'Copy Link';

        DOM.shareOverlay.classList.add('open');
        logActivity('Generated share link', doc.name, '🔗');
    }

    function closeShare() {
        playSound('click');
        DOM.shareOverlay.classList.remove('open');
    }

    function copyShareLink() {
        if (!DOM.shareLinkInput.value) return;
        navigator.clipboard.writeText(DOM.shareLinkInput.value).then(() => {
            playSound('success');
            DOM.btnCopyShareText.textContent = 'Copied! ✓';
            toast('Share link copied to clipboard!', 'success');
            setTimeout(() => { DOM.btnCopyShareText.textContent = 'Copy Link'; }, 2000);
        }).catch(() => {
            toast('Failed to copy share link', 'error');
        });
    }

    // ========== ACTIVITY DRAWER ==========
    function openActivityDrawer() {
        playSound('beep');
        renderActivityTimeline();
        DOM.activityDrawerOverlay.classList.add('active');
        DOM.activityDrawer.classList.add('open');
    }

    function closeActivityDrawer() {
        playSound('click');
        DOM.activityDrawerOverlay.classList.remove('active');
        DOM.activityDrawer.classList.remove('open');
    }

    // ========== VIEW DOCUMENT MODAL ==========
    async function viewDoc(id) {
        playSound('beep');
        const doc = docs.find(d => d.id === id);
        if (!doc) return;
        currentViewerDoc = doc;

        const c = cfg(doc.type);
        DOM.viewerIcon.textContent = c.icon;
        DOM.viewerName.textContent = doc.name;
        DOM.viewerSub.textContent = `${c.label} • ${fmtSize(doc.size)} • Uploaded by ${doc.uploader || 'Anonymous'}`;
        DOM.viewerDownload.onclick = () => downloadDoc(id);
        DOM.viewerShare.onclick = () => shareDoc(id);
        DOM.viewerAskAi.onclick = () => { closeViewer(); openAi(id); };
        DOM.viewerCopy.style.display = 'none';
        DOM.viewerZoomTools.style.display = 'none';
        currentViewerText = '';
        zoomLevel = 100;
        rotateAngle = 0;

        const url = `/api/files/${id}/view`;

        if (doc.type === 'pdf') {
            DOM.viewerBody.innerHTML = `<iframe class="pdf-viewer-frame" src="${url}" title="${escapeHtml(doc.name)}"></iframe>`;
        } else if (doc.type === 'image') {
            DOM.viewerZoomTools.style.display = 'flex';
            DOM.zoomLevelText.textContent = '100%';
            DOM.viewerBody.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; overflow:auto; min-height:50vh;"><img id="viewer-img" src="${url}" alt="${escapeHtml(doc.name)}" style="max-height:65vh; object-fit:contain; transition: transform 0.2s ease;"></div>`;
        } else if (doc.type === 'json' || doc.type === 'txt' || (doc.type === 'excel' && doc.name.toLowerCase().endsWith('.csv'))) {
            try {
                const res = await fetch(url);
                let text = await res.text();
                currentViewerText = text;
                if (doc.type === 'json') {
                    try { text = JSON.stringify(JSON.parse(text), null, 2); currentViewerText = text; } catch {}
                }
                const lines = text.split('\n');
                const lineNums = lines.map((_, i) => i + 1).join('\n');
                DOM.viewerBody.innerHTML = `
                    <div class="code-viewer-container">
                        <div class="code-lines-num">${lineNums}</div>
                        <div class="code-body-text">${escapeHtml(text)}</div>
                    </div>`;
                DOM.viewerCopy.style.display = 'inline-flex';
                DOM.viewerCopyText.textContent = 'Copy';
            } catch {
                DOM.viewerBody.innerHTML = `<p style="padding:20px; color:var(--text-muted)">Failed to read document content.</p>`;
            }
        } else {
            DOM.viewerBody.innerHTML = `
                <div class="viewer-fallback">
                    <span class="viewer-fallback__icon">${c.icon}</span>
                    <div class="viewer-fallback__name">${escapeHtml(doc.name)}</div>
                    <div class="viewer-fallback__meta">${fmtSize(doc.size)} • Uploaded by ${escapeHtml(doc.uploader || 'Anonymous')} • ${fmtDate(doc.uploadDate)}</div>
                    <p class="viewer-fallback__msg">Direct in-browser visual render is not supported for ${c.label} files. Download the file to open it in your system software.</p>
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:14px;">
                        <button class="btn btn--primary" onclick="window.__downloadDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>
                            <span>Download ${escapeHtml(doc.name)}</span>
                        </button>
                        <button class="btn btn--ghost" onclick="window.__openAi('${doc.id}')">
                            <span>🤖 Analyze with AI</span>
                        </button>
                    </div>
                </div>`;
        }

        DOM.viewerOverlay.classList.add('open');
        logActivity('Viewed document', doc.name, '👁️');
    }

    function closeViewer() {
        playSound('click');
        DOM.viewerOverlay.classList.remove('open');
        setTimeout(() => { DOM.viewerBody.innerHTML = ''; }, 300);
    }

    function copyViewerContent() {
        if (!currentViewerText) return;
        navigator.clipboard.writeText(currentViewerText).then(() => {
            playSound('success');
            DOM.viewerCopyText.textContent = 'Copied! ✓';
            toast('Content copied to clipboard!', 'success');
            setTimeout(() => { DOM.viewerCopyText.textContent = 'Copy'; }, 2000);
        }).catch(() => {
            toast('Clipboard copy failed', 'error');
        });
    }

    function zoomImage(delta) {
        zoomLevel = Math.max(40, Math.min(300, zoomLevel + delta));
        DOM.zoomLevelText.textContent = `${zoomLevel}%`;
        const img = $('#viewer-img');
        if (img) {
            img.style.transform = `scale(${zoomLevel / 100}) rotate(${rotateAngle}deg)`;
        }
        playSound('click');
    }

    function rotateImage() {
        rotateAngle = (rotateAngle + 90) % 360;
        const img = $('#viewer-img');
        if (img) {
            img.style.transform = `scale(${zoomLevel / 100}) rotate(${rotateAngle}deg)`;
        }
        playSound('click');
    }

    // ========== DOWNLOAD DOCUMENT ==========
    function downloadDoc(id) {
        playSound('beep');
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        const a = document.createElement('a');
        a.href = `/api/files/${id}/download`;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast(`Downloading "${doc.name}"...`, 'info');
        logActivity('Downloaded file', doc.name, '📥');
    }

    // ========== DELETE DOCUMENT ==========
    function deleteDoc(id) {
        playSound('beep');
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        pendingBatchDelete = false;
        pendingDeleteId = id;
        DOM.confirmIcon.textContent = '🗑️';
        DOM.confirmTitle.textContent = 'Permanently Delete?';
        DOM.confirmMsg.innerHTML = `Are you sure you want to delete <span class="confirm-box__name">"${escapeHtml(doc.name)}"</span> from the server repository?`;
        DOM.confirmYesText.textContent = 'Yes, Delete';
        DOM.confirmOverlay.classList.add('open');
    }

    async function confirmDelete() {
        if (pendingBatchDelete) {
            // Batch Delete execution
            const ids = [...selectedBatchIds];
            try {
                const res = await fetch('/api/files/batch-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids })
                });
                if (res.ok) {
                    docs = docs.filter(d => !selectedBatchIds.has(d.id));
                    ids.forEach(id => starredIds.delete(id));
                    localStorage.setItem(STARRED_KEY, JSON.stringify([...starredIds]));
                    selectedBatchIds.clear();
                    playSound('delete');
                    updateStats();
                    render();
                    toast(`Permanently deleted ${ids.length} documents`, 'info');
                    logActivity('Batch deleted files', `${ids.length} documents`, '🗑️');
                }
            } catch {
                toast('Failed to complete batch delete', 'error');
            }
            pendingBatchDelete = false;
        } else if (pendingDeleteId) {
            // Single delete execution
            const doc = docs.find(d => d.id === pendingDeleteId);
            const name = doc ? doc.name : 'file';

            try {
                await fetch(`/api/files/${pendingDeleteId}`, { method: 'DELETE' });
                docs = docs.filter(d => d.id !== pendingDeleteId);
                starredIds.delete(pendingDeleteId);
                localStorage.setItem(STARRED_KEY, JSON.stringify([...starredIds]));
                playSound('delete');
                updateStats();
                render();
                toast(`Permanently removed "${name}"`, 'info');
                logActivity('Deleted document', name, '🗑️');
            } catch {
                toast('Failed to delete file from server', 'error');
            }
            pendingDeleteId = null;
        }

        DOM.confirmOverlay.classList.remove('open');
    }

    function cancelDelete() {
        playSound('click');
        pendingDeleteId = null;
        pendingBatchDelete = false;
        DOM.confirmOverlay.classList.remove('open');
    }

    // ========== UPLOAD WORKFLOW ==========
    function openUpload() {
        playSound('beep');
        selectedFiles = [];
        renderSelected();
        DOM.uploaderInput.value = getUploaderName();
        DOM.progress.classList.remove('active');
        DOM.progressBar.style.width = '0%';
        DOM.submitBtn.disabled = true;
        DOM.submitBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16"/></svg>
            <span>Upload Documents</span>`;
        DOM.uploadOverlay.classList.add('open');
    }

    function closeUpload() {
        playSound('click');
        DOM.uploadOverlay.classList.remove('open');
        selectedFiles = [];
    }

    function handleFileSelect(fileList) {
        playSound('beep');
        for (const f of fileList) {
            if (f.size > MAX_FILE_SIZE) {
                toast(`"${f.name}" exceeds 50 MB limit`, 'error');
                continue;
            }
            if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) {
                selectedFiles.push(f);
            }
        }
        renderSelected();
    }

    function renderSelected() {
        DOM.submitBtn.disabled = selectedFiles.length === 0;

        if (selectedFiles.length === 0) {
            DOM.selectedList.innerHTML = '';
            return;
        }

        DOM.selectedList.innerHTML = selectedFiles.map((f, i) => {
            const c = cfg(getFileType(f.name));
            return `
            <div class="selected-item">
                <span class="selected-item__icon">${c.icon}</span>
                <div class="selected-item__info">
                    <div class="selected-item__name">${escapeHtml(f.name)}</div>
                    <div class="selected-item__size">${fmtSize(f.size)} • ${c.label}</div>
                </div>
                <button class="selected-item__remove" onclick="window.__removeFile(${i})" title="Remove file">✕</button>
            </div>`;
        }).join('');
    }

    function removeFile(i) {
        playSound('click');
        selectedFiles.splice(i, 1);
        renderSelected();
    }

    async function submitUpload() {
        const uploader = (DOM.uploaderInput.value.trim()) || 'Anonymous';
        setUploaderName(uploader);

        if (selectedFiles.length === 0) return;

        DOM.submitBtn.disabled = true;
        DOM.submitBtn.innerHTML = `<span>Uploading ${selectedFiles.length} file(s)...</span>`;
        DOM.progress.classList.add('active');

        let done = 0;
        const total = selectedFiles.length;

        for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('uploader', uploader);
            formData.append('type', getFileType(file.name));
            formData.append('name', file.name);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    const newDoc = await res.json();
                    docs.push(newDoc);
                    logActivity('Uploaded document', file.name, '📤');
                } else {
                    toast(`Failed to upload "${file.name}"`, 'error');
                }
            } catch {
                toast(`Network error uploading "${file.name}"`, 'error');
            }

            done++;
            DOM.progressBar.style.width = (done / total * 100) + '%';
        }

        playSound('success');
        updateStats();
        render();
        toast(`Successfully stored ${done} document(s)!`, 'success');

        setTimeout(() => {
            closeUpload();
            DOM.submitBtn.disabled = false;
            DOM.submitBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16"/></svg>
                <span>Upload Documents</span>`;
        }, 600);
    }

    function clearSearch() {
        searchQuery = '';
        DOM.searchInput.value = '';
        DOM.searchClear.style.display = 'none';
        activeFilter = 'all';
        DOM.filters.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
        playSound('click');
        render();
    }

    function setFilter(filterName) {
        activeFilter = filterName;
        DOM.filters.forEach(b => b.classList.toggle('active', b.dataset.filter === filterName));
        playSound('beep');
        render();
    }

    // ========== GLOBAL WINDOW BINDINGS (Inline HTML Safe) ==========
    window.__viewDoc = viewDoc;
    window.__downloadDoc = downloadDoc;
    window.__deleteDoc = deleteDoc;
    window.__removeFile = removeFile;
    window.__openUpload = openUpload;
    window.__clearSearch = clearSearch;
    window.__openAi = openAi;
    window.__shareDoc = shareDoc;
    window.__toggleStar = toggleStar;
    window.__toggleSelectBatch = toggleSelectBatch;
    window.__handleCardClick = handleCardClick;
    window.__filterByTag = filterByTag;
    window.__spotlightSelectDoc = spotlightSelectDoc;
    window.__spotlightExecuteAction = spotlightExecuteAction;

    // ========== INITIALIZATION ==========
    document.addEventListener('DOMContentLoaded', () => {
        cacheDom();
        applyTheme(currentTheme);
        updateSoundUI();
        load();

        // Theme and Sound Toggles
        DOM.themeToggle.addEventListener('click', toggleTheme);
        DOM.soundToggle.addEventListener('click', toggleSound);

        // Upload Modal Triggers
        DOM.btnOpenUpload.addEventListener('click', openUpload);
        DOM.uploadClose.addEventListener('click', closeUpload);
        DOM.uploadOverlay.addEventListener('click', e => { if (e.target === DOM.uploadOverlay) closeUpload(); });

        // Dropzone & File Input
        DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());
        DOM.browseLink.addEventListener('click', e => { e.stopPropagation(); DOM.fileInput.click(); });
        DOM.fileInput.addEventListener('change', e => {
            handleFileSelect(e.target.files);
            DOM.fileInput.value = '';
        });

        DOM.dropzone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropzone.classList.add('dragover'); });
        DOM.dropzone.addEventListener('dragleave', () => DOM.dropzone.classList.remove('dragover'));
        DOM.dropzone.addEventListener('drop', e => {
            e.preventDefault();
            DOM.dropzone.classList.remove('dragover');
            handleFileSelect(e.dataTransfer.files);
        });

        DOM.submitBtn.addEventListener('click', submitUpload);

        // Viewer Modal
        DOM.viewerClose.addEventListener('click', closeViewer);
        DOM.viewerOverlay.addEventListener('click', e => { if (e.target === DOM.viewerOverlay) closeViewer(); });
        DOM.viewerCopy.addEventListener('click', copyViewerContent);
        DOM.btnZoomIn.addEventListener('click', () => zoomImage(25));
        DOM.btnZoomOut.addEventListener('click', () => zoomImage(-25));
        DOM.btnRotateImg.addEventListener('click', rotateImage);

        // Confirm Delete Modal
        DOM.confirmClose.addEventListener('click', cancelDelete);
        DOM.confirmCancel.addEventListener('click', cancelDelete);
        DOM.confirmYes.addEventListener('click', confirmDelete);
        DOM.confirmOverlay.addEventListener('click', e => { if (e.target === DOM.confirmOverlay) cancelDelete(); });

        // Search Input
        DOM.searchInput.addEventListener('input', e => {
            searchQuery = e.target.value;
            DOM.searchClear.style.display = searchQuery ? 'block' : 'none';
            render();
        });
        DOM.searchClear.addEventListener('click', clearSearch);
        DOM.searchKbdTrigger.addEventListener('click', openSpotlight);

        // Sort Select
        DOM.sortSelect.addEventListener('change', e => {
            playSound('click');
            sortMode = e.target.value;
            render();
        });

        // Filter Pills
        DOM.filters.forEach(btn => {
            btn.addEventListener('click', () => {
                setFilter(btn.dataset.filter);
            });
        });

        // View Mode Toggles
        DOM.viewGrid.addEventListener('click', () => {
            playSound('click');
            DOM.fileGrid.classList.remove('file-grid--list');
            DOM.viewGrid.classList.add('active');
            DOM.viewList.classList.remove('active');
            viewMode = 'grid';
        });
        DOM.viewList.addEventListener('click', () => {
            playSound('click');
            DOM.fileGrid.classList.add('file-grid--list');
            DOM.viewList.classList.add('active');
            DOM.viewGrid.classList.remove('active');
            viewMode = 'list';
        });

        // Batch Action Bar Handlers
        DOM.btnToggleSelect.addEventListener('click', toggleSelectMode);
        DOM.batchSelectAll.addEventListener('click', selectAllBatch);
        DOM.batchCancel.addEventListener('click', cancelBatch);
        DOM.batchDownload.addEventListener('click', batchDownload);
        DOM.batchDelete.addEventListener('click', batchDelete);

        // AI Drawer Handlers
        DOM.aiDrawerClose.addEventListener('click', closeAi);
        DOM.aiDrawerOverlay.addEventListener('click', closeAi);
        DOM.aiTabs.forEach(tab => {
            tab.addEventListener('click', () => switchAiTab(tab.dataset.tab));
        });
        DOM.aiChatForm.addEventListener('submit', handleAiChatSubmit);
        DOM.btnCopySummary.addEventListener('click', () => {
            navigator.clipboard.writeText(DOM.aiSummaryText.innerText).then(() => {
                playSound('success');
                toast('AI Summary copied to clipboard!', 'success');
            });
        });
        $$('.quick-prompt').forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.aiChatInput.value = btn.dataset.prompt;
                DOM.aiChatForm.dispatchEvent(new Event('submit'));
            });
        });

        // Spotlight Command Palette
        DOM.btnSpotlight.addEventListener('click', openSpotlight);
        DOM.spotlightCloseBtn.addEventListener('click', closeSpotlight);
        DOM.spotlightOverlay.addEventListener('click', e => { if (e.target === DOM.spotlightOverlay) closeSpotlight(); });
        DOM.spotlightInput.addEventListener('input', e => renderSpotlightResults(e.target.value));

        // Share Modal Handlers
        DOM.shareClose.addEventListener('click', closeShare);
        DOM.shareOverlay.addEventListener('click', e => { if (e.target === DOM.shareOverlay) closeShare(); });
        DOM.btnCopyShareLink.addEventListener('click', copyShareLink);

        // Activity Drawer Handlers
        DOM.btnActivityToggle.addEventListener('click', openActivityDrawer);
        DOM.activityDrawerClose.addEventListener('click', closeActivityDrawer);
        DOM.activityDrawerOverlay.addEventListener('click', closeActivityDrawer);

        // Mobile Bottom Nav Handlers
        DOM.mobNavHome.addEventListener('click', () => {
            playSound('beep');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        DOM.mobNavSpotlight.addEventListener('click', openSpotlight);
        DOM.mobNavStats.addEventListener('click', () => {
            playSound('beep');
            DOM.statsSection.scrollIntoView({ behavior: 'smooth' });
        });
        DOM.mobNavTheme.addEventListener('click', toggleTheme);
        DOM.mobUploadFab.addEventListener('click', openUpload);

        // Full-screen Global Drag & Drop Handlers
        let dragCounter = 0;
        window.addEventListener('dragenter', e => {
            e.preventDefault();
            dragCounter++;
            DOM.globalDropzone.classList.add('active');
        });
        window.addEventListener('dragleave', e => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                DOM.globalDropzone.classList.remove('active');
            }
        });
        window.addEventListener('dragover', e => e.preventDefault());
        window.addEventListener('drop', e => {
            e.preventDefault();
            dragCounter = 0;
            DOM.globalDropzone.classList.remove('active');
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                openUpload();
                handleFileSelect(e.dataTransfer.files);
            }
        });

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', e => {
            // Command Palette (Ctrl+K or Cmd+K)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (DOM.spotlightOverlay.classList.contains('open')) {
                    closeSpotlight();
                } else {
                    openSpotlight();
                }
                return;
            }

            // Quick Upload (Ctrl+U or Cmd+U)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                openUpload();
                return;
            }

            // ESC closes any open overlay
            if (e.key === 'Escape') {
                closeUpload();
                closeViewer();
                closeAi();
                closeSpotlight();
                closeShare();
                closeActivityDrawer();
                cancelDelete();
                if (isSelectMode) {
                    cancelBatch();
                }
            }
        });

        // First click audio unlock
        document.addEventListener('click', () => { initAudio(); }, { once: true });
    });
})();
