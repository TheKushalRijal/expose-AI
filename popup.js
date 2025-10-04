// popup.js: handle saving settings
document.addEventListener('DOMContentLoaded', async () => {
  const t1 = document.getElementById('t1');
  const t2 = document.getElementById('t2');
  const min = document.getElementById('min');
  const t1v = document.getElementById('t1v');
  const t2v = document.getElementById('t2v');
  const minv = document.getElementById('minv');
  const save = document.getElementById('save');
  const reset = document.getElementById('reset');

  const DEFAULT = { thresholdLikelyAI: 0.75, thresholdPossibleAI: 0.45, minChars: 50 };

  // load stored
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULT));
  const cfg = { ...DEFAULT, ...stored };

  t1.value = cfg.thresholdLikelyAI;
  t2.value = cfg.thresholdPossibleAI;
  min.value = cfg.minChars;

  t1v.innerText = Number(t1.value).toFixed(2);
  t2v.innerText = Number(t2.value).toFixed(2);
  minv.innerText = min.value;

  t1.addEventListener('input', () => t1v.innerText = Number(t1.value).toFixed(2));
  t2.addEventListener('input', () => t2v.innerText = Number(t2.value).toFixed(2));
  min.addEventListener('input', () => minv.innerText = min.value);

  save.addEventListener('click', async () => {
    const toStore = {
      thresholdLikelyAI: Number(t1.value),
      thresholdPossibleAI: Number(t2.value),
      minChars: Number(min.value)
    };
    await chrome.storage.sync.set(toStore);
    // give brief feedback
    save.innerText = 'Saved!';
    setTimeout(()=> save.innerText = 'Save', 900);
  });

  reset.addEventListener('click', async () => {
    await chrome.storage.sync.set(DEFAULT);
    t1.value = DEFAULT.thresholdLikelyAI;
    t2.value = DEFAULT.thresholdPossibleAI;
    min.value = DEFAULT.minChars;
    t1v.innerText = DEFAULT.thresholdLikelyAI.toFixed(2);
    t2v.innerText = DEFAULT.thresholdPossibleAI.toFixed(2);
    minv.innerText = DEFAULT.minChars;
    reset.innerText = 'Reset!';
    setTimeout(()=> reset.innerText = 'Reset', 900);
  });
});
