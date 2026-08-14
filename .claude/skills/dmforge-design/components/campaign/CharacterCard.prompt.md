The left-sidebar roster unit. Left edge carries the allegiance pigment; the whole card goes accent-soft on the active turn.

```jsx
<CharacterCard name="奥利奥 (战士)" kind="PC" level={1} klass="战士"
  hp={45} maxHp={55} tempHp={4} conditions={['重甲防护']} speedRemaining={30} activeTurn
  actions={<IconButton icon="copy" size="sm" title="快速复制此角色" />} />
```

Pass `children` for the expanded sheet (StatPill grid, ResourceSlot list, feats).
