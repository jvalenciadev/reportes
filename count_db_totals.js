const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('./.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.trim().split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = val;
      }
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
        if (key === 'SUPABASE_SERVICE_ROLE_KEY' || !supabaseKey) {
          supabaseKey = val;
        }
      }
    }
  }
} catch (e) {}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countTotals() {
  console.log('--- DB TOTAL COUNT CHECK ---');

  const { count: cCount, error: cErr } = await supabase
    .from('calificaciones')
    .select('*', { count: 'exact', head: true });
    
  if (cErr) console.error('Error counting calificaciones:', cErr);
  else console.log('Total calificaciones in DB:', cCount);

  const { count: aCount, error: aErr } = await supabase
    .from('asistencias')
    .select('*', { count: 'exact', head: true });
    
  if (aErr) console.error('Error counting asistencias:', aErr);
  else console.log('Total asistencias in DB:', aCount);
  
  const { count: gCount, error: gErr } = await supabase
    .from('grupos')
    .select('*', { count: 'exact', head: true });
    
  if (gErr) console.error('Error counting grupos:', gErr);
  else console.log('Total grupos in DB:', gCount);

  const { count: iCount, error: iErr } = await supabase
    .from('inscripciones')
    .select('*', { count: 'exact', head: true });
    
  if (iErr) console.error('Error counting inscripciones:', iErr);
  else console.log('Total inscripciones in DB:', iCount);
}

countTotals();
