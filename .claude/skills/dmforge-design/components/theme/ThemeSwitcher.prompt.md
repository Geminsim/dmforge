Switches the active theme by writing `data-theme` on a wrapper (or `<html>`). Intentional addition to the system — the product ships three themes and the DM picks by table lighting.

```jsx
const [theme, setTheme] = React.useState('grimoire');
<div data-theme={theme}>
  <ThemeSwitcher value={theme} onChange={setTheme} />
</div>
```

Themes: `grimoire` (dark codex — ink ground + rubrication red, the signature default), `slate` (warm charcoal + brass), `terminal` (cold near-black + signal cyan).
