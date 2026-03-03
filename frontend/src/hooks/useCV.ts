import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase.ts'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Set PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
}

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

      // Extract text from CV
      onProgress?.('Extracting text from your CV...')
      let extractedText = ''
      try {
        if (file.type === 'application/pdf') {
          extractedText = await extractTextFromPDF(file)
        } else {
          const arrayBuffer = await file.arrayBuffer()
          const result = await mammoth.extractRawText({ arrayBuffer })
          extractedText = result.value
        }
      } catch (e) {
        console.warn('Text extraction failed:', e)
      }

      const { error: dbErr } = await supabase.from('cv').insert({
        user_id: user.id,
        file_url: publicUrl,
        parsed_content: extractedText || null,
      })

      if (dbErr) throw dbErr

      // Extract and save skills using backend API
      if (extractedText && extractedText.length > 20) {
        await extractAndSaveSkills(extractedText, onProgress)
      } else {
        onProgress?.('CV uploaded. Could not extract text — add skills manually.')
      }

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

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: any) => item.str).join(' ') + '\n'
  }
  return text
}

async function extractAndSaveSkills(text: string, onProgress?: (status: string) => void) {
  onProgress?.('Extracting skills with AI...')
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  try {
    const res = await fetch('http://localhost:3001/api/cv/extract-skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text }),
    })

    const json = await res.json()

    if (!res.ok) {
      onProgress?.(`CV uploaded but skill extraction failed: ${json.error || 'Unknown error'}`)
      return
    }

    const skills = json.skills || []
    if (skills.length === 0) {
      onProgress?.('CV uploaded. No skills identified — you can add them manually.')
      return
    }

    onProgress?.(`CV uploaded! Found ${skills.length} skills: ${skills.map((s: any) => s.name).join(', ')}`)
  } catch (err) {
    console.error('Skill extraction error:', err)
    onProgress?.('CV uploaded. Skill extraction failed — add skills manually.')
  }
}
