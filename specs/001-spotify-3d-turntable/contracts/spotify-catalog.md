# Contract: Spotify Catalog Search Gateway

## Purpose

Provide the custom search surface with normalized public Spotify catalog metadata without exposing
Spotify app secrets or user playback credentials to the browser.

This contract replaces the current internal response shape from `api/spotify/search.ts` and the
matching Vite middleware. Those adapters currently accept `type=track`, return raw Spotify data,
and use a 12-result default; the client must migrate to this contract without changing the public
route.

## Request

```text
GET /api/spotify/search?q={query}&types=track,artist,album,playlist&limit=10&offset=0
```

- `q` is required after trimming and URL encoding.
- `types` defaults to `track,playlist` for the primary experience and may include artist and album
  matches for discovery. The gateway translates this to the provider's current search parameter.
- `limit` is clamped to 1-10 and `offset` is zero or greater.
- The browser sends no Spotify `Authorization` header.

## Success Response

```json
{
  "query": "fleetwood mac",
  "items": [
    {
      "uri": "spotify:track:example",
      "kind": "track",
      "title": "Dreams",
      "creator": "Fleetwood Mac",
      "imageUrl": "https://i.scdn.co/image/example",
      "contextUri": null,
      "isPlayable": true,
      "availabilityReason": null
    }
  ],
  "page": {
    "limit": 10,
    "offset": 0,
    "hasMore": false
  },
  "isDemoMode": false
}
```

Playlist results use `kind: "playlist"`, set `contextUri` to the playlist URI, and return the
playlist artwork. Missing artwork is represented by `null`, not by a broken URL.

## Error Responses

```json
{
  "error": {
    "code": "SEARCH_UNAVAILABLE",
    "message": "Search is temporarily unavailable. Try again."
  }
}
```

The gateway maps empty input to `400 INVALID_QUERY`, missing server configuration to
`503 CATALOG_NOT_CONFIGURED`, Spotify authorization failure to `502 CATALOG_AUTH_ERROR`, rate or
quota limiting to `429 CATALOG_RATE_LIMITED`, and other upstream failures to `502 CATALOG_UNAVAILABLE`.
Provider response bodies and authorization headers are not returned to the client or logged.

## Security and Operational Rules

- Server credentials come only from environment variables.
- The server may cache its app-only Client Credentials token in memory until expiry.
- A listener's password, login, or playback token is never accepted by this endpoint.
- The gateway returns normalized metadata and Spotify URIs only; it does not return audio bytes.
- Live requests include the configured market and respect Spotify's current search limit of 10 per
  request. The client paginates only when `hasMore` is true.
- When live credentials are absent in development, the response may use curated fixtures with
  `isDemoMode: true`.
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are server-only. `VITE_SPOTIFY_CLIENT_ID` is not
  required for this v1 contract because the browser PKCE/library flow is retired.
- Development middleware and the Vercel handler must return the same normalized shape and safe error
  codes so local validation exercises the production boundary.
