import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadVideos, saveVideos } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEDULE_FILE = path.join(__dirname, '../data/schedule.json');
const SCHEDULE_JS_FILE = path.join(__dirname, '../data/schedule.js');

/**
 * Loads schedule configuration safely
 */
function loadScheduleConfig() {
  const defaultConfig = {
    enabled: true,
    startDate: "2026-08-10",
    videosPerDay: 2,
    uploadTimes: ["12:30", "19:30"],
    timezone: "Asia/Kolkata"
  };

  try {
    if (!fs.existsSync(SCHEDULE_FILE)) {
      return defaultConfig;
    }
    const content = fs.readFileSync(SCHEDULE_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return { ...defaultConfig, ...parsed };
  } catch (e) {
    console.warn(`Warning: Could not read schedule.json (${e.message}). Using default schedule config.`);
    return defaultConfig;
  }
}

/**
 * Saves schedule config to both schedule.json and schedule.js
 */
export function saveScheduleConfig(config) {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(config, null, 2), 'utf-8');
    const jsContent = `window.SCHEDULE_DATA = ${JSON.stringify(config, null, 2)};\n`;
    fs.writeFileSync(SCHEDULE_JS_FILE, jsContent, 'utf-8');
  } catch (e) {
    console.error('Error saving schedule config:', e.message);
  }
}

/**
 * Generates an ISO timestamp string for a given date and time string in Asia/Kolkata (+05:30 offset)
 * @param {Date} dateObj 
 * @param {string} timeStr - "HH:mm" e.g., "12:30" or "19:30"
 * @returns {string} ISO Date String
 */
function createKolkataTimestamp(dateObj, timeStr) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');

  const [hh, min] = timeStr.split(':').map(s => String(s).padStart(2, '0'));

  // Asia/Kolkata offset is +05:30
  const kolkataIso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00+05:30`;
  const d = new Date(kolkataIso);
  return d.toISOString();
}

/**
 * Main Scheduling Runner Function
 */
function runScheduler() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const config = loadScheduleConfig();
  const videos = loadVideos();

  // Filter pending videos only
  const pendingVideos = videos.filter(v => v.status === 'pending');

  if (pendingVideos.length === 0) {
    console.log('No pending videos found to schedule.');
    return;
  }

  const vpd = Math.min(2, Math.max(1, config.videosPerDay || 1));
  const uploadTimes = config.uploadTimes || ["12:30", "19:30"];
  
  // Parse start date
  let startDate = new Date(config.startDate || new Date().toISOString().split('T')[0]);
  if (isNaN(startDate.getTime())) {
    startDate = new Date();
  }

  console.log(`=== YouTube Shorts Scheduler ===`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (Preview Only)' : 'LIVE EXECUTION'}`);
  console.log(`Start Date: ${config.startDate}`);
  console.log(`Videos Per Day: ${vpd}`);
  console.log(`Upload Times (IST): ${uploadTimes.slice(0, vpd).join(', ')}`);
  console.log(`Pending Videos to Schedule: ${pendingVideos.length}`);
  console.log('--------------------------------------------------');

  const scheduledAssignments = [];
  let currentDate = new Date(startDate);
  let pendingIdx = 0;

  while (pendingIdx < pendingVideos.length) {
    for (let slot = 0; slot < vpd && pendingIdx < pendingVideos.length; slot++) {
      const timeStr = uploadTimes[slot] || (slot === 0 ? "12:30" : "19:30");
      const scheduledIso = createKolkataTimestamp(currentDate, timeStr);
      const video = pendingVideos[pendingIdx];

      scheduledAssignments.push({
        video,
        scheduledIso,
        displayTime: `${currentDate.toDateString()} at ${timeStr} (IST)`
      });

      pendingIdx++;
    }

    // Advance to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Display assignments summary
  scheduledAssignments.forEach((item, index) => {
    console.log(`[${index + 1}] ${item.video.fileName} -> ${item.scheduledIso} (${item.displayTime})`);
  });

  console.log('--------------------------------------------------');

  if (isDryRun) {
    console.log(`DRY RUN COMPLETE: ${scheduledAssignments.length} videos WOULD be scheduled.`);
    console.log('No changes were written to videos.json (pass without --dry-run to apply).');
  } else {
    // Apply changes to video objects
    scheduledAssignments.forEach(item => {
      item.video.status = 'scheduled';
      item.video.scheduledAt = item.scheduledIso;
    });

    saveVideos(videos);
    console.log(`SUCCESSFULLY SCHEDULED ${scheduledAssignments.length} VIDEOS!`);
    console.log('Updated data/videos.json and data/videos.js.');
  }
}

// Run script
runScheduler();
