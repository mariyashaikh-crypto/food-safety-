import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { AiAskResponse } from '../api/types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/icons'
import { Kicker } from '../components/investigation'
import { useToast } from '../components/Toast'

interface QaItem {
  question: string
  answer: AiAskResponse
}

const SUGGESTIONS = [
  'Which risk factors drive high-risk establishments?',
  'Which establishments are overdue for inspection?',
  'Why was Golden Grill flagged as high risk?',
  'What corrective actions are still pending?',
  'How many critical violations are open in the Central region?',
  'Which violation categories recur most often?',
]

function GroundedPill({
  grounded,
}: {
  grounded: boolean | null
}) {
  const styles =
    grounded === true
      ? { borderColor: 'var(--green-line)', background: 'var(--green-bg)', color: 'var(--green-ink)' }
      : grounded === false
        ? { borderColor: 'var(--amber-line)', background: 'var(--amber-bg)', color: 'var(--amber-ink)' }
        : { borderColor: 'var(--border-strong)', background: 'var(--surface-2)', color: 'var(--ink-3)' }
  const label = grounded === true ? 'Grounded in record' : grounded === false ? 'Best-effort' : 'Pending'
  return (
    <span className="grounded-pill" style={styles}>
      <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {label}
    </span>
  )
}

export function AiAssistantPage() {
  const toast = useToast()
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<QaItem[]>([])
  const [showGreeting, setShowGreeting] = useState(true)

  const ask = async (q: string) => {
    const text = q.trim()
    if (!text || busy) return
    setBusy(true)
    setShowGreeting(false)
    try {
      const answer = await api.aiAsk(text)
      setItems((prev) => [{ question: text, answer }, ...prev])
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'The assistant could not answer', 'error')
    } finally {
      setBusy(false)
      setQuestion('')
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(question)
  }

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <Kicker>Intelligence Layer</Kicker>
          <h1 className="page-title">AI Intelligence</h1>
          <p className="page-sub">
            Grounded analysis over the inspection record — retrieval-based answers tied to establishment
            risk, violations and corrective actions.
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={submit}>
          <div className="ai-composer">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask the intelligence layer about establishments, risks, violations or corrective actions…"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask(question)
                }
              }}
            />
            <div className="ai-composer-bar">
              <div className="ai-chip-row" style={{ marginTop: 0 }}>
                {SUGGESTIONS.slice(0, 3).map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
              <Button type="submit" variant="primary" icon={<Icon.Send />} loading={busy} disabled={!question.trim()}>
                Ask
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {showGreeting && !items.length && (
        <div className="empty" style={{ marginTop: 18, border: '1px dashed var(--border-strong)', background: 'var(--surface-2)' }}>
          <Icon.Sparkles className="ico" style={{ width: 26, height: 26, color: 'var(--violet)' }} />
          <div className="empty-title" style={{ marginTop: 8 }}>Submit a question</div>
          <div className="empty-sub" style={{ maxWidth: 460 }}>
            The intelligence layer answers over retrieved record context. Try one of the queries below, or ask
            directly about establishment risk, open violations and corrective actions.
          </div>
          <div className="ai-chip-row" style={{ justifyContent: 'center' }}>
            {SUGGESTIONS.slice(3).map((s) => (
              <button key={s} type="button" className="chip" onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {items.map((it, idx) => {
        const a = it.answer
        return (
          <div key={idx} className="intel-panel" style={{ marginTop: 16 }}>
            <div className="intel-bar">
              <Icon.Sparkles />
              <span>Analyst Response</span>
              <span style={{ marginLeft: 'auto' }}>
                <GroundedPill grounded={a.grounded} />
              </span>
            </div>
            <div className="intel-body">
              <div className="ai-answer" style={{ whiteSpace: 'pre-wrap' }}>{a.answer}</div>
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 7,
                padding: '10px 14px',
                borderTop: '1px solid var(--border-faint)',
                background: 'var(--surface-sunken)',
              }}
            >
              {a.model && (
                <span className="mini-chip" style={{ fontFamily: 'var(--font-mono)' }}>model {a.model}</span>
              )}
              {a.retrieval_type && <span className="mini-chip">retrieval {a.retrieval_type}</span>}
              <span className="mini-chip">query: {it.question}</span>
              {a.success === false && <span className="mini-chip mini-chip--red">partial answer</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}