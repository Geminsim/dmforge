import * as React from 'react';

export interface RollResultProps {
  /** The formula as typed, e.g. "2d20kh1+5" */
  formula: React.ReactNode;
  total: React.ReactNode;
  /** Per-die breakdown, e.g. "2d20kh1: [7, 18 -> Keep High: 18] = 18 (Mod: 18+5)" */
  detail?: React.ReactNode;
  time?: React.ReactNode;
  /** Latest roll — larger numeral on an accent-soft ground */
  emphasis?: boolean;
  style?: React.CSSProperties;
}

export function RollResult(props: RollResultProps): JSX.Element;
