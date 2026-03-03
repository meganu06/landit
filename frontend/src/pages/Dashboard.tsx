import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User'

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center p-2">
            <img src="/logo.png" alt="LandIt" className="w-full h-full object-contain" />
          </div>
          <span className="font-heading text-3xl font-bold tracking-wide">LandIt</span>
        </div>
        <span className="text-base font-body">Welcome, {userName}</span>
        <Button onClick={signOut} size="sm" className="bg-red-600 hover:bg-red-700">
          Sign Out
        </Button>
      </header>

      {/* Tab Navigation */}
      <nav className="fixed top-24 left-0 right-0 z-40 bg-white border-b border-background px-6 flex gap-0 shadow-sm">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'placements', label: 'Placements' },
          { id: 'skills', label: 'Skills' },
          { id: 'cv', label: 'CV' },
          { id: 'bookmarks', label: 'Saved Placements' },
          { id: 'profile', label: 'Profile' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-4 text-sm font-semibold font-body capitalize transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-text-gray border-transparent hover:text-primary hover:bg-background/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="pt-40 px-6 max-w-7xl mx-auto pb-12">
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Best Match', value: '—', color: 'text-primary' },
                { label: 'Total Placements', value: '—', color: 'text-secondary' },
                { label: 'Your Skills', value: '—', color: 'text-primary' },
                { label: 'Bookmarks', value: '—', color: 'text-secondary' },
              ].map((stat) => (
                <Card key={stat.label} className="text-center py-8">
                  <div className={`font-heading text-5xl font-bold mb-3 ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs uppercase tracking-wide text-text-gray font-semibold">{stat.label}</div>
                </Card>
              ))}
            </div>
            <Card title="Top Placement Matches">
              <p className="text-text-gray italic">No placements available yet. Upload your CV and add some skills to get started!</p>
            </Card>
          </div>
        )}

        {activeTab === 'placements' && (
          <Card title="All Placements">
            <p className="text-text-gray italic">No placements available yet. Check back soon for opportunities!</p>
          </Card>
        )}

        {activeTab === 'skills' && (
          <Card title="Your Skills">
            <p className="text-text-gray mb-6">Skills are automatically extracted when you upload your CV. You can also add them manually below.</p>
            <div className="mt-8 p-8 text-center border-2 border-dashed border-secondary rounded-xl bg-background/30">
              <div className="text-4xl mb-3">💡</div>
              <p className="text-text-gray font-medium">No skills yet — upload your CV to extract them automatically.</p>
            </div>
          </Card>
        )

        {activeTab === 'cv' && (
          <Card title="Your CV">
            <p className="text-text-gray mb-6">Upload your CV to automatically extract your skills and get matched with placements.</p>
            <div className="border-2 border-dashed border-secondary rounded-2xl p-16 text-center cursor-pointer hover:border-primary hover:bg-background/50 transition-all">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-semibold text-primary mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-text-gray">PDF or DOCX — max 10 MB</p>
            </div>
          </Card>
        )}

        {activeTab === 'bookmarks' && (
          <Card title="Saved Placements">
            <div className="py-12 text-center">
              <div className="text-5xl mb-4">🔖</div>
              <p className="text-text-gray italic">No saved placements yet. Bookmark roles from the Placements tab to see them here.</p>
            </div>
          </Card>
        )}

        {activeTab === 'profile' && (
          <Card title="Edit Profile" className="max-w-3xl mx-auto">
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-background">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-4xl font-bold font-heading flex items-center justify-center shadow-lg">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-primary font-heading">{userName}</h3>
                <p className="text-text-gray text-base mt-1">{profile?.email}</p>
                {profile?.degree_programme && (
                  <p className="text-text-gray text-sm mt-1">{profile.degree_programme} • Year {profile.year_of_study}</p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-1">Bio</label>
                <p className="text-text-gray italic">{profile?.bio || 'No bio added yet'}</p>
              </div>
              {profile?.location_preference && (
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">Location Preference</label>
                  <p className="text-text-gray">{profile.location_preference}</p>
                </div>
              )}
              {profile?.linkedin_url && (
                <div>
                  <label className="block text-sm font-semibold text-primary mb-1">LinkedIn</label>
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                    {profile.linkedin_url}
                  </a>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
