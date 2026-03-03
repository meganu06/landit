import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase.ts'

export function useSkills() {
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSkills()
  }, [])

  async function loadSkills() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from('student_skills')
        .select('*, skills(name, category)')
        .eq('user_id', user.id)

      if (fetchError) throw fetchError
      setSkills(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  async function addSkill(skillName: string, proficiencyLevel: number = 3) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let skillId: string
      const { data: existing } = await supabase
        .from('skills')
        .select('id')
        .ilike('name', skillName)
        .limit(1)
        .maybeSingle()

      if (existing) {
        skillId = existing.id
      } else {
        const { data: newSkill, error: createErr } = await supabase
          .from('skills')
          .insert({ name: skillName, category: 'General' })
          .select('id')
          .single()
        if (createErr) throw createErr
        skillId = newSkill.id
      }

      const { error } = await supabase.from('student_skills').upsert(
        { 
          user_id: user.id, 
          skill_id: skillId, 
          proficiency_level: proficiencyLevel, 
          source: 'manual' 
        },
        { onConflict: 'user_id,skill_id' }
      )

      if (error) throw error
      await loadSkills()
      return true
    } catch (err) {
      throw err
    }
  }

  async function removeSkill(skillId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('student_skills').delete()
        .eq('user_id', user.id)
        .eq('skill_id', skillId)

      if (error) throw error
      await loadSkills()
      return true
    } catch (err) {
      throw err
    }
  }

  return {
    skills,
    loading,
    error,
    addSkill,
    removeSkill,
    reload: loadSkills
  }
}
