async function isAiGenerated(textToCheck) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "checkAI", text: textToCheck },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (response?.error) {
          console.error("Response error:", response.error);
          reject(response.error);
        } else {
          resolve(response?.result);
        }
      }
    );
  });
}

async function checkBatchAiGenerated(posts) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { 
        action: "checkBatchAI", 
        posts: posts.map(p => ({
          id: p.id,
          text: p.text
        }))
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (response?.error) {
          console.error("Response error:", response.error);
          reject(response.error);
        } else {
          resolve(response?.results);
        }
      }
    );
  });
}


function sanitizeText(text) {
  return text
    ?.trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, ' ') // Replace newlines with space
    .trim();
}

function extractPostContent(element) {
  // For title elements
  if (element.tagName.toLowerCase() === 'h3' || element.tagName.toLowerCase() === 'h1') {
    return {
      type: 'title',
      title: sanitizeText(element.textContent),
      originalElement: element
    };
  }

  // For body elements
  const postBody = element.closest('[data-click-id="body"]');
  if (postBody) {
    const titleElement = postBody.querySelector('h3, h1');
    const bodyElement = postBody.querySelector('[data-click-id="text"], .Post-content');
    
    return {
      type: 'post',
      title: titleElement ? sanitizeText(titleElement.textContent) : '',
      body: bodyElement ? sanitizeText(bodyElement.textContent) : sanitizeText(element.textContent),
      originalElement: element
    };
  }

  // Default case
  return {
    type: 'content',
    content: sanitizeText(element.textContent),
    originalElement: element
  };
}

async function setElementBackground() {
  const postSelectors = [
  '[slot="title"]',
  '[slot="text-body"]',
  '[data-click-id="body"]',
  'article[data-testid="post-container"]',
  'div[data-click-id="body"]'
];

  let elements = [];

  // Handle Shadow DOM posts
  document.querySelectorAll("shreddit-post").forEach(post => {
  const root = post.shadowRoot;
  if (root) {
    postSelectors.forEach(selector => {
      root.querySelectorAll(selector).forEach(el => elements.push(el));
    });
  }
});

// ✅ Handle fallback (old Reddit / classic)
postSelectors.forEach(selector => {
  document.querySelectorAll(selector).forEach(el => elements.push(el));
});

  if (elements.length === 0) {
    console.log("⚠️ No Reddit post elements found yet.");
    return;
  }

  console.log(`🔍 Found ${elements.length} text elements to analyze.`);

  for (const element of elements) {
    const textToAnalyze = element.textContent?.trim();
    
    // Skip short texts and recommendation messages
    if (!textToAnalyze || 
        textToAnalyze.length < 30 || 
        textToAnalyze.includes("Because you've shown interest") ||
        textToAnalyze.includes("Because you've visited this community before") ||

        textToAnalyze.includes("Popular in") ||
        textToAnalyze.includes("Recommended") ||
        textToAnalyze.includes("Similar to") ||
        textToAnalyze.includes("More posts from") ||
        textToAnalyze.includes("People also enjoyed")) continue;

    try {
      const isAi = await isAiGenerated(textToAnalyze);
      element.style.backgroundColor = isAi ? "rgba(255, 0, 0, 0.25)" : "rgba(0, 255, 0, 0.25)";
      element.style.borderLeft = isAi ? "4px solid red" : "4px solid green";
    } catch (error) {
      console.error("❌ Error analyzing element:", error);
      element.style.backgroundColor = "gray";
    } finally {
      console.log("✅ Checked element:", element);
    }
  }
}


// Debounce to avoid spam runs
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}


// Run once when page loads
window.addEventListener("load", () => {
  console.log("🚀 Running initial Reddit AI detection...");
  setTimeout(setElementBackground, 1000); // wait 3s for posts to render
});

// Re-run on scroll
window.addEventListener(
  "DOMContentLoaded",
  debounce(() => {
    setElementBackground();
  }, 2000)
);