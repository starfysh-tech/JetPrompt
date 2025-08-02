
const DRIVE_FOLDER_NAME = 'JetPrompt';
const DRIVE_FILE_NAME = 'jetprompt_data.json';
const MIME_TYPE_JSON = 'application/json';

async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ 'interactive': interactive }, function(token) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

async function revokeAuthToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ 'token': token }, function() {
      resolve();
    });
  });
}

async function getDriveFileId() {
  const token = await getAuthToken();
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': MIME_TYPE_JSON
  };

  // Search for the folder
  let folderId = null;
  const folderQuery = `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  let response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id)`, { headers });
  let data = await response.json();
  if (data.files.length > 0) {
    folderId = data.files[0].id;
  } else {
    // Create the folder if it doesn't exist
    const folderMetadata = {
      'name': DRIVE_FOLDER_NAME,
      'mimeType': 'application/vnd.google-apps.folder'
    };
    response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': MIME_TYPE_JSON },
      body: JSON.stringify(folderMetadata)
    });
    data = await response.json();
    folderId = data.id;
  }

  // Search for the file within the folder
  const fileQuery = `name='${DRIVE_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
  response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id,modifiedTime)`, { headers });
  data = await response.json();
  if (data.files.length > 0) {
    return { id: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
  }
  return null;
}

async function readDriveFile(fileId) {
  const token = await getAuthToken();
  const headers = {
    'Authorization': 'Bearer ' + token
  };
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to read Drive file: ${response.statusText}`);
  }
  const text = await response.text();
  try {
    // Validate and repair malformed JSON if necessary
    const parsedData = JSON.parse(text);
    // Add schema validation here if a formal schema is defined
    return parsedData;
  } catch (e) {
    console.error('Malformed JSON in Drive file:', e);
    // Backup malformed data and notify user
    // For now, we'll just return an empty array or last good state
    throw new Error('Malformed JSON in Drive file');
  }
}

async function writeDriveFile(prompts) {
  const token = await getAuthToken();
  const headers = {
    'Authorization': 'Bearer ' + token
  };

  let fileInfo = await getDriveFileId();
  let fileId = fileInfo ? fileInfo.id : null;
  let folderId = null;

  // Ensure folder exists and get its ID
  const folderQuery = `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  let response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id)`, { headers });
  let data = await response.json();
  if (data.files.length > 0) {
    folderId = data.files[0].id;
  } else {
    const folderMetadata = {
      'name': DRIVE_FOLDER_NAME,
      'mimeType': 'application/vnd.google-apps.folder'
    };
    response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': MIME_TYPE_JSON },
      body: JSON.stringify(folderMetadata)
    });
    data = await response.json();
    folderId = data.id;
  }

  const metadata = {
    'name': DRIVE_FILE_NAME,
    'mimeType': MIME_TYPE_JSON,
    'parents': [folderId]
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: MIME_TYPE_JSON }));
  form.append('file', new Blob([JSON.stringify(prompts)], { type: MIME_TYPE_JSON }));

  if (fileId) {
    // Update existing file
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token },
      body: form
    });
  } else {
    // Create new file
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: form
    });
  }
}

async function syncFromDrive() {
  try {
    const fileInfo = await getDriveFileId();
    if (fileInfo) {
      const drivePrompts = await readDriveFile(fileInfo.id);
      const localPrompts = await getPrompts(); // Assuming getPrompts is available from storage.js

      // Simple sync strategy: if Drive file is newer, use it.
      // Otherwise, local is source of truth.
      const driveModifiedTime = new Date(fileInfo.modifiedTime);
      const lastLocalUpdate = localPrompts.length > 0 ? new Date(Math.max(...localPrompts.map(p => new Date(p.updatedAt)))) : new Date(0);

      if (driveModifiedTime > lastLocalUpdate) {
        await savePrompts(drivePrompts);
        console.log('Synced from Google Drive: Drive version is newer.');
        return { success: true, message: 'Synced from Google Drive.' };
      } else {
        console.log('Local version is newer or same, no sync from Drive needed.');
        return { success: true, message: 'Local version is up to date.' };
      }
    } else {
      console.log('No JetPrompt file found in Google Drive. Initializing sync.');
      // If no file exists, write current local prompts to Drive
      const localPrompts = await getPrompts();
      if (localPrompts.length > 0) {
        await writeDriveFile(localPrompts);
        console.log('Wrote initial prompts to Google Drive.');
        return { success: true, message: 'Initial sync to Google Drive complete.' };
      }
      return { success: true, message: 'No prompts to sync yet.' };
    }
  } catch (error) {
    console.error('Google Drive sync error:', error);
    return { success: false, message: `Google Drive sync failed: ${error.message}. Using local version.` };
  }
}

async function syncToDrive() {
  try {
    const localPrompts = await getPrompts(); // Assuming getPrompts is available from storage.js
    await writeDriveFile(localPrompts);
    console.log('Synced local prompts to Google Drive.');
    return { success: true, message: 'Synced to Google Drive.' };
  } catch (error) {
    console.error('Google Drive write error:', error);
    return { success: false, message: `Google Drive write failed: ${error.message}.` };
  }
}

// Expose functions for background script or popup
// This will be done via message passing in the background script


