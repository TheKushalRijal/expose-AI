let currentStep = 0;

const steps = [
  {
    title: "Expose AI",
    subtitle: "Detect AI-generated content on Reddit",
    content: `
      <h1 class="content-title">Welcome to Expose AI</h1>
      <p class="content-subtitle">Your intelligent companion for identifying AI-generated text</p>
      <p class="content-description">
        Expose AI uses advanced machine learning to analyze Reddit posts and comments, 
        helping you distinguish between human and AI-generated content in real-time.
      </p>
      <div class="feature-grid">
        <div class="feature-item">
          <span class="feature-icon">🔍</span>
          <h3 class="feature-title">Smart Detection</h3>
          <p class="feature-desc">Advanced AI analysis</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">⚡</span>
          <h3 class="feature-title">Real-time</h3>
          <p class="feature-desc">Instant results as you browse</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🎯</span>
          <h3 class="feature-title">Accurate</h3>
          <p class="feature-desc">Confidence-based scoring</p>
        </div>
      </div>
    `
  },
  {
    title: "How it works",
    subtitle: "Seamless integration",
    content: `
      <h1 class="content-title">Automatic Detection</h1>
      <p class="content-subtitle">Works silently in the background</p>
      <p class="content-description">
        As you scroll through Reddit, Expose AI automatically analyzes text content. 
        No manual actions required—just browse naturally and we'll highlight suspicious content.
      </p>
      <div class="tip-box">
        <p>💡 Powered by Google Gemini AI for accurate, real-time analysis</p>
      </div>
    `
  },
  {
    title: "Understanding the colors",
    subtitle: "Visual indicators",
    content: `
      <h1 class="content-title">Color-Coded Results</h1>
      <p class="content-subtitle">Instant visual feedback</p>
      <p class="content-description">
        Text is highlighted based on AI confidence levels. 
        Each color represents a different likelihood of AI generation.
      </p>
      <div class="legend-container">
        <div class="legend-item">
          <div class="legend-color ai"></div>
          <div class="legend-text">
            <h3>AI-Generated (71-100%)</h3>
            <p>Light red underlined text indicates high confidence of AI content</p>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-color unsure"></div>
          <div class="legend-text">
            <h3>Unsure (41-70%)</h3>
            <p>Yellow underlined text indicates uncertain classification</p>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-color human"></div>
          <div class="legend-text">
            <h3>Human-Written (0-40%)</h3>
            <p>No highlighting—appears as normal text</p>
          </div>
        </div>
      </div>
    `
  },
  {
    title: "Get Started",
    subtitle: "Optional login",
    content: `
      <h1 class="content-title">You're All Set</h1>
      <p class="content-subtitle">Start detecting AI content now</p>
      
      <div class="login-section">
        <h2 class="login-title">Track Your Statistics</h2>
        <p class="login-desc">Login to save your detection history and access advanced features</p>
        
        <div class="login-benefits">
          <div class="benefit-item">
            <span class="benefit-icon">💾</span>
            <span class="benefit-text">Persistent statistics that don't reset</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📊</span>
            <span class="benefit-text">Detailed analytics dashboard</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📈</span>
            <span class="benefit-text">Track detection history over time</span>
          </div>
        </div>
        
        <div class="login-actions">
          <button id="loginBtn" class="login-btn primary">Login with Auth0</button>
          <button id="skipLoginBtn" class="login-btn secondary">Continue Without Login</button>
        </div>
      </div>
      
      <div class="tip-box" style="margin-top: 40px;">
        <p>💡 Without login, your statistics will reset when you close your browser</p>
      </div>
    `
  }
];

function updateStep() {
  const step = steps[currentStep];
  
  // Update content
  document.getElementById('contentArea').innerHTML = step.content;
  
  // Update step indicators
  document.querySelectorAll('.step').forEach((dot, index) => {
    dot.classList.remove('active', 'completed');
    if (index === currentStep) {
      dot.classList.add('active');
    } else if (index < currentStep) {
      dot.classList.add('completed');
    }
  });
  
  // Update buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  prevBtn.disabled = currentStep === 0;
  
  if (currentStep === steps.length - 1) {
    nextBtn.style.display = 'none'; // Hide on last step
  } else {
    nextBtn.style.display = 'block';
    nextBtn.textContent = 'Continue';
  }
  
  // Add event listeners for login buttons on last step
  if (currentStep === steps.length - 1) {
    const loginBtn = document.getElementById('loginBtn');
    const skipBtn = document.getElementById('skipLoginBtn');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;
        try {
          await window.auth0Client.login();
        } catch (error) {
          console.error('Login failed:', error);
          loginBtn.textContent = 'Login with Auth0';
          loginBtn.disabled = false;
          alert('Login failed. Please try again.');
        }
      });
    }
    
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        finishSetup(false);
      });
    }
  }
}

function finishSetup(loggedIn) {
  chrome.storage.local.set({ hasSeenWelcome: true }, () => {
    chrome.tabs.create({ url: 'https://www.reddit.com' });
    window.close();
  });
}

document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    updateStep();
  }
});

document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    updateStep();
  }
});

// Initialize
updateStep();