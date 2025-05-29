'use client'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'rectangle' | 'circle' | 'card'
  width?: string | number
  height?: string | number
  count?: number
}

export default function LoadingSkeleton({ 
  className = '', 
  variant = 'rectangle',
  width,
  height,
  count = 1
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-700 rounded'
  
  const variantClasses = {
    text: 'h-4 rounded',
    rectangle: 'rounded',
    circle: 'rounded-full',
    card: 'rounded-lg p-4'
  }

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : variant === 'circle' ? '40px' : '100%'),
    height: height || (variant === 'text' ? '16px' : variant === 'circle' ? '40px' : '100px')
  }

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  ))

  return count > 1 ? (
    <div className="space-y-2">
      {skeletons}
    </div>
  ) : (
    skeletons[0]
  )
}

export function GameLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-4">
        <LoadingSkeleton variant="text" width={200} height={32} />
        <div className="flex gap-2">
          <LoadingSkeleton variant="rectangle" width={100} height={40} />
          <LoadingSkeleton variant="rectangle" width={100} height={40} />
        </div>
      </div>
      
      {/* Game canvas skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <LoadingSkeleton 
          variant="rectangle" 
          width="90%" 
          height="80vh" 
          className="rounded-lg"
        />
      </div>
      
      {/* Stats skeleton */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <LoadingSkeleton variant="card" height={80} />
        <LoadingSkeleton variant="card" height={80} />
        <LoadingSkeleton variant="card" height={80} />
      </div>
    </div>
  )
}

export function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <LoadingSkeleton variant="text" width={150} height={32} className="mb-6 mx-auto" />
        <div className="space-y-4">
          <LoadingSkeleton variant="rectangle" height={40} />
          <LoadingSkeleton variant="rectangle" height={40} />
          <LoadingSkeleton variant="rectangle" height={40} className="mt-6" />
        </div>
      </div>
    </div>
  )
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="flex items-center justify-between bg-gray-800 p-3 rounded">
          <div className="flex items-center gap-3">
            <LoadingSkeleton variant="circle" width={30} height={30} />
            <LoadingSkeleton variant="text" width={120} />
          </div>
          <LoadingSkeleton variant="text" width={60} />
        </div>
      ))}
    </div>
  )
}

export function ClanListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="bg-gray-800 p-4 rounded flex justify-between items-center">
          <div className="flex-1">
            <LoadingSkeleton variant="text" width={200} height={20} className="mb-2" />
            <LoadingSkeleton variant="text" width={300} height={16} className="mb-1" />
            <LoadingSkeleton variant="text" width={250} height={14} />
          </div>
          <LoadingSkeleton variant="rectangle" width={80} height={36} />
        </div>
      ))}
    </div>
  )
}