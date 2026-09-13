import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${props.className ?? ''}`} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`select ${props.className ?? ''}`} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${props.className ?? ''}`} {...props} />
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="form-row">{children}</div>
}