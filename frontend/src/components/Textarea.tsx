import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((
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
      <textarea
        ref={ref}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base font-body outline-none bg-gray-50 transition-all focus:border-primary focus:ring-4 focus:ring-secondary/30 focus:bg-white resize-vertical min-h-[100px] ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
})

Textarea.displayName = 'Textarea'
