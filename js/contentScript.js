// Content script for JetPrompt Quick Insert Overlay

let quickInsertOverlay = null;
let currentFocusedElement = null;
let overlayPrompts = [];
let selectedIndex = 0;
let searchQuery = '';

// Initialize content script
function initContentScript() {
  // Listen for keyboard shortcut
  document.addEventListener('keydown', handleKeyboardShortcut);
  
  // Track focused elements
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);
}

// Handle keyboard shortcut
function handleKeyboardShortcut(e) {
  // Ctrl+Shift+J (or Cmd+Shift+J on Mac)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
    e.preventDefault();
    e.stopPropagation();
    
    if (quickInsertOverlay) {
      hideQuickInsertOverlay();
    } else {
      showQuickInsertOverlay();
    }
  }
}

// Handle focus in
function handleFocusIn(e) {
  const element = e.target;
  if (isEditableElement(element)) {
    currentFocusedElement = element;
  }
}

// Handle focus out
function handleFocusOut(e) {
  // Small delay to allow for refocusing
  setTimeout(() => {
    if (!document.activeElement || !isEditableElement(document.activeElement)) {
      currentFocusedElement = null;
    }
  }, 100);
}

// Check if element is editable
function isEditableElement(element) {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const type = element.type ? element.type.toLowerCase() : '';
  
  // Exclude password fields and hidden inputs
  if (type === 'password' || type === 'hidden') return false;
  
  // Include text inputs, textareas, and contenteditable elements
  return (
    (tagName === 'input' && (type === 'text' || type === 'email' || type === 'search' || type === 'url' || type === '' || type === 'tel')) ||
    tagName === 'textarea' ||
    element.contentEditable === 'true'
  );
}

// Show quick insert overlay
async function showQuickInsertOverlay() {
  if (!currentFocusedElement) {
    showNotification('Please focus on a text input field first.');
    return;
  }
  
  try {
    // Get prompts from storage
    overlayPrompts = await getPromptsFromStorage();
    
    if (overlayPrompts.length === 0) {
      showNotification('No prompts available. Add some prompts first!');
      return;
    }
    
    createQuickInsertOverlay();
    renderOverlayPrompts();
    
    // Focus on search input
    const searchInput = quickInsertOverlay.querySelector('.jetprompt-overlay-search');
    if (searchInput) {
      searchInput.focus();
    }
  } catch (error) {
    console.error('Error showing quick insert overlay:', error);
    showNotification('Error loading prompts.');
  }
}

// Hide quick insert overlay
function hideQuickInsertOverlay() {
  if (quickInsertOverlay) {
    quickInsertOverlay.remove();
    quickInsertOverlay = null;
    selectedIndex = 0;
    searchQuery = '';
    
    // Refocus on the original element
    if (currentFocusedElement) {
      currentFocusedElement.focus();
    }
  }
}

// Create quick insert overlay
function createQuickInsertOverlay() {
  quickInsertOverlay = document.createElement('div');
  quickInsertOverlay.className = 'jetprompt-quick-insert-overlay';
  quickInsertOverlay.innerHTML = `
    <div class="jetprompt-overlay-container">
      <div class="jetprompt-overlay-header">
        <h3>JetPrompt - Quick Insert</h3>
        <button class="jetprompt-overlay-close">×</button>
      </div>
      <div class="jetprompt-overlay-search-container">
        <input type="text" class="jetprompt-overlay-search" placeholder="Search prompts...">
      </div>
      <div class="jetprompt-overlay-prompts-list">
        <!-- Prompts will be rendered here -->
      </div>
      <div class="jetprompt-overlay-footer">
        <span>Use ↑↓ to navigate, Enter to insert, Esc to close</span>
      </div>
    </div>
  `;
  
  // Add styles
  addOverlayStyles();
  
  // Add event listeners
  const closeBtn = quickInsertOverlay.querySelector('.jetprompt-overlay-close');
  closeBtn.addEventListener('click', hideQuickInsertOverlay);
  
  const searchInput = quickInsertOverlay.querySelector('.jetprompt-overlay-search');
  searchInput.addEventListener('input', handleOverlaySearch);
  searchInput.addEventListener('keydown', handleOverlayKeydown);
  
  // Close on outside click
  quickInsertOverlay.addEventListener('click', (e) => {
    if (e.target === quickInsertOverlay) {
      hideQuickInsertOverlay();
    }
  });
  
  document.body.appendChild(quickInsertOverlay);
}

// Add overlay styles
function addOverlayStyles() {
  if (document.getElementById('jetprompt-overlay-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'jetprompt-overlay-styles';
  styles.textContent = `
    .jetprompt-quick-insert-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Lexend Deca', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .jetprompt-overlay-container {
      background: linear-gradient(135deg, #1A252F 0%, #2C3E50 100%);
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .jetprompt-overlay-header {
      background: linear-gradient(90deg, #4ECDC4 0%, #A8E6CF 100%);
      color: #2C3E50;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .jetprompt-overlay-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      font-family: 'Orbitron', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .jetprompt-overlay-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 6px;
      color: #2C3E50;
      cursor: pointer;
      font-size: 20px;
      padding: 4px 8px;
      transition: all 0.2s ease;
    }
    
    .jetprompt-overlay-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .jetprompt-overlay-search-container {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .jetprompt-overlay-search {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid transparent;
      border-radius: 8px;
      color: #ECF0F1;
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    
    .jetprompt-overlay-search:focus {
      outline: none;
      border-color: #4ECDC4;
      background: rgba(255, 255, 255, 0.15);
    }
    
    .jetprompt-overlay-search::placeholder {
      color: #95A5A6;
    }
    
    .jetprompt-overlay-prompts-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      min-height: 200px;
      max-height: 400px;
    }
    
    .jetprompt-overlay-prompts-list::-webkit-scrollbar {
      width: 6px;
    }
    
    .jetprompt-overlay-prompts-list::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    
    .jetprompt-overlay-prompts-list::-webkit-scrollbar-thumb {
      background: #4ECDC4;
      border-radius: 3px;
    }
    
    .jetprompt-overlay-prompt-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #ECF0F1;
    }
    
    .jetprompt-overlay-prompt-item:hover,
    .jetprompt-overlay-prompt-item.selected {
      background: rgba(78, 205, 196, 0.2);
      border-color: #4ECDC4;
      transform: translateX(4px);
    }
    
    .jetprompt-overlay-prompt-text {
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 8px;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .jetprompt-overlay-prompt-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #95A5A6;
    }
    
    .jetprompt-overlay-prompt-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    
    .jetprompt-overlay-prompt-tag {
      background: #4ECDC4;
      color: #2C3E50;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
    }
    
    .jetprompt-overlay-prompt-favorite {
      color: #FFD93D;
    }
    
    .jetprompt-overlay-footer {
      background: rgba(255, 255, 255, 0.05);
      padding: 12px 20px;
      text-align: center;
      font-size: 12px;
      color: #95A5A6;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .jetprompt-overlay-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #95A5A6;
      text-align: center;
    }
    
    .jetprompt-overlay-empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `;
  
  document.head.appendChild(styles);
}

// Handle overlay search
function handleOverlaySearch(e) {
  searchQuery = e.target.value.toLowerCase();
  selectedIndex = 0;
  renderOverlayPrompts();
}

// Handle overlay keydown
function handleOverlayKeydown(e) {
  const filteredPrompts = getFilteredPrompts();
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredPrompts.length - 1);
      updateSelection();
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
      break;
      
    case 'Enter':
      e.preventDefault();
      if (filteredPrompts[selectedIndex]) {
        insertPrompt(filteredPrompts[selectedIndex]);
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      hideQuickInsertOverlay();
      break;
  }
}

// Get filtered prompts
function getFilteredPrompts() {
  if (!searchQuery) return overlayPrompts;
  
  return overlayPrompts.filter(prompt => 
    prompt.text.toLowerCase().includes(searchQuery) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery))
  );
}

// Render overlay prompts
function renderOverlayPrompts() {
  const promptsList = quickInsertOverlay.querySelector('.jetprompt-overlay-prompts-list');
  const filteredPrompts = getFilteredPrompts();
  
  if (filteredPrompts.length === 0) {
    promptsList.innerHTML = `
      <div class="jetprompt-overlay-empty">
        <div class="jetprompt-overlay-empty-icon">🔍</div>
        <div>No prompts found</div>
      </div>
    `;
    return;
  }
  
  promptsList.innerHTML = '';
  filteredPrompts.forEach((prompt, index) => {
    const promptItem = document.createElement('div');
    promptItem.className = `jetprompt-overlay-prompt-item ${index === selectedIndex ? 'selected' : ''}`;
    promptItem.innerHTML = `
      <div class="jetprompt-overlay-prompt-text">${escapeHtml(prompt.text)}</div>
      <div class="jetprompt-overlay-prompt-meta">
        <div class="jetprompt-overlay-prompt-tags">
          ${prompt.tags.map(tag => `<span class="jetprompt-overlay-prompt-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        ${prompt.isFavorite ? '<span class="jetprompt-overlay-prompt-favorite">⭐</span>' : ''}
      </div>
    `;
    
    promptItem.addEventListener('click', () => insertPrompt(prompt));
    promptsList.appendChild(promptItem);
  });
}

// Update selection
function updateSelection() {
  const promptItems = quickInsertOverlay.querySelectorAll('.jetprompt-overlay-prompt-item');
  promptItems.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Insert prompt
function insertPrompt(prompt) {
  if (!currentFocusedElement) {
    showNotification('No text field focused.');
    return;
  }
  
  try {
    const element = currentFocusedElement;
    const text = prompt.text;
    
    if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
      // For input and textarea elements
      const start = element.selectionStart;
      const end = element.selectionEnd;
      const currentValue = element.value;
      
      element.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      element.selectionStart = element.selectionEnd = start + text.length;
      
      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
      // For contenteditable elements
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        element.textContent += text;
      }
      
      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    hideQuickInsertOverlay();
    showNotification('Prompt inserted!');
  } catch (error) {
    console.error('Error inserting prompt:', error);
    showNotification('Error inserting prompt.');
  }
}

// Get prompts from storage
async function getPromptsFromStorage() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getPrompts' }, (response) => {
      resolve(response || []);
    });
  });
}

// Show notification
function showNotification(message) {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4ECDC4;
    color: #2C3E50;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Lexend Deca', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideInRight 0.3s ease-out;
  `;
  notification.textContent = message;
  
  // Add animation keyframes
  if (!document.getElementById('jetprompt-notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'jetprompt-notification-styles';
    styles.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}

