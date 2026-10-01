# Personal website — Mehmet Akif Sahin

A static personal site for a researcher, with a homepage blog list and an FDD tutorial.
No framework or install step is required to serve the committed HTML.

## One profile, three outputs

Edit `profile.yaml`, then run from this directory:

```bash
python3 scripts/build-profile.py
```

This generates `index.html`, `resume/resume.tex`, `cv.pdf`, and
`output/linkedin.txt`. The website has a CV download link. It remains a static
site with no browser-side build dependency. The LinkedIn file contains proposed
profile text to apply manually; the build does not read or edit LinkedIn.

Requirements: Python 3, PyYAML (`python3 -m pip install -r requirements.txt`), and
`pdflatex` with the packages used by `templates/resume.tex` (fullpage, titlesec,
enumitem, hyperref, fancyhdr, color). These are available on the original local
machine. A TeX distribution is needed on a new machine.

- `profile.yaml`: shared content; `cv_bullets` adds detail only to the CV.
  Education with `website: false` appears only in the CV and LinkedIn copy.
- `templates/home.html`: website layout and blog list; edit this instead of the
  generated `index.html`. Professional content and metadata come from the profile.
- `templates/resume.tex`: original CV's LaTeX style, with corrected settings.
- `resume/original.tex`: unchanged source from the supplied Overleaf export,
  kept only as a reference; it is not compiled by the build.
- `styles.css`: website styling; `profile.jpg`: profile photograph.

Use `python3 scripts/build-profile.py --check` to detect stale generated HTML,
LaTeX, or LinkedIn text. This check does not validate PDF freshness; run the full
build before publishing. `--no-pdf` regenerates text only and leaves the PDF
unchanged. LaTeX logs and scratch files are in ignored `tmp/pdfs/`.

Workflow: edit the profile → run the full build → review the PDF and website →
publish the generated website/PDF using the existing GitHub Pages setup → copy
changed sections from `output/linkedin.txt` to LinkedIn. Use `git diff` to see
what changed. No account connection or Overleaf subscription is needed.

## Editing

### FDD tutorial

Edit `content/fdd.html` (HTML with LaTeX math), then run:

```bash
node scripts/build-tutorial.cjs
```

This regenerates `blogs/fdd/index.html` with accessible HTML and MathML equations.
KaTeX 0.16.22 and its MIT license are vendored in `assets/katex/`; there are no
external runtime requests. Math stays readable without JavaScript. The two
interactive, synthetic figures live in `blogs/fdd/fdd.js`; shared blog styling is
in `blogs/blog.css`. Each numbered derivation maps to sources at the end of the
tutorial. Serve the repository root and visit `/blogs/fdd/` to preview.

The homepage’s Blogs section lists posts as bullet links directly to their pages.
Add new posts to the list in `templates/home.html`, then rebuild the profile. Publishing follows
the existing GitHub Pages workflow below.

### Homepage

Change professional content in `profile.yaml`, and layout or blog links in
`templates/home.html`. Run the build before previewing. Direct edits to
`index.html` are overwritten by the next build.

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
