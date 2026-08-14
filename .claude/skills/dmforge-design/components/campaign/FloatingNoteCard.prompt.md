Draggable note that floats over the map — rumours, secrets, trap reminders. The only component allowed to use blur, because it sits above live content.

```jsx
<FloatingNoteCard tone="ochre" title="酒馆传闻与秘密"
  content="北山废弃矿井深处，每到月圆之夜就会传出低沉的龙吼声……"
  style={{ position: 'absolute', left: 100, top: 120 }} />
```

Positioning is the caller's job; the card is static and unaware of drag state.
