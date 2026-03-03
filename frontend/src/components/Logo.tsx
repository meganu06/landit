export function Logo({ className = 'w-32' }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="LandIt" 
      className={className}
    />
  )
}

export function LogoMini({ className = 'h-8' }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="LandIt" 
      className={`${className} rounded-full bg-background p-1`}
    />
  )
}
