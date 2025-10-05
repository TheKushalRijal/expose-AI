(async function() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(urlParams.get('error_description') || 'Authentication failed');
    }

    if (!code || !state) {
      throw new Error('Invalid callback parameters');
    }

    // Verify state
    const stored = await chrome.storage.local.get(['auth_state', 'auth_code_verifier']);
    
    if (stored.auth_state !== state) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    document.getElementById('message').textContent = 'Exchanging authorization code...';

    // Exchange code for token
    const tokens = await window.auth0Client.exchangeCodeForToken(code, stored.auth_code_verifier);
    
    document.getElementById('message').textContent = 'Getting user information...';

    // Get user info
    const userInfo = await window.auth0Client.getUserInfo(tokens.access_token);

    // Get existing session stats if user was browsing before login
    const sessionData = await chrome.storage.session.get([
      'session_ai_count',
      'session_human_count',
      'session_unsure_count'
    ]);

    // Get existing persistent stats
    const existingData = await chrome.storage.local.get([
      'ai_detection_count',
      'human_detection_count',
      'unsure_detection_count',
      'detection_history'
    ]);

    // Merge session stats with persistent stats (if user logged in after browsing)
    const aiCount = (existingData.ai_detection_count || 0) + (sessionData.session_ai_count || 0);
    const humanCount = (existingData.human_detection_count || 0) + (sessionData.session_human_count || 0);
    const unsureCount = (existingData.unsure_detection_count || 0) + (sessionData.session_unsure_count || 0);

    // Store tokens and user info with merged stats
    await chrome.storage.local.set({
      auth_token: tokens.access_token,
      auth_user: userInfo,
      ai_detection_count: aiCount,
      human_detection_count: humanCount,
      unsure_detection_count: unsureCount,
      detection_history: existingData.detection_history || [],
      hasSeenWelcome: true
    });

    // Clear session stats
    await chrome.storage.session.clear();

    // Clean up auth temporary data
    await chrome.storage.local.remove(['auth_state', 'auth_code_verifier']);

    document.getElementById('message').textContent = 'Success! Opening dashboard...';

    // Open dashboard in new tab and close this window
    setTimeout(() => {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL('frontend/dashboard.html')
      });
      window.close();
    }, 1000);

  } catch (error) {
    console.error('Callback error:', error);
    document.getElementById('message').innerHTML = `
      <div class="error">
        <strong>Authentication Error</strong><br>
        ${error.message}<br><br>
        <button onclick="window.close()" style="padding: 10px 20px; background: #0071e3; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
      </div>
    `;
  }
})();