import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase.ts'

export function useCV() {
  const [cv, setCV] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCV()
  }, [])

  async function loadCV() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('cv')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setCV(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CV')
    } finally {
      setLoading(false)
    }
  }

  async function uploadCV(file: File, onProgress?: (status: string) => void) {
    try {
      setUploading(true)
      setError(null)

      const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowed.includes(file.type)) {
        throw new Error('Only PDF and DOCX files are accepted.')
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File must be under 10 MB.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      onProgress?.('Uploading...')
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('cvs')
        .upload(path, file, { contentType: file.type })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('cvs').getPublicUrl(path)

      const { error: dbErr } = await supabase.from('cv').insert({
        user_id: user.id,
        file_url: publicUrl,
        parsed_content: null,
      })

      if (dbErr) throw dbErr

      onProgress?.('CV uploaded! You can now add skills manually.')
      await loadCV()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      throw err
    } finally {
      setUploading(false)
    }
  }

  async function deleteCV(cvId: string, fileUrl: string) {
    try {
      const urlPath = fileUrl.split('/storage/v1/object/public/cvs/')[1]
      if (urlPath) {
        await supabase.storage.from('cvs').remove([decodeURIComponent(urlPath)])
      }

      const { error } = await supabase.from('cv').delete().eq('id', cvId)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('student_skills')
          .delete()
          .eq('user_id', user.id)
          .eq('source', 'cv')
      }

      await loadCV()
      return true
    } catch (err) {
      throw err
    }
  }

  return {
    cv,
    loading,
    uploading,
    error,
    uploadCV,
    deleteCV,
    reload: loadCV
  }
}
