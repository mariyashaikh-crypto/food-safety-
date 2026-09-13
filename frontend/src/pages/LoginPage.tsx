import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { Icon } from '../components/icons'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel" style={{ boxShadow: 'inset 0 3px 0 var(--red-deep)' }}>
        <div className="login-brand-head">
          <div className="brand-mark">
            <Icon.Shield />
          </div>
          <div>
            <div className="brand-name">Food Safety</div>
            <div className="brand-sub">Inspection System</div>
          </div>
        </div>
        <div className="login-brand-tagline">
          <div className="page-kicker">FOOD SAFETY INSPECTION AUTHORITY</div>
          <h1>Inspection. Evidence. Resolution.</h1>
          <p>
            A command-center platform for evidence-backed corrective-action review,
            ML-driven risk scoring and inspection priority, and tracking the
            full violation lifecycle from first observation through final resolution.
          </p>
          <div className="login-features">
            <div className="login-feature"><Icon.Shield /> Evidence-backed corrective-action review</div>
            <div className="login-feature"><Icon.Scale /> Risk scoring, ML prediction &amp; inspection priority</div>
            <div className="login-feature"><Icon.Clipboard /> Full violation lifecycle tracking</div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-card-mobile-brand">
            <div className="brand-mark" style={{ background: 'var(--gray-800)' }}>
              <Icon.Shield />
            </div>
            <div className="brand-name" style={{ color: 'var(--ink)' }}>Food Safety Inspection</div>
          </div>
          <h1 className="login-title">Secure inspection access</h1>
          <p className="login-sub">Authorized inspectors and administrators only.</p>

          <form onSubmit={submit}>
            <Field label="Username" required>
              <Input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                autoComplete="username"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            {error && (
              <div className="error-banner" style={{ marginBottom: 12 }}>
                <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.4v.1" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" variant="primary" block loading={submitting}>
              Sign in
            </Button>
          </form>

          <div className="login-hint">
            Default administrator — username: <strong>admin</strong>, password: <strong>admin123</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
