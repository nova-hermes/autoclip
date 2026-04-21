import { Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { Layout } from 'antd'
import HomePage from './pages/HomePage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import SettingsPage from './pages/SettingsPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import BillingPage from './pages/BillingPage'
import Header from './components/Header'

const { Content } = Layout

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function ProtectedApp() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Content>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:id" element={<ProjectDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Content>
    </Layout>
  )
}

function App() {
  // If no Clerk key configured, run in dev mode without auth
  if (!clerkPubKey) {
    console.warn('VITE_CLERK_PUBLISHABLE_KEY not set — running without auth')
    return <ProtectedApp />
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Routes>
        {/* Public auth routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        {/* Billing page — auth required but separate from app */}
        <Route path="/billing" element={
          <SignedIn>
            <BillingPage />
          </SignedIn>
        } />

        {/* Protected app routes */}
        <Route path="/*" element={
          <>
            <SignedIn>
              <ProtectedApp />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />
      </Routes>
    </ClerkProvider>
  )
}

export default App
