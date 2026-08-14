Horizontal action strip — map tools, panel header actions, modal footers.

```jsx
<Toolbar sunken dense>
  <ToolbarLabel>工具</ToolbarLabel>
  <IconButton icon="hand" active title="选择/漫游模式" />
  <IconButton icon="selection" title="框选区域模式" />
  <ToolbarDivider />
  <Button size="sm" variant="secondary" icon="plus">新建地图</Button>
</Toolbar>
```

`ToolbarLabel` is the only place uppercase letter-spaced Latin labels are allowed; never apply that treatment to Chinese text.
