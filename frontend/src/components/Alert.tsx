interface AlertProps {
  children: React.ReactNode
  variant: 'success' | 'error'
  className?: string
}

export function Alert({ children, variant, className = '' }: AlertProps) {
  const variantClasses = {
    success: 'bg-secondary text-white',
    error: 'bg-red-100 text-red-800',
  }
  
  return (
    <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}
