import * as React from 'react';

export interface ResizeHandleProps {
  orientation?: 'vertical' | 'horizontal';
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: string;
}

export function ResizeHandle(props: ResizeHandleProps): JSX.Element;
