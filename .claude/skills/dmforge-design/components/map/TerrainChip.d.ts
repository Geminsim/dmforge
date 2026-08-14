import * as React from 'react';

export interface TerrainChipProps {
  name: React.ReactNode;
  shape?: 'rect' | 'circle';
  tone?: 'madder' | 'verdigris' | 'woad' | 'ochre' | 'accent';
  /** DM-only area — swatch goes dashed and translucent */
  secret?: boolean;
  /** Impassable terrain */
  blocked?: boolean;
  /** Mono footnote, e.g. "8×4" or "r5" */
  meta?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function TerrainChip(props: TerrainChipProps): JSX.Element;
