import * as React from 'react';

/**
 * Roster row for a PC, NPC or monster group.
 */
export interface CharacterCardProps {
  name: React.ReactNode;
  kind?: 'PC' | 'NPC' | 'MONSTER';
  level?: number;
  /** Class or role line, e.g. "战士" */
  klass?: React.ReactNode;
  hp?: number;
  maxHp?: number;
  tempHp?: number;
  conditions?: string[];
  /** Remaining movement in feet during combat */
  speedRemaining?: number;
  activeTurn?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  actions?: React.ReactNode;
  /** Expanded body — stat grid, resource slots, feats */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function CharacterCard(props: CharacterCardProps): JSX.Element;
