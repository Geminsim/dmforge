Item-hub list row: name, category badge, quantity, rules text, holder. Row actions fade up on hover.

```jsx
<ItemRow name="远古圣水" category="消耗品" quantity={3} owner="世界物品池"
  description="饮用后回复20点生命，并对不死生物产生5d6的真实灼烧伤害。"
  actions={<><IconButton icon="hand-arrow-down" size="sm" title="消耗1个物品" /><IconButton icon="trash" size="sm" tone="danger" title="彻底删除物品" /></>} />
```
