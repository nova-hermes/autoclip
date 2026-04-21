import React from 'react'
import { Layout, Button, Dropdown } from 'antd'
import { SettingOutlined, HomeOutlined, UserOutlined, LogoutOutlined, CreditCardOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'

const { Header: AntHeader } = Layout

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()

  const userMenu = {
    items: [
      {
        key: 'email',
        label: user?.emailAddresses?.[0]?.emailAddress || '',
        disabled: true,
      },
      { type: 'divider' as const },
      {
        key: 'billing',
        icon: <CreditCardOutlined />,
        label: 'Billing',
        onClick: () => navigate('/billing'),
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Settings',
        onClick: () => navigate('/settings'),
      },
      { type: 'divider' as const },
      {
        key: 'signout',
        icon: <LogoutOutlined />,
        label: 'Sign Out',
        onClick: () => signOut(),
      },
    ],
  }

  return (
    <AntHeader
      className="glass-effect"
      style={{
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(20px)',
        background: 'rgba(26, 26, 26, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={() => navigate('/')}
      >
        <span
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#00d4ff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            letterSpacing: '-0.5px',
          }}
        >
          AutoClip
        </span>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!isHomePage && (
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            style={{
              background: '#00d4ff',
              border: 'none',
              borderRadius: '8px',
              height: '40px',
              padding: '0 20px',
              fontWeight: 500,
            }}
          >
            Back to Home
          </Button>
        )}

        {isSignedIn ? (
          <Dropdown menu={userMenu} placement="bottomRight">
            <Button
              shape="circle"
              icon={<UserOutlined />}
              style={{
                background: '#333',
                border: '1px solid #444',
                color: '#fff',
              }}
            />
          </Dropdown>
        ) : (
          <Button
            onClick={() => navigate('/sign-in')}
            style={{
              borderColor: '#00d4ff',
              color: '#00d4ff',
              borderRadius: 8,
            }}
          >
            Sign In
          </Button>
        )}
      </div>
    </AntHeader>
  )
}

export default Header
