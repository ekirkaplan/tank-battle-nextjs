'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface LevelInfo {
  level: {
    current: number
    experience: number
    experienceToNext: number
    totalExperience: number
  }
  attributes: {
    health: number
    speed: number
    damage: number
    regeneration: number
    availablePoints: number
  }
}

interface LevelDisplayProps {
  playerId: string | null
  onLevelUp?: (newLevel: number) => void
  refreshTrigger?: number
}

export default function LevelDisplay({ playerId, onLevelUp, refreshTrigger }: LevelDisplayProps) {
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (playerId) {
      // Add a small delay when triggered by refreshTrigger to ensure DB updates complete
      if (refreshTrigger > 0) {
        const timer = setTimeout(() => {
          fetchLevelInfo()
        }, 300) // 300ms delay for DB propagation
        return () => clearTimeout(timer)
      } else {
        fetchLevelInfo()
      }
    }
  }, [playerId, refreshTrigger])

  const fetchLevelInfo = async () => {
    try {
      const authToken = localStorage.getItem('authToken')
      const response = await fetch('/api/player/attributes', {
        credentials: 'include',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched level info:', data)
        setLevelInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch level info:', error)
    }
  }

  const assignAttribute = async (attribute: string) => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const authToken = localStorage.getItem('authToken')
      const response = await fetch('/api/player/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        credentials: 'include',
        body: JSON.stringify({ attribute })
      })
      
      if (response.ok) {
        const data = await response.json()
        setLevelInfo({
          level: data.level,
          attributes: data.attributes
        })
        toast.success(`${attribute} increased!`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to assign attribute')
      }
    } catch (error) {
      toast.error('Failed to assign attribute')
    } finally {
      setIsLoading(false)
    }
  }

  if (!levelInfo) return null

  const expProgress = (levelInfo.level.experience / levelInfo.level.experienceToNext) * 100

  return (
    <div className="absolute top-4 left-4 bg-blitz-bg/90 backdrop-blur-sm border border-blitz-neon/20 text-white p-4 rounded-lg space-y-3 shadow-[0_0_20px_rgba(0,235,215,0.2)]">
      {/* Level and Experience */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg font-bold">Level {levelInfo.level.current}</span>
          <span className="text-sm text-gray-300">
            {levelInfo.level.experience}/{levelInfo.level.experienceToNext} XP
          </span>
        </div>
        <div className="w-48 h-2 bg-blitz-bg/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blitz-copper to-blitz-neon transition-all duration-300"
            style={{ width: `${expProgress}%` }}
          />
        </div>
      </div>

      {/* Attributes */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-300">Attributes:</div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">❤️ Health: +{levelInfo.attributes.health * 10} HP</span>
          {levelInfo.attributes.availablePoints > 0 && (
            <button
              onClick={() => assignAttribute('health')}
              disabled={isLoading}
              className="text-xs bg-blitz-neon/20 hover:bg-blitz-neon/30 border border-blitz-neon/50 px-2 py-1 rounded transition-all"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">⚡ Speed: +{(levelInfo.attributes.speed * 0.3).toFixed(1)}</span>
          {levelInfo.attributes.availablePoints > 0 && (
            <button
              onClick={() => assignAttribute('speed')}
              disabled={isLoading}
              className="text-xs bg-blitz-neon/20 hover:bg-blitz-neon/30 border border-blitz-neon/50 px-2 py-1 rounded transition-all"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">⚔️ Damage: +{levelInfo.attributes.damage * 5}</span>
          {levelInfo.attributes.availablePoints > 0 && (
            <button
              onClick={() => assignAttribute('damage')}
              disabled={isLoading}
              className="text-xs bg-blitz-neon/20 hover:bg-blitz-neon/30 border border-blitz-neon/50 px-2 py-1 rounded transition-all"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">💚 Regen: +{(levelInfo.attributes.regeneration * 0.5).toFixed(1)} HP/s</span>
          {levelInfo.attributes.availablePoints > 0 && (
            <button
              onClick={() => assignAttribute('regeneration')}
              disabled={isLoading}
              className="text-xs bg-blitz-neon/20 hover:bg-blitz-neon/30 border border-blitz-neon/50 px-2 py-1 rounded transition-all"
            >
              +
            </button>
          )}
        </div>

        {levelInfo.attributes.availablePoints > 0 && (
          <div className="text-sm text-yellow-400 font-semibold mt-2">
            {levelInfo.attributes.availablePoints} points available!
          </div>
        )}
      </div>
    </div>
  )
}