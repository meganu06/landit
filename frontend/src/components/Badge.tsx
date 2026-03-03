interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  className?: string
}

export function Badge({ children, variant = 'blue', className = '' }: BadgeProps) {
  const variantClasses = {
    green: 'bg-secondary text-white',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-background text-primary',
    gray: 'bg-gray-100 text-gray-600',
  }
  
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
