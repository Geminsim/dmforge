Read-only spreadsheet view for imported .xlsx character sheets and rulebooks. Sticky row numbers and header, mono numerals, accent-soft search highlight.

```jsx
<SheetTable highlight="护甲" maxHeight={360}
  columns={['属性', '数值', '备注']}
  rows={[['力量', 16, '重甲防护'], ['敏捷', 12, '']]} />
```

Render at most a screenful — the app caps sheets at 501 rows × 101 columns.
