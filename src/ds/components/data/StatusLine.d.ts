import * as React from 'react';

export interface StatusCell {
  /** Short Latin key, rendered uppercase and letterspaced, e.g. "ROUND" */
  label?: string;
  value: React.ReactNode;
  tone?: 'accent' | 'madder' | 'verdigris' | 'woad' | 'ochre';
}

export interface StatusLineProps {
  items?: StatusCell[];
  /** Right-aligned cells — sync state, save size */
  right?: StatusCell[];
  style?: React.CSSProperties;
}

export function StatusLine(props: StatusLineProps): JSX.Element;
