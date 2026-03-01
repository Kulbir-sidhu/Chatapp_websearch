export default function VideoCard({ videoUrl, title, thumbnailUrl }) {
  return (
    <a
      className="chat-video-card"
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {thumbnailUrl && (
        <div className="chat-video-card-thumb">
          <img src={thumbnailUrl} alt="" />
        </div>
      )}
      <div className="chat-video-card-title">{title || 'Watch on YouTube'}</div>
      <span className="chat-video-card-open">Open in new tab →</span>
    </a>
  );
}
