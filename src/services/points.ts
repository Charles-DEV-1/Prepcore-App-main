export const RANKS = [
  { name: 'Beginner', emoji: 'B', min: 0, color: '#64748B' },
  { name: 'Studious', emoji: 'S', min: 100, color: '#185FA5' },
  { name: 'Sharp', emoji: 'SH', min: 300, color: '#D97706' },
  { name: 'Genius', emoji: 'G', min: 600, color: '#7C3AED' },
  { name: 'Legend', emoji: 'L', min: 1000, color: '#DC2626' }
];

export function getRankInfo(points: number) {
  const rank = [...RANKS].reverse().find(item => points >= item.min) ?? RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];
  const progress = nextRank
    ? Math.round(((points - rank.min) / (nextRank.min - rank.min)) * 100)
    : 100;

  return { ...rank, nextRank, progress, points };
}
