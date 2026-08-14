The one container primitive — sidebars, dice panel, log feed, map frame, settings sections are all Panels. Replaces the old glassmorphism panel: solid surface, hairline border, no blur, no glow.

```jsx
<Panel title="核心掷骰器" icon="dice-six" actions={<IconButton icon="clock-counter-clockwise" title="投掷历史" />}>
  …
</Panel>
<Panel title="战术地图" icon="map-trifold" flush scroll>…</Panel>
```
