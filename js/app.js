/* ================================================================
   STOREDOC AI — Next-Gen Application Engine
   Dual Theme · Web Audio FX · Full Responsive Mobile/Desktop
   Upload · View · Download · Search · Sort · Filter · Delete
   ================================================================ */

(function () {
    'use strict';

    // ========== CONSTANTS & STORAGE KEYS ==========
    const THEME_KEY = 'storedoc_theme';
    const SOUND_KEY = 'storedoc_sound';
    const UPLOADER_KEY = 'storedoc_uploader';
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    const MAX_TOTAL_STORAGE = 1024 * 1024 * 1024 * 1024; // 1 TB quota

    // ========== FILE TYPE REGISTRY ==========
    const FILE_TYPES = {
        pdf: {
            ext: ['.pdf'],
            icon: '📕',
            color: 'var(--clr-pdf)',
            bg: 'var(--clr-pdf-bg)',
            label: 'PDF',
            viewable: true
        },
        word: {
            ext: ['.doc', '.docx'],
            icon: '📘',
            color: 'var(--clr-word)',
            bg: 'var(--clr-word-bg)',
            label: 'DOC',
            viewable: false
        },
        excel: {
            ext: ['.xls', '.xlsx', '.csv'],
            icon: '📗',
            color: 'var(--clr-excel)',
            bg: 'var(--clr-excel-bg)',
            label: 'XLS',
            viewable: true
        },
        ppt: {
            ext: ['.ppt', '.pptx'],
            icon: '📙',
            color: 'var(--clr-ppt)',
            bg: 'var(--clr-ppt-bg)',
            label: 'PPT',
            viewable: false
        },
        json: {
            ext: ['.json'],
            icon: '📒',
            color: 'var(--clr-json)',
            bg: 'var(--clr-json-bg)',
            label: 'JSON',
            viewable: true
        },
        image: {
            ext: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'],
            icon: '🖼️',
            color: 'var(--clr-image)',
            bg: 'var(--clr-image-bg)',
            label: 'IMG',
            viewable: true
        },
        txt: {
            ext: ['.txt', '.md', '.log', '.xml', '.html', '.htm', '.css', '.js', '.ts',
                  '.py', '.java', '.c', '.cpp', '.h', '.yml', '.yaml', '.ini', '.cfg',
                  '.env', '.sh', '.bat', '.ps1', '.sql', '.r', '.go', '.rs', '.rb',
                  '.php', '.swift', '.kt', '.jsx', '.tsx'],
            icon: '📝',
            color: 'var(--clr-txt)',
            bg: 'var(--clr-txt-bg)',
            label: 'TXT',
            viewable: true
        },
        other: {
            ext: [],
            icon: '📎',
            color: 'var(--clr-other)',
            bg: 'var(--clr-other-bg)',
            label: 'FILE',
            viewable: false
        }
    };

    // ========== STATE ==========
    let docs = [];
    let selectedFiles = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let sortMode = 'newest';
    let viewMode = 'grid'; // 'grid' | 'list'
    let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
    let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
    let audioCtx = null;
    let pendingDeleteId = null;
    let currentViewerText = '';

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
        DOM.storageBarFill = $('#storage-bar-fill');
        DOM.statsSection = $('#stats-section');

        // Controls
        DOM.searchInput = $('#search-input');
        DOM.searchClear = $('#search-clear');
        DOM.sortSelect = $('#sort-select');
        DOM.filters = $$('.filter');
        DOM.viewGrid = $('#view-grid');
        DOM.viewList = $('#view-list');

        // Header Action Toggles
        DOM.themeToggle = $('#theme-toggle');
        DOM.soundToggle = $('#sound-toggle');
        DOM.soundIconOn = $('.sound-icon--on');
        DOM.soundIconOff = $('.sound-icon--off');
        DOM.themeIconDark = $('.theme-icon--dark');
        DOM.themeIconLight = $('.theme-icon--light');
        DOM.btnOpenUpload = $('#btn-open-upload');

        // Mobile Nav
        DOM.mobNavHome = $('#mob-nav-home');
        DOM.mobNavStats = $('#mob-nav-stats');
        DOM.mobNavSearch = $('#mob-nav-search');
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
        DOM.viewerBody = $('#viewer-body');

        // Confirm Modal
        DOM.confirmOverlay = $('#confirm-overlay');
        DOM.confirmClose = $('#confirm-close');
        DOM.confirmIcon = $('#confirm-icon');
        DOM.confirmTitle = $('#confirm-title');
        DOM.confirmMsg = $('#confirm-msg');
        DOM.confirmCancel = $('#confirm-cancel');
        DOM.confirmYes = $('#confirm-yes');

        // Toasts
        DOM.toasts = $('#toasts');
    }

    // ========== WEB AUDIO SYNTHESIZER (Interface Beep FX) ==========
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
            } else if (type === 'success') {
                // Ascending melodic chime
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.07);

                    gain.gain.setValueAtTime(0.09, now + i * 0.07);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.16);

                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start(now + i * 0.07);
                    osc.stop(now + i * 0.07 + 0.16);
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
            // Audio policy fallback
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
        const units = ['B', 'KB', 'MB', 'GB'];
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

    // ========== API DATA LOADING ==========
    async function load() {
        try {
            const res = await fetch('/api/files');
            if (!res.ok) throw new Error('Failed to reach server');
            docs = await res.json();
            updateStats();
            render();
        } catch (error) {
            console.error('Failed to load files:', error);
            toast('Backend Server Offline or Disconnected', 'error');
        }
    }

    // ========== STATS & STORAGE GAUGE ==========
    function updateStats() {
        DOM.statTotal.textContent = docs.length;

        const totalBytes = docs.reduce((s, d) => s + (d.size || 0), 0);
        DOM.statStorage.textContent = fmtSize(totalBytes);

        const pct = Math.min(100, Math.max(0.5, (totalBytes / MAX_TOTAL_STORAGE) * 100));
        DOM.statStoragePct.textContent = `${pct < 1 ? '<1%' : pct.toFixed(1) + '%'} Used`;
        DOM.storageBarText.textContent = `${fmtSize(totalBytes)} of 1 TB allocated • ${docs.length} files`;
        DOM.storageBarFill.style.width = `${pct}%`;

        const members = new Set(docs.map(d => d.uploader).filter(Boolean));
        DOM.statMembers.textContent = members.size;

        const types = new Set(docs.map(d => d.type));
        DOM.statTypes.textContent = types.size;
    }

    // ========== RENDER DOCUMENTS ==========
    function render() {
        let list = [...docs];

        // 1. Filter
        if (activeFilter !== 'all') {
            list = list.filter(d => d.type === activeFilter);
        }

        // 2. Search Query (name or uploader)
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
                    <div class="empty__icon">📂</div>
                    <h3 class="empty__title">${docs.length === 0 ? 'No Documents Uploaded Yet' : 'No Matching Documents'}</h3>
                    <p class="empty__desc">${docs.length === 0
                        ? 'Your enterprise cloud repository is empty. Upload PDFs, Spreadsheets, Docs, Images, or Code to get started.'
                        : 'No files match your filter or search query. Try clearing your search.'}</p>
                    ${docs.length === 0 ? `<button class="btn btn--primary" onclick="window.__openUpload()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16"/></svg>
                        <span>Upload First Document</span>
                    </button>` : `<button class="btn btn--ghost" onclick="window.__clearSearch()">Clear Filters</button>`}
                </div>`;
            return;
        }

        DOM.fileGrid.innerHTML = list.map((doc, i) => {
            const c = cfg(doc.type);
            const ac = avatarColor(doc.uploader);
            const ini = initials(doc.uploader);

            return `
            <div class="file-card" data-id="${doc.id}" style="animation-delay:${Math.min(i * 0.03, 0.3)}s" onclick="window.__viewDoc('${doc.id}')">
                <div class="file-card__accent" style="background:${c.color}"></div>
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
                    <div class="file-card__actions">
                        <button class="action-btn" title="View Document" onclick="event.stopPropagation(); window.__viewDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="action-btn" title="Download Document" onclick="event.stopPropagation(); window.__downloadDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>
                        </button>
                        <button class="action-btn action-btn--danger" title="Delete Document" onclick="event.stopPropagation(); window.__deleteDoc('${doc.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // ========== VIEW DOCUMENT MODAL ==========
    async function viewDoc(id) {
        playSound('beep');
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        const c = cfg(doc.type);
        DOM.viewerIcon.textContent = c.icon;
        DOM.viewerName.textContent = doc.name;
        DOM.viewerSub.textContent = `${c.label} • ${fmtSize(doc.size)} • Uploaded by ${doc.uploader || 'Anonymous'}`;
        DOM.viewerDownload.onclick = () => downloadDoc(id);
        DOM.viewerCopy.style.display = 'none';
        currentViewerText = '';

        const url = `/api/files/${id}/view`;

        if (doc.type === 'pdf') {
            DOM.viewerBody.innerHTML = `<iframe src="${url}" title="${escapeHtml(doc.name)}"></iframe>`;
        } else if (doc.type === 'image') {
            DOM.viewerBody.innerHTML = `<img src="${url}" alt="${escapeHtml(doc.name)}">`;
        } else if (doc.type === 'json' || doc.type === 'txt' || (doc.type === 'excel' && doc.name.toLowerCase().endsWith('.csv'))) {
            try {
                const res = await fetch(url);
                let text = await res.text();
                currentViewerText = text;
                if (doc.type === 'json') {
                    try { text = JSON.stringify(JSON.parse(text), null, 2); currentViewerText = text; } catch {}
                }
                DOM.viewerBody.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
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
                    <p class="viewer-fallback__msg">Direct in-browser preview is not supported for ${c.label} files. Download the file to open it in your system software.</p>
                    <button class="btn btn--primary" onclick="window.__downloadDoc('${doc.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>
                        <span>Download ${escapeHtml(doc.name)}</span>
                    </button>
                </div>`;
        }

        DOM.viewerOverlay.classList.add('open');
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
    }

    // ========== DELETE DOCUMENT ==========
    function deleteDoc(id) {
        playSound('beep');
        const doc = docs.find(d => d.id === id);
        if (!doc) return;

        pendingDeleteId = id;
        DOM.confirmIcon.textContent = '🗑️';
        DOM.confirmTitle.textContent = 'Permanently Delete?';
        DOM.confirmMsg.innerHTML = `Are you sure you want to delete <span class="confirm-box__name">"${escapeHtml(doc.name)}"</span> from the server repository?`;
        DOM.confirmOverlay.classList.add('open');
    }

    async function confirmDelete() {
        if (!pendingDeleteId) return;
        const doc = docs.find(d => d.id === pendingDeleteId);
        const name = doc ? doc.name : 'file';

        try {
            await fetch(`/api/files/${pendingDeleteId}`, { method: 'DELETE' });
            docs = docs.filter(d => d.id !== pendingDeleteId);
            playSound('delete');
            updateStats();
            render();
            toast(`Permanently removed "${name}"`, 'info');
        } catch {
            toast('Failed to delete file from server', 'error');
        }

        pendingDeleteId = null;
        DOM.confirmOverlay.classList.remove('open');
    }

    function cancelDelete() {
        playSound('click');
        pendingDeleteId = null;
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

    // ========== GLOBAL WINDOW BINDINGS (Inline HTML Safe) ==========
    window.__viewDoc = viewDoc;
    window.__downloadDoc = downloadDoc;
    window.__deleteDoc = deleteDoc;
    window.__removeFile = removeFile;
    window.__openUpload = openUpload;
    window.__clearSearch = clearSearch;

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

        // Sort Select
        DOM.sortSelect.addEventListener('change', e => {
            playSound('click');
            sortMode = e.target.value;
            render();
        });

        // Filter Pills
        DOM.filters.forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('beep');
                DOM.filters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter;
                render();
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

        // Mobile Bottom Nav Handlers
        DOM.mobNavHome.addEventListener('click', () => {
            playSound('beep');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        DOM.mobNavStats.addEventListener('click', () => {
            playSound('beep');
            DOM.statsSection.scrollIntoView({ behavior: 'smooth' });
        });

        DOM.mobNavSearch.addEventListener('click', () => {
            playSound('beep');
            DOM.searchInput.focus();
        });

        DOM.mobNavTheme.addEventListener('click', toggleTheme);
        DOM.mobUploadFab.addEventListener('click', openUpload);

        // Keyboard Shortcuts
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeUpload();
                closeViewer();
                cancelDelete();
            }
        });

        // First click audio unlock
        document.addEventListener('click', () => { initAudio(); }, { once: true });
    });
})();
