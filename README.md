# Soma

Personal health app portal - a launcher for mini health-related apps.

## Quick Start

```bash
npm install
npm run dev
```

## Blood Tests

Track and visualize blood test results over time. Features include:

- **Historical Tracking**: Import multiple reports to see trends across metrics
- **Visual Charts**: Line charts showing metric values with reference range bands
- **Abnormal Detection**: Automatic flagging of out-of-range values
- **Category Filtering**: Filter by metabolic, lipid, thyroid, and other categories
- **Export**: Download your data in various formats
- **Reference Ranges**: Built-in reference ranges with explanations

Data is stored in a markdown file at `src/pages/blood-tests/data/reports.md`.

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
