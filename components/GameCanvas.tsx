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

    socket.on('death', () => {
      toast.error('You were destroyed!')
      // Add explosion effect for player death
      const player = playerId ? gameStateRef.current.players[playerId] : null
      if (player) {
        particleSystemRef.current.createExplosion(player.x, player.y, player.color)
      }
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
      
      // Add power-up collection effect
      const player = playerId ? gameStateRef.current.players[playerId] : null
      if (player) {
        const colorMap: { [key: string]: string } = {
          health: '#ff0000',
          speed: '#00ff00',
          damage: '#ff00ff',
          rapid_fire: '#ffff00',
          shield: '#0099ff'
        }
        particleSystemRef.current.createPowerUpEffect(player.x, player.y, colorMap[data.type] || '#ffffff')
      }
    })

    socket.on('obstacleDestroyed', (obstacleId) => {
      delete gameStateRef.current.obstacles[obstacleId]
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
      ctx.fillStyle = '#1a1a1a'
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
      ctx.strokeStyle = '#333'
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
        ctx.fillStyle = obstacle.color || '#666666'
        ctx.strokeStyle = '#000000'
        
        ctx.lineWidth = 2
        
        // Draw obstacle
        ctx.fillRect(x, y, obstacle.width, obstacle.height)
        ctx.strokeRect(x, y, obstacle.width, obstacle.height)
        
        // Draw health bar for destructible obstacles
        if (obstacle.destructible && obstacle.health && obstacle.health < 100) {
          ctx.fillStyle = '#ff0000'
          ctx.fillRect(x, y - 10, obstacle.width, 3)
          ctx.fillStyle = '#00ff00'
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
        ctx.fillStyle = player.color || '#4dabf7'
        ctx.fillRect(-20, -15, 40, 30)

        // Tank turret
        ctx.fillStyle = '#333'
        ctx.fillRect(0, -5, 30, 10)

        ctx.restore()

        // Health bar
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(player.x - 25, player.y - 35, 50, 5)
        ctx.fillStyle = '#00ff00'
        ctx.fillRect(player.x - 25, player.y - 35, 50 * (player.health / 100), 5)

        // Player name
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        const displayName = player.id === playerId ? 'You' : (player.username || 'Player')
        ctx.fillText(displayName, player.x, player.y - 40)
        
        // Clan tag
        if (player.clan?.tag) {
          ctx.fillStyle = '#ffd700' // Gold color for clan tag
          ctx.font = '10px Arial'
          ctx.fillText(`[${player.clan.tag}]`, player.x, player.y - 52)
        }
      })

      // Draw bullets
      Object.values(gameState.bullets).forEach(bullet => {
        ctx.fillStyle = '#ffff00'
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2)
        ctx.fill()
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
          health: { color: '#ff0000', symbol: '+' },
          speed: { color: '#00ff00', symbol: '⚡' },
          damage: { color: '#ff00ff', symbol: '⚔' },
          rapid_fire: { color: '#ffff00', symbol: '🔥' },
          shield: { color: '#0099ff', symbol: '🛡' }
        }
        
        const style = powerUpStyles[powerUp.type] || { color: '#ffffff', symbol: '?' }
        
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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize)
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 2
      ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize)
      
      // Draw obstacles on minimap
      Object.values(gameState.obstacles || {}).forEach(obstacle => {
        const ox = minimapX + obstacle.x * minimapScale
        const oy = minimapY + obstacle.y * minimapScale
        const ow = obstacle.width * minimapScale
        const oh = obstacle.height * minimapScale
        
        ctx.fillStyle = obstacle.color + '88' // Add transparency
        ctx.fillRect(ox - ow/2, oy - oh/2, ow, oh)
      })
      
      // Draw players on minimap
      Object.values(gameState.players).forEach(player => {
        const px = minimapX + player.x * minimapScale
        const py = minimapY + player.y * minimapScale
        
        ctx.fillStyle = player.id === playerId ? '#00ff00' : '#ff0000'
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fill()
      })
      
      // Draw viewport rectangle on minimap
      if (currentPlayer) {
        ctx.strokeStyle = '#00ff00'
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
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="mb-4 flex gap-4 items-center">
        <h1 className="text-2xl font-bold">Tank Battle Arena</h1>
        <div className="flex gap-2 items-center">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button 
          onClick={() => setShowLeaderboard(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
        >
          Leaderboard
        </button>
        <button 
          onClick={() => setShowStatModal(true)}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
        >
          Stats
        </button>
        <button 
          onClick={() => setShowClanModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          Clans
        </button>
        <button 
          onClick={handleLogout} 
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onClick={handleCanvasClick}
          className="game-canvas cursor-crosshair border border-gray-700"
        />
        
        {/* Level Display */}
        <LevelDisplay playerId={playerId} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Health</div>
          <div className="text-xl font-bold">
            {currentPlayer?.health || 100}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Score</div>
          <div className="text-xl font-bold">
            {currentPlayer?.score || 0}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Players</div>
          <div className="text-xl font-bold">{Object.keys(gameStateRef.current.players).length}</div>
        </div>
      </div>

      {playerData && (
        <div className="mt-4 bg-gray-800 p-4 rounded">
          <h3 className="font-bold mb-2">Lifetime Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>Kills: {playerData.stats.totalKills}</div>
            <div>Deaths: {playerData.stats.totalDeaths}</div>
            <div>Games: {playerData.stats.totalGamesPlayed}</div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400">
        Use WASD to move • Click to shoot
      </div>

      {/* Debug info */}
      <div className="mt-4 text-xs text-gray-500">
        Player ID: {playerId || 'Not set'} | 
        Players in game: {Object.keys(gameStateRef.current.players).length}
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
      
      {/* Chat Box */}
      <ChatBox socket={socketRef.current} isConnected={isConnected} />
    </div>
  )
}