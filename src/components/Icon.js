import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline, G } from 'react-native-svg';

export function Icon({
  name,
  size = 20,
  color = '#1E293B',
  strokeWidth = 2,
  style,
}) {
  const commonProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  const renderPath = () => {
    switch (name) {
      case 'card':
      case 'credit-card':
      case 'expense':
        return (
          <G {...commonProps}>
            <Rect x="2" y="5" width="20" height="14" rx="2" />
            <Line x1="2" y1="10" x2="22" y2="10" />
          </G>
        );
      case 'users':
      case 'family':
      case 'families':
        return (
          <G {...commonProps}>
            <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <Circle cx="9" cy="7" r="4" />
            <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </G>
        );
      case 'user':
      case 'friend':
      case 'member':
        return (
          <G {...commonProps}>
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Circle cx="12" cy="7" r="4" />
          </G>
        );
      case 'home':
        return (
          <G {...commonProps}>
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
          </G>
        );
      case 'scale':
      case 'settlement':
      case 'balance':
        return (
          <G {...commonProps}>
            <Line x1="12" y1="3" x2="12" y2="21" />
            <Line x1="4" y1="7" x2="20" y2="7" />
            <Path d="M4 7l-2 7h6l-2-7" />
            <Path d="M20 7l-2 7h6l-2-7" />
            <Circle cx="12" cy="20" r="1" />
          </G>
        );
      case 'sync':
      case 'refresh':
        return (
          <G {...commonProps}>
            <Path d="M21.5 2v6h-6" />
            <Path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </G>
        );
      case 'bolt':
      case 'flash':
        return (
          <G {...commonProps}>
            <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </G>
        );
      case 'plus':
      case 'add':
        return (
          <G {...commonProps}>
            <Line x1="12" y1="5" x2="12" y2="19" />
            <Line x1="5" y1="12" x2="19" y2="12" />
          </G>
        );
      case 'edit':
      case 'pencil':
        return (
          <G {...commonProps}>
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </G>
        );
      case 'trash':
      case 'delete':
        return (
          <G {...commonProps}>
            <Polyline points="3 6 5 6 21 6" />
            <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <Line x1="10" y1="11" x2="10" y2="17" />
            <Line x1="14" y1="11" x2="14" y2="17" />
          </G>
        );
      case 'copy':
      case 'clipboard':
        return (
          <G {...commonProps}>
            <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </G>
        );
      case 'check':
        return (
          <G {...commonProps}>
            <Polyline points="20 6 9 17 4 12" />
          </G>
        );
      case 'check-circle':
      case 'celebrate':
        return (
          <G {...commonProps}>
            <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <Polyline points="22 4 12 14.01 9 11.01" />
          </G>
        );
      case 'arrow-right':
        return (
          <G {...commonProps}>
            <Line x1="5" y1="12" x2="19" y2="12" />
            <Polyline points="12 5 19 12 12 19" />
          </G>
        );
      case 'qr':
        return (
          <G {...commonProps}>
            <Rect x="3" y="3" width="6" height="6" rx="1" />
            <Rect x="15" y="3" width="6" height="6" rx="1" />
            <Rect x="3" y="15" width="6" height="6" rx="1" />
            <Path d="M15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" fill={color} />
          </G>
        );
      case 'close':
      case 'x':
        return (
          <G {...commonProps}>
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
          </G>
        );
      default:
        return (
          <G {...commonProps}>
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="8" x2="12" y2="12" />
            <Line x1="12" y1="16" x2="12.01" y2="16" />
          </G>
        );
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {renderPath()}
    </Svg>
  );
}
