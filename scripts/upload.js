import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { loadVideos, saveVideos } from './utils.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

/**
 * Validates presence of required environment variables
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
    console.error('Please configure your .env file with your OAuth credentials and Refresh Token.');
    console.error('If you need to generate a Refresh Token, run: npm run auth');
    process.exit(1);
  }
}

/**
 * Main YouTube Video Upload Script
 */
async function uploadVideo() {
  validateEnv();

  const videos = loadVideos();
  
  // Find the first eligible video for upload (pending or scheduled, not published)
  const targetVideo = videos.find(v => (v.status === 'pending' || v.status === 'scheduled') && v.status !== 'published');

  if (!targetVideo) {
    console.log('No eligible video found for upload.');
    return;
  }

  const videoFilePath = path.join(__dirname, '../videos', targetVideo.fileName);

  if (!fs.existsSync(videoFilePath)) {
    console.error(`❌ ERROR: Video file not found at path: ${videoFilePath}`);
    targetVideo.status = 'failed';
    targetVideo.error = `Video file missing on disk: ${targetVideo.fileName}`;
    saveVideos(videos);
    process.exit(1);
  }

  // Print Terminal Output Header as requested
  console.log('Starting YouTube upload...');
  console.log('');
  console.log('Video:');
  console.log(targetVideo.fileName);
  console.log('');
  console.log('Title:');
  console.log(targetVideo.title || targetVideo.fileName);
  console.log('');
  console.log('Uploading...');

  // Set transient status to uploading
  targetVideo.status = 'uploading';
  saveVideos(videos);

  try {
    // Initialize Google OAuth2 client
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    // Execute upload call to YouTube Data API v3
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: targetVideo.title || targetVideo.fileName,
          description: targetVideo.description || '',
          tags: targetVideo.tags || []
        },
        status: {
          privacyStatus: 'private', // Test mode: private upload
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(videoFilePath)
      }
    });

    const videoId = res.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Update metadata on successful upload
    targetVideo.youtubeVideoId = videoId;
    targetVideo.youtubeUrl = videoUrl;
    targetVideo.status = 'published';
    targetVideo.publishedAt = new Date().toISOString();
    targetVideo.error = null;

    saveVideos(videos);

    console.log('');
    console.log('Upload successful.');
    console.log('');
    console.log('YouTube Video ID:');
    console.log(videoId);
    console.log('');
    console.log('YouTube URL:');
    console.log(videoUrl);
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || String(error);
    
    targetVideo.status = 'failed';
    targetVideo.error = errorMsg;
    saveVideos(videos);

    console.log('');
    console.error('Upload failed.');
    console.error(`Error: ${errorMsg}`);
    process.exit(1);
  }
}

// Execute upload script
uploadVideo();
