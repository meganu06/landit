import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>((
  { label, error, options, className = '', ...props },
  ref
) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold mb-2 text-primary">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-body outline-none bg-gray-50 transition-all focus:border-primary focus:ring-4 focus:ring-secondary/30 focus:bg-white ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
