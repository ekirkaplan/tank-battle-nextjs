'use client'

import { useEffect, useState } from 'react'

interface LeaderboardEntry {
  _id: string
  username: string
  tankColor: string
  stats?: {
    highestScore?: number
    totalKills?: number
    totalDeaths?: number
    totalDamageDealt?: number
    totalDamageTaken?: number
    totalGamesPlayed?: number
  }
  level?: {
    current?: number
    totalExperience?: number
  }
  kdRatio?: number
  lastSeen?: string
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardType, setLeaderboardType] = useState<string>('score')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard()
    }
  }, [isOpen, leaderboardType])

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/leaderboard?type=${leaderboardType}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const leaderboardTypes = [
    { value: 'score', label: 'Highest Score' },
    { value: 'level', label: 'Level' },
    { value: 'kills', label: 'Total Kills' },
    { value: 'kd', label: 'K/D Ratio' },
    { value: 'damage', label: 'Damage Dealt' },
    { value: 'games', label: 'Games Played' }
  ]

  const formatValue = (entry: LeaderboardEntry): string => {
    switch (leaderboardType) {
      case 'score':
        return entry.stats?.highestScore?.toString() || '0'
      case 'level':
        return `Level ${entry.level?.current || 1}`
      case 'kills':
        return `${entry.stats?.totalKills || 0} kills`
      case 'kd':
        return entry.kdRatio?.toFixed(2) || '0.00'
      case 'damage':
        return `${(entry.stats?.totalDamageDealt || 0).toLocaleString()}`
      case 'games':
        return `${entry.stats?.totalGamesPlayed || 0} games`
      default:
        return '0'
    }
  }

  const getSubValue = (entry: LeaderboardEntry): string | null => {
    switch (leaderboardType) {
      case 'kills':
        return `${entry.stats?.totalDeaths || 0} deaths`
      case 'damage':
        return `${(entry.stats?.totalDamageTaken || 0).toLocaleString()} taken`
      case 'level':
        return `${(entry.level?.totalExperience || 0).toLocaleString()} XP`
      case 'games':
        const lastSeen = entry.lastSeen ? new Date(entry.lastSeen) : null
        if (lastSeen) {
          const hoursAgo = Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60))
          if (hoursAgo < 1) return 'Online now'
          if (hoursAgo < 24) return `${hoursAgo}h ago`
          const daysAgo = Math.floor(hoursAgo / 24)
          return `${daysAgo}d ago`
        }
        return null
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Leaderboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {leaderboardTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setLeaderboardType(type.value)}
              className={`px-3 py-1 rounded transition-colors ${
                leaderboardType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No data available</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry._id}
                  className={`flex items-center gap-4 p-3 rounded ${
                    index < 3 ? 'bg-gray-800' : 'bg-gray-800/50'
                  }`}
                >
                  <div className={`text-2xl font-bold w-10 text-center ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    index === 2 ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: entry.tankColor }}
                  />
                  
                  <div className="flex-1">
                    <div className="font-semibold">{entry.username}</div>
                    {getSubValue(entry) && (
                      <div className="text-xs text-gray-400">{getSubValue(entry)}</div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold">{formatValue(entry)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}