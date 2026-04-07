# Ghost Inbox Labs

Ghost Inbox Labs is a multi-page frontend toolkit for developers and testers.

## Pages

- Home: `/`
- Temp Mail: `/temp-mail/`
- CC Generator: `/cc-gen/`
- BIN Lookup: `/bin-lookup/`
- Address Generator: `/address-gen/`
- CC Checker: `/cc-checker/`
- TOTP Generator: `/totp-gen/`
- Anonymous Chat: `/chat/`

Legacy `.html` files are kept for compatibility, but primary navigation uses extensionless URLs.

## SEO Setup Done

- Canonical tags added on main pages.
- Route pages use clean URLs (`/slug/`) for better indexing.
- Legacy `.html` URLs redirect to clean routes.
- `robots.txt` added.
- `sitemap.xml` added.
- Homepage has structured data (`WebSite` JSON-LD).

## SEO Steps You Must Do After Going Live

1. Open Google Search Console and add property `https://ghostinbox.me`.
2. Verify ownership via DNS record.
3. Submit sitemap: `https://ghostinbox.me/sitemap.xml`.
4. Use URL Inspection and request indexing for home + all tool pages.
5. Add unique content updates weekly (tool notes, examples, changelog).
6. Build quality backlinks (dev communities, product directories, docs links).
7. Improve performance and Core Web Vitals continuously.

Ranking cannot be guaranteed instantly. This setup gives a strong technical SEO base; top positions require content authority and backlinks over time.

## Notes

- All tools are designed for testing/demo use only.
- The project is static and can be hosted directly on GitHub Pages.

## Live API Integrations

- Temp Mail page uses `https://api.mail.tm` to create inboxes and fetch messages.
- BIN Lookup page uses `https://lookup.binlist.net/{bin}` for live card metadata.

## API Keys

- Current integration needs no API key.
- If you hit rate limits or CORS on BIN in production, use your own backend proxy and attach the provider key on server side (never expose keys in frontend JS).
