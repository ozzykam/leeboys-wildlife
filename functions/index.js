const {onCall} = require("firebase-functions/v2/https");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set admin claim for a user
exports.setAdminClaim = onCall(async (request) => {
  const {uid, isAdmin} = request.data;
  const callerUid = request.auth?.uid;

  // Verify that the caller is authenticated
  if (!callerUid) {
    throw new Error("Authentication required");
  }

  try {
    // Check if the caller is an admin
    const callerToken = await getAuth().getUser(callerUid);
    const callerClaims = callerToken.customClaims || {};
    
    if (!callerClaims.admin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Set the custom claim
    await getAuth().setCustomUserClaims(uid, {admin: isAdmin});
    
    // Update the user role in Firestore
    const db = getFirestore();
    await db.collection('users').doc(uid).update({
      role: isAdmin ? 'admin' : 'user',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Admin claim ${isAdmin ? 'granted' : 'revoked'} for user ${uid} by ${callerUid}`);
    
    return {
      success: true,
      message: `User ${isAdmin ? 'promoted to' : 'demoted from'} admin successfully`,
      uid: uid,
      isAdmin: isAdmin
    };
  } catch (error) {
    logger.error('Error setting admin claim:', error);
    throw new Error(`Failed to update admin status: ${error.message}`);
  }
});

// Initialize first admin (one-time use)
exports.initializeFirstAdmin = onCall(async (request) => {
  const {email} = request.data;

  if (!email) {
    throw new Error("Email is required");
  }

  try {
    // Get user by email
    const userRecord = await getAuth().getUserByEmail(email);
    
    // Set admin claim
    await getAuth().setCustomUserClaims(userRecord.uid, {admin: true});
    
    // Update user role in Firestore
    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`First admin initialized for user ${userRecord.uid} (${email})`);
    
    return {
      success: true,
      message: `First admin successfully initialized for ${email}`,
      uid: userRecord.uid
    };
  } catch (error) {
    logger.error('Error initializing first admin:', error);
    throw new Error(`Failed to initialize admin: ${error.message}`);
  }
});
