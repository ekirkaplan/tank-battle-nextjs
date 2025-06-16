'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface PlayerStats {
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
    attackSpeed: number
    availablePoints: number
  }
  stats: {
    totalKills: number
    totalDeaths: number
    totalGamesPlayed: number
    totalDamageDealt: number
    totalDamageTaken: number
  }
}

interface StatModalProps {
  isOpen: boolean
  onClose: () => void
  onStatsUpdate: () => void
}

export default function StatModal({ isOpen, onClose, onStatsUpdate }: StatModalProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingPoints, setPendingPoints] = useState<{[key: string]: number}>({
    health: 0,
    speed: 0,
    damage: 0,
    regeneration: 0,
    attackSpeed: 0
  })

  useEffect(() => {
    if (isOpen) {
      fetchPlayerStats()
    }
  }, [isOpen])

  const fetchPlayerStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Player data:', data.player)
        setPlayerStats(data.player)
        setPendingPoints({
          health: 0,
          speed: 0,
          damage: 0,
          regeneration: 0,
          attackSpeed: 0
        })
      } else {
        console.error('Failed to fetch player stats:', response.status)
        toast.error('Failed to load stats')
      }
    } catch (error) {
      console.error('Failed to fetch player stats:', error)
      toast.error('Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }

  const assignPoint = async (attribute: string) => {
    if (!playerStats || getTotalPendingPoints() >= playerStats.attributes.availablePoints) {
      return
    }

    setPendingPoints(prev => ({
      ...prev,
      [attribute]: prev[attribute] + 1
    }))
  }

  const removePoint = (attribute: string) => {
    if (pendingPoints[attribute] <= 0) return

    setPendingPoints(prev => ({
      ...prev,
      [attribute]: prev[attribute] - 1
    }))
  }

  const getTotalPendingPoints = () => {
    return Object.values(pendingPoints).reduce((sum, points) => sum + points, 0)
  }

  const applyChanges = async () => {
    setIsLoading(true)
    try {
      // Apply each pending point one by one
      for (const [attribute, points] of Object.entries(pendingPoints)) {
        for (let i = 0; i < points; i++) {
          const response = await fetch('/api/player/assign-stat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ attribute })
          })

          if (!response.ok) {
            throw new Error(`Failed to assign ${attribute} point`)
          }
        }
      }

      toast.success('Stats updated successfully!')
      await fetchPlayerStats()
      onStatsUpdate() // Notify parent to update
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stats')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatDescription = (stat: string) => {
    switch (stat) {
      case 'health': return '+10 Max HP per point'
      case 'speed': return '+3% Movement Speed per point'
      case 'damage': return '+5 Damage per point'
      case 'regeneration': return '+0.5 HP/sec per point'
      case 'attackSpeed': return '-5% Shot Cooldown per point'
      default: return ''
    }
  }

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'health': return '❤️'
      case 'speed': return '👟'
      case 'damage': return '⚔️'
      case 'regeneration': return '💚'
      case 'attackSpeed': return '⚡'
      default: return '❓'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Character Stats</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : playerStats ? (
          <>
            {/* Level Info */}
            {playerStats.level && (
              <div className="bg-gray-800 p-4 rounded mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">Level {playerStats.level.current}</h3>
                  <div className="text-sm text-gray-400">
                    {playerStats.level.experience} / {playerStats.level.experienceToNext} XP
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${(playerStats.level.experience / playerStats.level.experienceToNext) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Available Points */}
            {playerStats.attributes && (
              <div className="bg-gray-800 p-4 rounded mb-6">
                <h3 className="text-lg font-bold mb-2">Available Points: {playerStats.attributes.availablePoints - getTotalPendingPoints()}</h3>
                <p className="text-sm text-gray-400">Gain 2 points per level</p>
              </div>
            )}

            {/* Attributes */}
            {playerStats.attributes && (
              <div className="space-y-4 mb-6">
                {Object.entries({
                  health: 'Health',
                  speed: 'Movement Speed',
                  damage: 'Damage',
                  regeneration: 'Regeneration',
                  attackSpeed: 'Attack Speed'
                }).map(([key, label]) => (
                <div key={key} className="bg-gray-800 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getStatIcon(key)}</span>
                      <div>
                        <h4 className="font-bold">{label}</h4>
                        <p className="text-sm text-gray-400">{getStatDescription(key)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removePoint(key)}
                        disabled={pendingPoints[key] <= 0}
                        className="w-8 h-8 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded transition-colors"
                      >
                        -
                      </button>
                      <div className="text-center min-w-[60px]">
                        <div className="font-bold text-lg">
                          {playerStats.attributes[key as keyof typeof playerStats.attributes]}
                          {pendingPoints[key] > 0 && (
                            <span className="text-green-400"> +{pendingPoints[key]}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => assignPoint(key)}
                        disabled={getTotalPendingPoints() >= playerStats.attributes.availablePoints}
                        className="w-8 h-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}

            {/* Apply Button */}
            {getTotalPendingPoints() > 0 && playerStats.attributes && (
              <button
                onClick={applyChanges}
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded font-bold transition-colors"
              >
                Apply Changes ({getTotalPendingPoints()} points)
              </button>
            )}

            {/* Lifetime Stats */}
            {playerStats.stats && (
              <div className="mt-6 bg-gray-800 p-4 rounded">
                <h3 className="font-bold mb-3">Lifetime Statistics</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Total Kills:</span>
                    <span className="ml-2 font-bold">{playerStats.stats.totalKills}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Deaths:</span>
                    <span className="ml-2 font-bold">{playerStats.stats.totalDeaths}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">K/D Ratio:</span>
                    <span className="ml-2 font-bold">
                      {playerStats.stats.totalDeaths > 0 
                        ? (playerStats.stats.totalKills / playerStats.stats.totalDeaths).toFixed(2)
                        : playerStats.stats.totalKills}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Games Played:</span>
                    <span className="ml-2 font-bold">{playerStats.stats.totalGamesPlayed}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">Failed to load stats</div>
        )}
      </div>
    </div>
  )
}