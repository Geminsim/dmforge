import * as React from 'react';

export interface ButtonProps {
  /** primary = accent fill, secondary = raised surface, ghost = bare, danger = madder-tinted */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Phosphor Fill icon name without prefix, e.g. "dice-six" */
  icon?: string;
  iconRight?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
