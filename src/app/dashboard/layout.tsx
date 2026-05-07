import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch profile to get role and name
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles(name)')
    .eq('id', user.id)
    .single()

  return (
    <div className="dashboard-layout" suppressHydrationWarning>
      <Sidebar 
        role={(profile as any)?.roles?.name} 
        departamentoId={(profile as any)?.departamento_id}
      />
      <main className="content" suppressHydrationWarning>
        <Navbar profile={profile} />
        {children}
      </main>
    </div>
  )
}
