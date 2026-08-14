Single-choice picker for closed sets — item category, owner, terrain colour, hit dice.

```jsx
<Select label="归属" value={owner} onChange={e => setOwner(e.target.value)} options={[
  { value: 'WORLD', label: '世界物品池' },
  { value: 'char_player_a', label: '奥利奥 (战士)' }
]} />
```
