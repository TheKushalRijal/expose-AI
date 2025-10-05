// Auth0 Configuration - UPDATE THESE!
const AUTH0_DOMAIN = 'YOUR_AUTH0_DOMAIN.us.auth0.com'; // Change this
const AUTH0_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';         // Change this
const REDIRECT_URI = chrome.runtime.getURL('frontend/callback.html');

class Auth0Client {
  constructor() {
    this.user = null;
  }

  generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
  }

  base64urlencode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    bytes.forEach(byte => str += String.fromCharCode(byte));
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async generateCodeChallenge(verifier) {
    const hashed = await this.sha256(verifier);
    return this.base64urlencode(hashed);
  }

  async login() {
    try {
      const codeVerifier = this.generateRandomString(64);
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateRandomString(32);

      await chrome.storage.local.set({
        auth_code_verifier: codeVerifier,
        auth_state: state
      });

      const authUrl = `https://${AUTH0_DOMAIN}/authorize?` +
        `response_type=code` +
        `&client_id=${AUTH0_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=openid profile email` +
        `&state=${state}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256`;

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

  async exchangeCodeForToken(code, codeVerifier) {
    const tokenUrl = `https://${AUTH0_DOMAIN}/oauth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  async getUserInfo(accessToken) {
    const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  async isAuthenticated() {
    const result = await chrome.storage.local.get(['auth_user', 'auth_token']);
    return !!(result.auth_user && result.auth_token);
  }

  async getCurrentUser() {
    const result = await chrome.storage.local.get(['auth_user']);
    return result.auth_user || null;
  }

  async logout() {
    await chrome.storage.local.remove(['auth_user', 'auth_token']);
    
    const logoutUrl = `https://${AUTH0_DOMAIN}/v2/logout?` +
      `client_id=${AUTH0_CLIENT_ID}` +
      `&returnTo=${encodeURIComponent(REDIRECT_URI)}`;
    
    chrome.tabs.create({ url: logoutUrl });
  }
}

window.auth0Client = new Auth0Client();