import mongoose from 'mongoose'
import Player from '../models/Player'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tank-battle-nextjs'

async function resetPlayerStats() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')
    
    const username = process.argv[2]
    if (!username) {
      console.log('Usage: npm run reset-stats <username>')
      process.exit(1)
    }
    
    const player = await Player.findOne({ username })
    if (!player) {
      console.log('Player not found')
      process.exit(1)
    }
    
    console.log(`\n=== Resetting stats for ${username} ===`)
    console.log('Before reset:')
    console.log(`  Total Kills: ${player.stats.totalKills}`)
    console.log(`  Total Deaths: ${player.stats.totalDeaths}`)
    console.log(`  Total Damage Dealt: ${player.stats.totalDamageDealt}`)
    console.log(`  Total Damage Taken: ${player.stats.totalDamageTaken}`)
    
    // Reset stats
    player.stats.totalKills = 0
    player.stats.totalDeaths = 0
    player.stats.totalDamageDealt = 0
    player.stats.totalDamageTaken = 0
    player.stats.highestScore = 0
    
    await player.save()
    
    console.log('\nAfter reset:')
    console.log(`  Total Kills: ${player.stats.totalKills}`)
    console.log(`  Total Deaths: ${player.stats.totalDeaths}`)
    console.log(`  Total Damage Dealt: ${player.stats.totalDamageDealt}`)
    console.log(`  Total Damage Taken: ${player.stats.totalDamageTaken}`)
    
    console.log('\nStats reset successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

resetPlayerStats()