TEST ROOM - deploy to Netlify
==============================

What is inside
- public/index.html            The test site (daily quizzes, weekly tests, chapter tests, progress portal)
- netlify/functions/results.mjs Saves results in Netlify Blobs (Netlify's built-in storage)
- netlify.toml, package.json   Netlify settings

Deploy (one time, about 10 minutes)
1. Install Node.js (nodejs.org) if you don't have it.
2. Open a terminal in this folder and run:
     npm install
     npm install -g netlify-cli
     netlify login
     netlify init          (choose "Create & configure a new site", pick a name, e.g. test-room-9th)
3. Set the PIN for the progress portal (only you should know it):
     netlify env:set PORTAL_PIN 4821      (use your own number)
4. Deploy:
     netlify deploy --prod
5. Open the site address it prints. Give your sister that link.
   Your portal: tap "Progress" and enter the PIN.

Updating later
- When new tests are added, replace public/index.html and run: netlify deploy --prod
- Results are stored in Netlify Blobs and are kept across deploys.
