
# OAuth 2.0: Authenticate Users with Google

OAuth2 is the industry-standard protocol for authorization. It provides a mechanism for users to grant web and desktop applications access to private information without sharing their username, password, and other private credentials.

This tutorial builds an extension that accesses a user's Google contacts using the Google People API and the Chrome Identity API. Because extensions don't load over HTTPS, can't perform redirects or set cookies, they rely on the Chrome Identity API to use OAuth2.

## Initiate first OAuth flow

Register the `identity` permission in the manifest.

```json
{
      "name": "OAuth Tutorial FriendBlock",
      ...
      "permissions": [
        "identity"
      ],
      ...
    }
```

Create a file to manage the OAuth flow called `oauth.js` and include the following code.

```javascript
window.onload = function() {
      document.querySelector('button').addEventListener('click', function() {
        chrome.identity.getAuthToken({interactive: true}, function(token) {
          console.log(token);
        });
      });
    };
```

Place a script tag for `oauth.js` in the head of `index.html`.

```html
...
      <head>
        <title>FriendBlock</title>
        ...
        <script type="text/javascript" src="oauth.js"></script>
      </head>
    ...
```

Reload the extension and click the browser icon to open `index.html`. Open the console and click the "FriendBlock Contacts" button. An OAuth token will appear in the console.

## Enable the Google People API

Return to the Google API console and select **Library** from the sidebar. Search for "Google People API", click the correct result and enable it.

Add the Google People API client library to `"scopes"` in the extension manifest.

```json
{
      "name": "OAuth Tutorial FriendBlock",
      ...
      "oauth2": {
        "client_id": "yourExtensionOAuthClientIDWillGoHere.apps.googleusercontent.com",
        "scopes": [
          "https://www.googleapis.com/auth/contacts.readonly"
        ]
      },
      ...
    }
```

Return to the Google API console and navigate back to credentials. Click "Create credentials" and select "API key" from the dropdown.

Keep the generated API key for later use.

## Create the first API request

Now that the extension has proper permissions, credentials, and can authorize a Google user, it can request data through the People API. Update the code in `oauth.js` to match below.

```javascript
window.onload = function() {
      document.querySelector('button').addEventListener('click', function() {
        chrome.identity.getAuthToken({interactive: true}, function(token) {
          let init = {
            method: 'GET',
            async: true,
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            'contentType': 'json'
          };
          fetch(
              'https://people.googleapis.com/v1/contactGroups/all?maxMembers=20&key=API_KEY',
              init)
              .then((response) => response.json())
              .then(function(data) {
                console.log(data)
              });
        });
      });
    };
```

Replace API_KEY with the API key generated from the Google API console. The extension should log a JSON object that includes an array of `people/account_id`s under the `memberResourceNames` field.

## Block faces

Now that the extension is returning a list of the user's contacts, it can make additional requests to retrieve those contact's profiles and information . The extension will use the `memberResourceNames` to retrieve the photo information of user contacts. Update `oauth.js` to include the following code.

```javascript
window.onload = function() {
      document.querySelector('button').addEventListener('click', function() {
        chrome.identity.getAuthToken({interactive: true}, function(token) {
          let init = {
            method: 'GET',
            async: true,
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            'contentType': 'json'
          };
          fetch(
              'https://people.googleapis.com/v1/contactGroups/all?maxMembers=20&key=<API_Key_Here>',
              init)
              .then((response) => response.json())
              .then(function(data) {
                let photoDiv = document.querySelector('#friendDiv');
                let returnedContacts = data.memberResourceNames;
                for (let i = 0; i < returnedContacts.length; i++) {
                  fetch(
                      'https://people.googleapis.com/v1/' + returnedContacts[i] +
                          '?personFields=photos&key=API_KEY',
                      init)
                      .then((response) => response.json())
                      .then(function(data) {
                        let profileImg = document.createElement('img');
                        profileImg.src = data.photos[0].url;
                        photoDiv.appendChild(profileImg);
                      });
                };
              });
        });
      });
    };
```


