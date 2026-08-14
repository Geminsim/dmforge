import * as React from 'react';

export interface TextInputProps {
  label?: string;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Mono field — use for dice formulas, coordinates, HP, any number the DM reads aloud */
  mono?: boolean;
  size?: 'sm' | 'md';
  icon?: string;
  suffix?: React.ReactNode;
  hint?: string;
  invalid?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
  type?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export function TextInput(props: TextInputProps): JSX.Element;
