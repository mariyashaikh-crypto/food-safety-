import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The FastAPI backend runs on 127.0.0.1:8000 at the root path.
// Forward recognized backend route prefixes directly (no rewrite) so that
// server-generated paths such as /evidence/<file> also resolve in dev.
const backend = 'http://127.0.0.1:8000'

const backendPrefixes = [
  '/auth',
  '/establishments',
  '/inspections',
  '/violations',
  '/corrective-actions',
  '/reinspections',
  '/evidence',
  '/dashboard',
  '/inspection-priority',
  '/ml-risk-overview',
  '/smart-decision-overview',
  '/ai',
  '/health',
]

const proxy = Object.fromEntries(
  backendPrefixes.map((prefix) => [prefix, backend])
)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy,
  },
})