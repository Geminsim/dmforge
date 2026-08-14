import * as React from 'react';

export interface FloatingNoteCardProps {
  title?: React.ReactNode;
  content?: React.ReactNode;
  /** Category marker colour */
  tone?: 'madder' | 'verdigris' | 'woad' | 'ochre' | 'accent';
  minimized?: boolean;
  width?: number;
  height?: number;
  onClose?: () => void;
  onToggle?: () => void;
  onToneChange?: (tone: string) => void;
  style?: React.CSSProperties;
}

export function FloatingNoteCard(props: FloatingNoteCardProps): JSX.Element;
