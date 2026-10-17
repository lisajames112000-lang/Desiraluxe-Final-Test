export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        emerald: {
          deep: '#0B4938',
          forest: '#06372A',
          muted: '#427A65',
        },
        sage: '#EDF4EF',
        warmwhite: '#FAFBF8',
        ink: '#172A23',
        line: '#DBE6DF',
        champagne: '#BDA679',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(11,73,56,0.08)',
        card: '0 2px 16px rgba(23,42,35,0.07)',
        lift: '0 16px 40px rgba(11,73,56,0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
    },
  },
  plugins: [],
}
