import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Player from '../models/Player'
import dotenv from 'dotenv'
import path from 'path'
import { SpatialGrid } from './spatial-grid'
import { BulletPool, PooledBullet } from './object-pool'
import { DeltaCompressor } from './delta-compression'
import { PowerUpManager, PlayerPowerUpManager, PowerUpType, PowerUp } from './powerups'
import { ObstacleManager, Obstacle } from './obstacles'
import { ChatManager, ChatMessage } from './chat-manager'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tank-battle-nextjs'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const SOCKET_PORT = 3001

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

interface GamePlayer {
  id: string
  userId: string
  username: string
  x: number
  y: number
  angle: number
  health: number
  maxHealth: number
  speed: number
  damage: number
  regeneration: number
  attackSpeed: number
  score: number
  color: string
  lastShot: number
  lastRegen: number
  level: number
  clan?: {
    name: string
    tag: string
  }
}

interface Bullet {
  id: number
  playerId: string
  x: number
  y: number
  vx: number
  vy: number
  damage: number
}

interface GameState {
  players: { [key: string]: GamePlayer }
  bullets: { [key: string]: PooledBullet }
  powerUps: { [key: string]: PowerUp }
  obstacles: { [key: string]: Obstacle }
  arena: {
    width: number
    height: number
  }
}

let bulletId = 0

const gameState: GameState = {
  players: {},
  bullets: {},
  powerUps: {},
  obstacles: {},
  arena: {
    width: 4000,
    height: 3000
  }
}

const playerSessions: { [socketId: string]: string } = {}
const sessionStats: { [socketId: string]: any } = {}
const playerPowerUps: { [socketId: string]: PlayerPowerUpManager } = {}

// Track active user sessions (userId -> socketId)
const activeUserSessions: { [userId: string]: string } = {}

// Initialize spatial grids with larger cell size for bigger map
const playerGrid = new SpatialGrid(gameState.arena.width, gameState.arena.height, 200)
const bulletGrid = new SpatialGrid(gameState.arena.width, gameState.arena.height, 100)

// Initialize bullet pool
const bulletPool = new BulletPool(50, 200)

// Initialize delta compressor
const deltaCompressor = new DeltaCompressor()

// Initialize power-up manager
const powerUpManager = new PowerUpManager(gameState.arena.width, gameState.arena.height)

// Initialize obstacle manager
const obstacleManager = new ObstacleManager(gameState.arena.width, gameState.arena.height)

// Populate game state with obstacles
obstacleManager.getObstacles().forEach(obstacle => {
  gameState.obstacles[obstacle.id] = obstacle
})

// Initialize chat manager
const chatManager = new ChatManager()

const httpServer = createServer()
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
})

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    console.log('Socket auth token received:', token ? 'Yes' : 'No')
    
    if (!token) {
      return next(new Error('No token provided'))
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any
    console.log('Token decoded:', decoded)
    
    if (!decoded || !decoded.userId) {
      return next(new Error('Invalid token'))
    }
    
    const player = await Player.findById(decoded.userId)
    if (!player) {
      console.log('Player not found for userId:', decoded.userId)
      return next(new Error('Player not found'))
    }
    
    console.log('Player authenticated:', player.username)
    socket.data.playerData = player
    next()
  } catch (error) {
    console.error('Auth error:', error)
    next(new Error('Authentication failed'))
  }
})

io.on('connection', async (socket) => {
  const playerData = socket.data.playerData
  const userId = playerData._id.toString()
  console.log('New player connected:', socket.id, playerData.username)
  
  // Check if user already has an active session
  const existingSocketId = activeUserSessions[userId]
  if (existingSocketId && io.sockets.sockets.get(existingSocketId)) {
    // Disconnect the previous session
    console.log(`Disconnecting previous session for user ${playerData.username}`)
    const existingSocket = io.sockets.sockets.get(existingSocketId)
    if (existingSocket) {
      existingSocket.emit('forceDisconnect', { reason: 'Another session started' })
      existingSocket.disconnect(true)
    }
  }
  
  // Track the new active session
  activeUserSessions[userId] = socket.id
  
  // Initialize session tracking
  playerSessions[socket.id] = userId
  sessionStats[socket.id] = {
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    damageTaken: 0,
    score: 0
  }
  playerPowerUps[socket.id] = new PlayerPowerUpManager()
  
  console.log(`Session initialized for ${playerData.username}:`, {
    socketId: socket.id,
    userId: userId,
    sessionStats: sessionStats[socket.id]
  })
  
  // Check if player has recent death time
  let isRespawning = false
  let respawnTimeRemaining = 0
  
  if (playerData.lastDeathTime) {
    const timeSinceDeath = Date.now() - new Date(playerData.lastDeathTime).getTime()
    const respawnDelay = 40000 // 40 seconds
    
    if (timeSinceDeath < respawnDelay) {
      isRespawning = true
      respawnTimeRemaining = Math.ceil((respawnDelay - timeSinceDeath) / 1000)
      console.log(`Player ${playerData.username} is still respawning. Time remaining: ${respawnTimeRemaining}s`)
    }
  }
  
  // Create new player with attributes
  const baseHealth = 100
  const baseSpeed = 3
  const baseDamage = 20
  
  // Find safe spawn position (not colliding with obstacles)
  let spawnX, spawnY
  let attempts = 0
  
  // Check if player has saved position
  if (playerData.position && playerData.position.x !== -1 && playerData.position.y !== -1) {
    // Use saved position if valid and not colliding
    if (!obstacleManager.checkCollision(playerData.position.x, playerData.position.y, 30)) {
      spawnX = playerData.position.x
      spawnY = playerData.position.y
    } else {
      // Saved position is blocked, find new one
      do {
        spawnX = 100 + Math.random() * (gameState.arena.width - 200)
        spawnY = 100 + Math.random() * (gameState.arena.height - 200)
        attempts++
      } while (obstacleManager.checkCollision(spawnX, spawnY, 30) && attempts < 50)
    }
  } else {
    // No saved position, find random spawn
    do {
      spawnX = 100 + Math.random() * (gameState.arena.width - 200)
      spawnY = 100 + Math.random() * (gameState.arena.height - 200)
      attempts++
    } while (obstacleManager.checkCollision(spawnX, spawnY, 30) && attempts < 50)
  }
  
  const player: GamePlayer = {
    id: socket.id,
    userId: playerData._id.toString(),
    username: playerData.username,
    x: spawnX,
    y: spawnY,
    angle: 0,
    health: isRespawning ? 0 : baseHealth + (playerData.attributes.health * 10), // 0 HP if respawning
    maxHealth: baseHealth + (playerData.attributes.health * 10),
    speed: baseSpeed + (playerData.attributes.speed * 0.3), // +0.3 speed per point
    damage: baseDamage + (playerData.attributes.damage * 5), // +5 damage per point
    regeneration: playerData.attributes.regeneration * 0.5, // 0.5 HP/sec per point
    attackSpeed: playerData.attributes.attackSpeed, // Used for shot cooldown reduction
    score: 0,
    color: playerData.tankColor,
    lastShot: 0,
    lastRegen: Date.now(),
    level: playerData.level.current,
    clan: playerData.clan ? {
      name: playerData.clan.name,
      tag: playerData.clan.tag
    } : undefined
  }
  
  gameState.players[socket.id] = player
  
  // Only add to spatial grid if not respawning
  if (!isRespawning) {
    playerGrid.insert({
      id: socket.id,
      x: player.x - 20,
      y: player.y - 20,
      width: 40,
      height: 40
    })
  }
  
  // Send initial game state with chat history
  const chatHistory = await chatManager.getRecentMessages()
  socket.emit('init', {
    playerId: socket.id,
    playerData: {
      _id: playerData._id.toString(),
      username: player.username,
      stats: playerData.stats,
      level: playerData.level,
      attributes: playerData.attributes,
      clan: playerData.clan,
      tankColor: playerData.tankColor
    },
    gameState: deltaCompressor.createPlayerSnapshot(socket.id, gameState),
    chatHistory: chatHistory,
    isRespawning: isRespawning,
    respawnTimeRemaining: respawnTimeRemaining
  })
  
  // If respawning, set timer to respawn
  if (isRespawning) {
    setTimeout(() => {
      if (gameState.players[socket.id]) {
        player.health = player.maxHealth
        
        // Add player to spatial grid
        playerGrid.insert({
          id: socket.id,
          x: player.x - 20,
          y: player.y - 20,
          width: 40,
          height: 40
        })
        
        // Clear death time in database
        Player.findByIdAndUpdate(userId, { $unset: { lastDeathTime: 1 } }).catch(err => {
          console.error('Error clearing death time:', err)
        })
        
        // Notify client of respawn
        socket.emit('respawn')
      }
    }, respawnTimeRemaining * 1000)
  }
  
  // Notify other players
  socket.broadcast.emit('playerJoined', player)
  
  // Send welcome message
  const welcomeMsg = await chatManager.addSystemMessage(`${player.username} joined the game`)
  if (welcomeMsg) {
    io.emit('chatMessage', welcomeMsg)
  }
  
  // Handle player movement
  socket.on('move', (data) => {
    if (gameState.players[socket.id]) {
      const player = gameState.players[socket.id]
      const powerUpManager = playerPowerUps[socket.id]
      const speedMultiplier = powerUpManager ? powerUpManager.getSpeedMultiplier() : 1
      const effectiveSpeed = player.speed * speedMultiplier
      
      if (data.up) {
        player.x += Math.cos(player.angle) * effectiveSpeed
        player.y += Math.sin(player.angle) * effectiveSpeed
      }
      if (data.down) {
        player.x -= Math.cos(player.angle) * effectiveSpeed
        player.y -= Math.sin(player.angle) * effectiveSpeed
      }
      if (data.left) {
        player.angle -= 0.08
      }
      if (data.right) {
        player.angle += 0.08
      }
      
      // Check obstacle collisions
      const collision = obstacleManager.checkCollision(player.x, player.y, 20)
      if (collision) {
        const pushback = obstacleManager.getPushbackVector(player.x, player.y, 20, collision)
        player.x += pushback.x
        player.y += pushback.y
      }
      
      // Keep player in bounds
      player.x = Math.max(20, Math.min(gameState.arena.width - 20, player.x))
      player.y = Math.max(20, Math.min(gameState.arena.height - 20, player.y))
      
      // Update player in spatial grid
      playerGrid.update({
        id: socket.id,
        x: player.x - 20,
        y: player.y - 20,
        width: 40,
        height: 40
      })
    }
  })
  
  // Handle shooting
  socket.on('shoot', () => {
    const player = gameState.players[socket.id]
    if (!player) {
      console.error('Shoot event: Player not found for socket:', socket.id)
      return
    }
    
    console.log(`Shoot event from ${player.username}:`, {
      damage: player.damage,
      socketId: socket.id
    })
    
    const powerUpManager = playerPowerUps[socket.id]
    const fireRateMultiplier = powerUpManager ? powerUpManager.getFireRateMultiplier() : 1
    const damageMultiplier = powerUpManager ? powerUpManager.getDamageMultiplier() : 1
    
    // Base cooldown 500ms, reduced by 5% per attack speed point
    const attackSpeedReduction = 1 - (player.attackSpeed * 0.05)
    const baseCooldown = 500
    const fireCooldown = baseCooldown * attackSpeedReduction * fireRateMultiplier
    
    if (player && Date.now() - player.lastShot > fireCooldown) {
      player.lastShot = Date.now()
      
      const bulletDamage = player.damage * damageMultiplier
      console.log(`Creating bullet with damage: ${bulletDamage} (base: ${player.damage}, multiplier: ${damageMultiplier})`)
      
      const bullet = bulletPool.createBullet(
        socket.id,
        player.x + Math.cos(player.angle) * 30,
        player.y + Math.sin(player.angle) * 30,
        Math.cos(player.angle) * 10,
        Math.sin(player.angle) * 10,
        bulletDamage
      )
      
      console.log('Created bullet:', {
        id: bullet.id,
        damage: bullet.damage,
        playerId: bullet.playerId
      })
      
      gameState.bullets[bullet.id] = bullet
      
      // Add bullet to spatial grid
      bulletGrid.insert({
        id: bullet.id.toString(),
        x: bullet.x - 5,
        y: bullet.y - 5,
        width: 10,
        height: 10
      })
      
      io.emit('bulletFired', bullet)
    }
  })
  
  // Handle chat messages
  socket.on('chatMessage', async (message: string) => {
    if (gameState.players[socket.id] && message) {
      const player = gameState.players[socket.id]
      const chatMessage = await chatManager.addMessage(socket.id, player.username, message)
      if (chatMessage) {
        io.emit('chatMessage', chatMessage)
      }
    }
  })
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('Player disconnected:', socket.id)
    
    // Save player position and any remaining session stats
    if (playerSessions[socket.id]) {
      try {
        const player = await Player.findById(playerSessions[socket.id])
        if (player && gameState.players[socket.id]) {
          // Save position
          player.position = {
            x: gameState.players[socket.id].x,
            y: gameState.players[socket.id].y
          }
          
          // Save any remaining session stats that weren't saved during gameplay
          const stats = sessionStats[socket.id]
          if (stats && (stats.damageDealt > 0 || stats.damageTaken > 0 || stats.score > 0)) {
            player.stats.totalDamageDealt += stats.damageDealt || 0
            player.stats.totalDamageTaken += stats.damageTaken || 0
            
            const score = gameState.players[socket.id]?.score || 0
            if (score > player.stats.highestScore) {
              player.stats.highestScore = score
            }
            
            // Add experience for damage dealt
            const expGained = (stats.damageDealt || 0) * 0.5 + score * 10
            if (expGained > 0) {
              await player.addExperience(expGained)
            }
          }
          
          player.lastSeen = new Date()
          await player.save()
          console.log(`Saved position (${player.position.x}, ${player.position.y}) and stats for ${player.username}`)
        }
      } catch (error) {
        console.error('Error saving player data on disconnect:', error)
      }
    }
    
    // Get player name and userId before cleanup
    const playerName = gameState.players[socket.id]?.username || 'A player'
    const userId = playerSessions[socket.id]
    
    // Clean up active user session
    if (userId && activeUserSessions[userId] === socket.id) {
      delete activeUserSessions[userId]
    }
    
    // Clean up
    delete gameState.players[socket.id]
    delete playerSessions[socket.id]
    delete sessionStats[socket.id]
    delete playerPowerUps[socket.id]
    
    // Remove player from spatial grid
    playerGrid.remove(socket.id)
    
    // Remove player snapshot
    deltaCompressor.removePlayerSnapshot(socket.id)
    
    // Remove player chat messages
    chatManager.removePlayerMessages(socket.id)
    
    // Send leave message
    const leaveMsg = await chatManager.addSystemMessage(`${playerName} left the game`)
    if (leaveMsg) {
      io.emit('chatMessage', leaveMsg)
    }
    
    io.emit('playerLeft', socket.id)
  })
})

// Game loop
setInterval(() => {
  updateGameState()
  
  // Compress and send delta state
  const deltaState = deltaCompressor.compressGameState(gameState)
  
  // Only send if there are changes
  if (Object.keys(deltaState).length > 0) {
    io.emit('deltaState', deltaState)
  }
}, 1000 / 30) // 30 FPS for smoother performance

function updateGameState() {
  const now = Date.now()
  
  // Update power-ups
  const activePowerUps = powerUpManager.update(now)
  gameState.powerUps = {}
  activePowerUps.forEach(powerUp => {
    gameState.powerUps[powerUp.id] = powerUp
  })
  
  // Check power-up collisions
  for (const playerId in gameState.players) {
    const player = gameState.players[playerId]
    const pickedUp = powerUpManager.checkCollision(player.x, player.y)
    
    if (pickedUp) {
      const powerUpManagerPlayer = playerPowerUps[playerId]
      if (powerUpManagerPlayer) {
        // Apply power-up effect
        if (pickedUp.type === PowerUpType.HEALTH) {
          // Instant health recovery
          player.health = Math.min(player.maxHealth, player.health + pickedUp.value)
          io.to(playerId).emit('powerUpCollected', { type: pickedUp.type, value: pickedUp.value })
        } else {
          // Timed effect
          const effect = powerUpManagerPlayer.applyPowerUp(pickedUp, now)
          if (effect) {
            io.to(playerId).emit('powerUpCollected', { 
              type: pickedUp.type, 
              value: pickedUp.value,
              duration: pickedUp.duration 
            })
          }
        }
      }
    }
  }
  
  // Update player power-up effects
  for (const playerId in playerPowerUps) {
    playerPowerUps[playerId].update(now)
  }
  
  // Apply regeneration
  for (const playerId in gameState.players) {
    const player = gameState.players[playerId]
    if (player.regeneration > 0 && player.health < player.maxHealth) {
      // Regenerate every second
      if (now - player.lastRegen >= 1000) {
        player.health = Math.min(player.maxHealth, player.health + player.regeneration)
        player.lastRegen = now
      }
    }
  }
  
  // Update bullets
  for (const bulletId in gameState.bullets) {
    const bullet = gameState.bullets[bulletId]
    
    // Update position
    bullet.x += bullet.vx
    bullet.y += bullet.vy
    
    // Update bullet in spatial grid
    bulletGrid.update({
      id: bulletId,
      x: bullet.x - 5,
      y: bullet.y - 5,
      width: 10,
      height: 10
    })
    
    // Check bullet-obstacle collision
    const obstacleHit = obstacleManager.checkCollision(bullet.x, bullet.y, 4)
    if (obstacleHit) {
      delete gameState.bullets[bulletId]
      bulletGrid.remove(bulletId)
      bulletPool.releaseBullet(bullet)
      
      // Damage destructible obstacles
      if (obstacleHit.destructible) {
        const destroyed = obstacleManager.damageObstacle(obstacleHit.id, bullet.damage)
        if (destroyed) {
          delete gameState.obstacles[obstacleHit.id]
          io.emit('obstacleDestroyed', obstacleHit.id)
        }
      }
      continue
    }
    
    // Remove out of bounds bullets
    if (bullet.x < 0 || bullet.x > gameState.arena.width || 
        bullet.y < 0 || bullet.y > gameState.arena.height) {
      delete gameState.bullets[bulletId]
      bulletGrid.remove(bulletId)
      bulletPool.releaseBullet(bullet)
      continue
    }
    
    // Check collisions using spatial grid
    const nearbyPlayers = playerGrid.getNearbyObjects({
      id: bulletId,
      x: bullet.x - 5,
      y: bullet.y - 5,
      width: 10,
      height: 10
    })
    
    for (const playerObj of nearbyPlayers) {
      const player = gameState.players[playerObj.id]
      if (player && playerObj.id !== bullet.playerId) {
        const dx = player.x - bullet.x
        const dy = player.y - bullet.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 20) {
          // Apply damage with shield reduction
          const shieldOwner = playerPowerUps[playerObj.id]
          const damageReduction = shieldOwner ? shieldOwner.getDamageReduction() : 0
          const finalDamage = bullet.damage * (1 - damageReduction)
          
          player.health -= finalDamage
          
          // Track and save damage immediately BEFORE releasing bullet
          const bulletDamage = bullet.damage // Save damage before releasing
          const bulletPlayerId = bullet.playerId // Save playerId before releasing
          
          if (sessionStats[bulletPlayerId]) {
            sessionStats[bulletPlayerId].damageDealt += bulletDamage
            
            // Update attacker's damage dealt in database
            const attackerUserId = playerSessions[bulletPlayerId]
            if (attackerUserId) {
              console.log(`Updating damage dealt for attacker: ${attackerUserId}, damage: ${bulletDamage}`)
              Player.findByIdAndUpdate(
                attackerUserId,
                { 
                  $inc: { 'stats.totalDamageDealt': bulletDamage },
                  $set: { lastSeen: new Date() }
                },
                { new: true }
              ).then(result => {
                if (!result) {
                  console.error('Attacker not found in database:', attackerUserId)
                } else {
                  console.log('Damage dealt updated successfully')
                }
              }).catch(err => {
                console.error('Error updating attacker damage stats:', err)
              })
            }
          }
          if (sessionStats[playerObj.id]) {
            sessionStats[playerObj.id].damageTaken += bulletDamage
            
            // Update defender's damage taken in database
            const defenderUserId = playerSessions[playerObj.id]
            if (defenderUserId) {
              console.log(`Updating damage taken for defender: ${defenderUserId}, damage: ${bullet.damage}`)
              Player.findByIdAndUpdate(
                defenderUserId,
                { 
                  $inc: { 'stats.totalDamageTaken': bulletDamage },
                  $set: { lastSeen: new Date() }
                },
                { new: true }
              ).then(result => {
                if (!result) {
                  console.error('Defender not found in database:', defenderUserId)
                } else {
                  console.log('Damage taken updated successfully')
                }
              }).catch(err => {
                console.error('Error updating defender damage stats:', err)
              })
            }
          }
          
          if (player.health <= 0) {
            // Player killed - check if killer still exists
            const killer = gameState.players[bulletPlayerId]
            if (killer) {
              killer.score += 1
              
              // Track kills for killer
              console.log('\n=== KILL EVENT START ===')
              console.log('Timestamp:', new Date().toISOString())
              console.log('Bullet info:', { playerId: bulletPlayerId, damage: bulletDamage })
              console.log('Killer info:', { username: killer.username, id: killer.id, userId: playerSessions[bulletPlayerId] })
              console.log('Victim info:', { username: player.username, id: playerObj.id, userId: playerSessions[playerObj.id] })
              console.log('SessionStats for killer:', sessionStats[bulletPlayerId])
              console.log('SessionStats for victim:', sessionStats[playerObj.id])
              
              if (sessionStats[bulletPlayerId]) {
                sessionStats[bulletPlayerId].kills += 1
                console.log(`Kill tracked in session: ${killer.username} killed ${player.username}. Session kills: ${sessionStats[bulletPlayerId].kills}`)
                
                // Update killer stats in database immediately
                const killerUserId = playerSessions[bulletPlayerId]
                console.log(`Looking up killer userId for socketId ${bulletPlayerId}: ${killerUserId}`)
                
                if (killerUserId) {
                  // Update database and emit new stats
                  Player.findByIdAndUpdate(
                    killerUserId,
                    { 
                      $inc: { 
                        'stats.totalKills': 1
                      },
                      $set: { lastSeen: new Date() }
                    },
                    { new: true }
                  ).then(killerPlayer => {
                    console.log('Database update response:', killerPlayer ? 'Player found' : 'Player not found')
                    if (killerPlayer) {
                      console.log('Updated stats in DB:', {
                        username: killerPlayer.username,
                        totalKills: killerPlayer.stats.totalKills,
                        totalDeaths: killerPlayer.stats.totalDeaths,
                        totalDamageDealt: killerPlayer.stats.totalDamageDealt
                      })
                      
                      // Calculate experience for the kill
                      const expGained = 50 // 50 XP per kill
                      console.log('Adding experience to killer:', {
                        username: killerPlayer.username,
                        expGained,
                        currentTotalXP: killerPlayer.level.totalExperience,
                        currentXP: killerPlayer.level.experience,
                        currentLevel: killerPlayer.level.current
                      })
                      
                      killerPlayer.addExperience(expGained).then(async levelResult => {
                        console.log('Experience added:', {
                          leveledUp: levelResult.leveledUp,
                          newLevel: levelResult.newLevel,
                          newTotalXP: killerPlayer.level.totalExperience,
                          newCurrentXP: killerPlayer.level.experience
                        })
                        
                        // Ensure the player document is saved with new XP
                        await killerPlayer.save()
                        
                        const statsUpdate = {
                          totalKills: killerPlayer.stats.totalKills,
                          totalDeaths: killerPlayer.stats.totalDeaths
                        }
                        console.log(`Emitting statsUpdate to socket ${bulletPlayerId}:`, statsUpdate)
                        
                        // Try both targeted and broadcast emit
                        io.to(bulletPlayerId).emit('statsUpdate', statsUpdate)
                        
                        // Also try direct socket emit if socket exists
                        const killerSocket = io.sockets.sockets.get(bulletPlayerId)
                        if (killerSocket) {
                          console.log('Direct emit to killer socket')
                          killerSocket.emit('statsUpdate', statsUpdate)
                        } else {
                          console.log('WARNING: Killer socket not found for direct emit')
                        }
                        
                        if (levelResult.leveledUp) {
                          io.to(bulletPlayerId).emit('levelUp', {
                            newLevel: levelResult.newLevel,
                            attributePoints: levelResult.attributePoints
                          })
                        }
                      })
                    } else {
                      console.log('Killer player not found in database')
                    }
                  }).catch(err => {
                    console.error('Error updating killer stats:', err)
                    console.error('Full error:', err.stack)
                  })
                } else {
                  console.error('ERROR: Killer userId not found in playerSessions')
                  console.error('Looking for socketId:', bulletPlayerId)
                  console.error('Available socketIds:', Object.keys(playerSessions))
                }
              } else {
                console.error('ERROR: No sessionStats for killer')
                console.error('Looking for socketId:', bulletPlayerId)
                console.error('Available sessionStats:', Object.keys(sessionStats))
              }
              console.log('=== KILL EVENT END ===\n')
              
              // Send kill message to chat
              chatManager.addKillMessage(killer.username, player.username).then(killMsg => {
                if (killMsg) io.emit('chatMessage', killMsg)
              })
            }
            
            // Track deaths for victim
            if (sessionStats[playerObj.id]) {
              sessionStats[playerObj.id].deaths += 1
              console.log(`Death tracked for ${player.username}. Session deaths: ${sessionStats[playerObj.id].deaths}`)
              
              // Update victim stats in database immediately
              const victimUserId = playerSessions[playerObj.id]
              console.log(`Victim userId: ${victimUserId}, socketId: ${playerObj.id}`)
              if (victimUserId) {
                // Update database and emit new stats
                Player.findByIdAndUpdate(
                  victimUserId,
                  { 
                    $inc: { 
                      'stats.totalDeaths': 1
                    },
                    $set: { 
                      lastSeen: new Date(),
                      lastDeathTime: new Date() // Save death time
                    }
                  },
                  { new: true }
                ).then(victimPlayer => {
                  if (victimPlayer) {
                    console.log(`Updated victim stats in DB. New total deaths: ${victimPlayer.stats.totalDeaths}`)
                    io.to(playerObj.id).emit('statsUpdate', {
                      totalKills: victimPlayer.stats.totalKills,
                      totalDeaths: victimPlayer.stats.totalDeaths
                    })
                  } else {
                    console.log('Victim player not found in database')
                  }
                }).catch(err => {
                  console.error('Error updating victim stats:', err)
                })
              } else {
                console.log('Victim userId not found in playerSessions')
              }
            } else {
              console.log('No sessionStats for victim')
            }
            
            io.to(playerObj.id).emit('death', { respawnTime: 40 }) // Send respawn time to client
            
            // Remove player from grid temporarily
            playerGrid.remove(playerObj.id)
            
            // Set respawn timer (40 seconds)
            setTimeout(() => {
              if (gameState.players[playerObj.id]) {
                // Respawn with full health at safe position
                player.health = player.maxHealth
                
                // Find safe spawn position
                let attempts = 0
                do {
                  player.x = 100 + Math.random() * (gameState.arena.width - 200)
                  player.y = 100 + Math.random() * (gameState.arena.height - 200)
                  attempts++
                } while (obstacleManager.checkCollision(player.x, player.y, 30) && attempts < 50)
                
                // Add player back to spatial grid
                playerGrid.insert({
                  id: playerObj.id,
                  x: player.x - 20,
                  y: player.y - 20,
                  width: 40,
                  height: 40
                })
                
                // Notify client of respawn
                io.to(playerObj.id).emit('respawn')
              }
            }, 40000) // 40 seconds
          }
          
          // NOW release the bullet after all operations are done
          delete gameState.bullets[bulletId]
          bulletGrid.remove(bulletId)
          bulletPool.releaseBullet(bullet)
          
          break
        }
      }
    }
  }
}

// Periodic cleanup of old chat messages (every hour)
setInterval(async () => {
  await chatManager.clearOldMessages()
  console.log('Cleaned old chat messages')
}, 3600000) // 1 hour

// Periodic position save (every 5 seconds)
setInterval(async () => {
  const positionUpdates = []
  
  for (const socketId in gameState.players) {
    const player = gameState.players[socketId]
    const userId = playerSessions[socketId]
    
    if (userId && player) {
      positionUpdates.push({
        updateOne: {
          filter: { _id: userId },
          update: {
            $set: {
              'position.x': player.x,
              'position.y': player.y,
              lastSeen: new Date()
            }
          }
        }
      })
    }
  }
  
  if (positionUpdates.length > 0) {
    try {
      await Player.bulkWrite(positionUpdates)
      console.log(`Saved positions for ${positionUpdates.length} players`)
    } catch (error) {
      console.error('Error saving player positions:', error)
    }
  }
}, 5000) // 5 seconds

httpServer.listen(SOCKET_PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${SOCKET_PORT}`)
})