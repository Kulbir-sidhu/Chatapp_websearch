import { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import YouTubeDownload from './components/YouTubeDownload';
import './App.css';

function App() {
  const [user, setUser] = useState(() => localStorage.getItem('chatapp_user'));
  const [activeTab, setActiveTab] = useState('chat');

  const handleLogin = (username) => {
    localStorage.setItem('chatapp_user', username);
    setUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatapp_user');
    setUser(null);
  };

  if (user) {
    return (
      <div className="app-tabs">
        <nav className="app-tab-nav" aria-label="Main">
          <button
            type="button"
            className={`app-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button
            type="button"
            className={`app-tab ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            YouTube Channel Download
          </button>
        </nav>
        {activeTab === 'chat' && <Chat username={user} onLogout={handleLogout} />}
        {activeTab === 'youtube' && <YouTubeDownload onLogout={handleLogout} />}
      </div>
    );
  }
  return <Auth onLogin={handleLogin} />;
}

export default App;
