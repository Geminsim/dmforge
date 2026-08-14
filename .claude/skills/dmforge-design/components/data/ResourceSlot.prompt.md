Countable character resource — action, bonus action, spell slots, charges. Shows pips up to 8, then a mono fraction.

```jsx
<ResourceSlot name="动作" value={1} max={1} resetType="turn" onSpend={spend} onRestore={restore} />
<ResourceSlot name="法术位 (1环)" value={2} max={4} resetType="long" onDelete={remove} />
```
