import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fixClanModal() {
  const filePath = path.join(__dirname, '../components/ClanModal.tsx')
  let content = await fs.readFile(filePath, 'utf-8')
  
  // Find all fetch calls and add Authorization header
  const fetchPattern = /fetch\(['"`]([^'"`]+)['"`],\s*{\s*([^}]+)}\)/g
  
  content = content.replace(fetchPattern, (match, url, options) => {
    // Check if it already has Authorization header
    if (options.includes('Authorization')) {
      return match
    }
    
    // Check if it has headers
    if (options.includes('headers:')) {
      // Add Authorization to existing headers
      return match.replace(
        /headers:\s*{([^}]+)}/,
        (headerMatch, headerContent) => {
          return `headers: {${headerContent},
          'Authorization': authToken ? \`Bearer \${authToken}\` : ''
        }`
        }
      )
    } else {
      // Add headers object
      const newOptions = options.trim()
      if (newOptions.endsWith(',')) {
        return `fetch('${url}', {
        ${newOptions}
        headers: {
          'Authorization': authToken ? \`Bearer \${authToken}\` : ''
        }
      })`
      } else {
        return `fetch('${url}', {
        ${newOptions},
        headers: {
          'Authorization': authToken ? \`Bearer \${authToken}\` : ''
        }
      })`
      }
    }
  })
  
  // Add authToken at the beginning of each function that uses fetch
  const functionPattern = /const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*{/g
  const functions: string[] = []
  let match
  
  while ((match = functionPattern.exec(content)) !== null) {
    functions.push(match[1])
  }
  
  functions.forEach(funcName => {
    const funcPattern = new RegExp(`const\\s+${funcName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*{`)
    content = content.replace(funcPattern, (match) => {
      return `${match}
    const authToken = localStorage.getItem('authToken')`
    })
  })
  
  await fs.writeFile(filePath, content)
  console.log('Fixed ClanModal.tsx')
}

fixClanModal().catch(console.error)