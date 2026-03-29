/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Yeni açık tema renkleri
        'bg-primary': '#F8F9FC',
        'bg-surface': '#FFFFFF',
        'bg-sidebar': '#FFFFFF',
        'border': '#E5E7EB',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'accent': '#E94560',
        'accent-hover': '#C73652',
        'success': '#10B981',
        'warning': '#F59E0B',
        'danger': '#EF4444',
        
        // Tailwind renklerini değiştir
        background: '#F8F9FC',
        surface: '#FFFFFF',
        text: '#111827',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        accent: '#E94560',
        surfaceHover: '#F9FAFB',
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06)',
        'header': '0 1px 3px rgba(0,0,0,0.08)',
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
