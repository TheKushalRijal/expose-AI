(async function() {
  // Check authentication
  const isAuth = await window.auth0Client.isAuthenticated();
  
  if (!isAuth) {
    // Not logged in, redirect to welcome
    chrome.tabs.create({ url: chrome.runtime.getURL('frontend/welcome.html') });
    window.close();
    return;
  }

  // Load user data
  const user = await window.auth0Client.getCurrentUser();
  
  if (user) {
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('userEmail').textContent = user.email || '';
    
    // Set avatar with fallback
    const avatarEl = document.getElementById('userAvatar');
    if (user.picture) {
      avatarEl.src = user.picture;
    } else {
      // Create a simple colored circle with initial
      const initial = (user.name || user.email || '?')[0].toUpperCase();
      avatarEl.src = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="50" fill="#0071e3"/>
          <text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial" font-weight="600">${initial}</text>
        </svg>
      `)}`;
    }
  }

  // Load stats
  async function loadStats() {
    const data = await chrome.storage.local.get([
      'ai_detection_count', 
      'human_detection_count', 
      'unsure_detection_count',
      'detection_history'
    ]);
    
    const aiCount = data.ai_detection_count || 0;
    const humanCount = data.human_detection_count || 0;
    const unsureCount = data.unsure_detection_count || 0;
    const total = aiCount + humanCount + unsureCount;

    document.getElementById('aiCount').textContent = aiCount;
    document.getElementById('humanCount').textContent = humanCount;
    document.getElementById('unsureCount').textContent = unsureCount;
    document.getElementById('totalCount').textContent = total;

    // Load recent activity
    const history = data.detection_history || [];
    displayActivity(history);
  }

  function displayActivity(history) {
    const activityList = document.getElementById('activityList');
    
    if (history.length === 0) {
      activityList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>No activity yet. Start browsing Reddit to see results!</p>
        </div>
      `;
      return;
    }

    // Show last 20 items, most recent first
    const recentItems = history.slice(-20).reverse();
    
    activityList.innerHTML = recentItems.map(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      let emoji = '🤖';
      let label = 'AI';
      if (item.category === 'human') {
        emoji = '👤';
        label = 'Human';
      } else if (item.category === 'unsure') {
        emoji = '❓';
        label = 'Unsure';
      }
      
      return `
        <div class="activity-item">
          <div class="activity-type">
            <span class="activity-badge ${item.category}">${emoji} ${label}</span>
            <span class="activity-confidence">Confidence: ${item.confidence}%</span>
          </div>
          <div class="activity-time">${dateStr} at ${timeStr}</div>
        </div>
      `;
    }).join('');
  }

  // Auto-refresh stats every 3 seconds
  loadStats();
  const refreshInterval = setInterval(loadStats, 3000);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout? Your statistics will be preserved and available when you login again.')) {
      await window.auth0Client.logout();
    }
  });

  // Go to Reddit button
  document.getElementById('goToRedditBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.reddit.com' });
  });
})();