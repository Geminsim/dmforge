import * as React from 'react';

export interface InitiativeParticipant {
  id: string;
  name: string;
  kind?: 'PC' | 'NPC' | 'MONSTER';
  initiative?: number;
}

export interface InitiativeTrackProps {
  round?: number;
  participants: InitiativeParticipant[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** End-turn / exit-combat buttons */
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function InitiativeTrack(props: InitiativeTrackProps): JSX.Element;
