Centre-screen dialog for campaign settings, map config, initiative setup and destructive confirmations.

```jsx
<Modal title="战役系统设置" icon="gear-six" onClose={close}
  footer={<><Button variant="secondary">取消</Button><Button icon="check">保存</Button></>}>
  …
</Modal>
```

The scrim is the only place blur is used. Entry is a fade plus a 2px rise — no scale-up bounce.
