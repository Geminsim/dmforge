Bottom readout strip for the console — round, active turn, map scale, current tool, save size, LAN address. Part of the plate grammar: all mono, all micro, no borders except the top hairline.

```jsx
<StatusLine
  items={[{ label: 'ROUND', value: '03' }, { label: 'TURN', value: '奥利奥 (战士)' }, { label: 'MAP', value: '60×40 · 1FT=40PX' }]}
  right={[{ label: 'SAVE', value: '1.2MB / 10MB' }, { label: 'LAN', value: '192.168.1.24', tone: 'verdigris' }]} />
```

One per screen, pinned to the bottom of the shell.
