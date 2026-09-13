import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AlreadyAuthed, RequireAuth } from './auth/RequireAuth'
import { LookupProvider } from './context/LookupContext'
import { ToastProvider } from './components/Toast'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { EstablishmentsPage } from './pages/EstablishmentsPage'
import { EstablishmentDetailPage } from './pages/EstablishmentDetailPage'
import { InspectionsPage } from './pages/InspectionsPage'
import { ViolationsPage } from './pages/ViolationsPage'
import { CorrectiveActionsPage } from './pages/CorrectiveActionsPage'
import { RiskPage } from './pages/RiskPage'
import { AiAssistantPage } from './pages/AiAssistantPage'
import { EvidencePage } from './pages/EvidencePage'

function ShellRoutes() {
  const { session } = useAuth()
  return (
    <LookupProvider ready={!!session}>
      <Routes>
        <Route path="/login" element={<AlreadyAuthed><LoginPage /></AlreadyAuthed>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="establishments" element={<EstablishmentsPage />} />
          <Route path="establishments/:id" element={<EstablishmentDetailPage />} />
          <Route path="inspections" element={<InspectionsPage />} />
          <Route path="violations" element={<ViolationsPage />} />
          <Route path="corrective-actions" element={<CorrectiveActionsPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="ai" element={<AiAssistantPage />} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LookupProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ShellRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}