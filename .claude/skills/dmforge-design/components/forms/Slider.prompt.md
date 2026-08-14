Continuous numeric control. Currently used for the live-stream font scale (0.75–1.5) in the presentation controls.

```jsx
<Slider label="界面字号" min={0.75} max={1.5} step={0.05} value={scale}
  onChange={e => setScale(Number(e.target.value))}
  format={v => Math.round(v * 100) + '%'} />
```

Track is recessed with a square accent thumb — the native input sits on top at zero opacity so keyboard and drag behaviour stay real.
