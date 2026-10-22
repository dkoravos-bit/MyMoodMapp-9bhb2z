/**
 * Cross-platform slider. Native uses @react-native-community/slider; web uses a
 * real <input type="range"> (the community slider's web build calls findDOMNode,
 * which React 19 removed).
 */
import React from 'react';
import { Platform, View } from 'react-native';
import CommunitySlider from '@react-native-community/slider';

type Props = {
  value: number; min?: number; max?: number; color: string; label: string;
  onChange: (v: number) => void; onDone?: () => void;
};

export function Slider({ value, min = 0, max = 100, color, label, onChange, onDone }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, height: 40, justifyContent: 'center' }}>
        {React.createElement('input', {
          type: 'range', min, max, step: 1, value, 'aria-label': label,
          onChange: (e: any) => onChange(Number(e.target.value)),
          onMouseUp: onDone, onTouchEnd: onDone,
          style: { width: '100%', accentColor: color, height: 28, margin: 0, cursor: 'pointer' },
        })}
      </View>
    );
  }
  return (
    <CommunitySlider
      style={{ flex: 1, height: 40 }}
      minimumValue={min} maximumValue={max} step={1} value={value}
      onValueChange={(x: number) => onChange(Math.round(x))}
      onSlidingComplete={onDone}
      minimumTrackTintColor={color} maximumTrackTintColor="rgba(255,255,255,0.14)" thumbTintColor="#F4F1EA"
      accessibilityLabel={label}
    />
  );
}
