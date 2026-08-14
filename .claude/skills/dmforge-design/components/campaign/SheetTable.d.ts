import * as React from 'react';

export interface SheetTableProps {
  /** Header labels — usually the spreadsheet's first row */
  columns?: React.ReactNode[];
  /** Cell matrix; numeric-looking cells auto-align right in mono */
  rows?: (string | number)[][];
  /** Search term to highlight in every cell */
  highlight?: string;
  /** Matches the app's adjustable sheet font size (default 14px there) */
  fontSize?: number;
  maxHeight?: number | string;
  style?: React.CSSProperties;
}

export function SheetTable(props: SheetTableProps): JSX.Element;
