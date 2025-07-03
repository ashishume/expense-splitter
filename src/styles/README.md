# CSS Variables & Theme System

This document explains how to use the CSS variables and theme system in the expense splitting app.

## Overview

The app uses a comprehensive CSS variables system that makes it easy to:

- Change colors, spacing, and other design tokens globally
- Switch between light and dark themes
- Maintain consistent design across all components
- Customize the app's appearance without touching component code

## File Structure

```
src/styles/
├── variables.css      # CSS variables definitions
├── components.css     # Reusable component styles
└── README.md         # This documentation
```

## CSS Variables

### Color Palette

The app includes a complete color palette with semantic naming:

#### Primary Colors

- `--color-primary-50` to `--color-primary-900`: Blue shades
- `--color-success-50` to `--color-success-900`: Green shades
- `--color-warning-50` to `--color-warning-900`: Yellow/Orange shades
- `--color-error-50` to `--color-error-900`: Red shades
- `--color-neutral-50` to `--color-neutral-900`: Gray shades
- `--color-indigo-50` to `--color-indigo-900`: Indigo shades
- `--color-purple-50` to `--color-purple-900`: Purple shades

#### Semantic Colors

- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`: Background colors
- `--text-primary`, `--text-secondary`, `--text-tertiary`: Text colors
- `--border-primary`, `--border-secondary`: Border colors
- `--btn-primary-*`, `--btn-success-*`, etc.: Button colors
- `--input-*`: Form input colors
- `--status-*`: Status indicator colors

### Spacing

- `--spacing-xs`: 0.25rem (4px)
- `--spacing-sm`: 0.5rem (8px)
- `--spacing-md`: 1rem (16px)
- `--spacing-lg`: 1.5rem (24px)
- `--spacing-xl`: 2rem (32px)
- `--spacing-2xl`: 3rem (48px)
- `--spacing-3xl`: 4rem (64px)

### Border Radius

- `--radius-sm`: 0.25rem (4px)
- `--radius-md`: 0.5rem (8px)
- `--radius-lg`: 0.75rem (12px)
- `--radius-xl`: 1rem (16px)
- `--radius-2xl`: 1.5rem (24px)
- `--radius-full`: 9999px

### Typography

- `--font-size-xs` to `--font-size-4xl`: Font sizes
- `--font-weight-normal`, `--font-weight-medium`, etc.: Font weights
- `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`: Line heights

### Shadows

- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`: Box shadows

### Transitions

- `--transition-fast`: 150ms ease
- `--transition-normal`: 200ms ease
- `--transition-slow`: 300ms ease

## Usage Examples

### In CSS

```css
.my-component {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}

.my-button {
  background-color: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: 1px solid var(--btn-primary-border);
}

.my-button:hover {
  background-color: var(--btn-primary-hover);
}
```

### In React Components

```tsx
// Using utility classes
<button className="btn btn-primary">
  Click me
</button>

// Using inline styles with CSS variables
<div style={{
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  padding: 'var(--spacing-lg)'
}}>
  Content
</div>
```

## Pre-built Component Classes

### Buttons

- `.btn`: Base button styles
- `.btn-primary`, `.btn-success`, `.btn-warning`, `.btn-error`: Button variants
- `.btn-secondary`, `.btn-ghost`: Secondary button styles
- `.btn-sm`, `.btn-lg`: Button sizes

### Forms

- `.form-input`: Styled input fields
- `.form-select`: Styled select dropdowns

### Cards

- `.card`: Card container
- `.card-header`, `.card-body`, `.card-footer`: Card sections

### Status Indicators

- `.status-success`, `.status-warning`, `.status-error`, `.status-info`: Status badges

### Utility Classes

- `.text-primary`, `.text-secondary`, etc.: Text colors
- `.bg-primary`, `.bg-secondary`, etc.: Background colors
- `.border-primary`, `.border-secondary`, etc.: Border colors
- `.shadow-sm`, `.shadow-md`, etc.: Shadows
- `.rounded-sm`, `.rounded-md`, etc.: Border radius

## Theme System

### Light Theme (Default)

The app uses a light theme by default with:

- White backgrounds
- Dark text
- Blue primary colors
- Subtle shadows and borders

### Dark Theme

To enable dark theme, add `data-theme="dark"` to the `<html>` element:

```html
<html data-theme="dark"></html>
```

### Theme Switching

Use the theme utility functions:

```tsx
import { setTheme, toggleTheme, getCurrentTheme } from "../utils/theme";

// Set specific theme
setTheme("dark");

// Toggle between themes
const newTheme = toggleTheme();

// Get current theme
const currentTheme = getCurrentTheme();
```

### Automatic Theme Detection

The app automatically detects system theme preference and applies it if no theme is saved in localStorage.

## Customization

### Changing Colors

To change the app's color scheme, modify the CSS variables in `variables.css`:

```css
:root {
  --color-primary-600: #your-color;
  --btn-primary-bg: var(--color-primary-600);
  --btn-primary-hover: var(--color-primary-700);
}
```

### Adding New Themes

To add a new theme, create a new CSS rule:

```css
[data-theme="custom"] {
  --bg-primary: #your-background;
  --text-primary: #your-text;
  /* ... other variables */
}
```

### Component-Specific Variables

For component-specific styling, create new variables:

```css
:root {
  --my-component-bg: var(--bg-secondary);
  --my-component-border: var(--border-primary);
}
```

## Best Practices

1. **Always use CSS variables** instead of hardcoded values
2. **Use semantic variable names** (e.g., `--text-primary` instead of `--color-black`)
3. **Group related variables** together in the CSS file
4. **Test both light and dark themes** when making changes
5. **Use the pre-built component classes** when possible
6. **Keep mobile responsiveness** in mind when customizing

## Browser Support

CSS variables are supported in all modern browsers:

- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 15+

For older browsers, consider using a CSS-in-JS solution or CSS custom properties polyfill.
