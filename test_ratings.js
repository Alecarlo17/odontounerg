const db = require('./config/database');

async function test() {
  const { error } = await db.supabase.from('ratings').insert({
    patient_id: '94b4e4b2-33db-477e-8d6e-95aef8c587da',
    score: 5,
    comment: 'test'
  });
  console.log('Insert error:', error);
}

test();
