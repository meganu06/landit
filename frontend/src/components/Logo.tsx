export function Logo({ className = 'w-32' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="60" fill="none" stroke="#344e41" strokeWidth="4" />
      <circle cx="100" cy="100" r="45" fill="none" stroke="#344e41" strokeWidth="4" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#344e41" strokeWidth="4" />
      <circle cx="100" cy="100" r="12" fill="#344e41" />
      <line x1="100" y1="100" x2="160" y2="40" stroke="#344e41" strokeWidth="6" strokeLinecap="round" />
      <line x1="100" y1="100" x2="150" y2="50" stroke="#344e41" strokeWidth="12" strokeLinecap="round" />
      <path d="M150 50 L165 35 L175 45 L160 60 Z" fill="#344e41" />
      <path d="M165 35 L175 25 L180 35 L170 45 Z" fill="#a3b18a" />
      <path d="M160 60 L150 70 L160 75 L170 65 Z" fill="#a3b18a" />
    </svg>
  )
}

export function LogoMini({ className = 'h-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="60" fill="none" stroke="#344e41" strokeWidth="6" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#344e41" strokeWidth="6" />
      <circle cx="100" cy="100" r="12" fill="#344e41" />
      <line x1="100" y1="100" x2="160" y2="40" stroke="#344e41" strokeWidth="8" strokeLinecap="round" />
      <path d="M150 50 L170 30 L180 40 L160 60 Z" fill="#344e41" />
    </svg>
  )
}
