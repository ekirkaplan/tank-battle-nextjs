import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fixAuthCookies() {
  const apiDir = path.join(__dirname, '../app/api')
  
  async function processDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath)
      } else if (entry.name.endsWith('.ts')) {
        let content = await fs.readFile(fullPath, 'utf-8')
        let modified = false
        
        // Fix cookie name from 'token' to 'authToken'
        if (content.includes("request.cookies.get('token')")) {
          content = content.replace(/request\.cookies\.get\('token'\)/g, "request.cookies.get('authToken')")
          modified = true
        }
        
        // Add Authorization header support if not present
        if (content.includes("request.cookies.get('authToken')?.value") && 
            !content.includes("request.headers.get('authorization')")) {
          
          // Find the pattern and add header support
          content = content.replace(
            /const token = request\.cookies\.get\('authToken'\)\?\.value/g,
            `let token = request.cookies.get('authToken')?.value
    
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }`
          )
          modified = true
        }
        
        if (modified) {
          await fs.writeFile(fullPath, content)
          console.log(`Fixed: ${fullPath}`)
        }
      }
    }
  }
  
  await processDirectory(apiDir)
  console.log('Done!')
}

fixAuthCookies().catch(console.error)