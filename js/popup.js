// Popup functionality for JetPrompt

let currentPrompts = [];
let allTags = [];
let activeFilters = [];
let editingPromptId = null;

// DOM elements
const searchInput = document.getElementById('searchInput');
const tagFilters = document.getElementById('tagFilters');
const addPromptInput = document.getElementById('addPromptInput');
const addTagsInput = document.getElementById('addTagsInput');
const addPromptBtn = document.getElementById('addPromptBtn');
const promptsList = document.getElementById('promptsList');
const emptyState = document.getElementById('emptyState');
const syncBanner = document.getElementById('syncBanner');
const syncBannerText = document.getElementById('syncBannerText');
const syncBannerClose = document.getElementById('syncBannerClose');
const settingsBtn = document.getElementById('settingsBtn');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadPrompts();
  setupEventListeners();
  await syncFromDriveOnLoad();
});

// Setup event listeners
function setupEventListeners() {
  searchInput.addEventListener('input', handleSearch);
  addPromptBtn.addEventListener('click', handleAddPrompt);
  addPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddPrompt();
    }
  });
  syncBannerClose.addEventListener('click', hideSyncBanner);
  settingsBtn.addEventListener('click', openSettings);
}

// Load prompts from storage
async function loadPrompts() {
  try {
    currentPrompts = await getPrompts();
    updateTagFilters();
    renderPrompts();
  } catch (error) {
    console.error('Error loading prompts:', error);
    showSyncBanner('Error loading prompts.', 'error');
  }
}

// Update tag filters
function updateTagFilters() {
  const tagSet = new Set();
  currentPrompts.forEach(prompt => {
    prompt.tags.forEach(tag => tagSet.add(tag));
  });
  allTags = Array.from(tagSet).sort();
  
  tagFilters.innerHTML = '';
  allTags.forEach(tag => {
    const tagBtn = document.createElement('button');
    tagBtn.className = 'jetprompt-tag-filter';
    tagBtn.textContent = tag;
    tagBtn.addEventListener('click', () => toggleTagFilter(tag));
    tagFilters.appendChild(tagBtn);
  });
}

// Toggle tag filter
function toggleTagFilter(tag) {
  const index = activeFilters.indexOf(tag);
  if (index > -1) {
    activeFilters.splice(index, 1);
  } else {
    activeFilters.push(tag);
  }
  
  // Update UI
  const tagBtns = tagFilters.querySelectorAll('.jetprompt-tag-filter');
  tagBtns.forEach(btn => {
    if (activeFilters.includes(btn.textContent)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  renderPrompts();
}

// Handle search
function handleSearch() {
  renderPrompts();
}

// Render prompts
function renderPrompts() {
  const searchText = searchInput.value.toLowerCase();
  const filteredPrompts = currentPrompts.filter(prompt => {
    const matchesSearch = !searchText || prompt.text.toLowerCase().includes(searchText);
    const matchesTags = activeFilters.length === 0 || activeFilters.every(tag => prompt.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  if (filteredPrompts.length === 0) {
    promptsList.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  promptsList.style.display = 'block';
  emptyState.style.display = 'none';

  promptsList.innerHTML = '';
  filteredPrompts.forEach(prompt => {
    const promptCard = createPromptCard(prompt);
    promptsList.appendChild(promptCard);
  });
}

// Create prompt card
function createPromptCard(prompt) {
  const card = document.createElement('div');
  card.className = `jetprompt-prompt-card ${prompt.isFavorite ? 'favorite' : ''}`;
  card.dataset.promptId = prompt.id;

  const promptText = document.createElement('div');
  promptText.className = 'jetprompt-prompt-text';
  promptText.textContent = prompt.text;
  promptText.addEventListener('click', () => startEditing(prompt.id, promptText));

  const meta = document.createElement('div');
  meta.className = 'jetprompt-prompt-meta';

  const tags = document.createElement('div');
  tags.className = 'jetprompt-prompt-tags';
  prompt.tags.forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.className = 'jetprompt-prompt-tag';
    tagSpan.textContent = tag;
    tags.appendChild(tagSpan);
  });

  const actions = document.createElement('div');
  actions.className = 'jetprompt-prompt-actions';

  const favoriteBtn = document.createElement('button');
  favoriteBtn.className = `jetprompt-action-btn ${prompt.isFavorite ? 'favorite' : ''}`;
  favoriteBtn.innerHTML = prompt.isFavorite ? '⭐' : '☆';
  favoriteBtn.title = 'Toggle favorite';
  favoriteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleToggleFavorite(prompt.id);
  });

  const copyBtn = document.createElement('button');
  copyBtn.className = 'jetprompt-action-btn';
  copyBtn.innerHTML = '📋';
  copyBtn.title = 'Copy to clipboard';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCopyPrompt(prompt.text);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'jetprompt-action-btn delete';
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.title = 'Delete prompt';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDeletePrompt(prompt.id);
  });

  actions.appendChild(favoriteBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(deleteBtn);

  meta.appendChild(tags);
  meta.appendChild(actions);

  card.appendChild(promptText);
  card.appendChild(meta);

  // Click to copy
  card.addEventListener('click', () => {
    if (!promptText.contentEditable || promptText.contentEditable === 'false') {
      handleCopyPrompt(prompt.text);
    }
  });

  return card;
}

// Start editing prompt
function startEditing(promptId, textElement) {
  if (editingPromptId && editingPromptId !== promptId) {
    finishEditing();
  }

  editingPromptId = promptId;
  textElement.contentEditable = true;
  textElement.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(textElement);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  textElement.addEventListener('blur', finishEditing);
  textElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      finishEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  });
}

// Finish editing prompt
async function finishEditing() {
  if (!editingPromptId) return;

  const textElement = document.querySelector(`[data-prompt-id="${editingPromptId}"] .jetprompt-prompt-text`);
  if (!textElement) return;

  const newText = textElement.textContent.trim();
  if (newText) {
    const prompt = currentPrompts.find(p => p.id === editingPromptId);
    if (prompt && prompt.text !== newText) {
      prompt.text = newText;
      await updatePrompt(prompt);
      await syncToDriveAfterUpdate();
    }
  }

  textElement.contentEditable = false;
  editingPromptId = null;
}

// Cancel editing
function cancelEditing() {
  if (!editingPromptId) return;

  const textElement = document.querySelector(`[data-prompt-id="${editingPromptId}"] .jetprompt-prompt-text`);
  if (textElement) {
    const prompt = currentPrompts.find(p => p.id === editingPromptId);
    if (prompt) {
      textElement.textContent = prompt.text;
    }
    textElement.contentEditable = false;
  }

  editingPromptId = null;
}

// Handle add prompt
async function handleAddPrompt() {
  const text = addPromptInput.value.trim();
  const tagsText = addTagsInput.value.trim();
  
  if (!text) return;

  const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
  
  const newPrompt = {
    text: text,
    tags: tags,
    isFavorite: false
  };

  try {
    const addedPrompt = await addPrompt(newPrompt);
    currentPrompts.push(addedPrompt);
    
    // Clear inputs
    addPromptInput.value = '';
    addTagsInput.value = '';
    
    updateTagFilters();
    renderPrompts();
    
    await syncToDriveAfterUpdate();
  } catch (error) {
    console.error('Error adding prompt:', error);
    showSyncBanner('Error adding prompt.', 'error');
  }
}

// Handle toggle favorite
async function handleToggleFavorite(promptId) {
  try {
    const newFavoriteStatus = await toggleFavorite(promptId);
    const prompt = currentPrompts.find(p => p.id === promptId);
    if (prompt) {
      prompt.isFavorite = newFavoriteStatus;
      renderPrompts();
      await syncToDriveAfterUpdate();
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    showSyncBanner('Error updating favorite status.', 'error');
  }
}

// Handle copy prompt
async function handleCopyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text);
    showSyncBanner('Copied to clipboard!', 'success', 2000);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    showSyncBanner('Failed to copy to clipboard.', 'error');
  }
}

// Handle delete prompt
async function handleDeletePrompt(promptId) {
  if (!confirm('Are you sure you want to delete this prompt?')) return;

  try {
    await deletePrompt(promptId);
    currentPrompts = currentPrompts.filter(p => p.id !== promptId);
    updateTagFilters();
    renderPrompts();
    await syncToDriveAfterUpdate();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    showSyncBanner('Error deleting prompt.', 'error');
  }
}

// Sync from Drive on load
async function syncFromDriveOnLoad() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'syncFromDrive' }, resolve);
    });
    
    if (response && response.success) {
      if (response.message.includes('Synced from Google Drive')) {
        await loadPrompts(); // Reload prompts if synced from Drive
        showSyncBanner(response.message, 'success', 3000);
      }
    } else if (response && !response.success) {
      showSyncBanner(response.message, 'warning');
    }
  } catch (error) {
    console.error('Error syncing from Drive on load:', error);
  }
}

// Sync to Drive after update
async function syncToDriveAfterUpdate() {
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'syncToDrive' }, resolve);
    });
    
    if (response && !response.success) {
      showSyncBanner(response.message, 'warning');
    }
  } catch (error) {
    console.error('Error syncing to Drive:', error);
  }
}

// Show sync banner
function showSyncBanner(message, type = 'info', duration = 5000) {
  syncBannerText.textContent = message;
  syncBanner.className = `jetprompt-banner ${type}`;
  syncBanner.style.display = 'flex';
  
  if (duration > 0) {
    setTimeout(hideSyncBanner, duration);
  }
}

// Hide sync banner
function hideSyncBanner() {
  syncBanner.style.display = 'none';
}

// Open settings
function openSettings() {
  chrome.runtime.openOptionsPage();
}

