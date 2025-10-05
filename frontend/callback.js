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

    // Store tokens and user info
    await chrome.storage.local.set({
      auth_token: tokens.access_token,
      auth_user: userInfo,
      ai_detection_count: 0, // Initialize counter
      human_detection_count: 0
    });

    // Clean up
    await chrome.storage.local.remove(['auth_state', 'auth_code_verifier']);

    document.getElementById('message').textContent = 'Success! Redirecting...';

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = chrome.runtime.getURL('frontend/dashboard.html');
    }, 1000);

  } catch (error) {
    console.error('Callback error:', error);
    document.getElementById('message').innerHTML = `
      <div class="error">
        <strong>Authentication Error</strong><br>
        ${error.message}
      </div>
    `;
  }
})();