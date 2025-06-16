import mongoose from 'mongoose'
import Player from '../models/Player'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tank-battle-nextjs'

let previousStats: { [username: string]: any } = {}

async function monitorStats() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB - Monitoring player stats...')
  console.log('Press Ctrl+C to stop\n')
  
  // Initial stats
  const players = await Player.find({}, 'username stats')
  players.forEach(player => {
    previousStats[player.username] = JSON.parse(JSON.stringify(player.stats))
  })
  
  setInterval(async () => {
    try {
      const players = await Player.find({}, 'username stats')
      
      for (const player of players) {
        const prev = previousStats[player.username] || {}
        const curr = player.stats
        
        // Check for changes
        let changed = false
        const changes: string[] = []
        
        if (prev.totalKills !== curr.totalKills) {
          changes.push(`Kills: ${prev.totalKills || 0} → ${curr.totalKills}`)
          changed = true
        }
        if (prev.totalDeaths !== curr.totalDeaths) {
          changes.push(`Deaths: ${prev.totalDeaths || 0} → ${curr.totalDeaths}`)
          changed = true
        }
        if (prev.totalDamageDealt !== curr.totalDamageDealt) {
          changes.push(`Damage Dealt: ${prev.totalDamageDealt || 0} → ${curr.totalDamageDealt}`)
          changed = true
        }
        if (prev.totalDamageTaken !== curr.totalDamageTaken) {
          changes.push(`Damage Taken: ${prev.totalDamageTaken || 0} → ${curr.totalDamageTaken}`)
          changed = true
        }
        
        if (changed) {
          console.log(`[${new Date().toLocaleTimeString()}] ${player.username}: ${changes.join(', ')}`)
          previousStats[player.username] = JSON.parse(JSON.stringify(curr))
        }
      }
    } catch (error) {
      console.error('Monitor error:', error)
    }
  }, 1000) // Check every second
}

monitorStats().catch(console.error)