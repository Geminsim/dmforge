import * as React from 'react';

export interface MeterProps {
  value?: number;
  max?: number;
  /** Temporary HP — drawn as a woad segment after the main fill */
  temp?: number;
  /** auto grades verdigris → ochre → madder as the value drops */
  tone?: 'auto' | 'accent' | 'madder' | 'verdigris' | 'woad' | 'ochre';
  label?: React.ReactNode;
  showNumbers?: boolean;
  /** Number of blocks in the bar — 13 by default */
  segments?: number;
  height?: number;
  style?: React.CSSProperties;
}

export function Meter(props: MeterProps): JSX.Element;
