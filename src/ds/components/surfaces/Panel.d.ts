import * as React from 'react';

/**
 * Bordered surface that frames every region of the DM console.
 */
export interface PanelProps {
  title?: React.ReactNode;
  /** Short Latin key rendered uppercase in the accent colour before the title, e.g. "ROSTER" */
  code?: string;
  /** Phosphor Fill icon name — renders in the accent colour before the title */
  icon?: string;
  /** Small mono note in the header, e.g. a count or coordinate */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** Remove body padding — for tables, map canvases and full-bleed lists */
  flush?: boolean;
  tone?: 'panel' | 'raised' | 'sunken';
  scroll?: boolean;
  /** Apply the parchment texture (visible in the grimoire theme only) */
  textured?: boolean;
  /** Corner brackets — the plate grammar's frame. Off only for nested plates. */
  brackets?: boolean;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

export function Panel(props: PanelProps): JSX.Element;
