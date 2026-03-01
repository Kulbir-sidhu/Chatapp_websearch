import { useState } from 'react';
import './YouTubeDownload.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function YouTubeDownload({ onLogout }) {
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@veritasium');
  const [maxVideos, setMaxVideos] = useState(10);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setError(null);
    setResult(null);
    setProgress({ value: 0, message: 'Starting…' });

    try {
      const res = await fetch(`${API_BASE}/api/youtube/channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl: channelUrl.trim(),
          maxVideos: Math.min(100, Math.max(1, maxVideos)),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            if (obj.type === 'progress') {
              setProgress({ value: obj.value, message: obj.message });
            } else if (obj.type === 'done') {
              setProgress(null);
              setResult(obj.data);
            } else if (obj.type === 'error') {
              throw new Error(obj.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
      if (buffer.trim()) {
        const obj = JSON.parse(buffer.trim());
        if (obj.type === 'done') setResult(obj.data);
        if (obj.type === 'error') throw new Error(obj.error);
      }
    } catch (err) {
      setError(err.message);
      setProgress(null);
    }
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube_channel_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="yt-download-layout">
      <aside className="yt-sidebar">
        <h1 className="yt-sidebar-title">YouTube Channel Download</h1>
        <button type="button" className="yt-logout-btn" onClick={onLogout}>
          Log out
        </button>
      </aside>
      <main className="yt-main">
        <div className="yt-card">
          <h2>Download channel video metadata</h2>
          <p className="yt-desc">
            Enter a YouTube channel URL. Metadata (title, description, transcript if available,
            duration, release date, views, likes, comments, video URL) will be saved to a JSON file.
          </p>
          <div className="yt-field">
            <label htmlFor="channel-url">Channel URL</label>
            <input
              id="channel-url"
              type="url"
              placeholder="https://www.youtube.com/@channel"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              disabled={!!progress}
            />
          </div>
          <div className="yt-field">
            <label htmlFor="max-videos">Max videos (1–100)</label>
            <input
              id="max-videos"
              type="number"
              min={1}
              max={100}
              value={maxVideos}
              onChange={(e) => setMaxVideos(Number(e.target.value) || 10)}
              disabled={!!progress}
            />
          </div>
          {error && <div className="yt-error">{error}</div>}
          {progress && (
            <div className="yt-progress-wrap">
              <div className="yt-progress-bar">
                <div className="yt-progress-fill" style={{ width: `${progress.value}%` }} />
              </div>
              <span className="yt-progress-msg">{progress.message}</span>
            </div>
          )}
          <div className="yt-actions">
            <button
              type="button"
              className="yt-download-btn"
              onClick={handleDownload}
              disabled={!!progress}
            >
              Download Channel Data
            </button>
            {result && (
              <button type="button" className="yt-save-json-btn" onClick={handleDownloadJson}>
                Save as JSON file
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
