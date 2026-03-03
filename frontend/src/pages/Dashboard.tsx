import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogoMini } from '@/components/Logo'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User'

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-white px-6 h-15 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <LogoMini className="h-8 rounded-full bg-background p-1" />
          <span className="font-heading text-2xl font-bold tracking-wide">LANDIT</span>
        </div>
        <span className="text-sm opacity-90">Welcome, {userName}</span>
        <Button onClick={signOut} className="bg-red-600 hover:bg-red-700">
          Sign Out
        </Button>
      </header>

      {/* Tab Navigation */}
      <nav className="fixed top-15 left-0 right-0 z-40 bg-white border-b border-background px-6 flex gap-0 shadow-sm">
        {['overview', 'placements', 'skills', 'cv', 'bookmarks', 'profile'].map((tab) => (
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
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[{ label: 'Best Match', value: '—', color: 'green' },
                { label: 'Total Placements', value: '—', color: 'blue' },
                { label: 'Your Skills', value: '—', color: 'purple' },
                { label: 'Bookmarks', value: '—', color: 'orange' }].map((stat) => (
                <Card key={stat.label} className="text-center">
                  <div className={`font-heading text-4xl font-bold mb-2 text-${stat.color}-600`}>{stat.value}</div>
                  <div className="text-xs uppercase tracking-wide text-text-gray font-semibold">{stat.label}</div>
                </Card>
              ))}
            </div>
            <Card title="Top Placement Matches">
              <p className="text-text-gray italic">Loading matches...</p>
            </Card>
          </div>
        )}

        {activeTab === 'placements' && (
          <Card title="All Placements">
            <p className="text-text-gray italic">Loading placements...</p>
          </Card>
        )}

        {activeTab === 'skills' && (
          <Card title="Your Skills">
            <p className="text-text-gray mb-6">Skills are automatically extracted when you upload your CV. You can also add them manually below.</p>
            <p className="text-text-gray italic">No skills yet — upload your CV to extract them automatically.</p>
          </Card>
        )}

        {activeTab === 'cv' && (
          <Card title="Your CV">
            <p className="text-text-gray mb-6 italic">No CV uploaded yet.</p>
            <div className="border-2 border-dashed border-secondary rounded-2xl p-12 text-center cursor-pointer hover:border-primary hover:bg-background transition-all">
              <div className="text-5xl mb-4">📄</div>
              <p><strong className="text-primary">Click to upload</strong> or drag and drop</p>
              <p className="text-sm text-text-gray mt-2">PDF or DOCX — max 10 MB</p>
            </div>
          </Card>
        )}

        {activeTab === 'bookmarks' && (
          <Card title="Saved Placements">
            <p className="text-text-gray italic">No saved placements yet. Bookmark roles from the Placements tab.</p>
          </Card>
        )}

        {activeTab === 'profile' && (
          <Card title="Edit Profile" className="max-w-3xl mx-auto">
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-background">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-3xl font-bold font-heading flex items-center justify-center shadow-lg">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary">{userName}</h3>
                <p className="text-text-gray">{profile?.email}</p>
              </div>
            </div>
            <p className="text-text-gray italic">Profile editing coming soon...</p>
          </Card>
        )}
      </main>
    </div>
  )
}
