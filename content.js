async function isAiGenerated(textToCheck) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "checkAI", text: textToCheck },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (!response) {
          reject(new Error("No response from background script"));
        } else if (response.error) {
          console.error("Response error:", response.error);
          reject(response.error);
        } else {
          resolve(response.result);
        }
      }
    );
  });
}

async function setElementBackground(selector) {
  const elements = document.querySelectorAll(selector);
  for (const element of elements) {
    // Skip already-processed elements
    if (element.dataset.aiChecked) continue;

    const textToAnalyze = element.textContent.trim();
    if (!textToAnalyze) continue;

    try {
      const isAi = await isAiGenerated(textToAnalyze);
      element.style.backgroundColor = isAi ? "red" : "green";
    } catch (error) {
      console.error("Error:", error);
      element.style.backgroundColor = "gray";
    } finally {
      element.dataset.aiChecked = "true"; // mark as processed
      console.log("checked element:", element);
    }
  }
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ✅ Run immediately when script loads
setElementBackground("p");

// ✅ Observe dynamic changes (e.g., Reddit loads more posts)
const observer = new MutationObserver(
  debounce(() => setElementBackground("p"), 1000)
);
observer.observe(document.body, { childList: true, subtree: true });
