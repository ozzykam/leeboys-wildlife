const admin = require('firebase-admin');
const path = require('path');

// Replace 'path-to-your-service-account-key.json' with the actual path to your downloaded JSON file
const serviceAccount = require('');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'leeboys-wildlife-removal'
});

const auth = admin.auth();
const db = admin.firestore();

async function createFirstAdmin(email) {
  try {
    console.log(`Setting up admin for: ${email}`);
    
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid}`);
    
    // Set custom claim
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    console.log('✓ Custom claim set');
    
    // Create/Update Firestore document
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || userRecord.email.split('@')[0],
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    console.log('✓ Firestore document created/updated');
    
    console.log(`🎉 Successfully made ${email} an admin!`);
    console.log('You can now log out and log back in to see admin access.');
    
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log(`\n❌ User ${email} not found.`);
      console.log('Make sure to sign up on your website first: http://localhost:4200/signup');
    }
  }
}

// Replace with your actual email
const EMAIL = 'ozzykam@gmail.com';

createFirstAdmin(EMAIL).then(() => {
  console.log('\nScript completed. You can delete this file now.');
  process.exit(0);
});