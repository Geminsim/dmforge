import * as React from 'react';

export interface LogEntryProps {
  type?: 'SYSTEM' | 'COMBAT' | 'ITEMS' | 'DICE';
  /** Supports **bold** spans, which render in mono — that is where the numbers live */
  content?: string;
  /** Local time string, e.g. "20:56:01" */
  timestamp?: string;
  style?: React.CSSProperties;
}

export function LogEntry(props: LogEntryProps): JSX.Element;
