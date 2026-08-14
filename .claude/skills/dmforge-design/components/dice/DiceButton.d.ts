import * as React from 'react';

export interface DiceButtonProps {
  /** Die size — the app offers 4, 6, 8, 10, 12, 20, 100 */
  sides: number;
  onClick?: () => void;
  size?: 'sm' | 'md';
  title?: string;
  style?: React.CSSProperties;
}

export function DiceButton(props: DiceButtonProps): JSX.Element;
