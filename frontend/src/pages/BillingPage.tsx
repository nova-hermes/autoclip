import { useState, useEffect } from 'react'
import { Button, Card, Tag, message } from 'antd'
import { CheckOutlined, LogoutOutlined } from '@ant-design/icons'
import axios from 'axios'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

let useUser: any = null
let useClerk: any = null
if (clerkPubKey) {
  const clerk = await import('@clerk/clerk-react')
  useUser = clerk.useUser
  useClerk = clerk.useClerk
}

interface Plan {
  id: string
  name: string
  price: number
  period: string
  features: string[]
  tier: string
  popular?: boolean
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    features: [
      '3 videos per month',
      'Basic AI clipping',
      'Standard export quality',
      'Community support',
    ],
    tier: 'free',
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 12,
    period: 'month',
    features: [
      '30 videos per month',
      'Advanced AI clipping',
      'HD export quality',
      'Priority processing',
      'Email support',
    ],
    tier: 'creator',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: 'month',
    features: [
      'Unlimited videos',
      'Premium AI models',
      '4K export quality',
      'Custom branding',
      'Priority support',
      'API access',
    ],
    tier: 'pro',
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 79,
    period: 'month',
    features: [
      'Everything in Pro',
      '5 team members',
      'Shared workspace',
      'Admin dashboard',
      'SSO integration',
      'Dedicated support',
    ],
    tier: 'team',
  },
]

export default function BillingPage() {
  let user: any = null
  let signOut: any = () => {}

  if (useUser && useClerk) {
    const userResult = useUser()
    user = userResult.user
    signOut = useClerk().signOut
  }

  const [loading, setLoading] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const token = await user?.getToken()
      if (!token) return
      const { data } = await axios.get('/api/v1/billing/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSubscription(data)
    } catch {
      // No subscription yet
    } finally {
      setStatusLoading(false)
    }
  }

  const handleCheckout = async (tier: string) => {
    if (tier === 'free') {
      window.location.href = '/'
      return
    }
    setLoading(tier)
    try {
      const token = await user?.getToken()
      const { data } = await axios.post(
        '/api/v1/billing/checkout',
        { tier },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      window.location.href = data.url
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Checkout failed')
    } finally {
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setLoading('manage')
    try {
      const token = await user?.getToken()
      const { data } = await axios.post(
        '/api/v1/billing/portal',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      window.location.href = data.url
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to open billing portal')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '40px 20px',
      color: '#fff',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: '#00d4ff' }}>AutoClip</h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>
            Signed in as {user?.emailAddresses?.[0]?.emailAddress}
          </p>
        </div>
        <Button
          icon={<LogoutOutlined />}
          onClick={() => signOut()}
          style={{ borderColor: '#444', color: '#aaa' }}
        >
          Sign Out
        </Button>
      </div>

      {!statusLoading && subscription?.subscription_tier !== 'free' && (
        <div style={{
          maxWidth: 600,
          margin: '0 auto 40px',
          background: '#1a1a1a',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
        }}>
          <p style={{ color: '#888', margin: '0 0 8px' }}>Current Plan</p>
          <h2 style={{ color: '#00d4ff', margin: '0 0 16px', textTransform: 'capitalize' }}>
            {subscription?.subscription_tier}
          </h2>
          <Tag color={subscription?.subscription_status === 'active' ? 'green' : 'orange'}>
            {subscription?.subscription_status}
          </Tag>
          <br />
          <Button type="link" onClick={handleManageBilling} loading={loading === 'manage'} style={{ marginTop: 12 }}>
            Manage Billing
          </Button>
        </div>
      )}

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 24,
      }}>
        {plans.map((plan) => (
          <Card
            key={plan.id}
            style={{
              background: '#1a1a1a',
              border: plan.popular ? '2px solid #00d4ff' : '1px solid #333',
              borderRadius: 12,
              position: 'relative',
            }}
            styles={{ body: { padding: 24 } }}
          >
            {plan.popular && (
              <Tag color="#00d4ff" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontWeight: 600 }}>
                Most Popular
              </Tag>
            )}
            <h3 style={{ fontSize: 20, margin: '0 0 8px', color: '#fff' }}>{plan.name}</h3>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>${plan.price}</span>
              {plan.price > 0 && <span style={{ color: '#888' }}>/{plan.period}</span>}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ color: '#ccc', marginBottom: 8, display: 'flex', gap: 8 }}>
                  <CheckOutlined style={{ color: '#52c41a', marginTop: 4 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              type={plan.popular ? 'primary' : 'default'}
              block
              size="large"
              loading={loading === plan.tier}
              onClick={() => handleCheckout(plan.tier)}
              style={plan.popular ? { background: '#00d4ff', borderColor: '#00d4ff', fontWeight: 600 } : { borderColor: '#444', color: '#fff' }}
            >
              {plan.price === 0 ? 'Current Plan' : `Get ${plan.name}`}
            </Button>
          </Card>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Button type="link" onClick={() => window.location.href = '/'} style={{ color: '#00d4ff' }}>
          Skip for now — go to app
        </Button>
      </div>
    </div>
  )
}
