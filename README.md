# CallScribe

A Chromium browser extension that extracts Mindtickle call transcripts and converts them into structured JIRA tickets and Productboard insights using Claude AI.

## Features

- Detects Mindtickle recording pages automatically
- Fetches full transcripts via the Mindtickle GraphQL API
- Analyzes transcripts with Claude AI to surface bugs, feature requests, pain points, and improvements
- Creates JIRA issues and Productboard insights with one click
- Exports transcripts as TXT, Markdown, or JSON
- Editable ticket suggestions before submission
- Works on Chrome, Edge, and any Chromium-based browser

## Development

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

The extension is output to the `dist/` folder.

### Watch mode

```bash
npm run dev
```

## Loading the extension

1. Run `npm run build` to generate the `dist/` folder.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (toggle in top-right).
4. Click **Load unpacked** and select the `dist/` folder.
5. The CallScribe icon will appear in your browser toolbar.

## Configuration

Click the settings gear icon in the extension popup and fill in:

| Field | Description |
|---|---|
| Claude API Key | Your Anthropic API key (`sk-ant-...`) |
| JIRA Base URL | e.g. `https://yourorg.atlassian.net` |
| JIRA Email | Your Atlassian account email |
| JIRA API Token | Generate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| JIRA Project Key | e.g. `PROJ` |
| Productboard API Key | Your Productboard API key |

All credentials are stored locally in `chrome.storage.sync` and are never sent to any third-party server other than the respective APIs.

## Usage

1. Open a Mindtickle recording page (URL containing `/recording/{meetingId}`).
2. Click the CallScribe extension icon.
3. The extension detects the transcript and shows a **Load Transcript** button.
4. Click **Load Transcript** to fetch the full transcript.
5. Choose an action:
   - **Analyze with Claude AI** – generates categorized insight cards
   - **Download Transcript** – export as TXT, Markdown, or JSON
6. On the Analysis screen, each insight card shows:
   - Type (Bug / Feature / Pain Point / Improvement)
   - Priority
   - Product Area
   - Quick **JIRA** and **Productboard** submit buttons
   - **Edit** button to customize before submitting
7. Use the **Edit** button to open the Ticket Review screen for full customization.

## Project Structure

```
callscribe-extension/
├── public/
│   ├── manifest.json         ← MV3 extension manifest
│   └── icons/                ← Extension icons (16/48/128px)
├── background/
│   └── service-worker.js     ← Tab state relay
├── content/
│   ├── detectMindtickle.js   ← Injected into Mindtickle pages
│   └── transcriptFetcher.js  ← Fires GraphQL transcript request
└── src/
    ├── App.jsx               ← Root with useReducer state machine
    ├── constants.js          ← Screen name constants
    ├── components/           ← Screen + shared UI components
    ├── services/             ← Claude, JIRA, Productboard API clients
    └── utils/                ← Parser, formatter, prompt builder
```

## Tech Stack

- **React 18** + **Vite 5** (multi-entry build)
- **Lucide React** icons
- **Manifest V3** extension API
- Pure CSS animations (no animation library)
- Whatfix design palette
