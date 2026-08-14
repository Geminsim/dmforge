import * as React from 'react';

export interface ItemRowProps {
  name: React.ReactNode;
  /** Chinese category label — 武器 / 消耗品 / 护甲 / 法器 / 杂物 map to pigments */
  category?: string;
  quantity?: number;
  description?: React.ReactNode;
  /** Display name of the holder, or 世界物品池 for unowned */
  owner?: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function ItemRow(props: ItemRowProps): JSX.Element;
