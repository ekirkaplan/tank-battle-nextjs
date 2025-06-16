import mongoose from 'mongoose'
import Player from '../models/Player'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tank-battle-nextjs'

async function debugKillTracking() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')
    
    // Get all players and show their stats
    const players = await Player.find({}, 'username stats level')
    
    console.log('\n=== All Players Stats ===')
    players.forEach(player => {
      console.log(`\nPlayer: ${player.username}`)
      console.log(`  Level: ${player.level.current}`)
      console.log(`  Total Kills: ${player.stats.totalKills}`)
      console.log(`  Total Deaths: ${player.stats.totalDeaths}`)
      console.log(`  Total Damage Dealt: ${player.stats.totalDamageDealt}`)
      console.log(`  Total Damage Taken: ${player.stats.totalDamageTaken}`)
      console.log(`  Total Games Played: ${player.stats.totalGamesPlayed}`)
    })
    
    // Test updating a player's kills
    const testUsername = process.argv[2]
    if (testUsername) {
      console.log(`\n=== Testing kill update for ${testUsername} ===`)
      const player = await Player.findOne({ username: testUsername })
      if (player) {
        console.log(`Before: ${player.stats.totalKills} kills`)
        
        const updated = await Player.findByIdAndUpdate(
          player._id,
          { 
            $inc: { 'stats.totalKills': 1 },
            $set: { lastSeen: new Date() }
          },
          { new: true }
        )
        
        console.log(`After: ${updated.stats.totalKills} kills`)
        console.log('Update successful!')
      } else {
        console.log('Player not found')
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

debugKillTracking()