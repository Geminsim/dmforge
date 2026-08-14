import * as React from 'react';

export interface SliderProps {
  label?: React.ReactNode;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Custom read-out, e.g. v => Math.round(v * 100) + '%' */
  format?: (value: number) => string;
  suffix?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Slider(props: SliderProps): JSX.Element;
