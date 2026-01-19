# Soma

Personal health app portal - a launcher for mini health-related apps.

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
      "icon": "🩸",
      "color": "#ef4444",
      "url": "https://my-app.vercel.app"
    }
  ]
}
```

## Tech Stack

- React 18
- React Router
- Tailwind CSS
- shadcn/ui
- Lucide icons

## Deployment

```bash
npm run build
```

Deploy the `dist` folder to Vercel, Netlify, or any static host.
