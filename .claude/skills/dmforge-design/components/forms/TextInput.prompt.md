Text, number and multiline entry. `mono` for anything numeric or formula-shaped.

```jsx
<TextInput mono icon="dice-six" placeholder="自定义公式如: 2d6+4 或 2d20kh1+5" />
<TextInput label="地图名称" value={name} onChange={e => setName(e.target.value)} />
<TextInput multiline rows={5} placeholder="输入对话、描述、秘密或事件笔记..." />
```

Fields are recessed (`--surface-sunken`) with a hairline border; focus shows the accent ring, never a glow.
