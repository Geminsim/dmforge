import * as React from 'react';

export interface ToolbarProps {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'between';
  dense?: boolean;
  /** Recessed strip treatment — use for map tool rows inside the canvas frame */
  sunken?: boolean;
  wrap?: boolean;
  style?: React.CSSProperties;
}

export function Toolbar(props: ToolbarProps): JSX.Element;
export function ToolbarDivider(): JSX.Element;
export function ToolbarLabel(props: { children?: React.ReactNode }): JSX.Element;
