import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { usePlacements } from '@/hooks/usePlacements'
import { useSkills } from '@/hooks/useSkills'
import { useCV } from '@/hooks/useCV'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [uploadStatus, setUploadStatus] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [skillLevel, setSkillLevel] = useState(3)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    degree_programme: '',
    year_of_study: '',
    bio: '',
    linkedin_url: '',
    github_url: '',
    location_preference: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { skills, loading: skillsLoading, addSkill, removeSkill, reload: reloadSkills } = useSkills()
  const { placements, matchScores, loading: placementsLoading, recalculateMatches } = usePlacements(skills)
  const { cv, uploading, uploadCV, deleteCV } = useCV()

  const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User'

  // Initialize profile form when profile loads
  useState(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        degree_programme: profile.degree_programme || '',
        year_of_study: profile.year_of_study?.toString() || '',
        bio: profile.bio || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        location_preference: profile.location_preference || ''
      })
    }
  })

  // Calculate stats
  const scores = Object.values(matchScores).map((m: any) => m.score)
  const bestMatch = scores.length ? Math.max(...scores) : 0
  const totalPlacements = placements.length
  const skillsCount = skills.length
  const topMatches = placements.slice(0, 5)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadCV(file, setUploadStatus)
      await reloadSkills()
      await recalculateMatches()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return
    try {
      await addSkill(newSkillName, skillLevel)
      setNewSkillName('')
      await recalculateMatches()
    } catch (err) {
      alert('Failed to add skill')
    }
  }

  const handleRemoveSkill = async (skillId: string, name: string) => {
    if (!confirm(`Remove "${name}" from your skills?`)) return
    try {
      await removeSkill(skillId)
      await recalculateMatches()
    } catch (err) {
      alert('Failed to remove skill')
    }
  }

  const handleDeleteCV = async () => {
    if (!cv || !confirm('Delete your CV?')) return
    try {
      await deleteCV(cv.id, cv.file_url)
      await reloadSkills()
      await recalculateMatches()
    } catch (err) {
      alert('Failed to delete CV')
    }
  }

  const handleSaveProfile = async () => {
    try {
      const updates = {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        degree_programme: profileForm.degree_programme || null,
        year_of_study: profileForm.year_of_study ? parseInt(profileForm.year_of_study) : null,
        bio: profileForm.bio.trim() || null,
        linkedin_url: profileForm.linkedin_url.trim() || null,
        github_url: profileForm.github_url.trim() || null,
        location_preference: profileForm.location_preference.trim() || null
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile?.id)

      if (error) throw error

      setProfileMessage('Profile saved successfully!')
      setTimeout(() => setProfileMessage(''), 3000)
      // Refresh the page to update profile data
      window.location.reload()
    } catch (err: any) {
      setProfileMessage('Error saving profile: ' + err.message)
    }
  }

  const getScoreBadgeClass = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800'
    if (score > 0) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-600'
  }

  const renderPlacementCard = (placement: any) => {
    const match = matchScores[placement.id] || { score: 0, matched: [], missing: [] }
    const company = placement.companies?.name || 'Unknown company'
    const placementSkills = (placement.placement_skills || []).slice(0, 5)

    return (
      <Card key={placement.id} className="mb-4 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-heading text-xl font-bold text-primary">{placement.title}</h3>
            <p className="text-sm text-text-gray mt-1">
              {company} {placement.companies?.industry && `• ${placement.companies.industry}`}
            </p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ml-4 ${
            getScoreBadgeClass(match.score)
          }`}>
            {match.score}%
          </div>
        </div>
        
        {placement.description && (
          <p className="text-sm text-text-gray mb-3">
            {placement.description.slice(0, 140)}{placement.description.length > 140 ? '…' : ''}
          </p>
        )}

        <div className="flex gap-4 text-xs text-text-gray mb-3 flex-wrap">
          {placement.location && <span>📍 {placement.location}</span>}
          {placement.salary_range && <span>💷 £{Number(placement.salary_range).toLocaleString()}/yr</span>}
          {placement.deadline && <span>⏰ Deadline: {new Date(placement.deadline).toLocaleDateString()}</span>}
        </div>

        {placementSkills.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {placementSkills.map((ps: any) => (
              <span key={ps.skills?.name} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                {ps.skills?.name}
              </span>
            ))}
          </div>
        )}

        {(match.matched.length > 0 || match.missing.length > 0) && (
          <div className="flex gap-2 flex-wrap mb-4">
            {match.matched.slice(0, 3).map((skill: string) => (
              <span key={skill} className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                ✓ {skill}
              </span>
            ))}
            {match.missing.slice(0, 3).map((skill: string) => (
              <span key={skill} className="bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
                ✗ {skill}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-background">
          {(placement.application_link || placement.companies?.website_url) && (
            <Button
              as="a"
              href={placement.application_link || placement.companies.website_url}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              Apply
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center p-2">
            <img src="/logo.png" alt="LandIt" className="w-full h-full object-contain" />
          </div>
          <span className="font-body text-3xl font-bold tracking-tight">LandIt</span>
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
              <Card className="text-center py-8">
                <div className="font-heading text-5xl font-bold mb-3 text-primary">{bestMatch}%</div>
                <div className="text-xs uppercase tracking-wide text-text-gray font-semibold">Best Match</div>
              </Card>
              <Card className="text-center py-8">
                <div className="font-heading text-5xl font-bold mb-3 text-secondary">{totalPlacements}</div>
                <div className="text-xs uppercase tracking-wide text-text-gray font-semibold">Total Placements</div>
              </Card>
              <Card className="text-center py-8">
                <div className="font-heading text-5xl font-bold mb-3 text-primary">{skillsCount}</div>
                <div className="text-xs uppercase tracking-wide text-text-gray font-semibold">Your Skills</div>
              </Card>
              <Card className="text-center py-8">
                <div className="font-heading text-5xl font-bold mb-3 text-secondary">0</div>
                <div className="text-xs uppercase tracking-wide text-text-gray font-semibold">Bookmarks</div>
              </Card>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="font-heading text-2xl font-bold">Top Placement Matches</h2>
              <Button onClick={recalculateMatches} size="sm">Refresh Matches</Button>
            </div>
            
            {placementsLoading ? (
              <p className="text-text-gray">Loading matches...</p>
            ) : topMatches.length === 0 ? (
              <Card>
                <p className="text-text-gray italic">No placements available yet. Upload your CV and add some skills to get started!</p>
              </Card>
            ) : (
              topMatches.map(renderPlacementCard)
            )}
          </div>
        )}

        {activeTab === 'placements' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-heading text-2xl font-bold">All Placements</h2>
              <span className="text-sm text-text-gray">{totalPlacements} open roles</span>
            </div>
            {placementsLoading ? (
              <p className="text-text-gray">Loading placements...</p>
            ) : placements.length === 0 ? (
              <Card>
                <p className="text-text-gray italic">No placements available yet. Check back soon for opportunities!</p>
              </Card>
            ) : (
              placements.map(renderPlacementCard)
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <Card title="Your Skills">
            <p className="text-text-gray mb-6">Skills are automatically extracted when you upload your CV. You can also add them manually below.</p>
            
            {skillsLoading ? (
              <p className="text-text-gray">Loading skills...</p>
            ) : skills.length === 0 ? (
              <div className="mt-8 p-8 text-center border-2 border-dashed border-secondary rounded-xl bg-background/30">
                <div className="text-4xl mb-3">💡</div>
                <p className="text-text-gray font-medium">No skills yet — upload your CV to extract them automatically.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-6">
                {skills.map((skill: any) => {
                  const levels = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert']
                  return (
                    <span key={skill.skill_id} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-full text-sm font-semibold">
                      {skill.skills?.name || skill.skill_name}
                      {skill.source === 'cv' && <span className="text-xs opacity-50">CV</span>}
                      {skill.proficiency_level && <span className="text-xs opacity-60">({levels[skill.proficiency_level]})</span>}
                      <button
                        onClick={() => handleRemoveSkill(skill.skill_id, skill.skills?.name || '')}
                        className="text-gray-500 hover:text-red-600 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            <details className="mt-6">
              <summary className="cursor-pointer font-semibold text-sm text-primary list-none flex items-center gap-2">
                + Add a skill manually
              </summary>
              <div className="mt-4 flex gap-3 flex-wrap">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Python, React, SQL..."
                  className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1">Beginner</option>
                  <option value="2">Elementary</option>
                  <option value="3">Intermediate</option>
                  <option value="4">Advanced</option>
                  <option value="5">Expert</option>
                </select>
                <Button onClick={handleAddSkill}>Add</Button>
              </div>
            </details>
          </Card>
        )}

        {activeTab === 'cv' && (
          <Card title="Your CV">
            <p className="text-text-gray mb-6">Upload your CV to automatically extract your skills and get matched with placements.</p>
            {cv && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6">
                <div className="text-4xl">📄</div>
                <div className="flex-1">
                  <div className="font-semibold">{cv.file_url.split('/').pop().split('?')[0]}</div>
                  <div className="text-xs text-text-gray mt-1">
                    Uploaded {new Date(cv.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <Button as="a" href={cv.file_url} target="_blank" size="sm" variant="secondary">
                  View
                </Button>
                <Button onClick={handleDeleteCV} size="sm" className="bg-red-100 text-red-600 hover:bg-red-200">
                  Delete
                </Button>
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-secondary rounded-2xl p-16 text-center cursor-pointer hover:border-primary hover:bg-background/50 transition-all"
            >
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-semibold text-primary mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-text-gray">PDF or DOCX — max 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploadStatus && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg">
                {uploadStatus}
              </div>
            )}
            {uploading && <p className="mt-4 text-text-gray">Uploading...</p>}
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

            {/* Editable Profile Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">First Name</label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    placeholder="First"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    placeholder="Last"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Degree Programme</label>
                <select
                  value={profileForm.degree_programme}
                  onChange={(e) => setProfileForm({ ...profileForm, degree_programme: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Not specified</option>
                  <option>BSc Computer Science</option>
                  <option>MEng Computer Science</option>
                  <option>BSc Computer Science & Mathematics</option>
                  <option>BSc Computer Science with Artificial Intelligence</option>
                  <option>BSc Computer Science for Business</option>
                  <option>BSc Software Engineering</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Year of Study</label>
                <select
                  value={profileForm.year_of_study}
                  onChange={(e) => setProfileForm({ ...profileForm, year_of_study: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Not specified</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4 / Masters</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">About Me</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Brief intro — interests, goals, experience..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    LinkedIn URL <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={profileForm.linkedin_url}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    GitHub URL <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={profileForm.github_url}
                    onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Preferred Location</label>
                <input
                  type="text"
                  value={profileForm.location_preference}
                  onChange={(e) => setProfileForm({ ...profileForm, location_preference: e.target.value })}
                  placeholder="e.g. London, Remote, Anywhere..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 items-center pt-2">
                <Button onClick={handleSaveProfile}>Save Profile</Button>
                {profileMessage && (
                  <span className={`text-sm ${
                    profileMessage.includes('Error') ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {profileMessage}
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
