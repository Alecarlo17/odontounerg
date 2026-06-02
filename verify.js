const db = require('./config/database');
const requestController = require('./controllers/requestController');
const authController = require('./controllers/authController');
const patientController = require('./controllers/patientController');

async function testAll() {
  console.log('--- STARTING TESTS ---');

  // 1. Get available patients
  console.log('1. Testing getAvailablePatients...');
  const patients = await require('./models/patients').getAvailablePatients();
  console.log('Available patients count:', patients.length);

  // 2. Test Get Profile
  console.log('2. Testing user profile fetching...');
  const prof = await require('./models/users').getProfileById('std-1');
  console.log('Profile std-1:', prof ? 'OK' : 'FAIL');

  // 3. Test Student Requests
  console.log('3. Testing getStudentRequests...');
  const reqs = await require('./models/requests').getStudentRequests('std-1', null);
  console.log('Requests count:', reqs.length);

  // 4. Test Appointments
  console.log('4. Testing getAppointmentsByUser...');
  const apps = await require('./models/appointments').getAppointmentsByUser('std-1', null);
  console.log('Appointments count:', apps.length);

  console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

testAll().catch(e => {
  console.error(e);
  process.exit(1);
});
