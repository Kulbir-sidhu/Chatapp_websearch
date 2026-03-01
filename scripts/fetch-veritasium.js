/**
 * Fetches channel data for 10 videos from https://www.youtube.com/@veritasium
 * and saves to public/veritasium_channel_data.json.
 *
 * Requires YOUTUBE_API_KEY or REACT_APP_YOUTUBE_API_KEY in .env
 * Run from project root: node scripts/fetch-veritasium.js
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { fetchChannelVideoData } = require('../server/youtube');

const CHANNEL_URL = 'https://www.youtube.com/@veritasium';
const MAX_VIDEOS = 10;
const OUT_PATH = path.join(__dirname, '..', 'public', 'veritasium_channel_data.json');

async function main() {
  console.log('Fetching channel data for', CHANNEL_URL, 'max', MAX_VIDEOS, 'videos…');
  const data = await fetchChannelVideoData({
    channelUrl: CHANNEL_URL,
    maxVideos: MAX_VIDEOS,
    includeTranscript: true,
    onProgress(percent, message) {
      console.log(`[${percent}%] ${message}`);
    },
  });
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('Saved to', OUT_PATH);
  console.log('Videos:', data.videos.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
