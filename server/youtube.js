/**
 * YouTube channel video metadata fetcher.
 * Uses YouTube Data API v3 and youtube-transcript for captions.
 * Requires YOUTUBE_API_KEY or REACT_APP_YOUTUBE_API_KEY in .env
 */

const { google } = require('googleapis');

/**
 * Parse channel URL to get either handle (for @urls) or channel ID.
 * @param {string} url - e.g. https://www.youtube.com/@veritasium or .../channel/UC...
 * @returns {{ type: 'handle', value: string } | { type: 'channelId', value: string }}
 */
function parseChannelUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  // @handle: youtube.com/@handle or youtube.com/c/... (custom URL - we treat as handle-like; API may need channel id)
  const handleMatch = u.match(/youtube\.com\/@([^/?&#]+)/i);
  if (handleMatch) return { type: 'handle', value: handleMatch[1].trim() };
  const channelMatch = u.match(/youtube\.com\/channel\/([^/?&#]+)/i);
  if (channelMatch) return { type: 'channelId', value: channelMatch[1].trim() };
  // Allow bare handle
  const atMatch = u.match(/^@?([a-zA-Z0-9_]+)$/);
  if (atMatch) return { type: 'handle', value: atMatch[1].trim() };
  return null;
}

/**
 * Resolve to channel ID and uploads playlist ID using YouTube Data API v3.
 */
async function getChannelUploadsPlaylistId(youtube, parsed) {
  if (parsed.type === 'channelId') {
    const res = await youtube.channels.list({
      part: 'contentDetails',
      id: parsed.value,
    });
    const item = res.data?.items?.[0];
    if (!item?.contentDetails?.relatedPlaylists?.uploads)
      throw new Error('Channel not found or has no uploads');
    return {
      channelId: parsed.value,
      uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    };
  }
  if (parsed.type === 'handle') {
    const res = await youtube.channels.list({
      part: 'id,contentDetails',
      forHandle: parsed.value.startsWith('@') ? parsed.value : `@${parsed.value}`,
    });
    const item = res.data?.items?.[0];
    if (!item?.contentDetails?.relatedPlaylists?.uploads)
      throw new Error('Channel not found or has no uploads');
    return {
      channelId: item.id,
      uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    };
  }
  throw new Error('Invalid channel URL');
}

/**
 * Fetch video IDs from uploads playlist (up to maxResults).
 */
async function getVideoIdsFromPlaylist(youtube, uploadsPlaylistId, maxResults) {
  const videoIds = [];
  let nextPageToken = null;
  do {
    const res = await youtube.playlistItems.list({
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(50, maxResults - videoIds.length),
      pageToken: nextPageToken || undefined,
    });
    const items = res.data?.items || [];
    for (const item of items) {
      const vid = item.contentDetails?.videoId;
      if (vid) videoIds.push(vid);
    }
    nextPageToken = res.data?.nextPageToken || null;
    if (videoIds.length >= maxResults) break;
  } while (nextPageToken);
  return videoIds.slice(0, maxResults);
}

/**
 * Parse ISO 8601 duration (e.g. PT1H2M10S) to seconds or readable string.
 */
function parseDuration(iso) {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  const totalSeconds = h * 3600 + m * 60 + s;
  if (totalSeconds === 0) return null;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.length ? parts.join(' ') : `${totalSeconds}s`;
}

/**
 * Fetch transcript for a video (if available). Returns null on failure.
 */
async function getTranscript(videoId) {
  try {
    const { YoutubeTranscript } = require('youtube-transcript');
    const chunks = await YoutubeTranscript.fetchTranscript(videoId);
    if (Array.isArray(chunks) && chunks.length)
      return chunks.map((c) => c.text).join(' ');
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch channel video metadata (+ optional transcripts).
 * @param {object} opts
 * @param {string} opts.channelUrl
 * @param {number} opts.maxVideos
 * @param {boolean} [opts.includeTranscript=true]
 * @param {function(number, string)} [opts.onProgress] - (percent, message) => void
 * @returns {Promise<{ channelUrl: string, channelId: string, fetchedAt: string, videos: array }>}
 */
async function fetchChannelVideoData({ channelUrl, maxVideos, includeTranscript = true, onProgress }) {
  const apiKey = (process.env.YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY || '').trim();
  if (!apiKey) throw new Error('YouTube API key not set. Add YOUTUBE_API_KEY or REACT_APP_YOUTUBE_API_KEY to .env');

  const parsed = parseChannelUrl(channelUrl);
  if (!parsed) throw new Error('Invalid channel URL. Use e.g. https://www.youtube.com/@veritasium');

  const youtube = google.youtube({ version: 'v3', auth: apiKey });

  const report = (pct, msg) => {
    if (typeof onProgress === 'function') onProgress(pct, msg);
  };

  report(5, 'Resolving channel…');
  const { channelId, uploadsPlaylistId } = await getChannelUploadsPlaylistId(youtube, parsed);

  report(10, 'Fetching video list…');
  const videoIds = await getVideoIdsFromPlaylist(youtube, uploadsPlaylistId, maxVideos);
  if (videoIds.length === 0) {
    return {
      channelUrl,
      channelId,
      fetchedAt: new Date().toISOString(),
      videos: [],
    };
  }

  const videos = [];
  const batchSize = 50;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const pctBase = 10 + (80 * i) / videoIds.length;
    report(Math.round(pctBase), `Loading metadata for videos ${i + 1}-${Math.min(i + batchSize, videoIds.length)}…`);
    const res = await youtube.videos.list({
      part: 'snippet,contentDetails,statistics',
      id: batch.join(','),
    });
    const items = res.data?.items || [];
    for (const item of items) {
      const vid = item.id;
      const sn = item.snippet || {};
      const stat = item.statistics || {};
      const content = item.contentDetails || {};
      const videoUrl = `https://www.youtube.com/watch?v=${vid}`;
      let transcript = null;
      if (includeTranscript) {
        transcript = await getTranscript(vid);
      }
      videos.push({
        videoId: vid,
        videoUrl,
        title: sn.title || null,
        description: sn.description || null,
        transcript: transcript || null,
        duration: parseDuration(content.duration),
        releaseDate: sn.publishedAt || null,
        viewCount: stat.viewCount != null ? String(stat.viewCount) : null,
        likeCount: stat.likeCount != null ? String(stat.likeCount) : null,
        commentCount: stat.commentCount != null ? String(stat.commentCount) : null,
      });
      const idx = videos.length;
      report(10 + Math.round((80 * idx) / videoIds.length), `Processed ${idx}/${videoIds.length}…`);
    }
  }

  report(100, 'Done.');
  return {
    channelUrl,
    channelId,
    fetchedAt: new Date().toISOString(),
    videos,
  };
}

module.exports = { fetchChannelVideoData, parseChannelUrl };
