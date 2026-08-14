import * as React from 'react';

export interface EmptyStateProps {
  icon?: string;
  text: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  style?: React.CSSProperties;
}

export function EmptyState(props: EmptyStateProps): JSX.Element;
