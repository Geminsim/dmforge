import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom Vite plugin to handle campaign state synchronisation
function campaignSyncPlugin() {
  return {
    name: 'campaign-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/campaign') {
          const filePath = path.resolve(process.cwd(), 'campaign_state.json')

          if (req.method === 'GET') {
            if (fs.existsSync(filePath)) {
              try {
                const data = fs.readFileSync(filePath, 'utf-8')
                res.writeHead(200, {
                  'Content-Type': 'application/json; charset=utf-8',
                  'Cache-Control': 'no-cache'
                })
                res.end(data)
                return
              } catch (err) {
                console.error('Error reading campaign_state.json:', err)
              }
            }
            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-cache'
            })
            res.end(JSON.stringify({}))
          } 
          else if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => {
              body += chunk
            })
            req.on('end', () => {
              try {
                // Ensure it is valid JSON
                JSON.parse(body)
                fs.writeFileSync(filePath, body, 'utf-8')
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
                res.end(JSON.stringify({ success: true }))
              } catch (err) {
                console.error('Failed to parse or write campaign POST body:', err)
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
                res.end(JSON.stringify({ error: 'Invalid JSON state payload' }))
              }
            })
          }
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), campaignSyncPlugin()],
  server: {
    host: true,         // Expose server to Docker network
    port: 5173,         // Standard dev port
    watch: {
      usePolling: true, // Force polling so file changes sync seamlessly across Windows WSL2/Docker filesystem boundary
      interval: 100     // Poll every 100ms
    }
  }
})
