// Google OAuth Configuration

export const GOOGLE_OAUTH_CONFIG = {
  // Get the OAuth Client ID from Firebase project
  // This will use the correct Client ID for your Firebase project (641959779564)
  CLIENT_ID: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,

  // Optional: Configure One Tap settings
  ONE_TAP_CONFIG: {
    auto_select: false,
    cancel_on_tap_outside: false,
  },

  // Optional: Configure button appearance
  BUTTON_CONFIG: {
    theme: "filled_blue", // Use the modern filled blue theme
    size: "large",
    text: "continue_with",
    shape: "pill", // Rounded pill shape for a modern look
    logo_alignment: "left",
    width: "100%",
  },
};
