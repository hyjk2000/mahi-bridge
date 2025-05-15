# Mahi Bridge

_Mahi Bridge_ is a Chrome extension designed to help Scouts Aotearoa (Scouts NZ) group treasurers compare member records between **Mahi Tahi** and **Xero**.

Built with [WXT](https://wxt.dev) and [Bun](https://bun.sh).

## Quick Start

Obtain an OAuth 2.0 client ID for [Xero API](https://developer.xero.com/app/manage) and create an `.env.local` file in `apps/webext:

```env
VITE_XERO_OAUTH_CLIENT_ID=<Your Client ID>
```

Start the dev server:

```shell
bun install
bun -F webext dev
```

Then, load unpacked extension from `apps/webext/.output/chrome-mv3-dev`.

## Privacy

See `PRIVACY.md`.
