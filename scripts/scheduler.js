import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { loadVideos, saveVideos } from './utils.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(__dirname, '../videos');
const UPLOAD_STATE_FILE = path.join(__dirname, '../data/upload-state.json');
const SUPPORTED_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;
const PRIVACY_STATUS = (process.env.YOUTUBE_PRIVACY_STATUS || 'public').toLowerCase();

const DEFAULT_CHANNEL_DESCRIPTION = `Welcome to Wanderlens_28 ❤️

A journey of bikes, roads, travel, emotions and unforgettable moments. 🏍️✨
Here you’ll find cinematic bike rides, travel adventures, scenic views, Shayari, love, motivation and moments captured straight from the heart.

If you love riding, travelling, exploring new places and feeling every moment, you’re in the right place. 🌍❤️

Subscribe to Wanderlens_28 and join the journey. 🔔

#Wanderlens28 #BikeRide #TravelVlog #BikeVlog #Travel #Shayari #Motivation #Love #RoadTrip #BikerLife`;

const DEFAULT_CHANNEL_TAGS = [
  "Wanderlens 28", "Wanderlens", "bike ride", "motorcycle ride", "bike vlog",
  "travel vlog", "road trip", "riding videos", "solo ride", "cinematic ride",
  "travel reels", "Hindi shayari", "Hinglish shayari", "love shayari",
  "motivational shayari", "romantic quotes", "life quotes", "travel motivation",
  "biker lifestyle", "India travel", "scenic rides", "sunset ride", "adventure travel"
];

/**
 * Validates environment variables
 */
function validateEnv() {
  const missing = [];
  if (!CLIENT_ID) missing.push('YOUTUBE_CLIENT_ID');
  if (!CLIENT_SECRET) missing.push('YOUTUBE_CLIENT_SECRET');
  if (!REFRESH_TOKEN) missing.push('YOUTUBE_REFRESH_TOKEN');

  if (missing.length > 0) {
    console.error('❌ ERROR: Missing required environment variable(s):');
    missing.forEach(m => console.error(`   - ${m}`));
    console.error('');
    console.error('Please configure your .env file or GitHub Secrets with OAuth credentials.');
    process.exit(1);
  }
}

/**
 * Reads data/upload-state.json safely
 */
function loadUploadState() {
  const defaultState = { nextVideoIndex: 0, uploadedVideos: [] };
  try {
    if (!fs.existsSync(UPLOAD_STATE_FILE)) {
      return defaultState;
    }
    const content = fs.readFileSync(UPLOAD_STATE_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      nextVideoIndex: typeof parsed.nextVideoIndex === 'number' ? parsed.nextVideoIndex : 0,
      uploadedVideos: Array.isArray(parsed.uploadedVideos) ? parsed.uploadedVideos : []
    };
  } catch (e) {
    console.warn(`Warning: Could not read upload-state.json (${e.message}). Initializing new state.`);
    return defaultState;
  }
}

/**
 * Saves data/upload-state.json safely
 */
function saveUploadState(state) {
  try {
    fs.writeFileSync(UPLOAD_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving upload-state.json:', e.message);
  }
}

/**
 * Natural sort comparator for filenames (e.g. Video_001.MOV < Video_002.MOV)
 */
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Checks if a file path is a Git LFS pointer text file (< 2000 bytes with LFS header)
 */
function isLfsPointer(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 2000) {
      const header = fs.readFileSync(filePath, 'utf-8');
      return header.includes('version https://git-lfs.github.com/spec/v1');
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Fetches ONLY the single target video from Git LFS
 */
function fetchTargetLfsFile(fileName) {
  console.log('Fetching only this LFS object...');
  try {
    // Targeted Git LFS pull command for ONLY the single required video file
    execSync(`git lfs pull --include="videos/${fileName}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
  } catch (err) {
    console.warn(`Warning: git lfs pull command encountered an issue: ${err.message}`);
  }
}

/**
 * Main YouTube Scheduler Runner (Production Single Video Upload)
 */
async function runScheduler() {
  validateEnv();

  // 1. Scan videos directory pointer files
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  const dirFiles = fs.readdirSync(VIDEOS_DIR);
  const videoFiles = dirFiles.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  });

  // Sort deterministically in natural ascending order
  videoFiles.sort(naturalSort);

  // 2. Read state
  const state = loadUploadState();
  const uploadedSet = new Set(state.uploadedVideos);

  // Filter unuploaded videos
  const unuploadedVideos = videoFiles.filter(f => !uploadedSet.has(f));

  console.log('Starting YouTube scheduler...');
  console.log('');
  console.log(`Videos found: ${videoFiles.length}`);
  console.log(`Already uploaded: ${state.uploadedVideos.length}`);

  // Check if all videos are finished
  if (unuploadedVideos.length === 0) {
    console.log('');
    console.log('========================================');
    console.log('ALL VIDEOS UPLOADED');
    console.log('========================================');
    console.log('');
    console.log(`Total videos: ${videoFiles.length}`);
    console.log(`Uploaded: ${state.uploadedVideos.length}`);
    console.log('Remaining: 0');
    console.log('');
    console.log('All videos have already been uploaded.');
    process.exit(0);
  }

  // 3. Select the NEXT single video to upload
  const targetFileName = unuploadedVideos[0];
  console.log(`Next video: ${targetFileName}`);
  console.log('');

  const videoFilePath = path.join(VIDEOS_DIR, targetFileName);

  if (!fs.existsSync(videoFilePath)) {
    console.error(`❌ ERROR: Video file path does not exist: ${videoFilePath}`);
    process.exit(1);
  }

  // 4. Check if target file is an LFS pointer, and fetch ONLY this file if needed
  if (isLfsPointer(videoFilePath)) {
    fetchTargetLfsFile(targetFileName);
  }

  // 5. Verify that the downloaded file is the actual video and NOT an LFS pointer
  const finalStat = fs.statSync(videoFilePath);
  if (finalStat.size < 2000 || isLfsPointer(videoFilePath)) {
    console.error(`❌ ERROR: LFS fetch failed for ${targetFileName}. File remains an LFS pointer file (< 2KB).`);
    process.exit(1);
  }

  // 6. Load metadata from data/videos.json
  const allVideos = loadVideos();
  let videoObj = allVideos.find(v => v.fileName === targetFileName || v.id === path.basename(targetFileName, path.extname(targetFileName)));

  if (!videoObj) {
    const fileBase = path.basename(targetFileName, path.extname(targetFileName));
    videoObj = {
      id: fileBase,
      fileName: targetFileName,
      title: fileBase,
      description: DEFAULT_CHANNEL_DESCRIPTION,
      tags: [...DEFAULT_CHANNEL_TAGS],
      status: "pending",
      scheduledAt: null,
      youtubeVideoId: null,
      youtubeUrl: null,
      publishedAt: null,
      error: null
    };
    allVideos.push(videoObj);
  }

  console.log(`Uploading ${targetFileName}...`);

  // 7. Upload to YouTube API
  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    const validPrivacy = ['private', 'unlisted', 'public'].includes(PRIVACY_STATUS) ? PRIVACY_STATUS : 'public';

    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: videoObj.title || path.basename(targetFileName, path.extname(targetFileName)),
          description: videoObj.description || DEFAULT_CHANNEL_DESCRIPTION,
          tags: (videoObj.tags && videoObj.tags.length) ? videoObj.tags : DEFAULT_CHANNEL_TAGS,
          categoryId: '22'
        },
        status: {
          privacyStatus: validPrivacy,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(videoFilePath)
      }
    });

    const videoId = res.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 8. SUCCESS - Update metadata and state ONLY after API confirmation
    console.log('');
    console.log('Upload successful.');
    console.log('');
    console.log(`YouTube Video ID: ${videoId}`);
    console.log(`YouTube URL: ${videoUrl}`);
    console.log(`Privacy Status: ${res.data.status?.privacyStatus}`);
    console.log(`Self Declared Made For Kids: ${res.data.status?.selfDeclaredMadeForKids}`);
    console.log('');
    console.log('Updating state...');

    videoObj.youtubeVideoId = videoId;
    videoObj.youtubeUrl = videoUrl;
    videoObj.status = 'published';
    videoObj.publishedAt = new Date().toISOString();
    videoObj.error = null;

    saveVideos(allVideos);

    state.uploadedVideos.push(targetFileName);
    state.nextVideoIndex = state.uploadedVideos.length;
    saveUploadState(state);

    console.log('State updated successfully.');

    // Clean up downloaded binary file to restore pointer state if needed
    try {
      execSync(`git checkout -- videos/${targetFileName}`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      console.log(`Cleaned up downloaded video file: ${targetFileName}`);
    } catch (cleanErr) {
      // Ignored if git is not initialized locally
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || String(error);

    // FAILURE - Do NOT modify upload-state.json or advance state. Exit code 1 for retry.
    console.log('');
    console.error(`❌ YouTube upload failed for ${targetFileName}`);
    console.error(`Error: ${errorMsg}`);
    process.exit(1);
  }
}

// Execute scheduler
runScheduler();
