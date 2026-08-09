import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/videos.json');

/**
 * Reads the video queue from data/videos.json
 * @returns {Array} Array of video objects
 */
export function loadVideos() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.videos)) {
      return parsed.videos;
    } else if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error reading videos.json:', error.message);
    return [];
  }
}

/**
 * Formats JSON object with tags array compact on a single line
 */
export function formatJsonWithSingleLineTags(dataObj) {
  let jsonStr = JSON.stringify(dataObj, null, 2);
  jsonStr = jsonStr.replace(/"tags":\s*\[\s*([\s\S]*?)\s*\]/g, (match, p1) => {
    const items = p1.split('\n').map(s => s.trim()).filter(Boolean).join(' ');
    return `"tags": [ ${items} ]`;
  });
  return jsonStr;
}

/**
 * Saves the video queue array back to data/videos.json under { videos: [...] }
 * @param {Array} videos 
 */
export function saveVideos(videos) {
  try {
    const dataObj = { videos };
    const jsonContent = formatJsonWithSingleLineTags(dataObj);

    fs.writeFileSync(DATA_FILE, jsonContent, 'utf-8');

    const jsFile = path.join(path.dirname(DATA_FILE), 'videos.js');
    const jsContent = `window.VIDEOS_DATA = ${jsonContent};\n`;
    fs.writeFileSync(jsFile, jsContent, 'utf-8');

    console.log(`Successfully updated ${DATA_FILE}`);
  } catch (error) {
    console.error('Error writing to videos.json:', error.message);
  }
}

/**
 * Returns summary statistics for video statuses
 * @param {Array} videos 
 */
export function calculateStats(videos = []) {
  return {
    total: videos.length,
    pending: videos.filter(v => v.status === 'pending').length,
    scheduled: videos.filter(v => v.status === 'scheduled').length,
    uploading: videos.filter(v => v.status === 'uploading').length,
    published: videos.filter(v => v.status === 'published').length,
    failed: videos.filter(v => v.status === 'failed').length
  };
}

/**
 * Finds the next scheduled video chronologically
 * @param {Array} videos 
 */
export function getNextUpload(videos = []) {
  const now = new Date();
  const scheduled = videos
    .filter(v => v.status === 'scheduled' && v.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  
  return scheduled.find(v => new Date(v.scheduledAt) > now) || scheduled[0] || null;
}

/**
 * Formats a Date into a human-readable string
 * @param {string|Date} dateIso 
 */
export function formatDate(dateIso) {
  if (!dateIso) return 'N/A';
  const d = new Date(dateIso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
