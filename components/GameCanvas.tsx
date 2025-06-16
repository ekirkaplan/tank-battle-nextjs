'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import LevelDisplay from './LevelDisplay'
import Leaderboard from './Leaderboard'
import { ParticleSystem } from '@/lib/particle-system'
import { GameLoadingSkeleton } from './LoadingSkeleton'
import ChatBox from './ChatBox'
import StatModal from './StatModal'
import ClanModal from './ClanModal'
import ReportModal from './ReportModal'

interface Player {
  id: string
  userId: string
  username: string
  x: number
  y: number
  angle: number
  health: number
  score: number
  color: string
  lastShot: number
  clan?: {
    name: string
    tag: string
  }
}

interface Obstacle {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'wall' | 'box' | 'rock'
  health?: number
  destructible: boolean
  color: string
}

interface PowerUp {
  id: string
  x: number
  y: number
  type: string
  radius: number
}

interface GameState {
  players: { [key: string]: Player }
  bullets: { [key: string]: any }
  powerUps: { [key: string]: PowerUp }
  obstacles: { [key: string]: Obstacle }
  arena: { width: number; height: number }
}

interface PlayerData {
  username: string
  stats: any
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const router = useRouter()
  const gameStateRef = useRef<GameState>({
    players: {},
    bullets: {},
    powerUps: {},
    obstacles: {},
    arena: { width: 4000, height: 3000 }
  })
  
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showStatModal, setShowStatModal] = useState(false)
  const [showClanModal, setShowClanModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [activeBuffs, setActiveBuffs] = useState<{
    [key: string]: { value: number; duration: number; startTime: number }
  }>({})
  const [isRespawning, setIsRespawning] = useState(false)
  const [respawnTimer, setRespawnTimer] = useState(0)
  const [levelRefreshTrigger, setLevelRefreshTrigger] = useState(0)
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem())
  const lastFrameTimeRef = useRef<number>(0)
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false
  })

  useEffect(() => {
    // Get auth token from localStorage
    const authToken = localStorage.getItem('authToken')
    console.log('Auth token from localStorage:', authToken ? 'Found' : 'Not found')

    if (!authToken) {
      router.push('/')
      return
    }

    // Connect to socket
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token: authToken },
      transports: ['websocket']
    })
    
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      setIsConnecting(false)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    // Socket events
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message)
      setIsConnecting(false)
      if (error.message === 'Authentication failed' || error.message === 'No token provided') {
        toast.error('Authentication failed')
        router.push('/')
      }
    })
    
    // Handle forced disconnection
    socket.on('forceDisconnect', (data) => {
      console.log('Forced disconnect:', data.reason)
      toast.error('Disconnected: ' + data.reason)
      socket.disconnect()
      router.push('/')
    })

    socket.on('init', (data) => {
      console.log('Game init received:', data)
      console.log('Obstacles count:', Object.keys(data.gameState.obstacles || {}).length)
      console.log('PowerUps count:', Object.keys(data.gameState.powerUps || {}).length)
      setPlayerId(data.playerId)
      setPlayerData(data.playerData)
      gameStateRef.current = data.gameState
      setIsLoadingAssets(false)
      
      // Check if respawning
      if (data.isRespawning) {
        setIsRespawning(true)
        setRespawnTimer(data.respawnTimeRemaining)
      }
    })

    socket.on('deltaState', (deltaState) => {
      // Apply delta updates
      const currentState = gameStateRef.current
      
      // Update players
      if (deltaState.players) {
        for (const playerId in deltaState.players) {
          if (currentState.players[playerId]) {
            Object.assign(currentState.players[playerId], deltaState.players[playerId])
          }
        }
      }
      
      // Handle joined players
      if (deltaState.playersJoined) {
        for (const player of deltaState.playersJoined) {
          currentState.players[player.id] = player
        }
      }
      
      // Handle left players
      if (deltaState.playersLeft) {
        for (const playerId of deltaState.playersLeft) {
          delete currentState.players[playerId]
        }
      }
      
      // Handle bullets
      if (deltaState.bullets) {
        // Add new bullets
        if (deltaState.bullets.added) {
          for (const bullet of deltaState.bullets.added) {
            currentState.bullets[bullet.id] = bullet
          }
        }
        
        // Update existing bullets
        if (deltaState.bullets.updated) {
          for (const bulletId in deltaState.bullets.updated) {
            if (currentState.bullets[bulletId]) {
              const oldBullet = { ...currentState.bullets[bulletId] }
              Object.assign(currentState.bullets[bulletId], deltaState.bullets.updated[bulletId])
              
              // Check if bullet hit something (stopped moving)
              const newBullet = currentState.bullets[bulletId]
              if (Math.abs(newBullet.x - oldBullet.x) < 0.1 && Math.abs(newBullet.y - oldBullet.y) < 0.1) {
                const angle = Math.atan2(oldBullet.vy, oldBullet.vx)
                particleSystemRef.current.createBulletHit(newBullet.x, newBullet.y, angle)
              }
            }
          }
        }
        
        // Remove bullets
        if (deltaState.bullets.removed) {
          for (const bulletId of deltaState.bullets.removed) {
            const bullet = currentState.bullets[bulletId]
            if (bullet) {
              // Add hit effect at bullet's last position
              const angle = Math.atan2(bullet.vy, bullet.vx)
              particleSystemRef.current.createBulletHit(bullet.x, bullet.y, angle)
            }
            delete currentState.bullets[bulletId]
          }
        }
      }
      
      // Handle power-ups
      if (deltaState.powerUps) {
        // Add new power-ups
        if (deltaState.powerUps.added) {
          for (const powerUp of deltaState.powerUps.added) {
            currentState.powerUps[powerUp.id] = powerUp
          }
        }
        
        // Remove power-ups
        if (deltaState.powerUps.removed) {
          for (const powerUpId of deltaState.powerUps.removed) {
            delete currentState.powerUps[powerUpId]
          }
        }
      }
    })

    socket.on('playerJoined', (player) => {
      console.log('Player joined:', player.username)
      gameStateRef.current.players[player.id] = player
    })

    socket.on('playerLeft', (id) => {
      console.log('Player left:', id)
      delete gameStateRef.current.players[id]
    })

    socket.on('bulletFired', (bullet) => {
      gameStateRef.current.bullets[bullet.id] = bullet
      // Add muzzle flash effect
      const shooter = gameStateRef.current.players[bullet.playerId]
      if (shooter) {
        const flashX = shooter.x + Math.cos(shooter.angle) * 30
        const flashY = shooter.y + Math.sin(shooter.angle) * 30
        particleSystemRef.current.createMuzzleFlash(flashX, flashY, shooter.angle)
      }
    })

    socket.on('death', (data) => {
      toast.error('You were destroyed!')
      // Add explosion effect for player death
      const player = playerId ? gameStateRef.current.players[playerId] : null
      if (player) {
        particleSystemRef.current.createExplosion(player.x, player.y, player.color)
      }
      // Start respawn timer
      setIsRespawning(true)
      setRespawnTimer(data.respawnTime || 40)
    })
    
    socket.on('respawn', () => {
      setIsRespawning(false)
      setRespawnTimer(0)
      toast.success('Respawned!')
    })

    socket.on('powerUpCollected', (data) => {
      const messages: { [key: string]: string } = {
        health: `+${data.value} Health!`,
        speed: `Speed Boost!`,
        damage: `Damage Boost!`,
        rapid_fire: `Rapid Fire!`,
        shield: `Shield Active!`
      }
      toast.success(messages[data.type] || 'Power-up collected!')
      
      // Track active buffs (skip health as it's instant)
      if (data.type !== 'health' && data.duration) {
        setActiveBuffs(prev => ({
          ...prev,
          [data.type]: {
            value: data.value,
            duration: data.duration,
            startTime: Date.now()
          }
        }))
      }
      
      // Add power-up collection effect
      const player = playerId ? gameStateRef.current.players[playerId] : null
      if (player) {
        const colorMap: { [key: string]: string } = {
          health: '#00EBD7',      // BLITZCORE neon
          speed: '#00EBD7',       // BLITZCORE neon  
          damage: '#AF5A29',      // BLITZCORE copper
          rapid_fire: '#00EBD7',  // BLITZCORE neon
          shield: '#00EBD7'       // BLITZCORE neon
        }
        particleSystemRef.current.createPowerUpEffect(player.x, player.y, colorMap[data.type] || '#ffffff')
      }
    })

    socket.on('obstacleDestroyed', (obstacleId) => {
      delete gameStateRef.current.obstacles[obstacleId]
    })

    socket.on('statsUpdate', (newStats: { totalKills: number; totalDeaths: number }) => {
      console.log('Received statsUpdate:', newStats)
      setPlayerData(prev => {
        if (!prev) return prev
        console.log('Updating playerData stats from:', prev.stats, 'to:', newStats)
        return {
          ...prev,
          stats: {
            ...prev.stats,
            totalKills: newStats.totalKills,
            totalDeaths: newStats.totalDeaths
          }
        }
      })
      // Also trigger LevelDisplay refresh to update XP
      setLevelRefreshTrigger(prev => prev + 1)
    })

    socket.on('levelUp', (data: { newLevel: number; attributePoints: number }) => {
      console.log('Level up event received:', data)
      toast.success(`Level Up! You are now level ${data.newLevel}!`)
      toast.success(`+${data.attributePoints} attribute points available!`)
      // Trigger LevelDisplay refresh
      setLevelRefreshTrigger(prev => prev + 1)
    })

    return () => {
      console.log('Cleaning up socket connection')
      socket.disconnect()
    }
  }, [router])

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keysRef.current) {
        keysRef.current[key as keyof typeof keysRef.current] = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keysRef.current) {
        keysRef.current[key as keyof typeof keysRef.current] = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Send movement updates
  useEffect(() => {
    if (!socketRef.current || !isConnected) return

    const interval = setInterval(() => {
      const keys = keysRef.current
      // Only send updates if any key is pressed
      if (keys.w || keys.a || keys.s || keys.d) {
        socketRef.current?.emit('move', {
          up: keys.w,
          down: keys.s,
          left: keys.a,
          right: keys.d
        })
      }
    }, 1000 / 20) // Reduced to 20 updates per second

    return () => clearInterval(interval)
  }, [isConnected])

  // Clean up expired buffs and update respawn timer
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBuffs(prev => {
        const now = Date.now()
        const newBuffs: typeof prev = {}
        
        for (const [type, buff] of Object.entries(prev)) {
          const elapsed = now - buff.startTime
          if (elapsed < buff.duration) {
            newBuffs[type] = buff
          }
        }
        
        return newBuffs
      })
      
      // Update respawn timer
      if (isRespawning && respawnTimer > 0) {
        setRespawnTimer(prev => Math.max(0, prev - 0.1))
      }
    }, 100) // Update every 100ms for smooth countdown

    return () => clearInterval(interval)
  }, [isRespawning, respawnTimer])

  // Handle shooting
  const handleCanvasClick = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('shoot')
    }
  }

  // Game rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const render = (currentTime: number) => {
      const gameState = gameStateRef.current
      
      // Calculate delta time
      const deltaTime = lastFrameTimeRef.current ? (currentTime - lastFrameTimeRef.current) / 1000 : 0
      lastFrameTimeRef.current = currentTime
      
      // Update particle system
      particleSystemRef.current.update(deltaTime)
      
      // Clear canvas
      ctx.fillStyle = '#181D22' // BLITZCORE charcoal background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Calculate camera position (follow player)
      const currentPlayer = playerId ? gameState.players[playerId] : null
      let cameraX = 0
      let cameraY = 0
      
      if (currentPlayer) {
        // Center camera on player
        cameraX = currentPlayer.x - canvas.width / 2
        cameraY = currentPlayer.y - canvas.height / 2
        
        // Clamp camera to map bounds
        cameraX = Math.max(0, Math.min(cameraX, gameState.arena.width - canvas.width))
        cameraY = Math.max(0, Math.min(cameraY, gameState.arena.height - canvas.height))
      }
      
      // Save context and apply camera transform
      ctx.save()
      ctx.translate(-cameraX, -cameraY)

      // Draw grid (only visible portion)
      ctx.strokeStyle = '#00EBD710' // BLITZCORE neon with low opacity
      ctx.lineWidth = 1
      const gridSize = 100
      const startX = Math.floor(cameraX / gridSize) * gridSize
      const endX = Math.ceil((cameraX + canvas.width) / gridSize) * gridSize
      const startY = Math.floor(cameraY / gridSize) * gridSize
      const endY = Math.ceil((cameraY + canvas.height) / gridSize) * gridSize
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, Math.max(0, cameraY))
        ctx.lineTo(x, Math.min(gameState.arena.height, cameraY + canvas.height))
        ctx.stroke()
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(Math.max(0, cameraX), y)
        ctx.lineTo(Math.min(gameState.arena.width, cameraX + canvas.width), y)
        ctx.stroke()
      }

      // Draw obstacles (only visible ones)
      Object.values(gameState.obstacles || {}).forEach(obstacle => {
        // Check if obstacle is in viewport
        const x = obstacle.x - obstacle.width / 2
        const y = obstacle.y - obstacle.height / 2
        
        if (x + obstacle.width < cameraX || x > cameraX + canvas.width ||
            y + obstacle.height < cameraY || y > cameraY + canvas.height) {
          return // Skip if not visible
        }
        
        ctx.save()
        
        // Use obstacle color from server
        ctx.fillStyle = obstacle.color || '#AF5A2980' // BLITZCORE copper with opacity
        ctx.strokeStyle = '#181D22' // BLITZCORE charcoal
        
        ctx.lineWidth = 2
        
        // Draw obstacle
        ctx.fillRect(x, y, obstacle.width, obstacle.height)
        ctx.strokeRect(x, y, obstacle.width, obstacle.height)
        
        // Draw health bar for destructible obstacles
        if (obstacle.destructible && obstacle.health && obstacle.health < 100) {
          ctx.fillStyle = '#AF5A29' // BLITZCORE copper for damage
          ctx.fillRect(x, y - 10, obstacle.width, 3)
          ctx.fillStyle = '#00EBD7' // BLITZCORE neon for health
          ctx.fillRect(x, y - 10, obstacle.width * (obstacle.health / 100), 3)
        }
        
        ctx.restore()
      })

      // Draw players
      Object.values(gameState.players).forEach(player => {
        ctx.save()
        ctx.translate(player.x, player.y)
        ctx.rotate(player.angle)

        // Tank body
        ctx.fillStyle = player.color || '#00EBD7' // BLITZCORE neon default
        ctx.fillRect(-20, -15, 40, 30)

        // Tank turret
        ctx.fillStyle = '#AF5A29' // BLITZCORE copper
        ctx.fillRect(0, -5, 30, 10)

        ctx.restore()

        // Health bar
        ctx.fillStyle = '#AF5A29' // BLITZCORE copper for damage
        ctx.fillRect(player.x - 25, player.y - 35, 50, 5)
        ctx.fillStyle = '#00EBD7' // BLITZCORE neon for health
        ctx.fillRect(player.x - 25, player.y - 35, 50 * (player.health / 100), 5)

        // Player name
        ctx.fillStyle = '#FFFFFF' // BLITZCORE white
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        const displayName = player.id === playerId ? 'You' : (player.username || 'Player')
        ctx.fillText(displayName, player.x, player.y - 40)
        
        // Clan tag
        if (player.clan?.tag) {
          ctx.fillStyle = '#00EBD7' // BLITZCORE neon for clan tag
          ctx.font = '10px Arial'
          ctx.fillText(`[${player.clan.tag}]`, player.x, player.y - 52)
        }
      })

      // Draw bullets
      Object.values(gameState.bullets).forEach(bullet => {
        ctx.fillStyle = '#00EBD7' // BLITZCORE neon for bullets
        ctx.shadowBlur = 10
        ctx.shadowColor = '#00EBD7'
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Draw power-ups (only visible ones)
      Object.values(gameState.powerUps || {}).forEach(powerUp => {
        // Check if power-up is in viewport
        const radius = powerUp.radius || 20
        if (powerUp.x + radius < cameraX || powerUp.x - radius > cameraX + canvas.width ||
            powerUp.y + radius < cameraY || powerUp.y - radius > cameraY + canvas.height) {
          return // Skip if not visible
        }
        
        ctx.save()
        
        // Power-up colors and symbols
        const powerUpStyles: { [key: string]: { color: string; symbol: string } } = {
          health: { color: '#00EBD7', symbol: '+' },      // BLITZCORE neon
          speed: { color: '#00EBD7', symbol: '⚡' },      // BLITZCORE neon
          damage: { color: '#AF5A29', symbol: '⚔' },      // BLITZCORE copper
          rapid_fire: { color: '#00EBD7', symbol: '🔥' }, // BLITZCORE neon
          shield: { color: '#00EBD7', symbol: '🛡' }      // BLITZCORE neon
        }
        
        const style = powerUpStyles[powerUp.type] || { color: '#00EBD7', symbol: '?' }
        
        // Glowing effect
        const glowSize = 5 + Math.sin(Date.now() * 0.005) * 3
        ctx.shadowColor = style.color
        ctx.shadowBlur = glowSize
        
        // Draw circle
        ctx.fillStyle = style.color
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.arc(powerUp.x, powerUp.y, powerUp.radius || 20, 0, Math.PI * 2)
        ctx.fill()
        
        // Draw symbol
        ctx.globalAlpha = 1
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(style.symbol, powerUp.x, powerUp.y)
        
        ctx.restore()
      })

      // Render particles on top
      particleSystemRef.current.render(ctx)
      
      // Restore camera transform
      ctx.restore()
      
      // Draw minimap
      const minimapSize = 200
      const minimapX = canvas.width - minimapSize - 10
      const minimapY = 10
      const minimapScale = minimapSize / Math.max(gameState.arena.width, gameState.arena.height)
      
      // Minimap background
      ctx.fillStyle = 'rgba(24, 29, 34, 0.9)' // BLITZCORE charcoal with opacity
      ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize)
      ctx.strokeStyle = '#00EBD7' // BLITZCORE neon
      ctx.lineWidth = 2
      ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize)
      
      // Draw obstacles on minimap
      Object.values(gameState.obstacles || {}).forEach(obstacle => {
        const ox = minimapX + obstacle.x * minimapScale
        const oy = minimapY + obstacle.y * minimapScale
        const ow = obstacle.width * minimapScale
        const oh = obstacle.height * minimapScale
        
        ctx.fillStyle = (obstacle.color || '#AF5A29') + '88' // BLITZCORE copper with transparency
        ctx.fillRect(ox - ow/2, oy - oh/2, ow, oh)
      })
      
      // Draw players on minimap
      Object.values(gameState.players).forEach(player => {
        const px = minimapX + player.x * minimapScale
        const py = minimapY + player.y * minimapScale
        
        ctx.fillStyle = player.id === playerId ? '#00EBD7' : '#AF5A29' // BLITZCORE neon for self, copper for others
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fill()
      })
      
      // Draw viewport rectangle on minimap
      if (currentPlayer) {
        ctx.strokeStyle = '#00EBD7' // BLITZCORE neon
        ctx.lineWidth = 1
        ctx.strokeRect(
          minimapX + cameraX * minimapScale,
          minimapY + cameraY * minimapScale,
          canvas.width * minimapScale,
          canvas.height * minimapScale
        )
      }

      animationId = requestAnimationFrame(render)
    }

    render(0)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [playerId])

  const handleLogout = async () => {
    try {
      // Clear token from localStorage
      localStorage.removeItem('authToken')
      
      // Disconnect socket if connected
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      
      // Call logout endpoint (optional, for server-side cleanup)
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Logout failed')
    }
  }

  const currentPlayer = playerId ? gameStateRef.current.players[playerId] : null

  if (isConnecting || isLoadingAssets) {
    return <GameLoadingSkeleton />
  }

  return (
    <div className="flex flex-col min-h-screen bg-blitz-bg">
      {/* Header */}
      <header className="bg-blitz-bg/80 backdrop-blur-sm border-b border-blitz-neon/20 px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blitz-neon to-blitz-copper bg-clip-text text-transparent">
              BLITZCORE Arena
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-gray-400">{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowLeaderboard(true)}
              className="group px-4 py-2 bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg hover:border-blitz-neon/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,235,215,0.3)]"
            >
              <span className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span className="text-blitz-white group-hover:text-blitz-neon transition-colors">Leaderboard</span>
              </span>
            </button>
            
            <button 
              onClick={() => setShowStatModal(true)}
              className="group px-4 py-2 bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg hover:border-blitz-neon/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,235,215,0.3)]"
            >
              <span className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <span className="text-blitz-white group-hover:text-blitz-neon transition-colors">Stats</span>
              </span>
            </button>
            
            <button 
              onClick={() => setShowClanModal(true)}
              className="group px-4 py-2 bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg hover:border-blitz-neon/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,235,215,0.3)]"
            >
              <span className="flex items-center gap-2">
                <span className="text-2xl">⚔️</span>
                <span className="text-blitz-white group-hover:text-blitz-neon transition-colors">Clans</span>
              </span>
            </button>
            
            <button 
              onClick={() => setShowReportModal(true)}
              className="group px-4 py-2 bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg hover:border-blitz-neon/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,235,215,0.3)]"
            >
              <span className="flex items-center gap-2">
                <span className="text-2xl">🐛</span>
                <span className="text-blitz-white group-hover:text-blitz-neon transition-colors">Report</span>
              </span>
            </button>
            
            <div className="w-px h-8 bg-blitz-neon/20 mx-2"></div>
            
            <button 
              onClick={handleLogout} 
              className="group px-4 py-2 bg-red-900/50 border border-red-500/20 rounded-lg hover:border-red-500/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              <span className="text-red-400 group-hover:text-red-300 transition-colors">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            onClick={handleCanvasClick}
            className="game-canvas cursor-crosshair border border-blitz-neon/20 rounded-lg shadow-[0_0_30px_rgba(0,235,215,0.1)]"
          />
          
          {/* Level Display */}
          <LevelDisplay playerId={playerId} refreshTrigger={levelRefreshTrigger} />
          
          {/* Active Buffs Overlay */}
          {Object.keys(activeBuffs).length > 0 && (
            <div className="absolute bottom-4 left-4 space-y-2 z-10">
              <h3 className="text-xs font-bold text-blitz-neon mb-1">Active Buffs</h3>
              {Object.entries(activeBuffs).map(([type, buff]) => {
                const elapsed = Date.now() - buff.startTime
                const remaining = Math.max(0, buff.duration - elapsed)
                const percentage = (remaining / buff.duration) * 100
                const seconds = Math.ceil(remaining / 1000)
                
                const buffInfo: { [key: string]: { name: string; icon: string; color: string } } = {
                  speed: { name: 'Speed', icon: '⚡', color: 'from-yellow-400 to-yellow-600' },
                  damage: { name: 'Damage', icon: '⚔️', color: 'from-red-400 to-red-600' },
                  rapid_fire: { name: 'Rapid Fire', icon: '🔥', color: 'from-orange-400 to-orange-600' },
                  shield: { name: 'Shield', icon: '🛡️', color: 'from-blue-400 to-blue-600' }
                }
                
                const info = buffInfo[type] || { name: type, icon: '✨', color: 'from-blitz-neon to-blitz-copper' }
                
                return (
                  <div 
                    key={type} 
                    className="bg-blitz-bg/90 backdrop-blur-sm border border-blitz-neon/20 rounded-lg p-2 w-48 shadow-[0_0_15px_rgba(0,235,215,0.2)]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.icon}</span>
                        <span className="text-xs text-blitz-white">{info.name}</span>
                      </div>
                      <span className="text-xs text-blitz-copper font-bold">{seconds}s</span>
                    </div>
                    <div className="w-full bg-blitz-bg/50 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${info.color} transition-all duration-100`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Respawn Timer Overlay */}
          {isRespawning && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-20">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-red-500 mb-4">You Were Destroyed!</h2>
                <div className="text-6xl font-bold text-blitz-neon mb-2">
                  {Math.ceil(respawnTimer)}
                </div>
                <p className="text-xl text-gray-300">Respawning in seconds...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="bg-blitz-bg/80 backdrop-blur-sm border-t border-blitz-neon/20 px-4 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {/* Health */}
            <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Health</div>
              <div className="text-2xl font-bold text-blitz-neon">
                {currentPlayer?.health || 0}/{currentPlayer?.maxHealth || 100}
              </div>
              <div className="w-full bg-blitz-bg/50 rounded-full h-2 mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blitz-copper to-blitz-neon h-full transition-all duration-300"
                  style={{ width: `${((currentPlayer?.health || 0) / (currentPlayer?.maxHealth || 100)) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Score */}
            <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Score</div>
              <div className="text-2xl font-bold text-blitz-copper">
                {currentPlayer?.score || 0}
              </div>
            </div>
            
            {/* Players */}
            <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Players</div>
              <div className="text-2xl font-bold text-blitz-white">
                {Object.keys(gameStateRef.current.players).length}
              </div>
            </div>

            {/* Lifetime Stats */}
            {playerData && (
              <>
                <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Kills</div>
                  <div className="text-2xl font-bold text-green-400">
                    {playerData.stats.totalKills}
                  </div>
                </div>
                
                <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">Deaths</div>
                  <div className="text-2xl font-bold text-red-400">
                    {playerData.stats.totalDeaths}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Leaderboard Modal */}
      <Leaderboard 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
      
      {/* Stat Modal */}
      <StatModal
        isOpen={showStatModal}
        onClose={() => setShowStatModal(false)}
        onStatsUpdate={() => {
          // Optionally refresh player data
        }}
      />

      {/* Clan Modal */}
      <ClanModal
        isOpen={showClanModal}
        onClose={() => setShowClanModal(false)}
        playerData={playerData}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
      
      {/* Chat Box */}
      <ChatBox socket={socketRef.current} isConnected={isConnected} />
    </div>
  )
}