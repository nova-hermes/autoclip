import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import HomePage from './pages/HomePage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import SettingsPage from './pages/SettingsPage'
import Header from './components/Header'

const { Content } = Layout

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Lazy-load Clerk only when key is present (avoids import errors)
let ClerkProvider: any = null
let SignedIn: any = null
let SignedOut: any = null
let RedirectToSignIn: any = null
let SignInPage: any = null
let SignUpPage: any = null
let BillingPage: any = null

if (clerkPubKey) {
  const clerk = await import('@clerk/clerk-react')
  ClerkProvider = clerk.ClerkProvider
  SignedIn = clerk.SignedIn
  SignedOut = clerk.SignedOut
  RedirectToSignIn = clerk.RedirectToSignIn

  SignInPage = (await import('./pages/SignInPage')).default
  SignUpPage = (await import('./pages/SignUpPage')).default
  BillingPage = (await import('./pages/BillingPage')).default
}

function ProtectedApp() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Content>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:id" element={<ProjectDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {BillingPage && <Route path="/billing" element={<BillingPage />} />}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Content>
    </Layout>
  )
}

function App() {
  // No Clerk key — run without auth (dev mode)
  if (!clerkPubKey || !ClerkProvider) {
    return <ProtectedApp />
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Routes>
        {/* Public auth routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

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
