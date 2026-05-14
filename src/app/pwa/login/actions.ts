'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { loginSchema, validated } from '@/lib/validations'
import { loginLimiter, checkRateLimit } from '@/utils/rate-limit'

export async function loginPWA(formData: FormData) {
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  const rl = await checkRateLimit(loginLimiter, ip)
  if (!rl.success) {
    return { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter} segundos.` }
  }

  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const v = validated(loginSchema, { email, password })
  if (!v.ok) return { error: v.error }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: v.data.email,
    password: v.data.password,
  })

  if (error) return { error: 'Correo o contraseña incorrectos.' }

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined

  // Si viene del setup del dispositivo (no redirect, solo retorna éxito)
  // El caller decide si redirigir o solo guardar la sesión
  return { success: true, role: role ?? 'supervisor' }
}
