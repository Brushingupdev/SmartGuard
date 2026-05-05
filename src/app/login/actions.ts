'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'
import { loginSchema, resetPasswordSchema, updatePasswordSchema, validated } from '@/lib/validations'
import { loginLimiter, checkRateLimit } from '@/utils/rate-limit'

export async function login(formData: FormData) {
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  const rl = await checkRateLimit(loginLimiter, ip)
  if (!rl.success) {
    return { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter} segundos.` }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const v = validated(loginSchema, { email, password })
  if (!v.ok) return { error: v.error }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: v.data.email,
    password: v.data.password,
  })

  if (error) {
    return { error: 'Correo o contraseña incorrectos.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const metaRole = user?.user_metadata?.role as string | undefined
  const isGuardia = metaRole === 'guardia'
  const isAdmin   = metaRole === 'administrador'

  revalidatePath('/', 'layout')
  redirect(isGuardia ? '/registro' : isAdmin ? '/admin' : '/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Clear session-scoped cookies
  const cookieStore = await cookies()
  cookieStore.set('sg_impersonate', '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 })
  cookieStore.set('sg_plan',        '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 })
  redirect('/login')
}

export async function resetPassword(rawEmail: unknown) {
  const v = validated(resetPasswordSchema, { email: rawEmail })
  if (!v.ok) return { success: false, error: v.error }

  const supabase = await createClient()
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(v.data.email, {
    redirectTo: `${origin}/update-password`,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updatePassword(rawPassword: unknown) {
  const v = validated(updatePasswordSchema, { password: rawPassword })
  if (!v.ok) return { success: false, error: v.error }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: v.data.password })
  if (error) return { success: false, error: error.message }
  revalidatePath('/', 'layout')
  const { data: { user } } = await supabase.auth.getUser()
  const metaRole = user?.user_metadata?.role as string | undefined
  const isGuardia = metaRole === 'guardia'
  const isAdmin   = metaRole === 'administrador'
  redirect(isGuardia ? '/registro' : isAdmin ? '/admin' : '/dashboard')
}
