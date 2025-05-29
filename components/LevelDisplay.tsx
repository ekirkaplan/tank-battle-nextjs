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
}

export default function LevelDisplay({ playerId, onLevelUp }: LevelDisplayProps) {
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (playerId) {
      fetchLevelInfo()
    }
  }, [playerId])

  const fetchLevelInfo = async () => {
    try {
      const response = await fetch('/api/player/attributes')
      if (response.ok) {
        const data = await response.json()
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
      const response = await fetch('/api/player/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg space-y-3">
      {/* Level and Experience */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg font-bold">Level {levelInfo.level.current}</span>
          <span className="text-sm text-gray-300">
            {levelInfo.level.experience}/{levelInfo.level.experienceToNext} XP
          </span>
        </div>
        <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-500 transition-all duration-300"
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
              className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
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
              className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
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
              className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
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
              className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
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