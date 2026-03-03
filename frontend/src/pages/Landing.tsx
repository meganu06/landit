import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Modal } from '@/components/Modal'
import { Alert } from '@/components/Alert'

export default function Landing() {
  const { signIn, signUp } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'signin' | 'signup'>('signin')
  const [signupStep, setSignupStep] = useState(1)
  const [role, setRole] = useState<'student' | 'admin'>('student')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    degree_programme: '',
    year_of_study: '',
    location_preference: '',
    linkedin_url: '',
  })

  const openModal = (mode: 'signin' | 'signup', selectedRole?: 'student' | 'admin') => {
    setModalMode(mode)
    if (selectedRole) setRole(selectedRole)
    setShowModal(true)
    setError('')
    setSuccess('')
    setSignupStep(1)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(formData.email, formData.password)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(formData.email, formData.password, { ...formData, role })
      setSuccess('Account created! Please sign in.')
      setTimeout(() => {
        setModalMode('signin')
        setSuccess('')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-[#2a3e34] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-12 max-w-md w-full text-center shadow-2xl">
        <Logo className="w-32 mx-auto mb-4" />
        <h1 className="font-heading text-5xl font-bold text-primary mb-2 tracking-wide">LANDIT</h1>
        <p className="text-text-gray mb-8 leading-relaxed">
          Your AI-powered placement companion. Upload your CV, get matched to placements, and track your skill gaps.
        </p>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-background rounded-xl p-4">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-xs font-medium text-primary">Smart Matching</div>
          </div>
          <div className="bg-background rounded-xl p-4">
            <div className="text-3xl mb-2">📄</div>
            <div className="text-xs font-medium text-primary">CV Analysis</div>
          </div>
          <div className="bg-background rounded-xl p-4">
            <div className="text-3xl mb-2">🚀</div>
            <div className="text-xs font-medium text-primary">Skill Gaps</div>
          </div>
        </div>

        <p className="text-sm text-text-gray font-semibold mb-4">I am a...</p>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => openModal('signup', 'student')}
            className="border-2 border-background rounded-2xl p-6 hover:border-secondary hover:-translate-y-1 transition-all cursor-pointer bg-white"
          >
            <div className="text-4xl mb-3">🎓</div>
            <div className="font-heading font-bold text-lg text-primary">Student</div>
            <div className="text-xs text-text-gray mt-2">Find and apply for placements</div>
          </button>
          <button
            onClick={() => openModal('signup', 'admin')}
            className="border-2 border-background rounded-2xl p-6 hover:border-secondary hover:-translate-y-1 transition-all cursor-pointer bg-white"
          >
            <div className="text-4xl mb-3">🏢</div>
            <div className="font-heading font-bold text-lg text-primary">Placement Staff</div>
            <div className="text-xs text-text-gray mt-2">Manage placement opportunities</div>
          </button>
        </div>

        <Button onClick={() => openModal('signin')} size="lg" className="w-full">
          Sign In
        </Button>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'signin' ? 'Welcome Back' : role === 'admin' ? 'Create Staff Account' : 'Create Account'}
      >
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {modalMode === 'signin' ? (
          <form onSubmit={handleSignIn}>
            <p className="text-center text-text-gray mb-6">Sign in to your LandIt account</p>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@bath.ac.uk"
              required
            />
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Password"
              required
            />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-center text-text-gray text-sm mt-6">
              No account?{' '}
              <button type="button" onClick={() => setModalMode('signup')} className="text-primary font-semibold underline">
                Sign up
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={signupStep === 2 ? handleSignUp : (e) => { e.preventDefault(); setSignupStep(2) }}>
            <div className="flex gap-2 mb-6">
              <div className={`flex-1 h-1 rounded ${signupStep >= 1 ? 'bg-primary' : 'bg-background'}`} />
              <div className={`flex-1 h-1 rounded ${signupStep >= 2 ? 'bg-primary' : 'bg-background'}`} />
            </div>

            {signupStep === 1 ? (
              <>
                <p className="text-xs text-text-gray font-semibold uppercase tracking-wide mb-6">Step 1 of 2 — Account details</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
                <Input
                  label="Bath University Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@bath.ac.uk"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  required
                />
                <Button type="submit" className="w-full" size="lg">
                  Continue →
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-text-gray font-semibold uppercase tracking-wide mb-6">Step 2 of 2 — Your profile</p>
                {role === 'student' && (
                  <>
                    <Select
                      label="Degree Programme"
                      value={formData.degree_programme}
                      onChange={(e) => setFormData({ ...formData, degree_programme: e.target.value })}
                      options={[
                        { value: '', label: 'Select your degree...' },
                        { value: 'BSc Computer Science', label: 'BSc Computer Science' },
                        { value: 'MEng Computer Science', label: 'MEng Computer Science' },
                        { value: 'BSc CS & Mathematics', label: 'BSc CS & Mathematics' },
                        { value: 'BSc CS with AI', label: 'BSc CS with AI' },
                        { value: 'Other', label: 'Other' },
                      ]}
                    />
                    <Select
                      label="Year of Study"
                      value={formData.year_of_study}
                      onChange={(e) => setFormData({ ...formData, year_of_study: e.target.value })}
                      options={[
                        { value: '', label: 'Select year...' },
                        { value: '1', label: 'Year 1' },
                        { value: '2', label: 'Year 2' },
                        { value: '3', label: 'Year 3' },
                        { value: '4', label: 'Year 4 / Masters' },
                      ]}
                    />
                  </>
                )}
                <Input
                  label="Preferred Location (optional)"
                  value={formData.location_preference}
                  onChange={(e) => setFormData({ ...formData, location_preference: e.target.value })}
                  placeholder="e.g. London, Remote..."
                />
                <Input
                  label="LinkedIn URL (optional)"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
                <div className="flex gap-4">
                  <Button type="button" variant="secondary" onClick={() => setSignupStep(1)} className="flex-1">
                    ← Back
                  </Button>
                  <Button type="submit" className="flex-[2]" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </>
            )}
            <p className="text-center text-text-gray text-sm mt-6">
              Have an account?{' '}
              <button type="button" onClick={() => setModalMode('signin')} className="text-primary font-semibold underline">
                Sign in
              </button>
            </p>
          </form>
        )}
      </Modal>
    </div>
  )
}
