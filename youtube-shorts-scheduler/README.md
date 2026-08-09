# YouTube Shorts Automated Scheduler 🚀

A serverless, zero-cost automated YouTube Shorts scheduler for personal channels using **Node.js**, **Google OAuth 2.0**, **YouTube Data API v3**, and **GitHub Actions**.

---

## 📅 Schedule Overview

- **Daily Upload Target**: Exactly **1 Short per day**
  - **Execution Time**: **11:00 AM Asia/Kolkata** (05:30 AM UTC)
- **Execution Mechanism**: GitHub Actions cron task + Node.js selective LFS runner.
- **Workflow Scope**: Each workflow execution uploads **ONLY ONE video** sequentially.

---

## ⚡ Git LFS Selective Fetch Optimization

To prevent downloading the entire 8.29 GB video folder on every GitHub Actions run:
1. `actions/checkout@v4` runs with `lfs: false`, checking out tiny **~130-byte text pointer files** for `/videos` in seconds.
2. `scripts/scheduler.js` identifies the next unuploaded video from `data/upload-state.json` (e.g. `Video_003.MOV`).
3. Executes targeted LFS fetch:
   ```bash
   git lfs pull --include="videos/Video_003.MOV"
   ```
   This downloads **ONLY** `Video_003.MOV` (~200 MB) instead of downloading all 37 videos (8.29 GB).

---

## 📁 Repository Structure

```
youtube-shorts-scheduler/
├── .github/
│   └── workflows/
│       └── youtube-scheduler.yml   # GitHub Actions automated workflow (11 AM Asia/Kolkata)
├── data/
│   ├── upload-state.json            # State tracker (records uploaded filenames)
│   ├── schedule.json                # Schedule configuration
│   ├── schedule.js                  # Frontend browser bundle for schedule data
│   ├── videos.json                  # Central video metadata manifest
│   └── videos.js                    # Frontend browser bundle for videos
├── frontend/                        # Static GitHub Pages Dashboard UI
│   ├── index.html                   # Dashboard markup
│   ├── style.css                    # Responsive dark theme
│   └── app.js                       # Dashboard logic & visualizer
├── scripts/
│   ├── scan.js                      # Video file scanner (npm run scan)
│   ├── schedule.js                  # Schedule generator (npm run schedule)
│   ├── auth.js                      # One-time Google OAuth CLI setup (npm run auth)
│   ├── upload.js                    # Test single video uploader (npm run upload)
│   ├── scheduler.js                 # Selective LFS scheduler runner (npm run scheduler:test)
│   └── utils.js                     # Utility helpers
├── videos/                          # Storage folder for video files
├── .gitattributes                   # Git LFS tracking rules for video formats
├── .gitignore                       # Security exclusion rules
├── package.json                     # Node project manifest
└── README.md                        # Documentation
```

---

## 🚀 Setup & Deployment Guide

### 1. Place Videos in `/videos`
Drop your `.mp4`, `.mov`, `.m4v`, or `.webm` files inside the `videos/` folder.  
Filenames will be processed in natural ascending order (e.g. `Video_001.MOV`, `Video_002.MOV`).

### 2. Local Environment Setup (`.env`)
Create a local `.env` file from template:
```bash
cp .env.example .env
```

Populate your credentials:
```env
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
YOUTUBE_PRIVACY_STATUS=private
```

### 3. Generate OAuth Refresh Token
If you don't have a Refresh Token yet:
```bash
npm run auth
```
1. Open the Google Sign-In link generated in terminal.
2. Grant YouTube upload permissions for your channel.
3. Copy the **Refresh Token** printed in terminal to your `.env` file.

### 4. Configure GitHub Repository Secrets
On GitHub, navigate to:  
**Settings** > **Secrets and variables** > **Actions** > **New repository secret**

Add the following required secrets:
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

*(Optional Secret)*:
- `YOUTUBE_PRIVACY_STATUS` (Set to `public`, `unlisted`, or `private`. Defaults to `private` for safety).

---

## ⚙️ State Management & Failure Retry

1. **State Tracking (`data/upload-state.json`)**:
   ```json
   {
     "nextVideoIndex": 2,
     "uploadedVideos": [
       "Video_001.MOV",
       "Video_002.MOV"
     ]
   }
   ```
2. **Failure Safety**:
   - A video is marked as uploaded **ONLY AFTER** YouTube API confirms success.
   - If an upload fails, state is **NOT** updated, no filename is added to `uploadedVideos`, and the process exits with an error code 1.
   - The next day's scheduled run will automatically retry the same video.
3. **State Commit & Push**:
   - On successful upload, GitHub Actions commits `data/upload-state.json`, `data/videos.json`, and `data/videos.js` using `github-actions[bot]`.
4. **All Videos Completed**:
   - When every video in `/videos` is in `uploadedVideos`, the workflow prints `ALL VIDEOS UPLOADED` and exits cleanly with exit code 0.

---

## 🛠️ CLI Commands

```bash
# Scan videos/ directory and update videos.json
npm run scan

# Generate future schedule dates & times
npm run schedule

# Run one-time OAuth authorization
npm run auth

# Execute single video upload scheduler test locally
npm run scheduler:test
```
