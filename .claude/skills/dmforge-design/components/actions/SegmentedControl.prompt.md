Dense in-panel filter or mode row — log categories, map tool modes, note colour scopes.

```jsx
<SegmentedControl value={filter} onChange={setFilter} items={[
  { id: 'ALL', label: '全部', icon: 'stack', count: 12 },
  { id: 'COMBAT', label: '战斗', icon: 'sword' },
  { id: 'ITEMS', label: '物品', icon: 'backpack' },
  { id: 'DICE', label: '掷骰', icon: 'dice-six' }
]} />
```

Sits inside a `Panel`, never as page-level navigation.
