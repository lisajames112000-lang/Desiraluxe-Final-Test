import { createTheme, type MantineColorsTuple } from '@mantine/core';

const emerald: MantineColorsTuple = [
'#EDF4EF',
'#D7E6DE',
'#B9D2C4',
'#93B9A6',
'#6B9D86',
'#427A65',
'#2E6350',
'#1B5342',
'#0B4938',
'#06372A'];


const champagne: MantineColorsTuple = [
'#FAF6EE',
'#F3EADB',
'#E9DCC0',
'#DECCA5',
'#D3BD8C',
'#BDA679',
'#A68F63',
'#8C7750',
'#726140',
'#584B31'];


export const theme = createTheme({
  primaryColor: 'emerald',
  primaryShade: 8,
  colors: { emerald, champagne },
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  headings: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontWeight: '600'
  },
  defaultRadius: 'lg',
  shadows: {
    sm: '0 2px 12px rgba(23,42,35,0.06)',
    md: '0 8px 30px rgba(11,73,56,0.08)',
    lg: '0 16px 40px rgba(11,73,56,0.14)'
  },
  components: {
    Button: {
      defaultProps: { radius: 'xl' }
    },
    Badge: {
      defaultProps: { radius: 'sm' }
    }
  }
});