// Auth0 Configuration
// Auth0 Configuration - UPDATE THESE!
const AUTH0_DOMAIN = 'dev-buwyowk8m1k4ncct.us.auth0.com'; // Your actual Auth0 domain
const AUTH0_CLIENT_ID = '8MXrPqSYHl0qDzqkHsGeZP427vnwGCrZ'; // Your actual Client ID
const REDIRECT_URI = chrome.runtime.getURL('frontend/callback.html');

class Auth0Client {
  constructor() {
    this.user = null;
  }

  // Generate random string for PKCE
  generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Create SHA256 hash
  async sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
  }

  // Base64 URL encode
  base64urlencode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    bytes.forEach(byte => str += String.fromCharCode(byte));
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Generate code challenge for PKCE
  async generateCodeChallenge(verifier) {
    const hashed = await this.sha256(verifier);
    return this.base64urlencode(hashed);
  }

  // Login
  async login() {
    try {
      // Generate and store code verifier
      const codeVerifier = this.generateRandomString(64);
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateRandomString(32);

      // Store for later use
      await chrome.storage.local.set({
        auth_code_verifier: codeVerifier,
        auth_state: state
      });

      // Build authorization URL
      const authUrl = `https://${AUTH0_DOMAIN}/authorize?` +
        `response_type=code` +
        `&client_id=${AUTH0_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=openid profile email` +
        `&state=${state}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

      // Open auth window
      chrome.windows.create({
        url: authUrl,
        type: 'popup',
        width: 500,
        height: 700
      });

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Exchange code for token
  async exchangeCodeForToken(code, codeVerifier) {
    const tokenUrl = `https://${AUTH0_DOMAIN}/oauth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: AUTH0_CLIENT_ID,
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return await response.json();
  }

  // Get user info
  async getUserInfo(accessToken) {
    const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  // Check if user is logged in
  async isAuthenticated() {
    const result = await chrome.storage.local.get(['auth_user', 'auth_token']);
    return !!(result.auth_user && result.auth_token);
  }

  // Get current user
  async getCurrentUser() {
    const result = await chrome.storage.local.get(['auth_user']);
    return result.auth_user || null;
  }

  // Logout
  async logout() {
    await chrome.storage.local.remove(['auth_user', 'auth_token', 'auth_code_verifier', 'auth_state']);
    
    const logoutUrl = `https://${AUTH0_DOMAIN}/v2/logout?` +
      `client_id=${AUTH0_CLIENT_ID}` +
      `&returnTo=${encodeURIComponent(REDIRECT_URI)}`;
    
    chrome.tabs.create({ url: logoutUrl });
  }
}

// Export as global
window.auth0Client = new Auth0Client();