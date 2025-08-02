// Options page functionality for JetPrompt

let currentSettings = {
  enableDriveSync: false,
  autoSync: true
};

// DOM elements
const enableDriveSync = document.getElementById('enableDriveSync');
const autoSync = document.getElementById('autoSync');
const driveControls = document.getElementById('driveControls');
const syncStatusText = document.getElementById('syncStatusText');
const syncNowBtn = document.getElementById('syncNowBtn');
const disconnectDriveBtn = document.getElementById('disconnectDriveBtn');
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
  enableDriveSync.addEventListener('change', handleDriveSyncToggle);
  autoSync.addEventListener('change', handleAutoSyncToggle);
  syncNowBtn.addEventListener('click', handleSyncNow);
  disconnectDriveBtn.addEventListener('click', handleDisconnectDrive);
  customizeShortcutBtn.addEventListener('click', handleCustomizeShortcut);
  exportDataBtn.addEventListener('click', handleExportData);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportData);
  clearDataBtn.addEventListener('click', handleClearData);
  statusBannerClose.addEventListener('click', hideStatusBanner);
}

// Load settings
async function loadSettings() {
  try {
    const result = await new Promise((resolve) => {
      chrome.storage.sync.get(['jetprompt_settings'], resolve);
    });
    
    if (result.jetprompt_settings) {
      currentSettings = { ...currentSettings, ...result.jetprompt_settings };
    }
    
    // Update UI
    enableDriveSync.checked = currentSettings.enableDriveSync;
    autoSync.checked = currentSettings.autoSync;
    
    updateDriveControlsVisibility();
    await updateSyncStatus();
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatusBanner('Error loading settings.', 'error');
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

// Handle Drive sync toggle
async function handleDriveSyncToggle() {
  currentSettings.enableDriveSync = enableDriveSync.checked;
  await saveSettings();
  
  updateDriveControlsVisibility();
  
  if (currentSettings.enableDriveSync) {
    // Try to authenticate and sync
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'syncFromDrive' }, resolve);
      });
      
      if (response && response.success) {
        showStatusBanner('Google Drive sync enabled successfully!', 'success');
        await updateSyncStatus();
      } else {
        showStatusBanner('Failed to enable Google Drive sync. Please try again.', 'error');
        enableDriveSync.checked = false;
        currentSettings.enableDriveSync = false;
        await saveSettings();
        updateDriveControlsVisibility();
      }
    } catch (error) {
      console.error('Error enabling Drive sync:', error);
      showStatusBanner('Error enabling Google Drive sync.', 'error');
      enableDriveSync.checked = false;
      currentSettings.enableDriveSync = false;
      await saveSettings();
      updateDriveControlsVisibility();
    }
  } else {
    showStatusBanner('Google Drive sync disabled.', 'warning');
    await updateSyncStatus();
  }
}

// Handle auto sync toggle
async function handleAutoSyncToggle() {
  currentSettings.autoSync = autoSync.checked;
  await saveSettings();
  
  const message = currentSettings.autoSync ? 'Auto-sync enabled.' : 'Auto-sync disabled.';
  showStatusBanner(message, 'success');
}

// Update Drive controls visibility
function updateDriveControlsVisibility() {
  driveControls.style.display = currentSettings.enableDriveSync ? 'block' : 'none';
}

// Update sync status
async function updateSyncStatus() {
  if (!currentSettings.enableDriveSync) {
    syncStatusText.textContent = 'Google Drive sync is disabled.';
    return;
  }
  
  try {
    // Check if we can get an auth token (indicates connection)
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ 'interactive': false }, function(token) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
    
    if (token) {
      syncStatusText.textContent = 'Connected to Google Drive. Sync is active.';
    } else {
      syncStatusText.textContent = 'Not connected to Google Drive.';
    }
  } catch (error) {
    syncStatusText.textContent = 'Not connected to Google Drive.';
  }
}

// Handle sync now
async function handleSyncNow() {
  if (!currentSettings.enableDriveSync) {
    showStatusBanner('Google Drive sync is disabled.', 'warning');
    return;
  }
  
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = 'Syncing...';
  
  try {
    // Sync from Drive first
    const syncFromResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'syncFromDrive' }, resolve);
    });
    
    // Then sync to Drive
    const syncToResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'syncToDrive' }, resolve);
    });
    
    if (syncFromResponse && syncFromResponse.success && syncToResponse && syncToResponse.success) {
      showStatusBanner('Sync completed successfully!', 'success');
      await updateStats(); // Refresh stats in case data changed
    } else {
      const errorMessage = (syncFromResponse && !syncFromResponse.success) ? syncFromResponse.message : 
                          (syncToResponse && !syncToResponse.success) ? syncToResponse.message : 
                          'Sync failed.';
      showStatusBanner(errorMessage, 'error');
    }
  } catch (error) {
    console.error('Error during sync:', error);
    showStatusBanner('Error during sync.', 'error');
  } finally {
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = 'Sync Now';
  }
}

// Handle disconnect Drive
async function handleDisconnectDrive() {
  if (!confirm('Are you sure you want to disconnect from Google Drive? This will disable sync but won\'t delete your data.')) {
    return;
  }
  
  try {
    // Revoke auth token
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ 'interactive': false }, function(token) {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(token);
        }
      });
    });
    
    if (token) {
      await new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ 'token': token }, resolve);
      });
    }
    
    // Disable sync
    currentSettings.enableDriveSync = false;
    enableDriveSync.checked = false;
    await saveSettings();
    updateDriveControlsVisibility();
    
    showStatusBanner('Disconnected from Google Drive.', 'success');
    await updateSyncStatus();
  } catch (error) {
    console.error('Error disconnecting from Drive:', error);
    showStatusBanner('Error disconnecting from Google Drive.', 'error');
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
    if (currentSettings.enableDriveSync && currentSettings.autoSync) {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'syncToDrive' }, resolve);
      });
    }
    
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

