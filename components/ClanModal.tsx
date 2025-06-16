'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ClanListSkeleton } from './LoadingSkeleton'

interface ClanMember {
  player: {
    _id: string
    username: string
    level: { current: number }
    stats: { totalKills: number }
  }
  role: string
  joinedAt: string
}

interface Clan {
  _id: string
  name: string
  tag: string
  description: string
  members: ClanMember[]
  stats: {
    totalKills: number
    totalWins: number
    totalScore: number
  }
  requirements: {
    minLevel: number
    minKills: number
  }
  isPublic: boolean
  memberCount?: number
}

interface ClanInvite {
  _id: string
  clan: {
    _id: string
    name: string
    tag: string
    description: string
  }
  invitedBy: {
    username: string
  }
  createdAt: string
  expiresAt: string
}

interface ClanModalProps {
  isOpen: boolean
  onClose: () => void
  playerData?: any
}

export default function ClanModal({ isOpen, onClose, playerData }: ClanModalProps) {
  const [currentClan, setCurrentClan] = useState<Clan | null>(null)
  const [availableClans, setAvailableClans] = useState<Clan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'my-clan' | 'browse' | 'create' | 'invites'>('my-clan')
  const [createForm, setCreateForm] = useState({
    name: '',
    tag: '',
    description: '',
    isPublic: true,
    minLevel: 1,
    minKills: 0
  })
  const [inviteUsername, setInviteUsername] = useState('')
  const [pendingInvites, setPendingInvites] = useState<ClanInvite[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchClanData()
      if (!currentClan) {
        fetchPendingInvites()
      }
    }
  }, [isOpen])

  const fetchClanData = async () => {
    const authToken = localStorage.getItem('authToken')
    setIsLoading(true)
    try {
      // Get player's clan
      const response = await fetch('/api/clan', {
        credentials: 'include',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.clan) {
          setCurrentClan(data.clan)
          setActiveTab('my-clan')
        } else {
          setCurrentClan(null)
          fetchAvailableClans()
          setActiveTab('browse')
        }
      }
    } catch (error) {
      console.error('Failed to fetch clan data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableClans = async () => {
    const authToken = localStorage.getItem('authToken')
    try {
      const response = await fetch('/api/clan?public=true', {
        credentials: 'include',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableClans(data.clans || [])
      }
    } catch (error) {
      console.error('Failed to fetch clans:', error)
    }
  }

  const fetchPendingInvites = async () => {
    const authToken = localStorage.getItem('authToken')
    try {
      const response = await fetch('/api/clan/invite', {
        credentials: 'include',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPendingInvites(data.invites || [])
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    }
  }

  const searchPlayers = async (query: string) => {
    const authToken = localStorage.getItem('authToken')
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/player/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.players || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const sendInvite = async (username?: string) => {
    const authToken = localStorage.getItem('authToken')
    const targetUsername = username || inviteUsername.trim()
    if (!targetUsername) {
      toast.error('Please select or enter a username')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/clan/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ username: targetUsername }),
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        setInviteUsername('')
        setSearchResults([])
      } else {
        toast.error(data.error || 'Failed to send invite')
      }
    } catch (error) {
      toast.error('Failed to send invite')
    } finally {
      setIsLoading(false)
    }
  }

  const kickPlayer = async (playerId: string, username: string) => {
    const authToken = localStorage.getItem('authToken')
    if (!confirm(`Are you sure you want to kick ${username} from the clan?`)) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/clan/kick', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ playerId }),
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        fetchClanData()
      } else {
        toast.error(data.error || 'Failed to kick player')
      }
    } catch (error) {
      toast.error('Failed to kick player')
    } finally {
      setIsLoading(false)
    }
  }

  const changeRole = async (playerId: string, username: string, newRole: string) => {
    const authToken = localStorage.getItem('authToken')
    const roleNames = { 'leader': 'Leader', 'officer': 'Officer', 'member': 'Member' }
    const action = newRole === 'leader' ? 'promote' : newRole === 'officer' ? 'promote' : 'demote'
    
    if (!confirm(`Are you sure you want to ${action} ${username} to ${roleNames[newRole as keyof typeof roleNames]}?`)) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/clan/promote', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ playerId, newRole }),
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.message)
        fetchClanData()
      } else {
        toast.error(data.error || 'Failed to change role')
      }
    } catch (error) {
      toast.error('Failed to change role')
    } finally {
      setIsLoading(false)
    }
  }

  const respondToInvite = async (inviteId: string, response: 'accept' | 'reject') => {
    const authToken = localStorage.getItem('authToken')
    setIsLoading(true)
    try {
      const res = await fetch('/api/clan/invite/respond', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ inviteId, response }),
        credentials: 'include'
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        if (response === 'accept') {
          fetchClanData()
        } else {
          fetchPendingInvites()
        }
      } else {
        toast.error(data.error || 'Failed to respond to invite')
      }
    } catch (error) {
      toast.error('Failed to respond to invite')
    } finally {
      setIsLoading(false)
    }
  }

  const createClan = async () => {
    const authToken = localStorage.getItem('authToken')
    if (!createForm.name || !createForm.tag) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/clan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({
          name: createForm.name,
          tag: createForm.tag,
          description: createForm.description,
          isPublic: createForm.isPublic,
          requirements: {
            minLevel: createForm.minLevel,
            minKills: createForm.minKills
          }
        }),
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('Clan created successfully!')
        fetchClanData()
      } else {
        toast.error(data.error || 'Failed to create clan')
      }
    } catch (error) {
      toast.error('Failed to create clan')
    } finally {
      setIsLoading(false)
    }
  }

  const joinClan = async (clanId: string) => {
    const authToken = localStorage.getItem('authToken')
    setIsLoading(true)
    try {
      const response = await fetch('/api/clan/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ clanId }),
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('Joined clan successfully!')
        fetchClanData()
      } else {
        toast.error(data.error || 'Failed to join clan')
      }
    } catch (error) {
      toast.error('Failed to join clan')
    } finally {
      setIsLoading(false)
    }
  }

  const leaveClan = async () => {
    const authToken = localStorage.getItem('authToken')
    if (!confirm('Are you sure you want to leave the clan?')) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/clan/leave', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(data.clanDeleted ? 'Clan disbanded' : 'Left clan successfully')
        fetchClanData()
      } else {
        toast.error(data.error || 'Failed to leave clan')
      }
    } catch (error) {
      toast.error('Failed to leave clan')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-blitz-bg/95 border border-blitz-neon/20 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-[0_0_30px_rgba(0,235,215,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Clan System</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {currentClan && (
            <button
              onClick={() => setActiveTab('my-clan')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'my-clan'
                  ? 'bg-blitz-neon/20 text-blitz-neon border border-blitz-neon/50'
                  : 'bg-blitz-bg/50 text-gray-300 hover:bg-blitz-neon/10 border border-transparent'
              }`}
            >
              My Clan
            </button>
          )}
          {!currentClan && (
            <>
              <button
                onClick={() => {
                  setActiveTab('browse')
                  fetchAvailableClans()
                }}
                className={`px-4 py-2 rounded transition-colors ${
                  activeTab === 'browse'
                    ? 'bg-blitz-neon/20 text-blitz-neon border border-blitz-neon/50'
                    : 'bg-blitz-bg/50 text-gray-300 hover:bg-blitz-neon/10 border border-transparent'
                }`}
              >
                Browse Clans
              </button>
              <button
                onClick={() => {
                  setActiveTab('invites')
                  fetchPendingInvites()
                }}
                className={`px-4 py-2 rounded transition-colors ${
                  activeTab === 'invites'
                    ? 'bg-blitz-neon/20 text-blitz-neon border border-blitz-neon/50'
                    : 'bg-blitz-bg/50 text-gray-300 hover:bg-blitz-neon/10 border border-transparent'
                }`}
              >
                Invites {pendingInvites.length > 0 && `(${pendingInvites.length})`}
              </button>
            </>
          )}
          {!currentClan && playerData?.level?.current >= 5 && (
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'create'
                  ? 'bg-blitz-neon/20 text-blitz-neon border border-blitz-neon/50'
                  : 'bg-blitz-bg/50 text-gray-300 hover:bg-blitz-neon/10 border border-transparent'
              }`}
            >
              Create Clan
            </button>
          )}
        </div>

        {/* Show message for players below level 5 */}
        {!currentClan && playerData?.level?.current < 5 && (
          <div className="mb-4 p-4 bg-blitz-copper/20 border border-blitz-copper/50 rounded-lg">
            <p className="text-blitz-copper">
              <span className="font-bold">Level Requirement:</span> You need to reach level 5 to create a clan. 
              Current level: {playerData?.level?.current || 1}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <ClanListSkeleton />
          ) : (
            <>
              {/* My Clan Tab */}
              {activeTab === 'my-clan' && currentClan && (
                <div className="space-y-4">
                  <div className="bg-gray-800 p-4 rounded">
                    <h3 className="text-xl font-bold mb-2">
                      [{currentClan.tag}] {currentClan.name}
                    </h3>
                    <p className="text-gray-400 mb-4">{currentClan.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-400">Total Kills</div>
                        <div className="text-xl font-bold">{currentClan.stats.totalKills}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Total Wins</div>
                        <div className="text-xl font-bold">{currentClan.stats.totalWins}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Members</div>
                        <div className="text-xl font-bold">{currentClan.members.length}</div>
                      </div>
                    </div>

                    <button
                      onClick={leaveClan}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                      disabled={isLoading}
                    >
                      Leave Clan
                    </button>
                  </div>

                  <div className="bg-gray-800 p-4 rounded">
                    <h4 className="font-bold mb-3">Members</h4>
                    <div className="space-y-2">
                      {currentClan.members.map((member) => {
                        const currentUserRole = currentClan.members.find(m => m.player._id === playerData?._id)?.role
                        const canKick = currentUserRole === 'leader' || 
                                       (currentUserRole === 'officer' && member.role === 'member')
                        const canManageRoles = currentUserRole === 'leader'
                        const isCurrentUser = member.player._id === playerData?._id
                        
                        return (
                          <div key={member.player._id} className="bg-gray-700 p-3 rounded">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="font-semibold">{member.player.username}</span>
                                <span className="text-sm text-gray-400 ml-2">Level {member.player.level.current}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm">
                                  <span className="text-gray-400 mr-2">{member.player.stats.totalKills} kills</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    member.role === 'leader' ? 'bg-yellow-600' :
                                    member.role === 'officer' ? 'bg-blue-600' :
                                    'bg-gray-600'
                                  }`}>
                                    {member.role}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            {(canKick || canManageRoles) && !isCurrentUser && (
                              <div className="flex gap-1 flex-wrap">
                                {canManageRoles && member.role !== 'leader' && (
                                  <>
                                    {member.role === 'member' && (
                                      <button
                                        onClick={() => changeRole(member.player._id, member.player.username, 'officer')}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                                        disabled={isLoading}
                                      >
                                        Promote to Officer
                                      </button>
                                    )}
                                    {member.role === 'officer' && (
                                      <>
                                        <button
                                          onClick={() => changeRole(member.player._id, member.player.username, 'leader')}
                                          className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs transition-colors"
                                          disabled={isLoading}
                                        >
                                          Promote to Leader
                                        </button>
                                        <button
                                          onClick={() => changeRole(member.player._id, member.player.username, 'member')}
                                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs transition-colors"
                                          disabled={isLoading}
                                        >
                                          Demote to Member
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                                {canKick && member.role !== 'leader' && (
                                  <button
                                    onClick={() => kickPlayer(member.player._id, member.player.username)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                                    disabled={isLoading}
                                  >
                                    Kick
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Invite Member Section */}
                  {(currentClan.members.find(m => m.player._id === playerData?._id)?.role === 'leader' ||
                    currentClan.members.find(m => m.player._id === playerData?._id)?.role === 'officer') && (
                    <div className="bg-gray-800 p-4 rounded">
                      <h4 className="font-bold mb-3">Invite Member</h4>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inviteUsername}
                            onChange={(e) => {
                              setInviteUsername(e.target.value)
                              searchPlayers(e.target.value)
                            }}
                            placeholder="Search username to invite"
                            className="flex-1 p-2 rounded bg-gray-700 border border-gray-600"
                          />
                          <button
                            onClick={() => sendInvite()}
                            disabled={isLoading || !inviteUsername.trim()}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded transition-colors"
                          >
                            Send Invite
                          </button>
                        </div>
                        
                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <div className="max-h-32 overflow-y-auto bg-gray-700 rounded border border-gray-600">
                            {searchResults.map((player) => (
                              <div
                                key={player._id}
                                className="flex items-center justify-between p-2 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                                onClick={() => {
                                  setInviteUsername(player.username)
                                  setSearchResults([])
                                }}
                              >
                                <div>
                                  <span className="font-medium">{player.username}</span>
                                  <span className="text-sm text-gray-400 ml-2">
                                    Level {player.level} &bull; {player.totalKills} kills
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    sendInvite(player.username)
                                  }}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                                  disabled={isLoading}
                                >
                                  Invite
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {isSearching && (
                          <div className="text-center text-gray-400 text-sm">Searching...</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Browse Clans Tab */}
              {activeTab === 'browse' && !currentClan && (
                <div className="space-y-3">
                  {availableClans.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No clans available</div>
                  ) : (
                    availableClans.map((clan) => (
                      <div key={clan._id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
                        <div>
                          <h4 className="font-bold">[{clan.tag}] {clan.name}</h4>
                          <p className="text-sm text-gray-400">{clan.description}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            {clan.memberCount} members • Min Level: {clan.requirements.minLevel} • Min Kills: {clan.requirements.minKills}
                          </div>
                        </div>
                        <button
                          onClick={() => joinClan(clan._id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                          disabled={isLoading || 
                            playerData?.level?.current < clan.requirements.minLevel ||
                            playerData?.stats?.totalKills < clan.requirements.minKills}
                        >
                          Join
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Create Clan Tab */}
              {activeTab === 'create' && !currentClan && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Clan Name*</label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        className="w-full p-2 rounded bg-blitz-bg/50 border border-blitz-neon/20 focus:border-blitz-neon focus:outline-none"
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tag* (2-5 chars)</label>
                      <input
                        type="text"
                        value={createForm.tag}
                        onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                        className="w-full p-2 rounded bg-blitz-bg/50 border border-blitz-neon/20 focus:border-blitz-neon focus:outline-none"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="w-full p-2 rounded bg-blitz-bg/50 border border-blitz-neon/20 focus:border-blitz-neon focus:outline-none"
                      rows={3}
                      maxLength={200}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={createForm.isPublic}
                          onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                        />
                        Public Clan
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Min Level</label>
                      <input
                        type="number"
                        value={createForm.minLevel}
                        onChange={(e) => setCreateForm({ ...createForm, minLevel: parseInt(e.target.value) || 1 })}
                        className="w-full p-2 rounded bg-blitz-bg/50 border border-blitz-neon/20 focus:border-blitz-neon focus:outline-none"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Min Kills</label>
                      <input
                        type="number"
                        value={createForm.minKills}
                        onChange={(e) => setCreateForm({ ...createForm, minKills: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 rounded bg-blitz-bg/50 border border-blitz-neon/20 focus:border-blitz-neon focus:outline-none"
                        min={0}
                      />
                    </div>
                  </div>

                  <button
                    onClick={createClan}
                    className="px-6 py-2 bg-gradient-to-r from-blitz-copper to-blitz-neon text-blitz-bg font-bold rounded hover:shadow-[0_0_15px_rgba(0,235,215,0.5)] transition-all"
                    disabled={isLoading || !createForm.name || !createForm.tag}
                  >
                    Create Clan
                  </button>
                </div>
              )}

              {/* Invites Tab */}
              {activeTab === 'invites' && !currentClan && (
                <div className="space-y-3">
                  {pendingInvites.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No pending invites</div>
                  ) : (
                    pendingInvites.map((invite) => (
                      <div key={invite._id} className="bg-gray-800 p-4 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold">[{invite.clan.tag}] {invite.clan.name}</h4>
                            <p className="text-sm text-gray-400">{invite.clan.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Invited by: {invite.invitedBy.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              Expires: {new Date(invite.expiresAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => respondToInvite(invite._id, 'accept')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                              disabled={isLoading}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => respondToInvite(invite._id, 'reject')}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                              disabled={isLoading}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}