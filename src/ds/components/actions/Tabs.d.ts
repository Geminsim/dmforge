import * as React from 'react';

export interface TabItem { id: string; label: string; icon?: string }

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}

export function Tabs(props: TabsProps): JSX.Element;
