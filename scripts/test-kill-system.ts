import mongoose from 'mongoose'
import Player from '../models/Player'
import dotenv from 'dotenv'
import path from 'path'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import jwt from 'jsonwebtoken'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tank-battle-nextjs'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

async function testKillSystem() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')
    
    // Create test players if they don't exist
    let player1 = await Player.findOne({ username: 'testkiller' })
    if (!player1) {
      player1 = await Player.create({
        username: 'testkiller',
        password: 'test123'
      })
      console.log('Created test player: testkiller')
    }
    
    let player2 = await Player.findOne({ username: 'testvictim' })
    if (!player2) {
      player2 = await Player.create({
        username: 'testvictim',
        password: 'test123'
      })
      console.log('Created test player: testvictim')
    }
    
    // Reset their stats
    player1.stats = {
      totalKills: 0,
      totalDeaths: 0,
      highestScore: 0,
      totalGamesPlayed: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0
    }
    player2.stats = {
      totalKills: 0,
      totalDeaths: 0,
      highestScore: 0,
      totalGamesPlayed: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0
    }
    await player1.save()
    await player2.save()
    console.log('Reset player stats')
    
    // Test 1: Direct database update
    console.log('\n=== Test 1: Direct Database Update ===')
    const updated1 = await Player.findByIdAndUpdate(
      player1._id,
      { 
        $inc: { 
          'stats.totalKills': 1,
          'stats.totalDamageDealt': 20
        }
      },
      { new: true }
    )
    console.log('Direct update result:', {
      username: updated1.username,
      totalKills: updated1.stats.totalKills,
      totalDamageDealt: updated1.stats.totalDamageDealt
    })
    
    // Test 2: Using the updateStats method
    console.log('\n=== Test 2: Using updateStats Method ===')
    await player2.updateStats({
      kills: 0,
      deaths: 1,
      damageDealt: 0,
      damageTaken: 20,
      score: 0
    })
    const player2Updated = await Player.findById(player2._id)
    console.log('updateStats result:', {
      username: player2Updated.username,
      totalDeaths: player2Updated.stats.totalDeaths,
      totalDamageTaken: player2Updated.stats.totalDamageTaken
    })
    
    // Test 3: Check experience system
    console.log('\n=== Test 3: Experience System ===')
    const levelBefore = player1.level.current
    const expBefore = player1.level.experience
    await player1.addExperience(50) // Kill gives 50 XP
    const player1AfterExp = await Player.findById(player1._id)
    console.log('Experience result:', {
      levelBefore,
      levelAfter: player1AfterExp.level.current,
      expBefore,
      expAfter: player1AfterExp.level.experience
    })
    
    // Test 4: Simulate socket server kill tracking
    console.log('\n=== Test 4: Socket Server Simulation ===')
    const sessionStats = {
      'socket1': { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, score: 0 },
      'socket2': { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, score: 0 }
    }
    const playerSessions = {
      'socket1': player1._id.toString(),
      'socket2': player2._id.toString()
    }
    
    // Simulate damage
    sessionStats['socket1'].damageDealt += 20
    sessionStats['socket2'].damageTaken += 20
    
    // Simulate kill
    sessionStats['socket1'].kills += 1
    sessionStats['socket2'].deaths += 1
    
    console.log('Session stats after kill:', sessionStats)
    
    // Update database as the socket server should
    const killerUpdate = await Player.findByIdAndUpdate(
      playerSessions['socket1'],
      { 
        $inc: { 
          'stats.totalKills': 1,
          'stats.totalDamageDealt': 20
        }
      },
      { new: true }
    )
    
    const victimUpdate = await Player.findByIdAndUpdate(
      playerSessions['socket2'],
      { 
        $inc: { 
          'stats.totalDeaths': 1,
          'stats.totalDamageTaken': 20
        }
      },
      { new: true }
    )
    
    console.log('Database updates:', {
      killer: {
        username: killerUpdate.username,
        totalKills: killerUpdate.stats.totalKills,
        totalDamageDealt: killerUpdate.stats.totalDamageDealt
      },
      victim: {
        username: victimUpdate.username,
        totalDeaths: victimUpdate.stats.totalDeaths,
        totalDamageTaken: victimUpdate.stats.totalDamageTaken
      }
    })
    
    // Final stats
    console.log('\n=== Final Stats ===')
    const finalPlayer1 = await Player.findById(player1._id)
    const finalPlayer2 = await Player.findById(player2._id)
    
    console.log('Player 1 (testkiller):', finalPlayer1.stats)
    console.log('Player 2 (testvictim):', finalPlayer2.stats)
    
    process.exit(0)
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

testKillSystem()