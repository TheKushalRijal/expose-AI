(async function() {
  // Check authentication
  const isAuth = await window.auth0Client.isAuthenticated();
  
  if (!isAuth) {
    window.location.href = chrome.runtime.getURL('frontend/welcome.html');
    return;
  }

  // Load user data
  const user = await window.auth0Client.getCurrentUser();
  
  if (user) {
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('userEmail').textContent = user.email || '';
    document.getElementById('userAvatar').src = user.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%239333ea"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial">?</text></svg>';
  }

  // Load stats
  async function loadStats() {
    const data = await chrome.storage.local.get(['ai_detection_count', 'human_detection_count', 'detection_history']);
    
    const aiCount = data.ai_detection_count || 0;
    const humanCount = data.human_detection_count || 0;
    const total = aiCount + humanCount;
    const aiPercentage = total > 0 ? Math.round((aiCount / total) * 100) : 0;

    document.getElementById('aiCount').textContent = aiCount;
    document.getElementById('humanCount').textContent = humanCount;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('aiPercentage').textContent = `${aiPercentage}%`;

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

    activityList.innerHTML = history.slice(-10).reverse().map(item => `
      <div class="activity-item">
        <div class="activity-type">
          <span class="activity-badge ${item.type}">${item.type === 'ai' ? '🤖 AI' : '👤 Human'}</span>
          <span>${new Date(item.timestamp).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  }

  // Auto-refresh stats every 2 seconds
  loadStats();
  setInterval(loadStats, 2000);

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
      await window.auth0Client.logout();
    }
  });

  // Reset stats button
  document.getElementById('resetStatsBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all statistics?')) {
      await chrome.storage.local.set({
        ai_detection_count: 0,
        human_detection_count: 0,
        detection_history: []
      });
      loadStats();
    }
  });

  // Go to Reddit button
  document.getElementById('goToRedditBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.reddit.com' });
  });
})();