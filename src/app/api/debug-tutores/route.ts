import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const deptoName = searchParams.get('depto') || 'CHUQUISACA'
  const moduleTitle = searchParams.get('modulo') || ''

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Get depto ID
    const { data: depto } = await supabase
      .from('departamentos')
      .select('*')
      .eq('name', deptoName)
      .single()

    if (!depto) {
      return NextResponse.json({ error: `Departamento "${deptoName}" no encontrado.` })
    }

    // 2. Get groups
    const { data: groups } = await supabase
      .from('grupos')
      .select('*')
      .eq('departamento_id', depto.id)

    const groupIds = groups?.map((g: any) => g.id) || []

    if (groupIds.length === 0) {
      return NextResponse.json({
        depto,
        groupsCount: 0,
        message: 'No hay grupos en este departamento'
      })
    }

    // 3. Fetch tutors links
    const { data: links, error: pErr } = await supabase
      .from('tutor_grupos')
      .select('grupo_id, grupos(name), profiles(id, nombre, apellidos, ci, correo, email)')
      .in('grupo_id', groupIds)

    return NextResponse.json({
      depto,
      groups: groups?.map((g: any) => ({ id: g.id, name: g.name })) || [],
      groupIds,
      linksCount: links?.length || 0,
      linksError: pErr ? pErr.message : null,
      links: links || []
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}
