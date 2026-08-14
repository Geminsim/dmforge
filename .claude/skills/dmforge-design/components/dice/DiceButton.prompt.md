Quick-roll die face. Purely typographic — mono `d` over the mono numeral, no die illustration, no shake animation.

```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
  {[4, 6, 8, 10, 12, 20, 100].map(s => <DiceButton key={s} sides={s} onClick={() => roll(\`1d\${s}\`)} />)}
</div>
```
