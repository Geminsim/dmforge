import * as React from 'react';

export interface MapTokenProps {
  /** PC = woad, NPC = verdigris, MONSTER = madder */
  kind?: 'PC' | 'NPC' | 'MONSTER';
  name?: string;
  /** Overrides the two-character initial */
  label?: string;
  /** Pixel diameter — one grid cell is --map-cell (40px) */
  size?: number;
  /** Whose turn it is — steady accent ring, no pulse */
  active?: boolean;
  selected?: boolean;
  /** Count badge for active conditions */
  conditions?: number;
  dimmed?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function MapToken(props: MapTokenProps): JSX.Element;
