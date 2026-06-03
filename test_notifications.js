const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mrozcvhpwpgsfsipelmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb3pjdmhwd3Bnc2ZzaXBlbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTI0NzgsImV4cCI6MjA5MDU2ODQ3OH0.PIXUEJVN9RMhYCA9-xgfyfswdQIMMVqu1QUG2Gcje3A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { error } = await supabase.from('notifications').insert({
    id: Date.now().toString(),
    user_id: '94b4e4b2-33db-477e-8d6e-95aef8c587da',
    tipo: 'test',
    titulo: 'test',
    mensaje: 'test'
  });
  console.log('Insert error:', error);
}

test();
