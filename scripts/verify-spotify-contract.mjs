import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const baseUrl = (process.env.TURNTABLE_URL ?? 'http://localhost:5173').replace(/\/$/, '')

async function readJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init)
  let body
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { response, body }
}

function assertSafeError(body) {
  assert.equal(typeof body?.error?.code, 'string')
  assert.equal(typeof body?.error?.message, 'string')
  assert.equal(body.error.message.includes('access_token'), false)
  assert.equal(body.error.message.includes('client_secret'), false)
  assert.equal(body.error.message.includes('password'), false)
}

async function verifyGatewaySource(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  for (const requiredExport of ['filterDemoCatalog', 'normalizeSpotifySearchPayload', 'clampCatalogLimit', 'catalogError']) {
    assert.equal(source.includes(requiredExport), true, `${path} must use ${requiredExport}`)
  }
}

await verifyGatewaySource('api/spotify/search.ts')
await verifyGatewaySource('vite.config.ts')

const invalidQuery = await readJson('/api/spotify/search?q=')
assert.equal(invalidQuery.response.status, 400)
assert.equal(invalidQuery.body?.error?.code, 'INVALID_QUERY')

const oversizedQuery = await readJson(`/api/spotify/search?q=${'x'.repeat(121)}`)
assert.equal(oversizedQuery.response.status, 400)
assert.equal(oversizedQuery.body?.error?.code, 'INVALID_QUERY')

const postRequest = await readJson('/api/spotify/search?q=turntable', { method: 'POST' })
assert.equal(postRequest.response.status, 405)
assertSafeError(postRequest.body)

const catalog = await readJson('/api/spotify/search?q=turntable&types=track,playlist&limit=50&offset=-4')
if (catalog.response.ok) {
  assert.equal(Array.isArray(catalog.body?.items), true)
  assert.equal(catalog.body?.page?.limit, 10)
  assert.equal(catalog.body?.page?.offset, 0)
  assert.equal(typeof catalog.body?.isDemoMode, 'boolean')
  for (const item of catalog.body.items) {
    assert.equal(typeof item.uri, 'string')
    assert.equal(typeof item.title, 'string')
    assert.equal(typeof item.creator, 'string')
    assert.equal(typeof item.isPlayable, 'boolean')
  }
} else {
  assertSafeError(catalog.body)
  assert.equal(['CATALOG_AUTH_ERROR', 'CATALOG_RATE_LIMITED', 'CATALOG_UNAVAILABLE'].includes(catalog.body.error.code), true)
}

console.log('Spotify catalog contract smoke checks passed.')
