
const STORAGE_KEY = 'jetprompt_prompts';

// Function to get all prompts from Chrome storage
async function getPrompts() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

// Function to save all prompts to Chrome storage
async function savePrompts(prompts) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: prompts }, () => {
      resolve();
    });
  });
}

// Function to add a new prompt
async function addPrompt(prompt) {
  const prompts = await getPrompts();
  prompt.id = Date.now().toString(); // Simple unique ID
  prompt.updatedAt = new Date().toISOString();
  prompts.push(prompt);
  await savePrompts(prompts);
  return prompt;
}

// Function to update an existing prompt
async function updatePrompt(updatedPrompt) {
  let prompts = await getPrompts();
  const index = prompts.findIndex(p => p.id === updatedPrompt.id);
  if (index !== -1) {
    updatedPrompt.updatedAt = new Date().toISOString();
    prompts[index] = updatedPrompt;
    await savePrompts(prompts);
    return true;
  }
  return false;
}

// Function to delete a prompt
async function deletePrompt(id) {
  let prompts = await getPrompts();
  prompts = prompts.filter(p => p.id !== id);
  await savePrompts(prompts);
  return true;
}

// Function to toggle favorite status
async function toggleFavorite(id) {
  const prompts = await getPrompts();
  const prompt = prompts.find(p => p.id === id);
  if (prompt) {
    prompt.isFavorite = !prompt.isFavorite;
    await updatePrompt(prompt);
    return prompt.isFavorite;
  }
  return null;
}

// Function to filter prompts by tags or search text
async function filterPrompts(searchText, tags) {
  const prompts = await getPrompts();
  return prompts.filter(prompt => {
    const matchesSearch = searchText ? prompt.text.toLowerCase().includes(searchText.toLowerCase()) : true;
    const matchesTags = tags && tags.length > 0 ? tags.every(tag => prompt.tags.includes(tag)) : true;
    return matchesSearch && matchesTags;
  });
}


