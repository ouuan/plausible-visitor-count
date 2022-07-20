# plausible-visitor-count

Proxy to get visitor count for a specific page from [Plausible Analytics](https://plausible.io), because Plausible [does not support scoped API keys](https://github.com/plausible/analytics/discussions/1767).

The site's timezone needs to be set as GMT+0.

## API

`GET /api/visitors/:path`: returns a JSON object `{ statusCode: 200, path: string, visitors: number }` or `{ statusCode: number, error: string, message: string }` with corresponding HTTP status code. The period is from 2019-01-01 to now, i.e. all stats.

## Config

Configs are via environment variables.

`PLAUSIBLE_URL`: optional, default is `https://plausible.io`

`PLAUSIBLE_SITE_ID`: required

`PLAUSIBLE_API_TOKEN`: required
