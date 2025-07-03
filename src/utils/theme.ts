// Theme management utility
export type Theme = "light" | "dark";

// Theme configuration
export const themes = {
  light: {
    name: "light",
    label: "Light",
    icon: "☀️",
  },
  dark: {
    name: "dark",
    label: "Dark",
    icon: "🌙",
  },
} as const;

// Get current theme from localStorage or default to light
export const getCurrentTheme = (): Theme => {
  if (typeof window === "undefined") return "light";

  const saved = localStorage.getItem("theme") as Theme;
  if (saved && themes[saved]) return saved;

  // Check system preference
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

// Set theme and save to localStorage
export const setTheme = (theme: Theme): void => {
  if (typeof window === "undefined") return;

  // Save to localStorage
  localStorage.setItem("theme", theme);

  // Apply theme to document
  document.documentElement.setAttribute("data-theme", theme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      theme === "dark" ? "#111827" : "#ffffff"
    );
  }
};

// Initialize theme on app load
export const initializeTheme = (): void => {
  const theme = getCurrentTheme();
  setTheme(theme);

  // Listen for system theme changes
  if (typeof window !== "undefined") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          setTheme(e.matches ? "dark" : "light");
        }
      });
  }
};

// Toggle between light and dark themes
export const toggleTheme = (): Theme => {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === "light" ? "dark" : "light";
  setTheme(newTheme);
  return newTheme;
};

// Get theme colors for dynamic styling
export const getThemeColors = (theme: Theme) => {
  const colors = {
    light: {
      primary: "#3b82f6",
      background: "#ffffff",
      surface: "#f9fafb",
      text: "#111827",
      textSecondary: "#6b7280",
      border: "#e5e7eb",
    },
    dark: {
      primary: "#60a5fa",
      background: "#111827",
      surface: "#1f2937",
      text: "#ffffff",
      textSecondary: "#9ca3af",
      border: "#374151",
    },
  };

  return colors[theme];
};
