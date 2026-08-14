import * as React from 'react';

export interface SelectOption { value: string; label: string }

export interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  size?: 'sm' | 'md';
  hint?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function Select(props: SelectProps): JSX.Element;
