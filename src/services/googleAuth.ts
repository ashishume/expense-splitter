// Google OAuth Service with One Tap integration
import { GOOGLE_OAUTH_CONFIG } from "../config/googleOAuth";

// Extend the Window interface to include Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
          storeCredential: (credential: any, callback?: () => void) => void;
          cancel: () => void;
          onGoogleLibraryLoad: () => void;
          revoke: (email: string, callback?: () => void) => void;
        };
      };
    };
  }
}

export interface GoogleUser {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

export interface GoogleAuthConfig {
  clientId: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

class GoogleAuthService {
  private clientId: string;
  private isInitialized = false;
  private oneTapPromptShown = false;

  constructor() {
    this.clientId = GOOGLE_OAUTH_CONFIG.CLIENT_ID;
  }

  // Initialize Google Identity Services
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Wait for Google Identity Services to load
      if (window.google?.accounts?.id) {
        this.setupGoogleAuth();
        resolve();
      } else {
        // Set up a listener for when Google Identity Services loads
        window.addEventListener("load", () => {
          if (window.google?.accounts?.id) {
            this.setupGoogleAuth();
            resolve();
          } else {
            // Fallback: try again after a short delay
            setTimeout(() => {
              if (window.google?.accounts?.id) {
                this.setupGoogleAuth();
                resolve();
              } else {
                reject(new Error("Google Identity Services failed to load"));
              }
            }, 1000);
          }
        });
      }
    });
  }

  private setupGoogleAuth(): void {
    if (!window.google?.accounts?.id) {
      throw new Error("Google Identity Services not available");
    }

    window.google.accounts.id.initialize({
      client_id: this.clientId,
      callback: this.handleCredentialResponse.bind(this),
      ...GOOGLE_OAUTH_CONFIG.ONE_TAP_CONFIG,
    });

    this.isInitialized = true;
  }

  // Handle the credential response from Google
  private handleCredentialResponse(response: { credential: string }): void {
    try {
      const user = this.decodeJwtResponse(response.credential);
      // Emit a custom event with the user data
      window.dispatchEvent(
        new CustomEvent("googleAuthSuccess", {
          detail: { user, credential: response.credential },
        })
      );
    } catch (error) {
      console.error("Error handling credential response:", error);
      window.dispatchEvent(
        new CustomEvent("googleAuthError", {
          detail: { error },
        })
      );
    }
  }

  // Decode JWT response from Google
  private decodeJwtResponse(token: string): GoogleUser {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  }

  // Show One Tap prompt
  async showOneTap(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.oneTapPromptShown) {
      return;
    }

    try {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("One Tap prompt not displayed or skipped");
        }
      });
      this.oneTapPromptShown = true;
    } catch (error) {
      console.error("Error showing One Tap prompt:", error);
    }
  }

  // Render Google Sign-In button
  async renderButton(element: HTMLElement, config?: any): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      window.google.accounts.id.renderButton(element, {
        ...GOOGLE_OAUTH_CONFIG.BUTTON_CONFIG,
        ...config,
      });
    } catch (error) {
      console.error("Error rendering Google button:", error);
    }
  }

  // Sign out
  signOut(): void {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  // Cancel One Tap
  cancelOneTap(): void {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }
  }
}

// Create and export a singleton instance
export const googleAuthService = new GoogleAuthService();

// Export the class for testing purposes
export { GoogleAuthService };
