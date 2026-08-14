import * as React from 'react';

export interface SegmentItem { id: string; label: string; icon?: string; count?: number; title?: string }

export interface SegmentedControlProps {
  items: SegmentItem[];
  value: string;
  onChange?: (id: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
