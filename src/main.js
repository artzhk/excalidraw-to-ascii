import { formatJsonText, parseSceneText, sceneToAscii } from './ascii.js';

const sceneInput = document.getElementById('scene');
const asciiOutput = document.getElementById('ascii');
const status = document.getElementById('status');
const widthInput = document.getElementById('columns');
const ietfCheckbox = document.getElementById('ietf');
const convertButton = document.getElementById('convert');
const copyButton = document.getElementById('copy');
const clearButton = document.getElementById('clear');
const themeButton = document.getElementById('theme');

const themeStorageKey = 'excalidraw-to-ascii-theme';

const getPreferredTheme = () => {
  const stored = window.localStorage.getItem(themeStorageKey);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  themeButton.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  window.localStorage.setItem(themeStorageKey, theme);
};

const setStatus = (message, isError = false) => {
  status.textContent = message;
  status.className = isError ? 'mt-3 text-sm text-rose-300' : 'mt-3 text-sm text-slate-400';
};

const getColumns = () => {
  if (ietfCheckbox.checked) {
    return 72;
  }
  const value = Number(widthInput.value);
  return Number.isFinite(value) ? value : 120;
};

ietfCheckbox.addEventListener('change', () => {
  widthInput.disabled = ietfCheckbox.checked;
  widthInput.classList.toggle('opacity-50', ietfCheckbox.checked);
  if (sceneInput.value.trim()) {
    void convertScene();
  }
});

const convertScene = async () => {
  const formatted = formatJsonText(sceneInput.value);

  if (formatted.ok) {
    sceneInput.value = formatted.text;
  }

  const parsed = parseSceneText(sceneInput.value);

  if (!parsed.ok) {
    asciiOutput.value = '';
    setStatus(parsed.error, true);
    return;
  }

  convertButton.disabled = true;
  convertButton.classList.add('opacity-60');
  setStatus('Rendering scene...');

  try {
    asciiOutput.value = sceneToAscii(parsed.scene, {
      columns: getColumns(),
      aspectRatio: 3,
    });

    setStatus(`Exported ${parsed.scene.elements.length} element${parsed.scene.elements.length === 1 ? '' : 's'}.`);
  } catch (error) {
    console.error(error);
    asciiOutput.value = '';
    setStatus(error instanceof Error ? error.message : 'Export failed.', true);
  } finally {
    convertButton.disabled = false;
    convertButton.classList.remove('opacity-60');
  }
};

sceneInput.addEventListener('paste', () => {
  window.setTimeout(() => {
    if (sceneInput.value.trim()) {
      void convertScene();
    }
  }, 0);
});

convertButton.addEventListener('click', () => {
  void convertScene();
});

copyButton.addEventListener('click', async () => {
  if (!asciiOutput.value) {
    await convertScene();
  }

  const text = asciiOutput.value;

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus('ASCII copied.');
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : 'Copy failed.', true);
  }
});

clearButton.addEventListener('click', () => {
  sceneInput.value = '';
  asciiOutput.value = '';
  setStatus('Cleared.');
  sceneInput.focus();
});

sceneInput.focus();
applyTheme(getPreferredTheme());

themeButton.addEventListener('click', () => {
  applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
});
