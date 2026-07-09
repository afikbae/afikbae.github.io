# Personal website — Mehmet Akif Sahin

A single-page, dependency-free personal site for a researcher. No build step,
no framework. Just open `index.html` in a browser.

## Files

| File | What it is |
|------|------------|
| `index.html` | All the content. Edit the blocks marked `<!-- EDIT -->`. |
| `styles.css` | Styling. Colors live in the `:root` variables at the top. |
| `profile.jpg` | *(optional)* Your photo — add it yourself (see below). |
| `cv.pdf` | *(optional)* Your CV — drop it in and the CV link works. |

## Editing

1. Open `index.html` in any text editor.
2. Search for `<!-- EDIT -->` — each marks something to personalize
   (name, role, links, bio, research interests, news, publications, contact).
3. Save and refresh your browser.

**Add your photo:** put a square image named `profile.jpg` in this folder, then
in `index.html` replace the placeholder `<div class="avatar ...">MA</div>` with:

```html
<img class="avatar" src="profile.jpg" alt="Mehmet Akif Sahin" />
```

**Change colors:** edit the `--accent` (and other) variables at the top of
`styles.css`. Dark mode adjusts automatically.

## Preview locally

Just double-click `index.html`, or run a tiny local server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish (free) with GitHub Pages

1. Create a GitHub repo named `<your-username>.github.io`.
2. Put these files in it and push.
3. In the repo: **Settings → Pages → Deploy from branch → main / root**.
4. Your site is live at `https://<your-username>.github.io`.

Other free options: Netlify (drag-and-drop the folder), Cloudflare Pages,
or your university's `~username` web space.
