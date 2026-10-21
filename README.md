# The Garth

A cloister garden grown from the Instagram followers of
[@app_making_seal](https://www.instagram.com/app_making_seal/). Every follower becomes a
plant, and you decide where it grows. The garden is drawn as a plan of the
Cuxa Cloister garth at The Met Cloisters: a covered walk, an arcade of paired
pink-marble colonnettes, four wattle-fenced lawns and a fountain where the
paths cross.

## Using it

Open `index.html` in a browser (or the GitHub Pages site, below).

- **Seed tray**: new followers arrive here. Drag a seed by its picture into
  one of the four beds, or tap a name and then tap a spot. **Plant all for me**
  scatters every waiting seed evenly.
- **Move a plant**: drag it. Click it to see who it is, its species and its
  medieval lore.
- **Unfollows**: anyone missing from a new import fades and is marked "gone to
  seed". You can compost it or keep it.
- Each username always grows the same plant. There are 22 species from the
  Cloisters' gardens, and a few (quince, mandrake, Christmas rose) are rare.
- Your garden is saved in the browser. Use **Save a backup** to keep a copy
  or move it to another device.

The first visit shows a sample garden with example names. Your first import
replaces it.

## Getting your followers

Instagram has no public API that lists your followers, so the garden reads
Instagram's own data download:

1. Signed in as @app_making_seal, Instagram → Accounts Center → Your information and permissions →
   Download your information.
2. Choose Some of your information → Followers and following, format JSON,
   date range All time.
3. Unzip the download and import
   `connections/followers_and_following/followers_1.json`.

Import a fresh download whenever you like; only the differences change the
garden. A plain text or CSV list of usernames also works.

### Daily check

When the site is served over HTTP and a `followers.json` file sits beside
`index.html`, the garden reads it once a day (and every few hours while it is
open) and turns new names into seeds. Any process that keeps that file up to
date makes the garden update by itself. The file can be Instagram's
`followers_1.json` format or a JSON array of usernames.

## Hosting on GitHub Pages

`.github/workflows/pages.yml` publishes the site on every push to `main`.
Turn it on once in the repository's Settings → Pages → Source: GitHub
Actions.

## Files

- `index.html`: page and panel
- `css/style.css`: styles, light and dusk (dark) themes
- `js/plants.js`: species list and the top-down plant drawings
- `js/garden.js`: the cloister plan and the plantable beds
- `js/app.js`: saving, follower import, planting and dragging

The owner's handle appears in `index.html` (the `owner` line in the masthead
and the import instructions). A stone seal spouts water at the centre of the
fountain as the gardener's emblem.
