import * as React from 'react';

export interface ThemeOption { id: string; label: string; swatch: string; bg: string }

export interface ThemeSwitcherProps {
  value?: string;
  onChange?: (id: string) => void;
  themes?: ThemeOption[];
  compact?: boolean;
  style?: React.CSSProperties;
}

export const DMFORGE_THEMES: ThemeOption[];
export function ThemeSwitcher(props: ThemeSwitcherProps): JSX.Element;
