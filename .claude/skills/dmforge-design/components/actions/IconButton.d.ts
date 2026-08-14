import * as React from 'react';

export interface IconButtonProps {
  /** Phosphor Fill icon name without prefix */
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'muted' | 'accent' | 'danger';
  /** Toggle state — renders the accent-soft pressed treatment */
  active?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Always supply — these buttons are icon-only */
  title?: string;
  shape?: 'square' | 'circle';
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
