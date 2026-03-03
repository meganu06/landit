import logoImage from '@/assets/logo.png'

export function Logo({ className = 'w-32' }: { className?: string }) {
  return (
    <img 
      src={logoImage} 
      alt="LandIt" 
      className={className}
    />
  )
}

export function LogoMini({ className = 'h-8' }: { className?: string }) {
  return (
    <img 
      src={logoImage} 
      alt="LandIt" 
      className={`${className} rounded-full bg-background p-1`}
    />
  )
}
