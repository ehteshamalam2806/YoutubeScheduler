/**
 * YouTube Shorts Scheduler - Dashboard Application Logic
 * 
 * Manages stats metric calculations, queue filtering, countdown timer,
 * theme switching, and video detail view.
 */

// Embedded default fallback dataset if running directly via file:// protocol without HTTP server
const FALLBACK_DATASET = {
  "videos": [
    {
      "id": "001",
      "fileName": "001.mp4",
      "title": "5 Insane VS Code Shortcuts You Didn't Know! ⚡ #Shorts",
      "description": "Boost your coding speed 10x with these secret VS Code keyboard shortcuts! #coding #vscode #shorts",
      "tags": ["coding", "vscode", "webdev", "productivity", "shorts"],
      "status": "scheduled",
      "scheduledAt": "2026-08-10T14:00:00.000Z",
      "youtubeVideoId": null,
      "youtubeUrl": null,
      "publishedAt": null,
      "error": null
    },
    {
      "id": "002",
      "fileName": "002.mp4",
      "title": "JavaScript Array Tricks Senior Devs Use 🔥 #Shorts",
      "description": "Clean up your JS code with modern array methods! #javascript #frontend #shorts",
      "tags": ["javascript", "frontend", "tips"],
      "status": "scheduled",
      "scheduledAt": "2026-08-11T18:30:00.000Z",
      "youtubeVideoId": null,
      "youtubeUrl": null,
      "publishedAt": null,
      "error": null
    },
    {
      "id": "003",
      "fileName": "003.mp4",
      "title": "CSS Grid vs Flexbox in 30 Seconds 🎨 #Shorts",
      "description": "Stop struggling with CSS layout! Here is when to use Grid vs Flexbox. #css #webdesign #shorts",
      "tags": ["css", "design", "webdev"],
      "status": "pending",
      "scheduledAt": null,
      "youtubeVideoId": null,
      "youtubeUrl": null,
      "publishedAt": null,
      "error": null
    },
    {
      "id": "004",
      "fileName": "004.mp4",
      "title": "Python One-Liners That Will Save You Hours 🐍 #Shorts",
      "description": "Write cleaner Python code today with these elegant one-liners! #python #coding #shorts",
      "tags": ["python", "software", "tips"],
      "status": "published",
      "scheduledAt": "2026-08-08T15:00:00.000Z",
      "youtubeVideoId": "dQw4w9WgXcQ",
      "youtubeUrl": "https://youtube.com/shorts/dQw4w9WgXcQ",
      "publishedAt": "2026-08-08T15:00:12.000Z",
      "error": null
    },
    {
      "id": "005",
      "fileName": "005.mp4",
      "title": "Async/Await Mistakes You're Making Right Now ⏳ #Shorts",
      "description": "Avoid common promise anti-patterns in JavaScript! #js #async #shorts",
      "tags": ["javascript", "async", "debugging"],
      "status": "failed",
      "scheduledAt": "2026-08-07T14:00:00.000Z",
      "youtubeVideoId": null,
      "youtubeUrl": null,
      "publishedAt": null,
      "error": "Upload failed: Invalid OAuth scope or expired token."
    }
  ]
};

class DashboardApp {
  constructor() {
    this.videos = [];
    this.scheduleConfig = {
      enabled: true,
      startDate: '2026-08-10',
      videosPerDay: 2,
      uploadTimes: ['12:30', '19:30'],
      timezone: 'Asia/Kolkata'
    };
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.countdownInterval = null;

    this.init();
  }

  async init() {
    this.setupTheme();
    await this.fetchData();
    this.loadScheduleConfig();
    this.renderMetrics();
    this.renderNextUpload();
    this.renderUploadFrequency();
    this.renderScheduleConfigForm();
    this.renderScheduleTimeline();
    this.renderQueueTable();
    this.bindEvents();
  }

  // Theme Management
  setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.updateThemeIcon(next);
      });
    }
  }

  updateThemeIcon(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // Data Fetching
  async fetchData() {
    // 1. Prioritize window.VIDEOS_DATA if loaded via script tag (bypasses CORS restrictions on file:// URLs)
    if (window.VIDEOS_DATA && Array.isArray(window.VIDEOS_DATA.videos)) {
      this.videos = window.VIDEOS_DATA.videos;
      return;
    }

    // 2. Fallback to HTTP fetch if window.VIDEOS_DATA is not present
    try {
      const res = await fetch('../data/videos.json');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.videos)) {
          this.videos = data.videos;
          return;
        } else if (Array.isArray(data)) {
          this.videos = data;
          return;
        }
      }
    } catch (e) {
      console.warn('Fetch fallback triggered:', e.message);
    }

    // 3. Last fallback
    this.videos = (FALLBACK_DATASET && FALLBACK_DATASET.videos) || [];
  }

  // Metrics Grid Calculations
  renderMetrics() {
    const total = this.videos.length;
    const pending = this.videos.filter(v => v.status === 'pending').length;
    const scheduled = this.videos.filter(v => v.status === 'scheduled').length;
    const published = this.videos.filter(v => v.status === 'published').length;
    const failed = this.videos.filter(v => v.status === 'failed').length;

    this.animateNumber('val-total', total);
    this.animateNumber('val-pending', pending);
    this.animateNumber('val-scheduled', scheduled);
    this.animateNumber('val-published', published);
    this.animateNumber('val-failed', failed);
  }

  animateNumber(elementId, targetVal) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let current = 0;
    const duration = 400;
    const stepTime = 30;
    const steps = Math.ceil(duration / stepTime);
    const increment = targetVal / steps;

    if (targetVal === 0) {
      el.textContent = '0';
      return;
    }

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetVal) {
        el.textContent = targetVal;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current);
      }
    }, stepTime);
  }

  // Next Upload Spotlight Card
  renderNextUpload() {
    const now = new Date();
    const scheduledVideos = this.videos
      .filter(v => v.status === 'scheduled' && v.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    const nextVideo = scheduledVideos.find(v => new Date(v.scheduledAt) > now) || scheduledVideos[0];

    const titleEl = document.getElementById('next-title');
    const descEl = document.getElementById('next-description');
    const dateEl = document.getElementById('next-date-formatted');
    const fileEl = document.getElementById('next-filename');

    if (!nextVideo) {
      if (titleEl) titleEl.textContent = 'No upcoming videos scheduled';
      if (descEl) descEl.textContent = 'Run "npm run scan" to detect new files and assign a schedule timestamp.';
      if (dateEl) dateEl.textContent = 'N/A';
      if (fileEl) fileEl.textContent = 'N/A';
      this.setCountdownValues(0, 0, 0, 0);
      return;
    }

    if (titleEl) titleEl.textContent = nextVideo.title || nextVideo.fileName;
    if (descEl) descEl.textContent = nextVideo.description || 'No description added yet.';
    if (dateEl) dateEl.textContent = this.formatDate(nextVideo.scheduledAt);
    if (fileEl) fileEl.textContent = nextVideo.fileName;

    this.startCountdown(nextVideo.scheduledAt);
  }

  startCountdown(targetIso) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    const update = () => {
      if (!targetIso) {
        this.setCountdownValues(0, 0, 0, 0);
        return;
      }

      const diff = new Date(targetIso).getTime() - new Date().getTime();

      if (diff <= 0) {
        this.setCountdownValues(0, 0, 0, 0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      this.setCountdownValues(days, hours, mins, secs);
    };

    update();
    this.countdownInterval = setInterval(update, 1000);
  }

  setCountdownValues(d, h, m, s) {
    const pad = n => String(n).padStart(2, '0');
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');

    if (daysEl) daysEl.textContent = pad(d);
    if (hoursEl) hoursEl.textContent = pad(h);
    if (minsEl) minsEl.textContent = pad(m);
    if (secsEl) secsEl.textContent = pad(s);
  }

  renderUploadFrequency() {
    const rateText = document.getElementById('freq-rate-text');
    const container = document.getElementById('freq-bars-container');
    if (rateText) {
      rateText.textContent = `${this.scheduleConfig.videosPerDay || 1} Short / Day`;
    }
    if (container) {
      container.innerHTML = [80, 100, 75, 90, 85, 95, 70].map(h => `
        <div class="freq-bar" style="height: ${h}%;"></div>
      `).join('');
    }
  }

  // Schedule Config Load
  loadScheduleConfig() {
    if (window.SCHEDULE_DATA) {
      this.scheduleConfig = { ...this.scheduleConfig, ...window.SCHEDULE_DATA };
    }
  }

  renderScheduleConfigForm() {
    const startDateInput = document.getElementById('sched-start-date');
    const vpdSelect = document.getElementById('sched-vpd');
    const time1Input = document.getElementById('sched-time-1');
    const time2Input = document.getElementById('sched-time-2');

    if (startDateInput) startDateInput.value = this.scheduleConfig.startDate || '2026-08-10';
    if (vpdSelect) vpdSelect.value = String(this.scheduleConfig.videosPerDay || 2);
    if (time1Input) time1Input.value = (this.scheduleConfig.uploadTimes && this.scheduleConfig.uploadTimes[0]) || '12:30';
    if (time2Input) time2Input.value = (this.scheduleConfig.uploadTimes && this.scheduleConfig.uploadTimes[1]) || '19:30';

    if (time2Input && vpdSelect) {
      time2Input.style.display = vpdSelect.value === '1' ? 'none' : 'block';
    }
  }

  renderScheduleTimeline() {
    const container = document.getElementById('timeline-container');
    const badge = document.getElementById('scheduled-count-badge');
    if (!container) return;

    const scheduled = this.videos
      .filter(v => v.status === 'scheduled' && v.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    if (badge) {
      badge.textContent = `${scheduled.length} Scheduled`;
    }

    if (scheduled.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2rem 0;">
          No upcoming scheduled videos. Configure settings and click Apply.
        </div>
      `;
      return;
    }

    container.innerHTML = scheduled.map(v => `
      <div class="timeline-item">
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
          <div class="timeline-title">${this.escapeHtml(v.title || v.fileName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">📄 ${this.escapeHtml(v.fileName)}</div>
        </div>
        <div class="timeline-date">
          📅 ${this.formatDate(v.scheduledAt)}
        </div>
      </div>
    `).join('');
  }

  // Queue Table Rendering
  renderQueueTable() {
    const tbody = document.getElementById('video-table-body');
    const emptyState = document.getElementById('empty-state');
    if (!tbody) return;

    const filtered = this.videos.filter(v => {
      const matchesFilter = this.currentFilter === 'all' || v.status === this.currentFilter;
      const q = this.searchQuery.toLowerCase();
      const matchesSearch = !q || 
        (v.title && v.title.toLowerCase().includes(q)) || 
        (v.fileName && v.fileName.toLowerCase().includes(q)) || 
        (v.tags && v.tags.some(t => t.toLowerCase().includes(q)));
      
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = filtered.map(v => `
      <tr>
        <td>
          <code style="background: rgba(255, 255, 255, 0.06); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 600; color: var(--accent-cyan);">
            ${this.escapeHtml(v.fileName)}
          </code>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.2rem;">
            ${this.escapeHtml(v.title || '(Untitled Video)')}
          </div>
          ${v.tags && v.tags.length ? `
            <div class="video-tags">
              ${v.tags.map(t => `<span class="tag-badge">#${this.escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}
        </td>
        <td>
          <span class="badge-status ${v.status}">${v.status}</span>
        </td>
        <td>
          <span style="font-size: 0.875rem;">${v.scheduledAt ? this.formatDate(v.scheduledAt) : '<span style="color: var(--text-muted);">Unscheduled</span>'}</span>
        </td>
        <td>
          ${v.youtubeUrl ? `
            <a href="${this.escapeHtml(v.youtubeUrl)}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: none; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;">
              <span>Link 🔗</span>
            </a>
          ` : `<span style="color: var(--text-muted); font-size: 0.85rem;">N/A</span>`}
        </td>
        <td>
          <button class="btn-icon view-btn" data-id="${v.id}" title="View Details" style="width: 32px; height: 32px;">👁️</button>
        </td>
      </tr>
    `).join('');
  }

  // Event Listeners
  bindEvents() {
    // Schedule Form Change & Submit
    const vpdSelect = document.getElementById('sched-vpd');
    const time2Input = document.getElementById('sched-time-2');
    if (vpdSelect && time2Input) {
      vpdSelect.addEventListener('change', () => {
        time2Input.style.display = vpdSelect.value === '1' ? 'none' : 'block';
      });
    }

    const scheduleForm = document.getElementById('schedule-form');
    if (scheduleForm) {
      scheduleForm.addEventListener('submit', e => {
        e.preventDefault();
        const startDate = document.getElementById('sched-start-date').value || '2026-08-10';
        const vpd = parseInt(document.getElementById('sched-vpd').value, 10) || 2;
        const time1 = document.getElementById('sched-time-1').value || '12:30';
        const time2 = document.getElementById('sched-time-2').value || '19:30';

        this.scheduleConfig = {
          enabled: true,
          startDate,
          videosPerDay: vpd,
          uploadTimes: [time1, time2],
          timezone: 'Asia/Kolkata'
        };

        // Client side preview scheduling for pending items
        const pending = this.videos.filter(v => v.status === 'pending');
        if (pending.length > 0) {
          let currDate = new Date(startDate);
          let pIdx = 0;
          while (pIdx < pending.length) {
            for (let slot = 0; slot < vpd && pIdx < pending.length; slot++) {
              const tStr = slot === 0 ? time1 : time2;
              const [hh, mm] = tStr.split(':');
              const yyyy = currDate.getFullYear();
              const mStr = String(currDate.getMonth() + 1).padStart(2, '0');
              const dStr = String(currDate.getDate()).padStart(2, '0');
              const iso = new Date(`${yyyy}-${mStr}-${dStr}T${hh}:${mm}:00+05:30`).toISOString();
              
              pending[pIdx].status = 'scheduled';
              pending[pIdx].scheduledAt = iso;
              pIdx++;
            }
            currDate.setDate(currDate.getDate() + 1);
          }
        }

        // Re-render dashboard components
        this.renderMetrics();
        this.renderNextUpload();
        this.renderScheduleTimeline();
        this.renderQueueTable();

        alert(`Schedule updated! Configured for ${vpd} short(s)/day starting ${startDate}. (Run "npm run schedule" in terminal for Node synchronization)`);
      });
    }
    // Filter Pills
    const filterContainer = document.getElementById('filter-pills');
    if (filterContainer) {
      filterContainer.addEventListener('click', e => {
        const btn = e.target.closest('.pill-btn');
        if (!btn) return;

        filterContainer.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.currentFilter = btn.dataset.filter;
        this.renderQueueTable();
      });
    }

    // Search Input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value.trim();
        this.renderQueueTable();
      });
    }

    // Table Actions (View Modal)
    const tbody = document.getElementById('video-table-body');
    if (tbody) {
      tbody.addEventListener('click', e => {
        const btn = e.target.closest('.view-btn');
        if (btn) {
          const videoId = btn.dataset.id;
          const item = this.videos.find(v => v.id === videoId);
          if (item) this.openModal(item);
        }
      });
    }

    // Modal Close handlers
    const modalClose = document.getElementById('modal-close-btn');
    const modalOverlay = document.getElementById('video-modal');
    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }
    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) this.closeModal();
      });
    }
  }

  openModal(video) {
    const modal = document.getElementById('video-modal');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge-status ${video.status}">${video.status}</span>
          <code style="background: var(--bg-input); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">ID: ${this.escapeHtml(video.id)}</code>
        </div>

        <div>
          <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">File Name</label>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--accent-cyan); margin-top: 0.1rem;">
            ${this.escapeHtml(video.fileName)}
          </div>
        </div>

        <div>
          <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Title</label>
          <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 0.1rem;">
            ${this.escapeHtml(video.title || '(Untitled Video)')}
          </div>
        </div>
        
        <div>
          <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Description</label>
          <p style="font-size: 0.875rem; color: var(--text-secondary); background: var(--bg-input); padding: 0.75rem; border-radius: var(--radius-sm); margin-top: 0.25rem; white-space: pre-wrap;">
            ${this.escapeHtml(video.description || '(No description provided)')}
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
          <div>
            <span style="color: var(--text-muted);">Scheduled At:</span><br>
            <strong>${video.scheduledAt ? this.formatDate(video.scheduledAt) : 'N/A'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted);">Published At:</span><br>
            <strong>${video.publishedAt ? this.formatDate(video.publishedAt) : 'N/A'}</strong>
          </div>
        </div>

        ${video.youtubeUrl ? `
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">YouTube URL</label>
            <div style="margin-top: 0.2rem;">
              <a href="${this.escapeHtml(video.youtubeUrl)}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; font-size: 0.875rem;">
                ${this.escapeHtml(video.youtubeUrl)}
              </a>
            </div>
          </div>
        ` : ''}

        ${video.error ? `
          <div>
            <label style="font-size: 0.75rem; color: var(--color-failed); text-transform: uppercase; font-weight: 700;">Error Message</label>
            <p style="font-size: 0.85rem; color: var(--color-failed); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.6rem; border-radius: var(--radius-sm); margin-top: 0.25rem;">
              ${this.escapeHtml(video.error)}
            </p>
          </div>
        ` : ''}
      </div>
    `;

    modal.classList.add('active');
  }

  closeModal() {
    const modal = document.getElementById('video-modal');
    if (modal) modal.classList.remove('active');
  }

  // Utilities
  formatDate(isoString) {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DashboardApp();
});
