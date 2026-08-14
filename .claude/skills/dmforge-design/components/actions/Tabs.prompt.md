Primary view switcher across the top of the workspace column (tactical map / item hub / sheet import).

```jsx
<Tabs value={tab} onChange={setTab} items={[
  { id: 'map', label: '1ft 战术地图', icon: 'map-trifold' },
  { id: 'items', label: '物品流转中心', icon: 'backpack' },
  { id: 'excel', label: '玩家卡与规则书', icon: 'table' }
]} />
```

One row per workspace. For dense in-panel filtering use `SegmentedControl` instead.
