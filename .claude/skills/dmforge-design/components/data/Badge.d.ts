import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Pigment semantics: madder = danger/monster, verdigris = NPC/poison, woad = PC/cold, ochre = trap/warning */
  tone?: 'neutral' | 'accent' | 'madder' | 'verdigris' | 'woad' | 'ochre';
  variant?: 'soft' | 'solid' | 'outline';
  icon?: string;
  mono?: boolean;
  size?: 'sm' | 'md';
  /** Renders a clear affordance — used for removable conditions */
  onRemove?: () => void;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
