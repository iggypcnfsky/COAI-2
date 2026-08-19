export function generatePlaceholderImage(name: string, size = 200): string {
  const initials = name
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CO';
  const colors = [
    '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#6366F1', '#84CC16', '#F97316', '#14B8A6',
  ];
  const bgColor = colors[name.charCodeAt(0) % colors.length];
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${bgColor}"/>
      <text x="${size / 2}" y="${size / 2 + 10}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.3)}" font-weight="bold">${initials}</text>
    </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function generateTeamPlaceholderImage(teamName: string): string {
  return generatePlaceholderImage(teamName, 400);
}
