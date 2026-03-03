import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>((
  { label, error, className = '', ...props },
  ref
) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold mb-2 text-primary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-body outline-none bg-gray-50 transition-all focus:border-primary focus:ring-4 focus:ring-secondary/30 focus:bg-white ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
