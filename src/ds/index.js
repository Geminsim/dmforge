/**
 * DMForge Design System — public entry.
 *
 * Import components from here, never from the files underneath: the adherence
 * config (`.claude/skills/dmforge-design/_adherence.oxlintrc.json`) treats deep
 * imports as a violation, and the barrel is what keeps the surface reviewable.
 *
 * Source of truth is the design project pulled into
 * `.claude/skills/dmforge-design/`. Do not hand-edit these components here —
 * fix them upstream and re-copy, or the next sync silently reverts the change.
 */

export { Button } from './components/actions/Button.jsx';
export { IconButton } from './components/actions/IconButton.jsx';
export { SegmentedControl } from './components/actions/SegmentedControl.jsx';
export { Tabs } from './components/actions/Tabs.jsx';
export { Toolbar, ToolbarDivider, ToolbarLabel } from './components/actions/Toolbar.jsx';

export { TextInput } from './components/forms/TextInput.jsx';
export { Select } from './components/forms/Select.jsx';
export { Checkbox } from './components/forms/Checkbox.jsx';
export { Slider } from './components/forms/Slider.jsx';

export { Panel } from './components/surfaces/Panel.jsx';
export { Modal } from './components/surfaces/Modal.jsx';
export { ResizeHandle } from './components/surfaces/ResizeHandle.jsx';
export { EmptyState } from './components/surfaces/EmptyState.jsx';

export { Badge } from './components/data/Badge.jsx';
export { StatPill } from './components/data/StatPill.jsx';
export { Meter } from './components/data/Meter.jsx';
export { ResourceSlot } from './components/data/ResourceSlot.jsx';
export { StatusDot } from './components/data/StatusDot.jsx';
export { StatusLine } from './components/data/StatusLine.jsx';

export { DiceButton } from './components/dice/DiceButton.jsx';
export { RollResult } from './components/dice/RollResult.jsx';

export { MapToken } from './components/map/MapToken.jsx';
export { TerrainChip } from './components/map/TerrainChip.jsx';

export { CharacterCard } from './components/campaign/CharacterCard.jsx';
export { ItemRow } from './components/campaign/ItemRow.jsx';
export { LogEntry } from './components/campaign/LogEntry.jsx';
export { FloatingNoteCard } from './components/campaign/FloatingNoteCard.jsx';
export { InitiativeTrack } from './components/campaign/InitiativeTrack.jsx';
export { SheetTable } from './components/campaign/SheetTable.jsx';

export { ThemeSwitcher, DMFORGE_THEMES } from './components/theme/ThemeSwitcher.jsx';
