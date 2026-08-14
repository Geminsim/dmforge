import * as React from 'react';

export interface StatusDotProps {
  state?: 'synced' | 'local' | 'error' | 'idle';
  label?: React.ReactNode;
  mono?: boolean;
  style?: React.CSSProperties;
}

export function StatusDot(props: StatusDotProps): JSX.Element;
