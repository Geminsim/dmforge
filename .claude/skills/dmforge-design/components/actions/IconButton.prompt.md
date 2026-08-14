Icon-only control for row affordances and map tool toggles (hide/show, delete, minimise, select-mode).

```jsx
<IconButton icon="eye" size="sm" title="隐藏浮动框" />
<IconButton icon="crosshair" tone="accent" active title="框选区域模式" />
<IconButton icon="trash" size="sm" tone="danger" title="永久删除" />
```

Always pass `title` — it is the only label. Use `active` for tool modes, `tone="danger"` for destructive row actions.
