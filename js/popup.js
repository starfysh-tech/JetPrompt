// Popup functionality for JetPrompt

let currentPrompts = [];
let allTags = [];
let activeFilters = [];
let editingPromptId = null;
let editingTagsPromptId = null;

// DOM elements
const searchInput = document.getElementById('searchInput');
const tagFilters = document.getElementById('tagFilters');
const addPromptInput = document.getElementById('addPromptInput');
const addTagsInput = document.getElementById('addTagsInput');
const addPromptBtn = document.getElementById('addPromptBtn');
const promptsList = document.getElementById('promptsList');
const emptyState = document.getElementById('emptyState');

const settingsBtn = document.getElementById('settingsBtn');

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  await loadPrompts();
  setupEventListeners();
});
function setupEventListeners() {
  searchInput.addEventListener('input', handleSearch);
  addPromptBtn.addEventListener('click', handleAddPrompt);
  addPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddPrompt();
    }
  });
  settingsBtn.addEventListener("click", openSettings);
  
  // Setup autocomplete for add tags input
  setup_add_tags_autocomplete();
}

function setup_add_tags_autocomplete() {
  const container = addTagsInput.parentNode;
  container.style.position = 'relative';
  
  const dropdown = document.createElement('div');
  dropdown.className = 'jetprompt-tag-dropdown';
  dropdown.style.display = 'none';
  dropdown.id = 'addTagsDropdown';
  container.appendChild(dropdown);
  
  addTagsInput.addEventListener('input', (e) => handle_add_tags_input(e, dropdown));
  addTagsInput.addEventListener('keydown', (e) => handle_add_tags_keydown(e, dropdown));
  addTagsInput.addEventListener('blur', (e) => {
    setTimeout(() => {
      if (!dropdown.contains(document.activeElement)) {
        dropdown.style.display = 'none';
      }
    }, 150);
  });
}

function handle_add_tags_input(event, dropdown) {
  const input = event.target;
  const value = input.value;
  const lastCommaIndex = value.lastIndexOf(',');
  const currentTag = lastCommaIndex >= 0 ? value.substring(lastCommaIndex + 1).trim() : value.trim();
  
  if (currentTag.length === 0) {
    dropdown.style.display = 'none';
    return;
  }
  
  const existingTags = value.split(',').map(t => t.trim()).filter(t => t);
  const availableTags = allTags.filter(tag => 
    tag.toLowerCase().includes(currentTag.toLowerCase()) && 
    !existingTags.includes(tag)
  );
  
  if (availableTags.length === 0) {
    dropdown.style.display = 'none';
    return;
  }
  
  dropdown.innerHTML = '';
  availableTags.forEach((tag, index) => {
    const item = document.createElement('div');
    item.className = 'jetprompt-tag-dropdown-item';
    if (index === 0) item.classList.add('highlighted');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'jetprompt-tag-dropdown-checkbox';
    checkbox.checked = false;
    
    const label = document.createElement('span');
    label.textContent = tag;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    
    item.addEventListener('click', () => add_tag_to_input(tag));
    
    dropdown.appendChild(item);
  });
  
  dropdown.style.display = 'block';
}

function handle_add_tags_keydown(event, dropdown) {
  if (event.key === 'Enter' && !event.ctrlKey) {
    event.preventDefault();
    const highlighted = dropdown.querySelector('.highlighted');
    if (highlighted && dropdown.style.display !== 'none') {
      const tag = highlighted.querySelector('span').textContent;
      add_tag_to_input(tag);
    }
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    navigate_dropdown(dropdown, event.key === 'ArrowDown');
  } else if (event.key === 'Escape') {
    dropdown.style.display = 'none';
  }
}

function add_tag_to_input(tag) {
  const input = addTagsInput;
  const value = input.value;
  const lastCommaIndex = value.lastIndexOf(',');
  
  if (lastCommaIndex >= 0) {
    input.value = value.substring(0, lastCommaIndex + 1) + ' ' + tag + ', ';
  } else {
    input.value = tag + ', ';
  }
  
  const dropdown = document.getElementById('addTagsDropdown');
  dropdown.style.display = 'none';
  input.focus();
}

// Load prompts from storage
async function loadPrompts() {
  try {
    currentPrompts = await getPrompts();
    updateTagFilters();
    renderPrompts();
  } catch (error) {
    console.error("Error loading prompts:", error);
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
  tags.style.cursor = 'pointer';
  tags.style.padding = '4px';
  tags.style.borderRadius = '4px';
  tags.style.transition = 'background-color 0.2s';
  tags.title = 'Click to edit tags';
  
  // Add hover effect
  tags.addEventListener('mouseenter', () => {
    tags.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  });
  tags.addEventListener('mouseleave', () => {
    tags.style.backgroundColor = 'transparent';
  });
  
  prompt.tags.forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.className = 'jetprompt-prompt-tag';
    tagSpan.textContent = tag;
    tags.appendChild(tagSpan);
  });
  
  // Add placeholder if no tags
  if (prompt.tags.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.style.color = 'var(--color-gray)';
    placeholder.style.fontSize = '10px';
    placeholder.style.fontStyle = 'italic';
    placeholder.textContent = 'Click to add tags';
    tags.appendChild(placeholder);
  }
  
  // Add click handler for tag editing (when not already in edit mode)
  tags.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // If not already editing this prompt, start editing both text and tags
    if (editingPromptId !== prompt.id) {
      // Finish any other active editing first
      if (editingPromptId) {
        finishEditing();
      }
      
      // Start both text and tag editing
      const promptText = e.target.closest('.jetprompt-prompt-card').querySelector('.jetprompt-prompt-text');
      if (promptText) {
        startEditing(prompt.id, promptText);
      }
    }
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

  textElement.addEventListener('blur', finishEditing);
  textElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      finishEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  });
  
  // Also start tag editing when text editing begins
  const promptCard = textElement.closest('.jetprompt-prompt-card');
  if (promptCard) {
    const tagsElement = promptCard.querySelector('.jetprompt-prompt-tags');
    if (tagsElement) {
      start_tag_editing(promptId, tagsElement, false); // false = don't focus input
    }
  }
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
    }
  }

  textElement.contentEditable = false;
  const tempEditingId = editingPromptId;
  editingPromptId = null;
  
  // Also finish tag editing if it's for the same prompt
  if (editingTagsPromptId === tempEditingId) {
    await finish_tag_editing();
  }
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

  const tempEditingId = editingPromptId;
  editingPromptId = null;
  
  // Also cancel tag editing if it's for the same prompt
  if (editingTagsPromptId === tempEditingId) {
    finish_tag_editing();
  }
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
    

  } catch (error) {
    console.error("Error adding prompt:", error);
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

    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
  }
}

// Handle copy prompt
async function handleCopyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error("Error copying to clipboard:", error);
  }
}

// Handle delete prompt
async function handleDeletePrompt(promptId) {
  if (!confirm("Are you sure you want to delete this prompt?")) return;

  try {
    await deletePrompt(promptId);
    currentPrompts = currentPrompts.filter(p => p.id !== promptId);
    updateTagFilters();
    renderPrompts();
  } catch (error) {
    console.error("Error deleting prompt:", error);
  }
}

// Open settings
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Tag editing functionality
function start_tag_editing(promptId, tagsElement, shouldFocus = true) {
  if (editingTagsPromptId && editingTagsPromptId !== promptId) {
    finish_tag_editing();
  }

  editingTagsPromptId = promptId;
  const prompt = currentPrompts.find(p => p.id === promptId);
  if (!prompt) {
    return;
  }

  // Create tag editing interface
  const editingContainer = document.createElement('div');
  editingContainer.className = 'jetprompt-tag-editing-container';
  
  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'jetprompt-tag-chips';
  
  const tagInput = document.createElement('input');
  tagInput.type = 'text';
  tagInput.className = 'jetprompt-tag-input';
  tagInput.placeholder = 'Add tags...';
  
  const dropdown = document.createElement('div');
  dropdown.className = 'jetprompt-tag-dropdown';
  dropdown.style.display = 'none';

  editingContainer.appendChild(chipsContainer);
  editingContainer.appendChild(tagInput);
  editingContainer.appendChild(dropdown);

  // Replace tags display with editing interface
  tagsElement.style.display = 'none';
  tagsElement.parentNode.insertBefore(editingContainer, tagsElement.nextSibling);

  // Render current tags as chips
  render_tag_chips(prompt.tags, chipsContainer);

  // Setup event listeners
  tagInput.addEventListener('input', (e) => handle_tag_input(e, dropdown));
  tagInput.addEventListener('keydown', (e) => handle_tag_keydown(e, prompt, chipsContainer, dropdown));
  tagInput.addEventListener('blur', (e) => {
    // Delay to allow dropdown clicks
    setTimeout(() => {
      if (!dropdown.contains(document.activeElement)) {
        // Only finish tag editing if we're not also doing text editing
        if (!editingPromptId) {
          finish_tag_editing();
        }
      }
    }, 150);
  });

  if (shouldFocus) {
    tagInput.focus();
  }
}

function render_tag_chips(tags, container) {
  container.innerHTML = '';
  tags.forEach(tag => {
    const chip = document.createElement('div');
    chip.className = 'jetprompt-tag-chip';
    
    const tagText = document.createElement('span');
    tagText.textContent = tag;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'jetprompt-tag-chip-remove';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => remove_tag_chip(tag, container));
    
    chip.appendChild(tagText);
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
}

function remove_tag_chip(tagToRemove, container) {
  const prompt = currentPrompts.find(p => p.id === editingTagsPromptId);
  if (!prompt) return;
  
  prompt.tags = prompt.tags.filter(tag => tag !== tagToRemove);
  render_tag_chips(prompt.tags, container);
  
  // Focus the input after removing a tag
  const editingContainer = document.querySelector('.jetprompt-tag-editing-container');
  if (editingContainer) {
    const input = editingContainer.querySelector('.jetprompt-tag-input');
    if (input) input.focus();
  }
}

function handle_tag_input(event, dropdown) {
  const input = event.target;
  const query = input.value.toLowerCase().trim();
  
  if (query.length === 0) {
    dropdown.style.display = 'none';
    return;
  }

  const prompt = currentPrompts.find(p => p.id === editingTagsPromptId);
  if (!prompt) return;

  // Filter available tags
  const availableTags = allTags.filter(tag => 
    tag.toLowerCase().includes(query) && !prompt.tags.includes(tag)
  );

  if (availableTags.length === 0) {
    dropdown.style.display = 'none';
    return;
  }

  // Render dropdown
  dropdown.innerHTML = '';
  availableTags.forEach((tag, index) => {
    const item = document.createElement('div');
    item.className = 'jetprompt-tag-dropdown-item';
    if (index === 0) item.classList.add('highlighted');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'jetprompt-tag-dropdown-checkbox';
    checkbox.checked = false;
    
    const label = document.createElement('span');
    label.textContent = tag;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    
    item.addEventListener('click', () => add_tag_to_prompt(tag));
    
    dropdown.appendChild(item);
  });

  dropdown.style.display = 'block';
}

function handle_tag_keydown(event, prompt, chipsContainer, dropdown) {
  const input = event.target;
  
  if (event.key === 'Enter') {
    event.preventDefault();
    const highlighted = dropdown.querySelector('.highlighted');
    if (highlighted && dropdown.style.display !== 'none') {
      const tag = highlighted.querySelector('span').textContent;
      add_tag_to_prompt(tag);
    } else if (input.value.trim()) {
      add_tag_to_prompt(input.value.trim());
    }
  } else if (event.key === 'Escape') {
    finish_tag_editing();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    navigate_dropdown(dropdown, event.key === 'ArrowDown');
  }
}

function navigate_dropdown(dropdown, down) {
  const items = dropdown.querySelectorAll('.jetprompt-tag-dropdown-item');
  if (items.length === 0) return;
  
  const highlighted = dropdown.querySelector('.highlighted');
  let newIndex = 0;
  
  if (highlighted) {
    const currentIndex = Array.from(items).indexOf(highlighted);
    newIndex = down ? 
      (currentIndex + 1) % items.length : 
      (currentIndex - 1 + items.length) % items.length;
    highlighted.classList.remove('highlighted');
  }
  
  items[newIndex].classList.add('highlighted');
}

function add_tag_to_prompt(tag) {
  const prompt = currentPrompts.find(p => p.id === editingTagsPromptId);
  if (!prompt || prompt.tags.includes(tag)) return;
  
  prompt.tags.push(tag);
  const editingContainer = document.querySelector('.jetprompt-tag-editing-container');
  if (!editingContainer) return;
  
  const chipsContainer = editingContainer.querySelector('.jetprompt-tag-chips');
  const input = editingContainer.querySelector('.jetprompt-tag-input');
  const dropdown = editingContainer.querySelector('.jetprompt-tag-dropdown');
  
  if (chipsContainer) render_tag_chips(prompt.tags, chipsContainer);
  if (input) {
    input.value = '';
    input.focus();
  }
  if (dropdown) dropdown.style.display = 'none';
}

async function finish_tag_editing() {
  if (!editingTagsPromptId) return;

  const prompt = currentPrompts.find(p => p.id === editingTagsPromptId);
  if (prompt) {
    await updatePrompt(prompt);
  }

  // Remove editing interface
  const editingContainer = document.querySelector('.jetprompt-tag-editing-container');
  if (editingContainer) {
    const tagsElement = editingContainer.previousSibling;
    editingContainer.remove();
    
    if (tagsElement && tagsElement.classList.contains('jetprompt-prompt-tags')) {
      tagsElement.style.display = 'flex';
    }
  }

  const tempId = editingTagsPromptId;
  editingTagsPromptId = null;
  updateTagFilters();
  
  // Re-render only after clearing the editing state
  setTimeout(() => {
    renderPrompts();
  }, 50);
}