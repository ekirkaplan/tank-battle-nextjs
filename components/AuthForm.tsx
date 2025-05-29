'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import LoadingSkeleton from './LoadingSkeleton'

export default function AuthForm() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Manual validation
    if (!formData.username || !formData.password) {
      toast.error('Please fill all fields')
      return
    }

    if (formData.username.length < 3 || formData.username.length > 20) {
      toast.error('Username must be 3-20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_\-]+$/.test(formData.username)) {
      toast.error('Username can only contain letters, numbers, underscores and hyphens')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      })

      const data = await response.json()
      console.log('Auth response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token)
        console.log('Token stored in localStorage')
      }

      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!')
      
      // Navigate to game
      window.location.href = '/game'
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-tank-red to-tank-yellow bg-clip-text text-transparent">
          Tank Battle Arena
        </h1>
        <p className="text-gray-400 text-center mb-8">Join the battlefield!</p>

        <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              isLogin
                ? 'bg-gray-800 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              !isLogin
                ? 'bg-gray-800 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field"
              placeholder="Enter your username (3-20 chars)"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field"
              placeholder="Enter your password (min 6 chars)"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="input-field"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full relative"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Please wait...</span>
              </div>
            ) : (
              isLogin ? 'Login' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-700 rounded-lg">
          <h3 className="font-bold mb-2 text-tank-yellow">Game Features:</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Real-time multiplayer battles</li>
            <li>• Persistent stats tracking</li>
            <li>• Custom tank colors</li>
            <li>• Global leaderboard</li>
          </ul>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Username: letters, numbers, underscore, hyphen only
        </div>
      </div>
    </div>
  )
}