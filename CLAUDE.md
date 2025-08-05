# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JetPrompt is a retro-futuristic Chrome extension for managing and inserting text prompts. Built with vanilla JavaScript (no build system), it provides a popup interface for prompt management and a content script overlay for quick text insertion across websites.

## Development Commands

### Testing and Debugging
```bash
# Load extension in Chrome (manual process)
# 1. Navigate to chrome://extensions/
# 2. Enable Developer mode 
# 3. Click "Load unpacked" and select project directory
# 4. Use Chrome DevTools for debugging (popup, background, content scripts)
```

### Development Workflow
- No build process required - direct file editing
- Test changes by reloading extension in chrome://extensions/
- Use browser DevTools for all debugging (separate contexts for popup, background, content script)

## Code Architecture

### Core Module Structure
- **`js/storage.js`** - Chrome storage API wrapper functions for prompt data management
- **`js/popup.js`** - Main extension popup UI and interactions 
- **`js/contentScript.js`** - Quick insert overlay injected into web pages
- **`js/googleDriveSync.js`** - Google Drive integration for cross-device sync
- **`js/options.js`** - Settings page functionality

### Data Flow
- Prompts stored in Chrome sync storage as array of objects with `{id, text, tags, isFavorite, updatedAt}`
- Google Drive sync creates `jetprompt_data.json` in user's Drive folder
- Content script communicates with background script via Chrome messaging API

### Chrome Extension Architecture  
- **Manifest V3** - Service worker background script pattern
- **Permissions**: `storage`, `activeTab`, `scripting`, `identity`, `<all_urls>`
- **Content Security Policy**: Inline scripts not allowed, external resources restricted

### UI Patterns
- Retro-futuristic design with CSS custom properties for theming
- Google Fonts integration (Lexend Deca, Orbitron)
- Modular CSS with component-based class naming
- Keyboard shortcut: Ctrl+Shift+J (Cmd+Shift+J on Mac) for quick insert

## Key Technical Constraints

### Chrome Extension Limitations
- No build tools or module bundlers (vanilla JS only)
- Content Security Policy restrictions on inline scripts and eval
- Cross-origin requests limited to declared permissions
- Storage limited to Chrome's sync storage quotas

### Development Environment
- Manual testing only - no automated test framework
- Browser DevTools for debugging across extension contexts
- Extension reload required for most code changes

### Google Drive Integration
- OAuth2 flow with `https://www.googleapis.com/auth/drive.file` scope
- Rate limiting considerations for API calls
- User authorization state managed in Chrome storage

## Code Quality Standards

### JavaScript Patterns
- Modern ES6+ syntax (async/await, arrow functions, const/let)
- Error handling with try/catch blocks around storage operations  
- Consistent function naming with snake_case (per user preferences)
- Modular code organization with clear separation of concerns

### Extension-Specific Patterns
- Always check for Chrome API availability before use
- Handle extension context invalidation gracefully
- Use Chrome storage for persistence, not localStorage
- Content script isolation - no direct DOM global access