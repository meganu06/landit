import { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border border-background rounded-xl p-6 shadow-sm ${className}`}>
      {title && <h3 className="text-xl font-semibold text-primary mb-4 font-heading">{title}</h3>}
      {children}
    </div>
  )
}
