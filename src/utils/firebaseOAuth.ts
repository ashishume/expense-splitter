// Firebase OAuth Client ID Extractor
// This utility helps extract the correct OAuth Client ID from Firebase configuration

// import { firebaseConfig } from "../firebase";

/**
 * Get the Firebase OAuth Client ID for the current project
 * The Client ID is derived from the Firebase project configuration
 */
export const getFirebaseOAuthClientId = (): string => {
  // Firebase project number from your config

  // This is a placeholder - you need to get the actual Client ID from Firebase Console
  // The format should be: {projectNumber}-{randomString}.apps.googleusercontent.com
  const placeholderClientId = `641959779564-upqttek7msqkfmfoi6taa7d5uatjljvf.apps.googleusercontent.com`;

  return placeholderClientId;
};

/**
 * Validate OAuth Client ID format
 */
export const validateOAuthClientId = (clientId: string): boolean => {
  const pattern = /^641959779564-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;
  return pattern.test(clientId);
};

/**
 * Get OAuth Client ID with validation
 */
export const getValidatedOAuthClientId = (): string => {
  const clientId = getFirebaseOAuthClientId();

  if (!validateOAuthClientId(clientId)) {
    console.error("❌ Invalid OAuth Client ID format.");
  }

  return clientId;
};
