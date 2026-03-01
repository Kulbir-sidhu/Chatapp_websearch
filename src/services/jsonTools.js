/**
 * Chat tools for YouTube channel JSON data (videos array).
 * Used when the user has loaded channel data via the YouTube Channel Download tab or attached JSON.
 */

export const JSON_TOOL_DECLARATIONS = [
  {
    name: 'compute_stats_json',
    description:
      'Compute mean, median, std, min, and max for a numeric field in the channel videos JSON. ' +
      'Call when the user asks for statistics, average, or distribution of a numeric column. ' +
      'Supported fields: viewCount, likeCount, commentCount. Duration can be used if stored as numeric seconds.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field: {
          type: 'STRING',
          description: 'Numeric field name: viewCount, likeCount, commentCount (or duration if numeric).',
        },
      },
      required: ['field'],
    },
  },
  {
    name: 'plot_metric_vs_time',
    description:
      'Plot a numeric metric (views, likes, comments) vs time for the channel videos. ' +
      'Creates a chart displayed in the chat. Use when the user asks to plot or visualize a metric over time.',
    parameters: {
      type: 'OBJECT',
      properties: {
        metric: {
          type: 'STRING',
          description: 'Metric to plot: viewCount, likeCount, or commentCount.',
        },
      },
      required: ['metric'],
    },
  },
  {
    name: 'play_video',
    description:
      'Open or play a YouTube video from the loaded channel data. ' +
      'Returns a clickable card (title + thumbnail) that opens the video in a new tab. ' +
      'Use when the user says "play", "open", or "watch" a video. They can specify by: title (e.g. "the asbestos video"), ordinal (e.g. "first video", "third video"), or "most viewed".',
    parameters: {
      type: 'OBJECT',
      properties: {
        selector: {
          type: 'STRING',
          description:
            'How to pick the video: "most viewed" for highest viewCount; "1" or "first" for first video, "2" or "second" for second, etc.; or a substring of the video title (e.g. "asbestos").',
        },
      },
      required: ['selector'],
    },
  },
];

function toNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseReleaseDate(releaseDate) {
  if (!releaseDate) return null;
  const d = new Date(releaseDate);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

/**
 * Execute a JSON tool. videos = array of channel video objects from our YouTube fetch shape.
 */
export function executeJsonTool(toolName, args, videos) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return { error: 'No channel video data loaded. Load channel data first (YouTube Channel Download or attach JSON).' };
  }

  if (toolName === 'compute_stats_json') {
    const field = args?.field || 'viewCount';
    const values = videos
      .map((v) => toNumber(v[field]))
      .filter((n) => n != null);
    if (values.length === 0) {
      return { error: `No numeric values found for field "${field}".` };
    }
    values.sort((a, b) => a - b);
    const sum = values.reduce((s, n) => s + n, 0);
    const mean = sum / values.length;
    const min = values[0];
    const max = values[values.length - 1];
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    const variance = values.reduce((s, n) => s + (n - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    return { mean, median, std, min, max, count: values.length, field };
  }

  if (toolName === 'plot_metric_vs_time') {
    const metric = args?.metric || 'viewCount';
    const data = videos
      .map((v) => ({
        date: v.releaseDate || '',
        value: toNumber(v[metric]),
        title: v.title || '',
      }))
      .filter((d) => d.value != null && d.date)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (data.length === 0) {
      return { error: `No valid (date, ${metric}) points found.` };
    }
    return {
      _chartType: 'metric_vs_time',
      data,
      metricKey: metric,
      metricLabel: metric === 'viewCount' ? 'Views' : metric === 'likeCount' ? 'Likes' : metric === 'commentCount' ? 'Comments' : metric,
    };
  }

  if (toolName === 'play_video') {
    const selector = (args?.selector || '').toString().trim().toLowerCase();
    let video = null;

    if (/most viewed/.test(selector)) {
      const sorted = [...videos].sort((a, b) => (toNumber(b.viewCount) || 0) - (toNumber(a.viewCount) || 0));
      video = sorted[0];
    } else if (/first|^1(st)?$/.test(selector)) {
      video = videos[0];
    } else if (/second|^2(nd)?$/.test(selector)) {
      video = videos[1];
    } else if (/third|^3(rd)?$/.test(selector)) {
      video = videos[2];
    } else if (/^\d+$/.test(selector)) {
      const idx = parseInt(selector, 10);
      video = videos[idx - 1];
    } else if (selector) {
      video = videos.find((v) => (v.title || '').toLowerCase().includes(selector));
    }

    if (!video) {
      return { error: `No video matched "${args?.selector}". Try "most viewed", "first", or part of a title.` };
    }

    const videoId = video.videoId || video.video_url?.split('v=')[1];
    const videoUrl = video.videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : null;
    return {
      _cardType: 'youtube_video',
      videoId,
      videoUrl,
      title: video.title || 'Video',
      thumbnailUrl,
    };
  }

  return { error: `Unknown tool: ${toolName}` };
}
