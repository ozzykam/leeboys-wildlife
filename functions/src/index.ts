/**
 * Firebase Cloud Functions for LeeBoy's Wildlife Removal
 */

import {onCall, CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
initializeApp();

const auth = getAuth();
const db = getFirestore();

/**
 * Set custom claims for admin users
 * Only callable by existing admin users
 */
export const setAdminClaim = onCall(async (request: CallableRequest) => {
  // Check if the calling user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if the calling user is already an admin
  const callerRecord = await auth.getUser(request.auth.uid);
  const isCallerAdmin = callerRecord.customClaims?.["admin"] === true;

  if (!isCallerAdmin) {
    const msg = "Only admin users can set admin claims";
    throw new HttpsError("permission-denied", msg);
  }

  const {uid, isAdmin} = request.data;

  if (!uid || typeof isAdmin !== "boolean") {
    const msg = "Invalid uid or isAdmin parameter";
    throw new HttpsError("invalid-argument", msg);
  }

  try {
    // Set the custom claim
    await auth.setCustomUserClaims(uid, {admin: isAdmin});

    // Update the user document in Firestore
    await db.collection("users").doc(uid).update({
      role: isAdmin ? "admin" : "user",
      updatedAt: new Date(),
    });

    const action = isAdmin ? "granted" : "removed";
    logger.info(`Admin claim ${action} for user: ${uid}`);

    const message = `Admin privileges ${isAdmin ?
      "granted to" : "removed from"} user ${uid}`;
    return {
      success: true,
      message,
    };
  } catch (error) {
    logger.error("Error setting admin claim:", error);
    throw new HttpsError("internal", "Failed to update admin privileges");
  }
});

/**
 * Initialize first admin user
 * This is a one-time function to create the first admin
 * Should be called manually and then disabled/removed
 */
export const initializeFirstAdmin = onCall(async (
  request: CallableRequest
) => {
  const {email} = request.data;

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required");
  }

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);

    // Set admin claim
    await auth.setCustomUserClaims(userRecord.uid, {admin: true});

    // Update Firestore document
    await db.collection("users").doc(userRecord.uid).update({
      role: "admin",
      updatedAt: new Date(),
    });

    logger.info(`First admin initialized for user: ${userRecord.uid}`);

    return {
      success: true,
      message: `Admin privileges granted to ${email}`,
    };
  } catch (error) {
    logger.error("Error initializing first admin:", error);
    throw new HttpsError("internal", "Failed to initialize admin");
  }
});

/**
 * Auto-create user profile when user signs up
 */
export const createUserProfile = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const userData = event.data?.data();

    if (!userData) {
      logger.error("No user data found for user:", userId);
      return;
    }

    logger.info(`User profile created for: ${userId}`, userData);

    // We will add additional logic here like:
    // - Send welcome email
  }
);
