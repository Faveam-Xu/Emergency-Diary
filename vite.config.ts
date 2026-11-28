import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PR1-4: read the CSP from public/_headers (what Netlify serves) so that
// `vite preview` sends the same policy and it can be tested locally.
function headersFromNetlifyFile(): Record<string, string> {
  const headers: Record<string, string> = {}
  const lines = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^\s+([A-Za-z-]+):\s*(.+)$/)
    if (match) headers[match[1]] = match[2].trim()
  }
  return headers
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // PR1-4: the production build has no console output, so WebIDs, Pod URLs
  // and SPARQL queries are no longer printed in the browser console.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : undefined,
  preview: { headers: headersFromNetlifyFile() },
}))
