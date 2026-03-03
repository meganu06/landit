import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogoMini } from '@/components/Logo'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function StaffPortal() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('placements')

  const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Staff'

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-white px-6 h-15 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <LogoMini className="h-8 rounded-full bg-background p-1" />
          <span className="font-heading text-2xl font-bold tracking-wide">LANDIT</span>
          <span className="text-sm opacity-80 font-body ml-2">Staff Portal</span>
        </div>
        <span className="text-sm opacity-90">Welcome, {userName}</span>
        <Button onClick={signOut} className="bg-red-600 hover:bg-red-700">
          Sign Out
        </Button>
      </header>

      {/* Tab Navigation */}
      <nav className="fixed top-15 left-0 right-0 z-40 bg-white border-b border-background px-6 flex gap-0 shadow-sm">
        {['placements', 'companies'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-4 text-sm font-medium capitalize transition-all border-b-2 ${
              activeTab === tab
                ? 'text-primary border-primary'
                : 'text-text-gray border-transparent hover:text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="pt-32 px-6 max-w-6xl mx-auto pb-12">
        {activeTab === 'placements' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-primary font-heading">Manage Placements</h2>
              <Button>+ Add Placement</Button>
            </div>
            <Card>
              <p className="text-text-gray italic text-center py-12">No placements yet. Add one to get started.</p>
            </Card>
          </div>
        )}

        {activeTab === 'companies' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-primary font-heading">Companies</h2>
              <Button>+ Add Company</Button>
            </div>
            <Card>
              <p className="text-text-gray italic text-center py-12">No companies yet.</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
