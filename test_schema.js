const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mrozcvhpwpgsfsipelmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb3pjdmhwd3Bnc2ZzaXBlbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTI0NzgsImV4cCI6MjA5MDU2ODQ3OH0.PIXUEJVN9RMhYCA9-xgfyfswdQIMMVqu1QUG2Gcje3A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  // Check students columns
  const { data: students, error: err1 } = await supabase.from('students').select('*').limit(1);
  console.log('Students:', students, err1);

  // Check patients columns
  const { data: patients, error: err2 } = await supabase.from('patients').select('*').limit(1);
  console.log('Patients:', patients, err2);
  
  // Try to insert a dummy row into students? Can't bypass RLS easily unless we sign up a user or use service role key
}

test();
