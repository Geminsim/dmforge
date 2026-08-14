import * as React from 'react';

export interface StatPillProps {
  label: React.ReactNode;
  /** Always a mono numeral — ability score, modifier, speed, AC */
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Short Latin key after the label, e.g. "STR" */
  code?: string;
  /** leader = dotted-rule row (default), plate = boxed row */
  variant?: 'leader' | 'plate';
  tone?: 'accent' | 'neutral' | 'madder' | 'woad';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function StatPill(props: StatPillProps): JSX.Element;
