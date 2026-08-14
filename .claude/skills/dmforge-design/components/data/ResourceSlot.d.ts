import * as React from 'react';

export interface ResourceSlotProps {
  name: React.ReactNode;
  value?: number;
  max?: number;
  /** Drives the reset caption: per-turn, short rest, long rest */
  resetType?: 'turn' | 'short' | 'long';
  onSpend?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  style?: React.CSSProperties;
}

export function ResourceSlot(props: ResourceSlotProps): JSX.Element;
