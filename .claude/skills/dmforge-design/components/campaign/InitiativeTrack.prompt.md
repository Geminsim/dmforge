Turn order strip above the map while combat is running. Round counter on the left, ordered participants scrolling right.

```jsx
<InitiativeTrack round={3} activeId="char_player_a" participants={order}
  actions={<><Button size="sm" variant="secondary" icon="arrow-u-up-left">撤销移动</Button><Button size="sm" icon="skip-forward">结束回合</Button></>} />
```
