# Soma

A personal mini app portal built with React, Tailwind CSS, and shadcn/ui.

## Quick Start

```bash
npm install
npm run dev
```

## Adding Apps

Edit `src/config/apps.json`:

```json
{
  "apps": [
    {
      "id": "my-app",
      "name": "My App",
      "description": "Description",
      "icon": "🚀",
      "color": "#3b82f6",
      "url": "https://my-app.vercel.app"
    }
  ]
}
```

## Tech Stack

- React 18
- React Router
- Tailwind CSS
- shadcn/ui components
- Lucide icons

## Project Structure

```
src/
├── components/
│   ├── ui/          # shadcn components
│   ├── AppIcon.jsx
│   └── SharedHeader.jsx
├── views/
│   ├── Auth.jsx
│   ├── Launcher.jsx
│   └── AppHost.jsx
├── lib/
│   ├── auth.js
│   └── utils.js
├── config/
│   └── apps.json
├── App.jsx
├── main.jsx
└── index.css
```

## Authentication

- First visit: Create a passcode (min 4 characters)
- Passcode stored as SHA-256 hash in localStorage
- "Remember me" keeps session for 30 days

## Deployment

```bash
npm run build
```

Deploy the `dist` folder to Vercel, Netlify, or any static host.

For client-side routing, add a redirect rule:
- Vercel: Automatic
- Netlify: Add `_redirects` file with `/* /index.html 200`
