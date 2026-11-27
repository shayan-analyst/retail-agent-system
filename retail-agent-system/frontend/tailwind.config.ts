import type { Config } from 'tailwindcss';

/**
 * Palette: "Fresh Green" (light) / "Deep Forest" (dark).
 *
 * Every colour below is a CSS variable holding an `R G B` triplet (declared in
 * app/globals.css, one set for `:root` and one for `.dark`). That lets every
 * existing utility — `bg-brand-50`, `text-ash-600`, `border-ash-200` … — flip
 * between the two themes automatically, with alpha support (`bg-brand-600/20`).
 *
 * The dark theme is a deep green, never black.
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const ramp = (prefix: string) => ({
  50: rgb(`${prefix}-50`),
  100: rgb(`${prefix}-100`),
  200: rgb(`${prefix}-200`),
  300: rgb(`${prefix}-300`),
  400: rgb(`${prefix}-400`),
  500: rgb(`${prefix}-500`),
  600: rgb(`${prefix}-600`),
  700: rgb(`${prefix}-700`),
  800: rgb(`${prefix}-800`),
  900: rgb(`${prefix}-900`),
  950: rgb(`${prefix}-950`),
});

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: ramp('brand'),
        ash: ramp('ash'),
        surface: rgb('surface'),
      },
      boxShadow: {
        glass: '0 1px 2px rgb(var(--shadow) / 0.06), 0 12px 32px -16px rgb(var(--shadow) / 0.28)',
        glow: '0 1px 2px rgb(var(--shadow) / 0.14), 0 6px 14px -6px rgb(var(--brand-600) / 0.4)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
