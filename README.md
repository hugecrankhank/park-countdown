# Park Day Countdown

A one-page site that counts down to your next park trip and shows live standby times for the rides you pick.

- Add trips on the **Trips** tab. The countdown always shows the next one.
- On **Parks & rides**, choose a resort and parks, then tap ☆ on your favorite rides.
- **Wait times** shows your starred rides, shortest wait first, and refreshes every 5 minutes.

Trips and picks are saved in your browser only.

Live wait times come from [ThemeParks.wiki](https://themeparks.wiki). Not affiliated with any park operator.

## Hosting

It's a single `index.html`, so no build step is needed. Turn on GitHub Pages (Settings → Pages → deploy from `main`, root) or connect the repo to Cloudflare Pages.

Live at https://hugecrankhank.github.io/park-countdown/

## Calendar reminders (Cloudflare Pages)

iPhone only offers "Add to Calendar" for calendar files that come from a real web address. `functions/ics.js` makes those files when the site runs on Cloudflare Pages (it's ignored on GitHub Pages). Connect this repo in Cloudflare → Workers & Pages → Create → Pages → Connect to Git, with no build command and no output folder. The site expects it at `https://park-countdown.pages.dev`; if Cloudflare gives a different address, update `CAL_HOST` in `index.html`.

## Walking sync (Apple Health → the app)

`functions/api/walk.js` stores hourly walking distance per private sync code, so a Shortcut can send it in the background and the home-screen app can pick it up. In Cloudflare: Storage & Databases → KV → create a namespace (e.g. `park-walk`), then in the park-countdown Pages project → Settings → Bindings → Add → KV namespace, variable name `WALK`. Redeploy after adding the binding.
