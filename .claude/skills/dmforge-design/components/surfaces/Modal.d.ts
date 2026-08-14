import * as React from 'react';

export interface ModalProps {
  open?: boolean;
  title?: React.ReactNode;
  icon?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  width?: number | string;
  style?: React.CSSProperties;
}

export function Modal(props: ModalProps): JSX.Element | null;
