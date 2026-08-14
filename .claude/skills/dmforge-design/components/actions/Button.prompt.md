Standard DMForge action button — use for every committed action (roll, add, save, end turn); never restyle a div into a button.

```jsx
<Button icon="dice-six" onClick={roll}>投掷</Button>
<Button variant="secondary" size="sm" icon="plus">新建地图</Button>
<Button variant="danger" size="sm" icon="trash">清空记录</Button>
<Button variant="ghost" size="sm" icon="eye">隐藏</Button>
```

Variants: `primary` (one per panel, the accent fill), `secondary` (most toolbar actions), `ghost` (row-level, low weight), `danger` (destructive — always tinted, never solid red). Icons come from Phosphor Fill; the page must link the Phosphor stylesheet.
