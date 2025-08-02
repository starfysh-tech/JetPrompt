# JetPrompt Chrome Extension

A retro-futuristic Chrome extension for managing and inserting text prompts with ease, speed, and joy.

## Features

- **Prompt Storage and Organization**: Save prompts in a single list with favorites and tags
- **Search and Filter**: Simple text search and tag-based filtering
- **Quick Insert**: Keyboard shortcut (Ctrl+Shift+J) to open overlay and insert prompts
- **Google Drive Sync**: Optional sync with Google Drive for backup and cross-device access
- **Inline Editing**: Edit prompts directly with autosave
- **Retro-Futuristic Design**: Beautiful UI with pastel colors and rounded shapes

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `jetprompt_extension` folder
5. The extension should now appear in your Chrome toolbar

## Usage

### Adding Prompts
1. Click the JetPrompt icon in the Chrome toolbar
2. Type your prompt in the text area
3. Add tags (comma-separated) if desired
4. Click "Add" to save the prompt

### Using Quick Insert
1. Focus on any text input field on a webpage
2. Press `Ctrl+Shift+J` (or `Cmd+Shift+J` on Mac)
3. Search for your desired prompt
4. Use arrow keys to navigate or click to select
5. Press Enter to insert the prompt

### Managing Prompts
- Click on any prompt to copy it to clipboard
- Click the star icon to mark as favorite
- Click the edit icon to modify the prompt
- Click the delete icon to remove the prompt

### Google Drive Sync
1. Click the settings icon in the popup
2. Enable "Google Drive Sync"
3. Authorize the extension to access your Google Drive
4. Your prompts will be synced to a "JetPrompt" folder

## Keyboard Shortcuts

- `Ctrl+Shift+J` (or `Cmd+Shift+J` on Mac): Open Quick Insert Overlay
- `↑/↓`: Navigate prompts in overlay
- `Enter`: Insert selected prompt
- `Esc`: Close overlay

## File Structure

```
jetprompt_extension/
├── manifest.json          # Extension manifest
├── popup.html             # Main popup interface
├── options.html           # Settings page
├── test.html              # Test page for development
├── background.js          # Service worker
├── css/
│   ├── popup.css          # Popup styles
│   └── options.css        # Settings page styles
├── js/
│   ├── storage.js         # Chrome storage functions
│   ├── googleDriveSync.js # Google Drive sync logic
│   ├── popup.js           # Popup functionality
│   ├── contentScript.js   # Quick insert overlay
│   └── options.js         # Settings page functionality
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

## Development

### Testing
1. Load the extension in Chrome as described in Installation
2. Open `test.html` in Chrome to test functionality
3. Use Chrome DevTools to debug issues

### Customization
- Modify CSS files to change the appearance
- Update `manifest.json` to change permissions or shortcuts
- Edit JavaScript files to add new features

## Permissions

The extension requires the following permissions:
- `storage`: To save prompts locally
- `activeTab`: To interact with web pages
- `scripting`: To inject the quick insert overlay
- `identity`: For Google Drive authentication
- `<all_urls>`: To work on all websites

## Privacy

- All data is stored locally in Chrome's sync storage
- Google Drive sync is optional and user-controlled
- No data is sent to external servers except Google Drive (when enabled)
- The extension does not track user behavior

## License

This project is open source. Feel free to modify and distribute according to your needs.

## Support

For issues or feature requests, please refer to the extension's documentation or contact the developer.

