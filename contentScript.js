/* contentScript.js
   Observes reddit posts/comments in the DOM, computes a heuristic AI-likelihood score,
   and inserts a small badge next to each post/comment author/timestamp.
*/

(async () => {
  // Load sensitivity from storage (default)
  const DEFAULT = { thresholdLikelyAI: 0.75, thresholdPossibleAI: 0.45, minChars: 50 };
  let config = { ...DEFAULT };
  try {
    const stored = await chrome.storage.sync.get(Object.keys(DEFAULT));
    config = { ...config, ...stored };
  } catch (e) {
    console.warn("Could not load settings, using defaults.", e);
  }

  // Utility: create badge element
  function makeBadge(text, score) {
    const badge = document.createElement("span");
    badge.className = "raidet-badge";
    badge.dataset.score = String(score.toFixed(2));
    badge.innerText = text;
    badge.title = `AI-likelihood: ${Math.round(score * 100)}%`;
    return badge;
  }

  // Insert style for badges
  const style = document.createElement("style");
  style.textContent = `
    .raidet-badge {
      display:inline-block;
      margin-left:8px;
      padding:2px 6px;
      border-radius:10px;
      font-size:11px;
      font-weight:600;
      vertical-align:middle;
      box-shadow:0 1px 2px rgba(0,0,0,0.15);
    }
    .raidet-ai { background: linear-gradient(90deg,#ffb199,#ff7b7b); color:#3b0808; }
    .raidet-maybe { background: linear-gradient(90deg,#ffe9a8,#ffd36b); color:#3b2300; }
    .raidet-human { background: linear-gradient(90deg,#bdf7c9,#6fe7a7); color:#003b12; }
    .raidet-note { font-size:10px; opacity:0.85; margin-left:6px; }
  `;
  document.head.appendChild(style);

  // Heuristic scoring function
  function computeAiScore(text) {
    if (!text) return 0;
    const cleaned = text.replace(/\s+/g, " ").trim();
    const chars = cleaned.length;
    const words = cleaned.split(/\s+/);
    const wordCount = words.length;
    const sentenceCount = Math.max(1, (cleaned.match(/[.!?]+/g) || []).length);
    const avgSentenceLen = wordCount / sentenceCount;
    const avgWordLen = cleaned.replace(/\s+/g, '').length / Math.max(1, wordCount);

    // Feature 1: Repetition ratio (repeated words / total)
    const wordFreq = {};
    words.forEach(w => {
      const key = w.toLowerCase().replace(/[^a-z0-9']/g, "");
      if (!key) return;
      wordFreq[key] = (wordFreq[key] || 0) + 1;
    });
    const repeated = Object.values(wordFreq).filter(v => v > 1).reduce((s, v) => s + (v - 1), 0);
    const repetitionRatio = repeated / Math.max(1, wordCount);

    // Feature 2: Vocabulary diversity
    const uniqueWords = Object.keys(wordFreq).length;
    const diversity = uniqueWords / Math.max(1, wordCount); // lower -> more repetitive -> more likely AI

    // Feature 3: Overly even sentence length (AI often produces medium-length balanced sentences)
    // If avgSentenceLen within [12,24] and std dev low -> small penalty.
    const sentenceMatches = cleaned.split(/(?<=[.!?])\s+/);
    const sentenceWordCounts = sentenceMatches.map(s => s.split(/\s+/).filter(Boolean).length);
    const mean = sentenceWordCounts.reduce((a,b)=>a+b,0)/sentenceWordCounts.length;
    const variance = sentenceWordCounts.reduce((a,b)=>a + Math.pow(b - mean,2), 0) / sentenceWordCounts.length;
    const std = Math.sqrt(variance);

    // Feature 4: Punctuation richness (lack of commas/colons may signal generated text)
    const punctuationDensity = (cleaned.match(/[.,;:!?()-]/g) || []).length / Math.max(1, sentenceCount);

    // Feature 5: Use of "AI-y" phrases — boilerplate/hedging phrases commonly produced by LLMs
    const aiPhrases = [
      "as an ai", "as an ai language model", "i'm an ai", "as an artificial intelligence",
      "as a language model", "in conclusion", "to summarize", "overall", "in summary",
      "it's important to note", "it is important to note", "it is worth noting"
    ];
    const lower = cleaned.toLowerCase();
    const aiPhraseCount = aiPhrases.reduce((s, p) => s + (lower.includes(p) ? 1 : 0), 0);

    // Feature 6: Formality score (average presence of high-prob function words). We'll approximate:
    const stopwords = ["the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at"];
    let stopwordCount = 0;
    words.forEach(w => { if (stopwords.includes(w.toLowerCase().replace(/[^a-z]/g,''))) stopwordCount++; });
    const stopwordRatio = stopwordCount / Math.max(1, wordCount);

    // Combine features into a score 0..1 (higher = more likely AI)
    // Weights chosen heuristically — adjust via popup settings if needed.
    let score =
      0.22 * Math.min(1, repetitionRatio * 6) +                       // repetition strong signal
      0.18 * (1 - Math.min(1, diversity * 1.5)) +                     // low diversity -> more likely
      0.14 * ( (avgSentenceLen >= 8 && avgSentenceLen <= 28) ? (1 - Math.min(1, std/6)) : 0 ) + // too even
      0.12 * (1 - Math.min(1, punctuationDensity / 4)) +              // low punctuation -> more likely
      0.20 * Math.min(1, aiPhraseCount / 2) +                         // explicit AI phrases
      0.14 * Math.min(1, stopwordRatio * 1.2);                        // odd stopword ratios

    // Adjust for very short text (hard to classify)
    if (chars < 80) {
      // push score toward 0.5 (uncertain)
      score = score * 0.6 + 0.4 * 0.5;
    }

    // Bound
    score = Math.max(0, Math.min(1, score));
    return { score, features: { repetitionRatio, diversity, avgSentenceLen, std, punctuationDensity, aiPhraseCount, stopwordRatio, chars } };
  }

  // Find reddit content blocks (works for new reddit and old reddit)
  const contentSelectors = [
    'div[data-test-id="post-content"]',          // new reddit post body container
    'div[data-testid="post-container"]',         // new reddit
    'div[data-test-id="comment"]',               // comments
    'div[id^="t1_"]',                            // comment nodes (old reddit)
    '.Comment:not(.raidet-processed)',           // fallback
    '.post:not(.raidet-processed)'
  ];

  function getTextFromNode(node) {
    // Remove reply buttons and other noise
    const clone = node.cloneNode(true);
    // remove media, code blocks for cleaner text
    clone.querySelectorAll('img, iframe, video, pre, code, svg, noscript').forEach(n => n.remove());
    // get text
    return clone.innerText || "";
  }

  function annotateNode(node) {
    if (!node || node.classList.contains('raidet-processed')) return;
    node.classList.add('raidet-processed');

    // find the text element inside (post body or comment body)
    // reddit uses different structures; search for common containers
    let textElement = node.querySelector('[data-testid="post-container"], [data-test-id="post-content"], [data-test-id="comment"], .md, .RichTextJSON-root, p, .Comment, .usertext-body');
    if (!textElement) {
      // fallback to node itself
      textElement = node;
    }
    const text = getTextFromNode(textElement).trim();
    if (!text || text.length < config.minChars) return; // skip tiny items

    const { score } = computeAiScore(text);
    let badge;
    if (score >= config.thresholdLikelyAI) {
      badge = makeBadge("Likely AI", score);
      badge.classList.add("raidet-ai");
    } else if (score >= config.thresholdPossibleAI) {
      badge = makeBadge("Possible AI", score);
      badge.classList.add("raidet-maybe");
    } else {
      badge = makeBadge("Likely Human", score);
      badge.classList.add("raidet-human");
    }

    // Attempt to place badge in author line or near header
    // Reddit new: .PostHeader or ._3XFx6CfPlg-4Usgxm0gK8R etc. We'll attempt generic placements:
    const headerPlace = node.querySelector('[data-testid="post-title"], h1, h2, .PostHeader, .entry .tagline, .author, .Comment__header');
    if (headerPlace) {
      headerPlace.appendChild(badge);
    } else {
      // put at top-right of node
      node.style.position = node.style.position || 'relative';
      badge.style.position = 'absolute';
      badge.style.right = '8px';
      badge.style.top = '8px';
      node.appendChild(badge);
    }

    // Also add an accessible note
    const note = document.createElement('div');
    note.className = 'raidet-note';
    note.innerText = `AI-likelihood: ${Math.round(score * 100)}% (heuristic).`;
    note.style.marginTop = '4px';
    note.style.fontSize = '11px';
    note.style.opacity = '0.9';
    // append if room
    try {
      (textElement.parentElement || node).appendChild(note);
    } catch (e) {}

    // store score as dataset (useful for popup or future)
    node.dataset.raidetScore = score;
  }

  // Scan existing items
  function scanExisting() {
    const nodes = new Set();
    contentSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(n => nodes.add(n));
    });
    nodes.forEach(n => annotateNode(n));
  }

  // Observe DOM changes to pick up new comments/posts
  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of Array.from(m.addedNodes || [])) {
        if (!(n instanceof HTMLElement)) continue;
        // if the added node matches common selectors or contains them
        for (const sel of contentSelectors) {
          if (n.matches && n.matches(sel)) {
            annotateNode(n);
          } else {
            n.querySelectorAll && n.querySelectorAll(sel).forEach(el => annotateNode(el));
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // initial scan
  scanExisting();

  // Listen for settings updates from popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      for (const k of Object.keys(DEFAULT)) {
        if (changes[k]) config[k] = changes[k].newValue;
      }
      // re-run scan to update badges if thresholds changed
      scanExisting();
    }
  });

  console.log("Reddit AI Detector content script initialized.");
})();
