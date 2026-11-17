import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#17352C', navy: '#0B4938', teal: '#177653', mist: '#F3F8F4' }, boxShadow: { soft: '0 18px 50px rgba(16,42,67,.08)' } } }, plugins: [] } satisfies Config;
