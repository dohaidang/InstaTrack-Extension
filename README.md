# Instagram Tracker Extension (v3)

A Chrome Extension for tracking Instagram followers, detecting unfollowers, users not following back, and finding mutual friends.

##  Key Features

- **Intuitive Dashboard**: Overview of Followers and Following counts.
- **Account Classification**:
  - **Mutual Friends**: Accounts you follow that follow you back.
  - **Lost Followers**: Users who have unfollowed you.
  - **New Followers**: Recently gained followers.
  - **Not Following Back**: Users you follow who don't follow you back.
- **Auto Scan**: Automatically scans your follower/following lists.
- **Dark Mode**: Supports automatic or manual dark/light mode.
- **User History**: Saves history of scanned usernames.

### Load into Chrome
1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (top right corner).
3. Click **Load unpacked**.
4. Select the `dist` directory in your project folder (e.g., `.../instagram-tracker-v3/dist`).

## 🖥️ Technologies Used

- **React** (UI)
- **TypeScript** (Safety)
- **Vite** (Build tool)
- **TailwindCSS** (Styling)
- **Chrome Extension Manifest V3**

## Notes
- The extension works best when you are already logged into Instagram in your browser.
- Data is stored locally (`chrome.storage.local`) on your machine.

---
Powered by **DoHaiDang**
