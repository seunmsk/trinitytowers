# Trinity Towers website

The Trinity Towers website (trinitytowers.ng) runs on Cloudflare Pages, with a site manager at **/admin/**.

- **Website:** `public/` holds the pages: Home, Spaces, Facilities, Gallery and Contact Us, plus the photos and floor plans. It needs no build step.
- **Site manager:** staff sign in with a password to update the spaces (use, size, Available / Under offer / Let), the homepage text and figures, the contact details, the WhatsApp number and the YouTube video. Tour requests from the Contact page arrive there too.
- **Storage:** content and tour requests are saved in Cloudflare KV.
- **Cost:** on Cloudflare's free tier it is ₦0 a month. The only yearly cost is the trinitytowers.ng domain, which stays registered with GO54.

## Go live

1. **Create the Pages project.** In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git** and choose this repository. Use framework preset **None**, leave the build command empty, and set the build output directory to `public`. Every push to `main` redeploys the site.
2. **Create the content store (KV).** Open **Storage & databases → Workers KV → Create instance** (on some accounts it says **Create namespace**). Name it `trinitytowers-content`.
3. **Connect the store to the site.** Open the **trinitytowers** project, go to **Settings → Bindings → Add → KV namespace**, set the variable name to `CONTENT` and pick `trinitytowers-content`, then **Save**. If there's a **Production / Preview** switch, add it under **Production**.
4. **Set the admin password.** Under **Settings → Variables and Secrets**, add `ADMIN_PASSWORD` with the type **Secret**. Use a long password.
5. **Redeploy.** Under **Deployments**, open the latest one and choose **Retry deployment**. Bindings only take effect on a new deployment.
6. **Check it.** Open `https://<project>.pages.dev/api/status`. It should say `"mode": "live"`. Then sign in at `/admin/`.
7. **Optional: email alerts for tour requests.** Add the secrets `RESEND_API_KEY` (from resend.com) and `NOTIFY_EMAIL` (for example `trinitytowers@estatelinks.net`), then redeploy.
8. **Move the domain.** See below.

## Move trinitytowers.ng from WordPress (GO54) to this site

The domain stays registered at GO54. Only where it points changes. Do these steps in order, and don't cancel anything at GO54 until step 6.

1. **Back up the old site.** In the GO54 client area, open cPanel and take a full backup, or use a WordPress backup plugin. Keep it for a few months.
2. **Add the domain to Cloudflare.** In the Cloudflare dashboard, click **Add a domain**, enter `trinitytowers.ng` and choose the **Free** plan. Cloudflare imports the existing DNS records.
3. **Check the email records before going further.** In Cloudflare's DNS list, make sure any **MX** and **TXT** records from GO54 are there. These are needed only if anyone uses an @trinitytowers.ng email address. The current site uses trinitytowers@estatelinks.net, so there may be none. Compare with the DNS zone in GO54's cPanel (**Zone Editor**).
4. **Change the nameservers at GO54.** Cloudflare shows two nameservers (like `xxx.ns.cloudflare.com`). In the GO54 client area, go to **Domains → My Domains → trinitytowers.ng → Nameservers**, choose **Use custom nameservers**, and replace GO54's with Cloudflare's two. A .ng change usually takes a few hours, sometimes up to 24–48. Cloudflare emails you when the domain is active.
5. **Connect the domain to the site.** In the Pages project, open **Custom domains → Set up a custom domain**. Add `trinitytowers.ng`, then add `www.trinitytowers.ng`. Cloudflare creates the DNS records and the SSL certificate by itself.
6. **Check, then cancel the old hosting.** Open trinitytowers.ng on your phone using mobile data, and check that the new site, the Contact form and `/admin/` work. Old links like `/contact-2/` and `/book-a-tour/` redirect to the new pages. After a week with no problems, cancel the **hosting** plan at GO54. **Keep the domain registration** and its yearly renewal.

## Work on it locally

```
cp .dev.vars.example .dev.vars   # set ADMIN_PASSWORD
npm install
npm run dev                      # http://localhost:8788 with a local KV store · site manager at /admin/
npm test                         # checks the API functions
```

Opened without the API (for example straight from the files), the site shows its built-in content, and the site manager saves in that browser only, with the password `admin`.

## How it fits together

| Path | What it does |
|---|---|
| `public/index.html`, `public/<page>/index.html` | The five pages. The header and footer are repeated in each one, so change them in all five. |
| `public/admin/index.html` | The site manager |
| `public/assets/site.css` | All styles |
| `public/assets/site.js` | The stacking plan, gallery and photo viewer, tour booking, and the built-in default content |
| `public/assets/admin.js` | The site manager |
| `public/img/` | Photos, floor plans and partner logos |
| `public/_redirects` | Old WordPress addresses → new pages |
| `functions/api/content.js` | `GET` returns site content; `PUT` saves it (admin only). Each save keeps a 30-day backup of the previous version. |
| `functions/api/enquiry.js` | `POST` from the Book a tour form; saves the request and optionally emails it |
| `functions/api/enquiries.js` | Tour requests for the site manager (admin only) |
| `functions/api/status.js` | Shows whether storage and the password are connected |

To add photos to the Gallery, put the file in `public/img/` and add a line to the `G` list in `public/assets/site.js`.
