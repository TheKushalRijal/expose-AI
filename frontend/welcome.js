let currentStep = 0;

const steps = [
  {
    icon: "🛡️",
    title: "Welcome to Expose AI",
    description: "Your AI-powered text detection companion for Reddit",
    content: `
      <p style="font-size: 18px; margin-bottom: 20px;">
        Expose AI helps you identify AI-generated content on Reddit in real-time.
      </p>
      <div class="feature-grid">
        <div class="feature-box">
          <div class="emoji">🔍</div>
          <div class="text">Detect AI</div>
        </div>
        <div class="feature-box">
          <div class="emoji">⚡</div>
          <div class="text">Fast Analysis</div>
        </div>
        <div class="feature-box">
          <div class="emoji">🎯</div>
          <div class="text">Accurate</div>
        </div>
      </div>
    `
  },
  {
    icon: "⚡",
    title: "Real-Time Detection",
    description: "We analyze text as you browse and highlight AI-generated content",
    content: `
      <p style="font-size: 18px; margin-bottom: 30px;">
        As you scroll through Reddit, our extension automatically analyzes text content.
      </p>
      <div style="background: rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 10px; border: 1px solid rgba(168, 85, 247, 0.3);">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
          <div style="width: 15px; height: 15px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite;"></div>
          <span>Scanning in progress...</span>
        </div>
        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.6);">
          Powered by Google Gemini AI
        </div>
      </div>
    `
  },
  {
    icon: "🎨",
    title: "Color Coding",
    description: "Red backgrounds indicate AI-generated text, Green means human-written",
    content: `
      <p style="font-size: 18px; margin-bottom: 30px;">
        Text highlighting makes it easy to spot AI-generated content at a glance.
      </p>
      <div class="color-demo">
        <div class="color-box ai">
          <div class="label">🤖 AI-Generated</div>
          <div class="desc">Red background indicates likely AI content</div>
        </div>
        <div class="color-box human">
          <div class="label">👤 Human-Written</div>
          <div class="desc">Green background indicates human content</div>
        </div>
      </div>
    `
  },
  {
    icon: "🚀",
    title: "Ready to Start!",
    description: "Start browsing Reddit and we'll do the rest",
    content: `
      <p style="font-size: 20px; margin-bottom: 20px;">
        You're all set! 🎉
      </p>
      <p style="font-size: 16px; color: rgba(255, 255, 255, 0.8); margin-bottom: 30px;">
        Navigate to Reddit and the extension will automatically start detecting AI-generated text.
      </p>
      <div class="tip-box">
        <p style="font-size: 14px;">
          💡 Tip: The extension works best when you scroll slowly through content
        </p>
      </div>
    `
  }
];

// Add login button to first step
const originalStep0Content = steps[0].content;
steps[0].content = originalStep0Content + `
  <div style="margin-top: 30px;">
    <button id="loginBtn" class="btn btn-primary" style="width: 100%; padding: 15px; font-size: 16px;">
      🔐 Login with Auth0
    </button>
    <p style="margin-top: 15px; font-size: 14px; color: rgba(255,255,255,0.7);">
      Login to track your AI detection statistics
    </p>
  </div>
`;

// Listen for login button clicks
document.addEventListener('click', async (e) => {
  if (e.target.id === 'loginBtn') {
    e.target.textContent = 'Logging in...';
    e.target.disabled = true;
    try {
      await window.auth0Client.login();
    } catch (error) {
      console.error('Login failed:', error);
      e.target.textContent = '🔐 Login with Auth0';
      e.target.disabled = false;
      alert('Login failed. Please try again.');
    }
  }
});


function updateStep() {
  const step = steps[currentStep];
  
  // Update header
  document.getElementById('stepIcon').textContent = step.icon;
  document.getElementById('stepTitle').textContent = step.title;
  document.getElementById('stepDescription').textContent = step.description;
  
  // Update content
  document.getElementById('stepContent').innerHTML = step.content;
  
  // Update progress dots
  document.querySelectorAll('.progress-dot').forEach((dot, index) => {
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
    nextBtn.textContent = 'Get Started! 🚀';
    nextBtn.className = 'btn btn-success';
  } else {
    nextBtn.textContent = 'Next →';
    nextBtn.className = 'btn btn-primary';
  }
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
  } else {
    // Finish - save and close
    chrome.storage.local.set({ hasSeenWelcome: true }, () => {
      window.close();
    });
  }
});

// Initialize
updateStep();