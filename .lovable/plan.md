

# Change Browser Tab Icon (Favicon)

The icon showing in the browser tab is the **favicon**. Currently it's using `/favicon.ico` which appears to be a default Lovable icon. You already have a custom SVG icon at `/icons/icon.svg` with the NGR branding.

## Plan

### `index.html`
- Replace the current favicon `<link>` tag to point to your existing NGR icon:
  ```html
  <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
  ```

This will use your existing black/red NGR roof icon (already in the project at `public/icons/icon.svg`) as the browser tab icon. No new files needed.

