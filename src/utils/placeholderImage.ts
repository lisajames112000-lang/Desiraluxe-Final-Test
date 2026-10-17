// Deterministic, product-specific local SVG illustrations.
// Used for sample catalog items so every product gets a distinct, on-brand visual
// without claiming to be verified commercial photography. Each call with the same
// inputs always returns the same image, so it stays stable across reloads.
import { hashString } from './id';

const BG_OPTIONS = ['#EDF4EF', '#FAFBF8', '#E4EEE8'];
const ACCENT_OPTIONS = ['#0B4938', '#427A65', '#06372A', '#BDA679'];
const SHAPE_OPTIONS = ['hexagon', 'circle', 'triangle', 'rounded'] as const;

function shapePath(shape: (typeof SHAPE_OPTIONS)[number], cx: number, cy: number, r: number): string {
  if (shape === 'circle') {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
  }
  if (shape === 'rounded') {
    return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.35}" />`;
  }
  if (shape === 'triangle') {
    return `<polygon points="${cx},${cy - r} ${cx + r},${cy + r * 0.85} ${cx - r},${cy + r * 0.85}" />`;
  }
  // hexagon
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `<polygon points="${pts.join(' ')}" />`;
}

function wrapName(name: string): string[] {
  const words = name.split(' ');
  const lines: string[] = [];
  let current = '';
  words.forEach((w) => {
    const next = current ? `${current} ${w}` : w;
    if (next.length > 16 && current) {
      lines.push(current);
      current = w;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export function placeholderImage(categoryName: string, productName: string, seed: string = ''): string {
  const h = hashString(`${categoryName}|${productName}|${seed}`);
  const bg = BG_OPTIONS[h % BG_OPTIONS.length];
  const accent = ACCENT_OPTIONS[(h >> 2) % ACCENT_OPTIONS.length];
  const accent2 = ACCENT_OPTIONS[(h >> 4) % ACCENT_OPTIONS.length];
  const shape = SHAPE_OPTIONS[(h >> 6) % SHAPE_OPTIONS.length];
  const size = 800;
  const lines = wrapName(productName);
  const lineHeight = 34;
  const startY = size / 2 + 150 - (lines.length - 1) * lineHeight / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}" />
    <g opacity="0.14" fill="${accent}">${shapePath(shape, size * 0.22, size * 0.24, 120)}</g>
    <g opacity="0.1" fill="${accent2}">${shapePath(SHAPE_OPTIONS[(h >> 8) % 4], size * 0.82, size * 0.78, 150)}</g>
    <g fill="${accent}" opacity="0.92">${shapePath(shape, size / 2, size / 2 - 40, 92)}</g>
    <text x="${size / 2}" y="${size / 2 - 32}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="30" fill="${bg}" font-weight="600">${categoryName.charAt(0)}</text>
    ${lines.
  map(
    (line, i) =>
    `<text x="${size / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Inter, sans-serif" font-size="26" font-weight="600" fill="#172A23">${escapeXml(line)}</text>`
  ).
  join('')}
    <text x="${size / 2}" y="${size - 44}" text-anchor="middle" font-family="Inter, sans-serif" font-size="15" letter-spacing="3" fill="#427A65" font-weight="600">SAMPLE ILLUSTRATION</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function placeholderGallery(categoryName: string, productName: string, count: number = 3): string[] {
  return Array.from({ length: count }, (_, i) => placeholderImage(categoryName, productName, `g${i}`));
}