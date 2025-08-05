// Options page functionality for JetPrompt

let currentSettings = {};

// DOM elements

const customizeShortcutBtn = document.getElementById('customizeShortcutBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const clearDataBtn = document.getElementById('clearDataBtn');
const statusBanner = document.getElementById('statusBanner');
const statusBannerText = document.getElementById('statusBannerText');
const statusBannerClose = document.getElementById('statusBannerClose');
const totalPromptsCount = document.getElementById('totalPromptsCount');
const favoritePromptsCount = document.getElementById('favoritePromptsCount');
const uniqueTagsCount = document.getElementById('uniqueTagsCount');

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await updateStats();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  customizeShortcutBtn.addEventListener("click", handleCustomizeShortcut);
  exportDataBtn.addEventListener("click", handleExportData);
  importDataBtn.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", handleImportData);
  clearDataBtn.addEventListener("click", handleClearData);
  statusBannerClose.addEventListener("click", hideStatusBanner);
}

// Load settings
async function loadSettings() {
  try {
    const result = await new Promise((resolve) => {
      chrome.storage.sync.get(["jetprompt_settings"], resolve);
    });
    
    if (result.jetprompt_settings) {
      currentSettings = { ...currentSettings, ...result.jetprompt_settings };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
    showStatusBanner("Error loading settings.", "error");
  }
}

// Save settings
async function saveSettings() {
  try {
    await new Promise((resolve) => {
      chrome.storage.sync.set({ 'jetprompt_settings': currentSettings }, resolve);
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatusBanner('Error saving settings.', 'error');
  }
}













// Handle customize shortcut
function handleCustomizeShortcut() {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

// Handle export data
async function handleExportData() {
  try {
    const prompts = await getPrompts();
    
    if (prompts.length === 0) {
      showStatusBanner('No prompts to export.', 'warning');
      return;
    }
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      prompts: prompts
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `jetprompt-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    showStatusBanner(`Exported ${prompts.length} prompts successfully!`, 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showStatusBanner('Error exporting data.', 'error');
  }
}

// Handle import data
async function handleImportData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // Validate import data
    if (!importData.prompts || !Array.isArray(importData.prompts)) {
      throw new Error('Invalid import file format.');
    }
    
    // Validate each prompt
    const validPrompts = importData.prompts.filter(prompt => {
      return prompt.text && 
             Array.isArray(prompt.tags) && 
             typeof prompt.isFavorite === 'boolean';
    });
    
    if (validPrompts.length === 0) {
      showStatusBanner('No valid prompts found in import file.', 'warning');
      return;
    }
    
    // Get existing prompts
    const existingPrompts = await getPrompts();
    
    // Merge prompts (avoid duplicates based on text)
    const existingTexts = new Set(existingPrompts.map(p => p.text));
    const newPrompts = validPrompts.filter(p => !existingTexts.has(p.text));
    
    if (newPrompts.length === 0) {
      showStatusBanner('All prompts from import file already exist.', 'warning');
      return;
    }
    
    // Add new prompts
    for (const prompt of newPrompts) {
      await addPrompt({
        text: prompt.text,
        tags: prompt.tags,
        isFavorite: prompt.isFavorite
      });
    }
    
    // Sync to Drive if enabled

    
    await updateStats();
    showStatusBanner(`Imported ${newPrompts.length} new prompts successfully!`, 'success');
  } catch (error) {
    console.error('Error importing data:', error);
    showStatusBanner('Error importing data. Please check the file format.', 'error');
  } finally {
    // Clear the file input
    importFileInput.value = '';
  }
}

// Handle clear data
async function handleClearData() {
  const confirmation = prompt('This will permanently delete all your prompts. Type "DELETE" to confirm:');
  
  if (confirmation !== 'DELETE') {
    showStatusBanner('Data clearing cancelled.', 'warning');
    return;
  }
  
  try {
    await new Promise((resolve) => {
      chrome.storage.sync.clear(resolve);
    });
    
    await updateStats();
    showStatusBanner('All data cleared successfully.', 'success');
  } catch (error) {
    console.error('Error clearing data:', error);
    showStatusBanner('Error clearing data.', 'error');
  }
}

// Update stats
async function updateStats() {
  try {
    const prompts = await getPrompts();
    const favorites = prompts.filter(p => p.isFavorite);
    const allTags = new Set();
    
    prompts.forEach(prompt => {
      prompt.tags.forEach(tag => allTags.add(tag));
    });
    
    totalPromptsCount.textContent = prompts.length;
    favoritePromptsCount.textContent = favorites.length;
    uniqueTagsCount.textContent = allTags.size;
  } catch (error) {
    console.error('Error updating stats:', error);
    totalPromptsCount.textContent = '0';
    favoritePromptsCount.textContent = '0';
    uniqueTagsCount.textContent = '0';
  }
}

// Show status banner
function showStatusBanner(message, type = 'info', duration = 5000) {
  statusBannerText.textContent = message;
  statusBanner.className = `jetprompt-banner ${type}`;
  statusBanner.style.display = 'flex';
  
  if (duration > 0) {
    setTimeout(hideStatusBanner, duration);
  }
}

// Hide status banner
function hideStatusBanner() {
  statusBanner.style.display = 'none';
}

