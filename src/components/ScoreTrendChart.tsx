import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';

type Point = { score: number; completedAt: string };

export function ScoreTrendChart({ points }: { points: Point[] }) {
  const [width, setWidth] = useState(0);
  const height = 190;
  const pad = { top: 16, right: 12, bottom: 28, left: 4 };
  const chartWidth = Math.max(width - pad.left - pad.right, 1);
  const chartHeight = height - pad.top - pad.bottom;
  const mapped = points.map((point, index) => ({
    x: pad.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
    y: pad.top + (1 - Math.min(Math.max(point.score, 0), 100) / 100) * chartHeight,
    score: point.score,
  }));
  const line = mapped.length ? `M ${mapped.map(point => `${point.x} ${point.y}`).join(' L ')}` : '';
  const area = mapped.length ? `${line} L ${mapped[mapped.length - 1].x} ${pad.top + chartHeight} L ${mapped[0].x} ${pad.top + chartHeight} Z` : '';

  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
    {width > 0 ? <Svg width={width} height={height}>
      <Defs><LinearGradient id="score-area" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#2563EB" stopOpacity="0.28" /><Stop offset="1" stopColor="#2563EB" stopOpacity="0" /></LinearGradient></Defs>
      {[0, 25, 50, 75, 100].map(value => { const y = pad.top + (1 - value / 100) * chartHeight; return <Line key={value} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#E5EDF9" strokeWidth="1" />; })}
      {area ? <Path d={area} fill="url(#score-area)" /> : null}
      {line ? <Path d={line} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {mapped.map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />)}
    </Svg> : null}
  </View>;
}
