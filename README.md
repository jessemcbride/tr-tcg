# Techrangers Alumni TCG

A static browser card game built from public Techrangers roster/profile data.

## Run locally

```bash
python3 -m http.server 8091
```

Open `http://127.0.0.1:8091`.

## Files

- `index.html` - app shell
- `styles.css` - Techrangers-inspired visual design
- `app.js` - game logic and card rendering
- `data.js` - generated 216-card deck

No build step or package install is required.

## Deploy to GitHub Pages

Pushes to `main` deploy automatically through `.github/workflows/deploy-pages.yml`.
In the repository's **Settings → Pages**, set **Source** to **GitHub Actions** once.
