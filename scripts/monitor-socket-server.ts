import io from 'socket.io-client'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// Create a test token
const token = jwt.sign({ userId: '68505bc3f0df59004139926f' }, JWT_SECRET, { expiresIn: '7d' })

console.log('Connecting to socket server...')

const socket = io('http://localhost:3001', {
  auth: {
    token
  }
})

socket.on('connect', () => {
  console.log('Connected! Socket ID:', socket.id)
})

socket.on('init', (data) => {
  console.log('Received init event:', {
    playerId: data.playerId,
    username: data.playerData?.username,
    stats: data.playerData?.stats
  })
})

socket.on('statsUpdate', (stats) => {
  console.log('=== STATS UPDATE RECEIVED ===')
  console.log('New stats:', stats)
  console.log('=============================')
})

socket.on('death', () => {
  console.log('=== DEATH EVENT RECEIVED ===')
})

socket.on('levelUp', (data) => {
  console.log('=== LEVEL UP EVENT RECEIVED ===')
  console.log('New level:', data.newLevel)
  console.log('Attribute points:', data.attributePoints)
})

socket.on('disconnect', () => {
  console.log('Disconnected from server')
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message)
})

// Keep the script running
setInterval(() => {
  console.log('Monitor running... Socket connected:', socket.connected)
}, 30000)