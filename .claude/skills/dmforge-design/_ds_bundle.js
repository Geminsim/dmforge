/* @ds-bundle: {"format":4,"namespace":"DMForgeDesignSystem_e4395c","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"IconButton","sourcePath":"components/actions/IconButton.jsx"},{"name":"SegmentedControl","sourcePath":"components/actions/SegmentedControl.jsx"},{"name":"Tabs","sourcePath":"components/actions/Tabs.jsx"},{"name":"Toolbar","sourcePath":"components/actions/Toolbar.jsx"},{"name":"ToolbarDivider","sourcePath":"components/actions/Toolbar.jsx"},{"name":"ToolbarLabel","sourcePath":"components/actions/Toolbar.jsx"},{"name":"CharacterCard","sourcePath":"components/campaign/CharacterCard.jsx"},{"name":"FloatingNoteCard","sourcePath":"components/campaign/FloatingNoteCard.jsx"},{"name":"InitiativeTrack","sourcePath":"components/campaign/InitiativeTrack.jsx"},{"name":"ItemRow","sourcePath":"components/campaign/ItemRow.jsx"},{"name":"LogEntry","sourcePath":"components/campaign/LogEntry.jsx"},{"name":"SheetTable","sourcePath":"components/campaign/SheetTable.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"Meter","sourcePath":"components/data/Meter.jsx"},{"name":"ResourceSlot","sourcePath":"components/data/ResourceSlot.jsx"},{"name":"StatPill","sourcePath":"components/data/StatPill.jsx"},{"name":"StatusDot","sourcePath":"components/data/StatusDot.jsx"},{"name":"StatusLine","sourcePath":"components/data/StatusLine.jsx"},{"name":"DiceButton","sourcePath":"components/dice/DiceButton.jsx"},{"name":"RollResult","sourcePath":"components/dice/RollResult.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"TextInput","sourcePath":"components/forms/TextInput.jsx"},{"name":"MapToken","sourcePath":"components/map/MapToken.jsx"},{"name":"TerrainChip","sourcePath":"components/map/TerrainChip.jsx"},{"name":"EmptyState","sourcePath":"components/surfaces/EmptyState.jsx"},{"name":"Modal","sourcePath":"components/surfaces/Modal.jsx"},{"name":"Panel","sourcePath":"components/surfaces/Panel.jsx"},{"name":"ResizeHandle","sourcePath":"components/surfaces/ResizeHandle.jsx"},{"name":"DMFORGE_THEMES","sourcePath":"components/theme/ThemeSwitcher.jsx"},{"name":"ThemeSwitcher","sourcePath":"components/theme/ThemeSwitcher.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"ba5b7d91b887","components/actions/IconButton.jsx":"308ff5fe8902","components/actions/SegmentedControl.jsx":"151c934599e3","components/actions/Tabs.jsx":"45355691bf09","components/actions/Toolbar.jsx":"aadb055cbf40","components/campaign/CharacterCard.jsx":"b1b40a846f9e","components/campaign/FloatingNoteCard.jsx":"730f892ff8a2","components/campaign/InitiativeTrack.jsx":"096519df42a2","components/campaign/ItemRow.jsx":"2fae6d075d17","components/campaign/LogEntry.jsx":"dc79a8a26fc1","components/campaign/SheetTable.jsx":"c585706584b0","components/data/Badge.jsx":"1ca489563217","components/data/Meter.jsx":"c4ddd407936b","components/data/ResourceSlot.jsx":"3a27dc119db2","components/data/StatPill.jsx":"63fd565d2c10","components/data/StatusDot.jsx":"dde52bace8db","components/data/StatusLine.jsx":"2e610c52dc48","components/dice/DiceButton.jsx":"6ba80013fc64","components/dice/RollResult.jsx":"e5c507987c8f","components/forms/Checkbox.jsx":"658986772ad2","components/forms/Select.jsx":"c97d87cde666","components/forms/Slider.jsx":"5b792be647a1","components/forms/TextInput.jsx":"812e7669bc41","components/map/MapToken.jsx":"13d4da7242b5","components/map/TerrainChip.jsx":"ca45a6b3fa53","components/surfaces/EmptyState.jsx":"d84ebd2950eb","components/surfaces/Modal.jsx":"b2903f789c75","components/surfaces/Panel.jsx":"76337ec1c505","components/surfaces/ResizeHandle.jsx":"6ae9d74e936e","components/theme/ThemeSwitcher.jsx":"1217f1531e34","ui_kits/dm-console/Presenter.jsx":"751335b3b018","ui_kits/dm-console/Shell.jsx":"2c0bbae142c5","ui_kits/dm-console/Side.jsx":"16d690f390e5","ui_kits/dm-console/Work.jsx":"9ecdc8156f81","ui_kits/dm-console/data.js":"d2f5c84c612a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DMForgeDesignSystem_e4395c = window.DMForgeDesignSystem_e4395c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
const SIZES = {
  sm: {
    h: 'var(--control-h-sm)',
    px: '10px',
    fs: 'var(--type-meta)',
    icon: 12
  },
  md: {
    h: 'var(--control-h)',
    px: 'var(--control-pad-x)',
    fs: 'var(--type-body-sm)',
    icon: 14
  },
  lg: {
    h: 'var(--control-h-lg)',
    px: '20px',
    fs: 'var(--type-body)',
    icon: 16
  }
};
function tone(variant, hover) {
  switch (variant) {
    case 'secondary':
      return {
        background: hover ? 'var(--surface-hover)' : 'transparent',
        color: 'var(--text-body)',
        boxShadow: 'inset 0 0 0 1px ' + (hover ? 'var(--line-strong)' : 'var(--line-hairline)')
      };
    case 'ghost':
      return {
        background: hover ? 'var(--surface-hover)' : 'transparent',
        color: hover ? 'var(--text-body)' : 'var(--text-muted)',
        boxShadow: 'none'
      };
    case 'danger':
      return {
        background: hover ? 'var(--pigment-madder-soft)' : 'transparent',
        color: 'var(--pigment-madder)',
        boxShadow: 'inset 0 0 0 1px var(--pigment-madder-line)'
      };
    case 'primary':
    default:
      return {
        background: hover ? 'var(--accent-hover)' : 'var(--accent)',
        color: 'var(--text-on-accent)',
        boxShadow: 'none'
      };
  }
}
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  disabled = false,
  fullWidth = false,
  onClick,
  title,
  type = 'button',
  style
}) {
  const [hover, setHover] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    title: title,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      height: s.h,
      padding: `0 ${s.px}`,
      width: fullWidth ? '100%' : undefined,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fs,
      fontWeight: 'var(--weight-medium)',
      letterSpacing: '.03em',
      border: 'none',
      borderRadius: 0,
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      transition: 'var(--motion-control)',
      ...tone(variant, hover && !disabled),
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: s.icon,
      lineHeight: 1
    },
    "aria-hidden": "true"
  }) : null, children ? /*#__PURE__*/React.createElement("span", null, children) : null, iconRight ? /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + iconRight,
    style: {
      fontSize: s.icon,
      lineHeight: 1
    },
    "aria-hidden": "true"
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/IconButton.jsx
try { (() => {
const SIZES = {
  sm: {
    box: 24,
    icon: 13
  },
  md: {
    box: 30,
    icon: 15
  },
  lg: {
    box: 38,
    icon: 18
  }
};
function IconButton({
  icon,
  size = 'md',
  tone = 'muted',
  active = false,
  disabled = false,
  onClick,
  title,
  shape = 'square',
  style
}) {
  const [hover, setHover] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const toneColor = tone === 'danger' ? 'var(--pigment-madder)' : tone === 'accent' ? 'var(--accent)' : 'var(--text-muted)';
  const on = active || hover;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: title,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-pressed": active || undefined,
    style: {
      width: s.box,
      height: s.box,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: active ? 'var(--accent-soft)' : hover ? 'var(--surface-hover)' : 'transparent',
      color: on ? tone === 'muted' ? 'var(--text-body)' : toneColor : toneColor,
      border: '1px solid ' + (active ? 'var(--accent-line)' : 'transparent'),
      borderRadius: shape === 'circle' ? 'var(--radius-pill)' : 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'var(--motion-control)',
      padding: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: s.icon,
      lineHeight: 1
    },
    "aria-hidden": "true"
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/actions/SegmentedControl.jsx
try { (() => {
function SegmentedControl({
  items = [],
  value,
  onChange,
  size = 'sm',
  fullWidth = true,
  style
}) {
  const h = size === 'md' ? 'var(--control-h)' : 'var(--control-h-sm)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: fullWidth ? 'grid' : 'inline-grid',
      gridAutoFlow: 'column',
      gridAutoColumns: 'minmax(0, 1fr)',
      gap: '1px',
      background: 'var(--line-hairline)',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
      ...style
    }
  }, items.map(it => {
    const on = it.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      type: "button",
      onClick: () => onChange && onChange(it.id),
      title: it.title,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        height: h,
        padding: '0 var(--space-2)',
        minWidth: 0,
        overflow: 'hidden',
        background: on ? 'var(--accent)' : 'var(--surface-panel)',
        color: on ? 'var(--text-on-accent)' : 'var(--text-muted)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-meta)',
        fontWeight: on ? 'var(--weight-semibold)' : 'var(--weight-regular)',
        transition: 'var(--motion-control)'
      }
    }, it.icon ? /*#__PURE__*/React.createElement("i", {
      className: 'ph-fill ph-' + it.icon,
      style: {
        fontSize: 12,
        lineHeight: 1,
        flexShrink: 0
      },
      "aria-hidden": "true"
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, it.label), it.count != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--type-micro)',
        opacity: 0.7,
        flexShrink: 0
      }
    }, it.count) : null);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/actions/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange,
  style
}) {
  const [hover, setHover] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)',
      height: 'var(--shell-tabbar-h)',
      padding: '0 var(--space-5)',
      background: 'var(--surface-panel)',
      borderBottom: 'var(--border-hairline)',
      ...style
    }
  }, items.map(it => {
    const on = it.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      role: "tab",
      "aria-selected": on,
      type: "button",
      onClick: () => onChange && onChange(it.id),
      onMouseEnter: () => setHover(it.id),
      onMouseLeave: () => setHover(null),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '2px 8px',
        margin: '0 -8px',
        background: on ? 'var(--accent)' : 'transparent',
        border: 'none',
        color: on ? 'var(--text-on-accent)' : hover === it.id ? 'var(--text-body)' : 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-body-sm)',
        letterSpacing: '.04em',
        cursor: 'pointer',
        transition: 'var(--motion-control)',
        whiteSpace: 'nowrap'
      }
    }, it.icon ? /*#__PURE__*/React.createElement("i", {
      className: 'ph-fill ph-' + it.icon,
      style: {
        fontSize: 14,
        lineHeight: 1
      },
      "aria-hidden": "true"
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: on ? 1 : 0.55,
        fontFamily: 'var(--font-mono)'
      }
    }, "["), /*#__PURE__*/React.createElement("span", null, it.label), /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: on ? 1 : 0.55,
        fontFamily: 'var(--font-mono)'
      }
    }, "]"));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/actions/Toolbar.jsx
try { (() => {
function Toolbar({
  children,
  align = 'left',
  dense = false,
  sunken = false,
  wrap = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: wrap ? 'wrap' : 'nowrap',
      gap: dense ? 'var(--space-2)' : 'var(--space-3)',
      justifyContent: align === 'right' ? 'flex-end' : align === 'between' ? 'space-between' : 'flex-start',
      padding: dense ? 'var(--space-2) var(--space-3)' : 'var(--space-3) var(--space-4)',
      background: sunken ? 'var(--surface-sunken)' : 'transparent',
      border: sunken ? 'var(--border-hairline)' : 'none',
      borderRadius: sunken ? 'var(--radius-md)' : 0,
      ...style
    }
  }, children);
}
function ToolbarDivider() {
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: '1px',
      alignSelf: 'stretch',
      margin: '0 var(--space-1)',
      background: 'var(--line-hairline)'
    }
  });
}
function ToolbarLabel({
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, children);
}
Object.assign(__ds_scope, { Toolbar, ToolbarDivider, ToolbarLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Toolbar.jsx", error: String((e && e.message) || e) }); }

// components/campaign/FloatingNoteCard.jsx
try { (() => {
const TONES = ['madder', 'verdigris', 'woad', 'ochre', 'accent'];
function FloatingNoteCard({
  title,
  content,
  tone = 'ochre',
  minimized = false,
  width = 280,
  height = 190,
  onClose,
  onToggle,
  onToneChange,
  style
}) {
  const color = tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  const soft = tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height: minimized ? 'auto' : height,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--surface-overlay)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      boxShadow: 'inset 0 2px 0 ' + color + ', inset 0 0 0 1px var(--bracket-line), var(--shadow-float)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      borderBottom: minimized ? 'none' : 'var(--border-hairline)',
      cursor: 'move',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-note",
    style: {
      fontSize: 12,
      color
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--display-weight)',
      fontSize: 'var(--type-body-sm)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggle,
    title: minimized ? '展开' : '折叠',
    style: iconBtn
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + (minimized ? 'arrows-out-simple' : 'minus'),
    style: {
      fontSize: 11
    }
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    title: "\u5173\u95ED\u7B14\u8BB0 (\u53EF\u5728\u5217\u8868\u91CD\u65B0\u6253\u5F00)",
    style: {
      ...iconBtn,
      color: 'var(--pigment-madder)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-x",
    style: {
      fontSize: 11
    }
  }))), !minimized ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: soft,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      flex: 1,
      overflowY: 'auto',
      fontSize: 'var(--type-meta)',
      color: 'var(--text-body)',
      lineHeight: 'var(--type-body-lh)'
    }
  }, content), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      borderTop: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "\u5206\u7C7B\u6807\u8BB0"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, TONES.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    type: "button",
    onClick: () => onToneChange && onToneChange(t),
    title: t,
    style: {
      width: 11,
      height: 11,
      padding: 0,
      borderRadius: 'var(--radius-pill)',
      background: t === 'accent' ? 'var(--accent)' : `var(--pigment-${t})`,
      border: t === tone ? '2px solid var(--text-body)' : '1px solid var(--line-hairline)',
      cursor: 'pointer'
    }
  }))))) : null);
}
const iconBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: 'var(--text-muted)',
  cursor: 'pointer'
};
Object.assign(__ds_scope, { FloatingNoteCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/campaign/FloatingNoteCard.jsx", error: String((e && e.message) || e) }); }

// components/campaign/LogEntry.jsx
try { (() => {
const TYPES = {
  SYSTEM: ['accent', 'scroll', 'SYSTEM'],
  COMBAT: ['madder', 'sword', 'COMBAT'],
  ITEMS: ['ochre', 'backpack', 'ITEMS'],
  DICE: ['woad', 'dice-six', 'DICE']
};
function renderBold(content) {
  return String(content ?? '').split(/(\*\*.*?\*\*)/g).filter(Boolean).map((part, i) => part.startsWith('**') && part.endsWith('**') ? /*#__PURE__*/React.createElement("strong", {
    key: i,
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--accent)'
    }
  }, part.slice(2, -2)) : /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, part));
}
function LogEntry({
  type = 'SYSTEM',
  content,
  timestamp,
  style
}) {
  const [tone, icon, label] = TYPES[type] || TYPES.SYSTEM;
  const color = tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  return /*#__PURE__*/React.createElement("article", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      padding: 'var(--space-3) 0',
      minWidth: 0,
      borderBottom: 'var(--rule-dot)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, timestamp), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      color
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: 10
    },
    "aria-hidden": "true"
  }), label)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--type-body-lh)',
      overflowWrap: 'anywhere'
    }
  }, renderBold(content)));
}
Object.assign(__ds_scope, { LogEntry });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/campaign/LogEntry.jsx", error: String((e && e.message) || e) }); }

// components/campaign/SheetTable.jsx
try { (() => {
function mark(text, term) {
  const s = String(text ?? '');
  if (!term) return s;
  const i = s.toLowerCase().indexOf(String(term).toLowerCase());
  if (i < 0) return s;
  return /*#__PURE__*/React.createElement(React.Fragment, null, s.slice(0, i), /*#__PURE__*/React.createElement("mark", {
    style: {
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
      padding: '0 2px',
      borderRadius: '1px'
    }
  }, s.slice(i, i + term.length)), s.slice(i + term.length));
}
function SheetTable({
  columns = [],
  rows = [],
  highlight,
  fontSize = 13,
  maxHeight,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'auto',
      maxHeight,
      background: 'var(--surface-panel)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: 'collapse',
      width: '100%',
      fontSize,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      ...cellBase,
      position: 'sticky',
      top: 0,
      left: 0,
      zIndex: 2,
      width: 40,
      background: 'var(--surface-sunken)',
      color: 'var(--text-faint)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 'var(--weight-medium)'
    }
  }), columns.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      ...cellBase,
      position: 'sticky',
      top: 0,
      zIndex: 1,
      background: 'var(--surface-sunken)',
      color: 'var(--text-muted)',
      fontWeight: 'var(--weight-semibold)',
      textAlign: 'left',
      whiteSpace: 'nowrap'
    }
  }, c)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, ri) => /*#__PURE__*/React.createElement("tr", {
    key: ri
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...cellBase,
      position: 'sticky',
      left: 0,
      background: 'var(--surface-sunken)',
      color: 'var(--text-faint)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      textAlign: 'right'
    }
  }, ri + 1), r.map((cell, ci) => {
    const numeric = typeof cell === 'number' || typeof cell === 'string' && /^[-+]?[\d.]+$/.test(cell.trim());
    return /*#__PURE__*/React.createElement("td", {
      key: ci,
      style: {
        ...cellBase,
        color: 'var(--text-body)',
        fontFamily: numeric ? 'var(--font-mono)' : 'var(--font-sans)',
        textAlign: numeric ? 'right' : 'left',
        whiteSpace: 'nowrap'
      }
    }, mark(cell, highlight));
  }))))));
}
const cellBase = {
  padding: '6px 10px',
  border: '1px solid var(--line-hairline)',
  lineHeight: 1.5
};
Object.assign(__ds_scope, { SheetTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/campaign/SheetTable.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
const TONES = {
  neutral: ['var(--text-muted)', 'transparent', 'var(--line-strong)'],
  accent: ['var(--accent)', 'var(--accent-soft)', 'var(--accent-line)'],
  madder: ['var(--pigment-madder)', 'var(--pigment-madder-soft)', 'var(--pigment-madder-line)'],
  verdigris: ['var(--pigment-verdigris)', 'var(--pigment-verdigris-soft)', 'var(--pigment-verdigris-line)'],
  woad: ['var(--pigment-woad)', 'var(--pigment-woad-soft)', 'var(--pigment-woad-line)'],
  ochre: ['var(--pigment-ochre)', 'var(--pigment-ochre-soft)', 'var(--pigment-ochre-line)']
};
function Badge({
  children,
  tone = 'neutral',
  variant = 'outline',
  icon,
  mono = false,
  size = 'md',
  onRemove,
  style
}) {
  const [fg, soft, line] = TONES[tone] || TONES.neutral;
  const solid = variant === 'solid';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      height: size === 'sm' ? 17 : 21,
      padding: size === 'sm' ? '0 5px' : '0 7px',
      background: solid ? fg : variant === 'soft' ? soft : 'transparent',
      color: solid ? 'var(--text-on-accent)' : fg,
      boxShadow: solid ? 'none' : 'inset 0 0 0 1px ' + line,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: size === 'sm' ? 'var(--type-micro)' : 'var(--type-meta)',
      letterSpacing: '.04em',
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: size === 'sm' ? 10 : 11,
      lineHeight: 1
    },
    "aria-hidden": "true"
  }) : null, children, onRemove ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRemove,
    title: "\u6E05\u9664\u72B6\u6001",
    style: {
      display: 'inline-flex',
      background: 'transparent',
      border: 'none',
      padding: 0,
      marginLeft: 1,
      color: 'inherit',
      cursor: 'pointer',
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-x",
    style: {
      fontSize: 9
    },
    "aria-hidden": "true"
  })) : null);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/campaign/ItemRow.jsx
try { (() => {
const CATEGORY_TONE = {
  '武器': 'madder',
  '消耗品': 'verdigris',
  '护甲': 'woad',
  '法器': 'accent',
  '杂物': 'neutral'
};
function ItemRow({
  name,
  category,
  quantity,
  description,
  owner,
  actions,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)',
      padding: 'var(--row-pad-y) var(--space-4)',
      background: hover ? 'var(--surface-hover)' : 'transparent',
      borderBottom: 'var(--rule-dot)',
      transition: 'var(--motion-control)',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-body)'
    }
  }, name), category ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    size: "sm",
    tone: CATEGORY_TONE[category] || 'neutral'
  }, category) : null, quantity != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)'
    }
  }, "\xD7", quantity) : null), description ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--type-body-lh)'
    }
  }, description) : null, owner ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "\u5F52\u5C5E\uFF1A", owner) : null), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexShrink: 0,
      opacity: hover ? 1 : 0.55,
      transition: 'var(--motion-fade)'
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { ItemRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/campaign/ItemRow.jsx", error: String((e && e.message) || e) }); }

// components/data/Meter.jsx
try { (() => {
function Meter({
  value = 0,
  max = 1,
  temp = 0,
  tone = 'auto',
  label,
  showNumbers = true,
  segments = 13,
  height = 9,
  style
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const auto = ratio > 0.5 ? 'var(--pigment-verdigris)' : ratio > 0.25 ? 'var(--pigment-ochre)' : 'var(--pigment-madder)';
  const fill = tone === 'auto' ? auto : tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  const filled = Math.round(ratio * segments);
  const tempCount = max > 0 ? Math.min(segments - filled, Math.round(temp / max * segments)) : 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minWidth: 0,
      ...style
    }
  }, label || showNumbers ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      minWidth: 'var(--space-3)',
      borderTop: 'var(--rule-dot)',
      transform: 'translateY(-3px)'
    }
  }), showNumbers ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-numeral-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-body)',
      whiteSpace: 'nowrap'
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-faint)',
      fontWeight: 'var(--weight-regular)'
    }
  }, "/", max), temp > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pigment-woad)'
    }
  }, " +", temp) : null) : null) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: '2px'
    },
    role: "meter",
    "aria-valuenow": value,
    "aria-valuemax": max
  }, Array.from({
    length: segments
  }).map((_, i) => {
    const on = i < filled;
    const isTemp = !on && i < filled + tempCount;
    return /*#__PURE__*/React.createElement("i", {
      key: i,
      style: {
        flex: 1,
        minWidth: 4,
        height,
        background: on ? fill : isTemp ? 'var(--pigment-woad)' : 'transparent',
        opacity: isTemp ? 0.5 : 1,
        boxShadow: on || isTemp ? 'none' : 'inset 0 0 0 1px var(--meter-empty)'
      }
    });
  })));
}
Object.assign(__ds_scope, { Meter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Meter.jsx", error: String((e && e.message) || e) }); }

// components/campaign/CharacterCard.jsx
try { (() => {
const KIND = {
  PC: ['woad', 'PC'],
  NPC: ['verdigris', 'NPC'],
  MONSTER: ['madder', '怪物']
};
function CharacterCard({
  name,
  kind = 'PC',
  level,
  klass,
  hp = 0,
  maxHp = 1,
  tempHp = 0,
  conditions = [],
  speedRemaining,
  activeTurn = false,
  selected = false,
  onSelect,
  actions,
  children,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const [tone, kindLabel] = KIND[kind] || KIND.PC;
  return /*#__PURE__*/React.createElement("article", {
    onClick: onSelect,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-4)',
      background: activeTurn ? 'var(--accent-soft)' : hover && onSelect ? 'var(--surface-hover)' : 'var(--surface-raised)',
      boxShadow: 'inset 2px 0 0 ' + (activeTurn ? 'var(--accent)' : `var(--pigment-${tone})`) + ', inset 0 0 0 1px ' + (selected ? 'var(--line-strong)' : 'var(--line-hairline)'),
      cursor: onSelect ? 'pointer' : 'default',
      transition: 'var(--motion-control)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--display-weight)',
      fontSize: 'var(--type-display-sm)',
      letterSpacing: 'var(--display-tracking)',
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: tone,
    size: "sm"
  }, kindLabel), level != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, "Lv", level) : null, klass ? /*#__PURE__*/React.createElement("span", null, klass) : null, activeTurn ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--accent)'
    }
  }, "ACTIVE") : null)), actions), /*#__PURE__*/React.createElement(__ds_scope.Meter, {
    value: hp,
    max: maxHp,
    temp: tempHp,
    label: "\u751F\u547D\u503C"
  }), conditions.length > 0 || speedRemaining != null ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, conditions.map(c => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: c,
    tone: "ochre",
    size: "sm"
  }, c)), speedRemaining != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "SPD ", speedRemaining, "ft") : null) : null, children);
}
Object.assign(__ds_scope, { CharacterCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/campaign/CharacterCard.jsx", error: String((e && e.message) || e) }); }

// components/data/ResourceSlot.jsx
try { (() => {
const RESET = {
  turn: '每回合',
  short: '短休',
  long: '长休'
};
function ResourceSlot({
  name,
  value = 0,
  max = 1,
  resetType = 'turn',
  onSpend,
  onRestore,
  onDelete,
  style
}) {
  const pips = max <= 8;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-raised)',
      minWidth: 0,
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, RESET[resetType] || resetType, "\u91CD\u7F6E")), pips ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: '3px'
    },
    "aria-hidden": "true"
  }, Array.from({
    length: max
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 8,
      height: 8,
      background: i < value ? 'var(--accent)' : 'transparent',
      boxShadow: 'inset 0 0 0 1px ' + (i < value ? 'var(--accent)' : 'var(--meter-empty)')
    }
  }))) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-numeral-sm)',
      color: 'var(--accent)'
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-faint)'
    }
  }, "/", max)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: '2px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSpend,
    title: "\u6D88\u8017 1 \u6B21",
    style: btn
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-minus",
    style: {
      fontSize: 10
    }
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRestore,
    title: "\u6062\u590D 1 \u6B21",
    style: btn
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-plus",
    style: {
      fontSize: 10
    }
  })), onDelete ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDelete,
    title: "\u5220\u9664\u6B64\u8D44\u6E90\u69FD",
    style: {
      ...btn,
      color: 'var(--pigment-madder)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-trash",
    style: {
      fontSize: 10
    }
  })) : null));
}
const btn = {
  width: 20,
  height: 20,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '1px solid var(--line-hairline)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: 0
};
Object.assign(__ds_scope, { ResourceSlot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ResourceSlot.jsx", error: String((e && e.message) || e) }); }

// components/data/StatPill.jsx
try { (() => {
function StatPill({
  label,
  value,
  sub,
  code,
  tone = 'neutral',
  variant = 'leader',
  size = 'md',
  style
}) {
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'madder' ? 'var(--pigment-madder)' : tone === 'woad' ? 'var(--pigment-woad)' : 'var(--text-body)';
  const val = /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: size === 'sm' ? 'var(--type-numeral-sm)' : 'var(--type-numeral)',
      fontWeight: 'var(--weight-semibold)',
      color,
      whiteSpace: 'nowrap'
    }
  }, value);
  if (variant === 'plate') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--surface-raised)',
        boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
        minWidth: 0,
        ...style
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--type-meta)',
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, label), sub ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--type-micro)',
        color: 'var(--text-faint)'
      }
    }, sub) : null), val);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-2)',
      minWidth: 0,
      padding: '2px 0',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, label), code ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, code) : null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      minWidth: 'var(--space-3)',
      borderTop: 'var(--rule-dot)',
      transform: 'translateY(-3px)'
    }
  }), val, sub ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)',
      whiteSpace: 'nowrap'
    }
  }, sub) : null);
}
Object.assign(__ds_scope, { StatPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatPill.jsx", error: String((e && e.message) || e) }); }

// components/data/StatusDot.jsx
try { (() => {
const STATES = {
  synced: ['var(--pigment-verdigris)', '已同步'],
  local: ['var(--pigment-ochre)', '单机模式'],
  error: ['var(--pigment-madder)', '同步失败'],
  idle: ['var(--text-faint)', '空闲']
};
function StatusDot({
  state = 'synced',
  label,
  mono = true,
  style
}) {
  const [color, fallback] = STATES[state] || STATES.idle;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 7,
      height: 7,
      borderRadius: 'var(--radius-pill)',
      background: color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-muted)'
    }
  }, label || fallback));
}
Object.assign(__ds_scope, { StatusDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatusDot.jsx", error: String((e && e.message) || e) }); }

// components/data/StatusLine.jsx
try { (() => {
function StatusLine({
  items = [],
  right = [],
  style
}) {
  const cell = (v, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      whiteSpace: 'nowrap'
    }
  }, v.label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-faint)'
    }
  }, v.label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: v.tone === 'accent' ? 'var(--accent)' : v.tone ? `var(--pigment-${v.tone})` : 'var(--text-muted)'
    }
  }, v.value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 26,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)',
      padding: '0 var(--space-5)',
      background: 'var(--surface-panel)',
      borderTop: 'var(--border-hairline)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      overflow: 'hidden',
      ...style
    }
  }, items.map(cell), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), right.map(cell));
}
Object.assign(__ds_scope, { StatusLine });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatusLine.jsx", error: String((e && e.message) || e) }); }

// components/dice/DiceButton.jsx
try { (() => {
function DiceButton({
  sides,
  onClick,
  size = 'md',
  title,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const box = size === 'sm' ? 40 : 50;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    title: title || `投掷 1d${sides}`,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: '100%',
      minWidth: 0,
      height: box,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover ? 'var(--accent)' : 'var(--surface-raised)',
      color: hover ? 'var(--text-on-accent)' : 'var(--text-body)',
      boxShadow: hover ? 'none' : 'inset 0 0 0 1px var(--line-hairline)',
      border: 'none',
      borderRadius: 0,
      cursor: 'pointer',
      padding: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: size === 'sm' ? 'var(--type-numeral-sm)' : 'var(--type-numeral)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: '.03em',
      transition: 'var(--motion-control)',
      ...style
    }
  }, "d", sides);
}
Object.assign(__ds_scope, { DiceButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/dice/DiceButton.jsx", error: String((e && e.message) || e) }); }

// components/dice/RollResult.jsx
try { (() => {
function RollResult({
  formula,
  total,
  detail,
  time,
  emphasis = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minWidth: 0,
      padding: emphasis ? 'var(--space-4)' : 'var(--space-3)',
      background: 'var(--surface-raised)',
      boxShadow: (emphasis ? 'inset 2px 0 0 var(--accent), ' : '') + 'inset 0 0 0 1px var(--line-hairline)',
      animation: 'dmf-fade-in var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, formula), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      minWidth: 'var(--space-3)',
      borderTop: 'var(--rule-dot)',
      transform: 'translateY(-4px)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: emphasis ? 'var(--type-numeral-xl)' : 'var(--type-numeral-lg)',
      fontWeight: 700,
      color: 'var(--accent)',
      lineHeight: 1,
      flexShrink: 0
    }
  }, total)), detail ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)',
      overflowWrap: 'anywhere',
      lineHeight: 'var(--type-body-lh)'
    }
  }, detail) : null, time ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, time) : null);
}
Object.assign(__ds_scope, { RollResult });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/dice/RollResult.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked = false,
  onChange,
  hint,
  disabled = false,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      flexShrink: 0,
      marginTop: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked ? 'var(--accent)' : 'var(--surface-sunken)',
      border: '1px solid ' + (checked ? 'var(--accent)' : hover ? 'var(--line-strong)' : 'var(--line-hairline)'),
      borderRadius: 'var(--radius-sm)',
      transition: 'var(--motion-control)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), checked ? /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-check",
    style: {
      fontSize: 11,
      color: 'var(--text-on-accent)',
      lineHeight: 1
    },
    "aria-hidden": "true"
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm)',
      color: 'var(--text-body)'
    }
  }, label), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, hint) : null));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  value,
  onChange,
  options = [],
  size = 'md',
  hint,
  disabled = false,
  fullWidth = true,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      width: fullWidth ? '100%' : undefined,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      fontWeight: 'var(--weight-medium)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: 'none',
      width: '100%',
      height: h,
      padding: '0 32px 0 var(--space-4)',
      background: 'var(--surface-sunken)',
      color: 'var(--text-body)',
      border: 'none',
      boxShadow: 'inset 0 0 0 1px ' + (focus ? 'var(--accent-line)' : 'var(--line-hairline)') + (focus ? ', var(--ring-focus)' : ''),
      fontFamily: 'var(--font-sans)',
      fontSize: size === 'sm' ? 'var(--type-meta)' : 'var(--type-body-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'var(--motion-control)'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-caret-down",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      right: 'var(--space-4)',
      fontSize: 11,
      color: 'var(--text-faint)',
      pointerEvents: 'none'
    }
  })), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
function Slider({
  label,
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  format,
  suffix,
  disabled = false,
  style
}) {
  const pct = max > min ? (value - min) / (max - min) * 100 : 0;
  const shown = format ? format(value) : String(value) + (suffix || '');
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minWidth: 0,
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, label || shown ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      minWidth: 'var(--space-3)',
      borderTop: 'var(--rule-dot)',
      transform: 'translateY(-3px)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-numeral-sm)',
      color: 'var(--accent)',
      whiteSpace: 'nowrap'
    }
  }, shown)) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 4,
      background: 'var(--surface-sunken)',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: 0,
      width: pct + '%',
      height: 4,
      background: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: 'calc(' + pct + '% - 4px)',
      width: 8,
      height: 16,
      background: 'var(--accent)',
      boxShadow: 'inset 0 0 0 1px var(--surface-panel)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    step: step,
    value: value,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'relative',
      width: '100%',
      margin: 0,
      opacity: 0,
      height: 18,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  })));
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextInput.jsx
try { (() => {
function TextInput({
  label,
  value,
  defaultValue,
  placeholder,
  onChange,
  mono = false,
  size = 'md',
  icon,
  suffix,
  hint,
  invalid = false,
  disabled = false,
  multiline = false,
  rows = 4,
  fullWidth = true,
  type = 'text',
  style,
  inputStyle
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';
  const border = invalid ? 'var(--pigment-madder-line)' : focus ? 'var(--accent-line)' : 'var(--line-hairline)';
  const field = {
    flex: 1,
    minWidth: 0,
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-body)',
    fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
    fontSize: size === 'sm' ? 'var(--type-meta)' : 'var(--type-body-sm)',
    padding: 0,
    resize: multiline ? 'vertical' : undefined,
    lineHeight: multiline ? 'var(--type-body-lh)' : undefined,
    ...inputStyle
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      width: fullWidth ? '100%' : undefined,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      fontWeight: 'var(--weight-medium)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: multiline ? 'flex-start' : 'center',
      gap: 'var(--space-3)',
      minHeight: multiline ? undefined : h,
      padding: multiline ? 'var(--space-3) var(--space-4)' : '0 var(--space-4)',
      background: 'var(--surface-sunken)',
      minWidth: 0,
      boxShadow: 'inset 0 0 0 1px ' + border + (focus ? ', var(--ring-focus)' : ''),
      opacity: disabled ? 0.5 : 1,
      transition: 'var(--motion-control)'
    }
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: 14,
      lineHeight: 1,
      color: 'var(--text-faint)'
    },
    "aria-hidden": "true"
  }) : null, multiline ? /*#__PURE__*/React.createElement("textarea", {
    rows: rows,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: field
  }) : /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: field
  }), suffix ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)',
      whiteSpace: 'nowrap'
    }
  }, suffix) : null), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      color: invalid ? 'var(--pigment-madder)' : 'var(--text-faint)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/map/MapToken.jsx
try { (() => {
const KIND = {
  PC: 'var(--pigment-woad)',
  NPC: 'var(--pigment-verdigris)',
  MONSTER: 'var(--pigment-madder)'
};
function MapToken({
  kind = 'PC',
  name = '',
  label,
  size = 32,
  active = false,
  selected = false,
  conditions = 0,
  dimmed = false,
  onClick,
  style
}) {
  const color = KIND[kind] || KIND.PC;
  const text = label != null ? label : String(name).slice(0, 2);
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    title: name,
    style: {
      position: 'relative',
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color,
      color: 'var(--surface-panel)',
      boxShadow: '0 0 0 1px var(--bracket-line)',
      outline: active ? '1px solid var(--accent)' : selected ? '1px solid var(--text-body)' : 'none',
      outlineOffset: 2,
      fontFamily: 'var(--font-display)',
      fontSize: Math.round(size * 0.36),
      fontWeight: 700,
      cursor: onClick ? 'grab' : 'default',
      opacity: dimmed ? 0.45 : 1,
      userSelect: 'none',
      transition: 'opacity var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }, text, conditions > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -1,
      right: -1,
      minWidth: 12,
      height: 12,
      padding: '0 2px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--pigment-ochre)',
      color: 'var(--surface-panel)',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600
    }
  }, conditions) : null);
}
Object.assign(__ds_scope, { MapToken });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/MapToken.jsx", error: String((e && e.message) || e) }); }

// components/campaign/InitiativeTrack.jsx
try { (() => {
function InitiativeTrack({
  round = 1,
  participants = [],
  activeId,
  onSelect,
  actions,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--surface-panel)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-panel)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "Round"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-numeral-lg)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--accent)',
      lineHeight: 1
    }
  }, round)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 1,
      alignSelf: 'stretch',
      background: 'var(--line-hairline)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      overflowX: 'auto'
    }
  }, participants.map(p => {
    const on = p.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      type: "button",
      onClick: () => onSelect && onSelect(p.id),
      title: p.name,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        flexShrink: 0,
        padding: 'var(--space-2) var(--space-3)',
        background: on ? 'var(--accent-soft)' : 'transparent',
        border: '1px solid ' + (on ? 'var(--accent-line)' : 'var(--line-hairline)'),
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'var(--motion-control)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.MapToken, {
      kind: p.kind,
      name: p.name,
      size: 24,
      active: on
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--type-meta)',
        color: on ? 'var(--text-body)' : 'var(--text-muted)',
        maxWidth: 120,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, p.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--type-micro)',
        color: 'var(--text-faint)'
      }
    }, "\u5148\u653B ", p.initiative)));
  })), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexShrink: 0
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { InitiativeTrack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/campaign/InitiativeTrack.jsx", error: String((e && e.message) || e) }); }

// components/map/TerrainChip.jsx
try { (() => {
function TerrainChip({
  name,
  shape = 'rect',
  tone = 'madder',
  secret = false,
  blocked = false,
  meta,
  onClick,
  style
}) {
  const color = tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  const soft = tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      background: soft,
      minWidth: 0,
      boxShadow: 'inset 0 0 0 1px ' + (tone === 'accent' ? 'var(--accent-line)' : `var(--pigment-${tone}-line)`),
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 12,
      height: 12,
      flexShrink: 0,
      background: color,
      opacity: secret ? 0.35 : 1,
      borderRadius: shape === 'circle' ? '50%' : 0,
      border: secret ? '1px dashed ' + color : 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 'var(--type-meta)',
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, name), blocked ? /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-wall",
    title: "\u5B9E\u4F53\u963B\u6321",
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }) : null, secret ? /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-eye-closed",
    title: "\u4EC5 DM \u53EF\u89C1",
    style: {
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }) : null, meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, meta) : null);
}
Object.assign(__ds_scope, { TerrainChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/TerrainChip.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/EmptyState.jsx
try { (() => {
function EmptyState({
  icon,
  text,
  hint,
  action,
  compact = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: compact ? 'var(--space-5) var(--space-4)' : 'var(--space-8) var(--space-5)',
      textAlign: 'center',
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: compact ? 18 : 26,
      color: 'var(--text-faint)',
      opacity: 0.7
    },
    "aria-hidden": "true"
  }) : null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: compact ? 'var(--type-meta)' : 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      fontStyle: 'italic'
    }
  }, text), hint ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)',
      maxWidth: '34ch'
    }
  }, hint) : null, action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Modal.jsx
try { (() => {
function Modal({
  open = true,
  title,
  icon,
  onClose,
  footer,
  children,
  width = 560,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-7)',
      background: 'var(--surface-scrim)',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
      animation: 'dmf-fade-in var(--dur-fast) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: width,
      maxHeight: '86vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-panel)',
      boxShadow: 'inset 0 0 0 1px var(--bracket-line), var(--shadow-modal)',
      animation: 'dmf-rise-in var(--dur-base) var(--ease-out)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-4) var(--space-5)',
      borderBottom: 'var(--border-hairline)'
    }
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: 18,
      lineHeight: 1,
      color: 'var(--accent)'
    },
    "aria-hidden": "true"
  }) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--display-weight)',
      fontSize: 'var(--type-display-md)',
      letterSpacing: 'var(--display-tracking)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    title: "\u5173\u95ED\u9762\u677F",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      background: 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-muted)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-x",
    style: {
      fontSize: 14
    },
    "aria-hidden": "true"
  })) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-5)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, children), footer ? /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: 'var(--space-4) var(--space-5)',
      borderTop: 'var(--border-hairline)',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-3)'
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Modal.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Panel.jsx
try { (() => {
function Brackets() {
  const s = {
    position: 'absolute',
    width: 'var(--bracket-size)',
    height: 'var(--bracket-size)',
    border: '1px solid var(--bracket-line)',
    pointerEvents: 'none'
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      ...s,
      left: 0,
      top: 0,
      borderRight: 'none',
      borderBottom: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      ...s,
      right: 0,
      top: 0,
      borderLeft: 'none',
      borderBottom: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      ...s,
      left: 0,
      bottom: 0,
      borderRight: 'none',
      borderTop: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      ...s,
      right: 0,
      bottom: 0,
      borderLeft: 'none',
      borderTop: 'none'
    }
  }));
}
function Panel({
  title,
  code,
  icon,
  meta,
  actions,
  footer,
  children,
  flush = false,
  tone = 'panel',
  scroll = false,
  textured = false,
  brackets = true,
  style,
  bodyStyle
}) {
  const bg = tone === 'raised' ? 'var(--surface-raised)' : tone === 'sunken' ? 'var(--surface-sunken)' : 'var(--surface-panel)';
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      minWidth: 0,
      background: bg,
      backgroundImage: textured ? 'var(--texture-surface)' : undefined,
      borderRadius: 'var(--radius-panel)',
      boxShadow: 'var(--shadow-panel)',
      ...style
    }
  }, brackets ? /*#__PURE__*/React.createElement(Brackets, null) : null, title || code || actions ? /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      minHeight: 42,
      padding: '0 var(--space-4)',
      flexShrink: 0
    }
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: 14,
      lineHeight: 1,
      color: 'var(--accent)'
    },
    "aria-hidden": "true"
  }) : null, code ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      whiteSpace: 'nowrap'
    }
  }, code) : null, title ? /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--display-weight)',
      fontSize: 'var(--type-display-sm)',
      letterSpacing: 'var(--display-tracking)',
      color: 'var(--text-body)',
      whiteSpace: 'nowrap'
    }
  }, title) : null, meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)',
      whiteSpace: 'nowrap'
    }
  }, meta) : null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      minWidth: 'var(--space-4)',
      borderTop: 'var(--rule-dot)'
    }
  }), actions) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      minHeight: 0,
      minWidth: 0,
      padding: flush ? 0 : 'var(--panel-pad)',
      paddingTop: (title || code) && !flush ? 'var(--space-2)' : undefined,
      flex: scroll ? 1 : undefined,
      overflowY: scroll ? 'auto' : undefined,
      ...bodyStyle
    }
  }, children), footer ? /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: 'var(--space-3) var(--space-4)',
      borderTop: 'var(--border-hairline)',
      flexShrink: 0
    }
  }, footer) : null);
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Panel.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/ResizeHandle.jsx
try { (() => {
function ResizeHandle({
  orientation = 'vertical',
  onMouseDown,
  title = '拖动调整宽度'
}) {
  const [hot, setHot] = React.useState(false);
  const vertical = orientation === 'vertical';
  return /*#__PURE__*/React.createElement("div", {
    role: "separator",
    title: title,
    onMouseDown: onMouseDown,
    onMouseEnter: () => setHot(true),
    onMouseLeave: () => setHot(false),
    style: {
      position: 'relative',
      flexShrink: 0,
      width: vertical ? 'var(--shell-resize-w)' : '100%',
      height: vertical ? '100%' : 'var(--shell-resize-w)',
      background: hot ? 'var(--accent)' : 'var(--line-hairline)',
      cursor: vertical ? 'col-resize' : 'row-resize',
      transition: 'background var(--dur-fast) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: vertical ? '0 -5px' : '-5px 0',
      cursor: 'inherit'
    }
  }));
}
Object.assign(__ds_scope, { ResizeHandle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/ResizeHandle.jsx", error: String((e && e.message) || e) }); }

// components/theme/ThemeSwitcher.jsx
try { (() => {
const DMFORGE_THEMES = [{
  id: 'grimoire',
  label: '墨色典籍',
  swatch: '#c0503a',
  bg: '#1f1a17'
}, {
  id: 'slate',
  label: '石板烛火',
  swatch: '#c9a227',
  bg: '#1c1916'
}, {
  id: 'terminal',
  label: '战术终端',
  swatch: '#57cbdc',
  bg: '#0f1317'
}];
function ThemeSwitcher({
  value = 'grimoire',
  onChange,
  themes = DMFORGE_THEMES,
  compact = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    "aria-label": "\u4E3B\u9898",
    style: {
      display: 'inline-flex',
      gap: '2px',
      padding: '2px',
      background: 'var(--surface-sunken)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      ...style
    }
  }, themes.map(t => {
    const on = t.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      type: "button",
      role: "radio",
      "aria-checked": on,
      title: t.label,
      onClick: () => onChange && onChange(t.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        height: 'var(--control-h-sm)',
        padding: compact ? '0 6px' : '0 var(--space-3)',
        background: on ? 'var(--surface-raised)' : 'transparent',
        border: '1px solid ' + (on ? 'var(--line-hairline)' : 'transparent'),
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: on ? 'var(--text-body)' : 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-micro)',
        fontWeight: on ? 'var(--weight-semibold)' : 'var(--weight-regular)',
        transition: 'var(--motion-control)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 11,
        height: 11,
        borderRadius: 'var(--radius-sm)',
        background: t.bg,
        border: '1px solid var(--line-strong)',
        position: 'relative',
        display: 'inline-block'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        inset: '2px 2px auto auto',
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: t.swatch
      }
    })), compact ? null : /*#__PURE__*/React.createElement("span", null, t.label));
  }));
}
Object.assign(__ds_scope, { DMFORGE_THEMES, ThemeSwitcher });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/theme/ThemeSwitcher.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dm-console/Presenter.jsx
try { (() => {
const {
  Panel,
  Badge,
  Meter,
  Button,
  IconButton,
  SegmentedControl,
  StatusDot,
  MapToken,
  TerrainChip,
  Slider,
  Select,
  Checkbox,
  TextInput
} = window.DMForgeDesignSystem_e4395c;
const P = window.DMF_DATA;
const PGRID = 36; /* presenter grid step, from PresenterPage.css */

const SCENES = [{
  id: 'battle',
  label: '战斗直播',
  icon: 'sword'
}, {
  id: 'map',
  label: '战术地图',
  icon: 'map-trifold'
}, {
  id: 'party',
  label: '队伍概览',
  icon: 'users-three'
}, {
  id: 'story',
  label: '剧情画面',
  icon: 'book-open-text'
}, {
  id: 'pause',
  label: '暂停画面',
  icon: 'pause'
}];
const vit = id => P.vitals[id] || {
  ac: 10,
  speed: 30
};
const activeOf = s => P.turnOrder[s.currentTurnIndex || 0];
function Key({
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--accent)'
    }
  }, children);
}
function Vitals({
  c,
  size = 'md'
}) {
  const v = vit(c.id);
  const cell = (icon, value, sub, tone) => /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-raised)',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-' + icon,
    style: {
      fontSize: size === 'lg' ? 15 : 13,
      color: tone,
      transform: 'translateY(1px)'
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: size === 'lg' ? 'var(--type-numeral-lg)' : 'var(--type-numeral)',
      fontWeight: 600
    }
  }, value), sub ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, sub) : null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)'
    }
  }, cell('heart', c.hp, '/' + c.maxHp, 'var(--pigment-madder)'), cell('shield', v.ac, 'AC', 'var(--pigment-woad)'), cell('person-simple-run', Math.round(c.speedRemaining ?? v.speed), '/' + v.speed + 'ft', 'var(--pigment-verdigris)'));
}
function Resources({
  c,
  columns = 'repeat(auto-fit, minmax(8rem, 1fr))'
}) {
  if (!c.resources || !c.resources.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      gridTemplateColumns: columns
    }
  }, c.resources.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.name,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-raised)',
      boxShadow: 'inset 0 0 0 1px ' + (r.value <= 0 ? 'var(--pigment-madder-line)' : 'var(--line-hairline)'),
      opacity: r.value <= 0 ? 0.55 : 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, r.name), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      minWidth: 6,
      borderTop: 'var(--rule-dot)',
      transform: 'translateY(-3px)'
    }
  }), /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-numeral-sm)',
      color: 'var(--accent)'
    }
  }, r.value, "/", r.max)), /*#__PURE__*/React.createElement(Meter, {
    value: r.value,
    max: r.max,
    tone: "accent",
    showNumbers: false,
    segments: Math.max(4, Math.min(10, r.max)),
    height: 5
  }))));
}
function Conditions({
  c
}) {
  if (!c.conditions.length) return /*#__PURE__*/React.createElement("i", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--pigment-verdigris)',
      fontStyle: 'italic'
    }
  }, "\u72B6\u6001\u6B63\u5E38");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)'
    }
  }, c.conditions.map(x => /*#__PURE__*/React.createElement(Badge, {
    key: x,
    tone: "madder",
    size: "md"
  }, x, " \xB7 \u221E")));
}
function Initiative({
  inCombat = true,
  activeIndex = 0
}) {
  if (!inCombat) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-5)',
      color: 'var(--text-faint)',
      fontStyle: 'italic'
    }
  }, "\u81EA\u7531\u884C\u52A8");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 5.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-5)',
      borderBottom: 'var(--border-hairline)',
      background: 'var(--surface-panel)',
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: '5rem',
      alignSelf: 'stretch',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 2,
      paddingRight: 'var(--space-4)',
      borderRight: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(Key, null, "ROUND"), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-numeral-xl)',
      fontWeight: 700,
      lineHeight: 1,
      color: 'var(--text-body)'
    }
  }, "03")), P.turnOrder.map((entry, i) => {
    const c = P.characters.find(x => x.id === entry.id);
    if (!c) return null;
    const on = i === activeIndex;
    return /*#__PURE__*/React.createElement("div", {
      key: entry.id,
      style: {
        position: 'relative',
        minWidth: '11rem',
        height: '3.8rem',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        background: on ? 'var(--accent-soft)' : 'var(--surface-raised)',
        boxShadow: 'inset 0 0 0 1px ' + (on ? 'var(--accent-line)' : 'var(--line-hairline)')
      }
    }, /*#__PURE__*/React.createElement(MapToken, {
      kind: c.kind,
      name: c.name,
      size: 34,
      active: on
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("b", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 'var(--type-body-sm)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, c.name), /*#__PURE__*/React.createElement("small", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--type-micro)',
        color: 'var(--text-faint)'
      }
    }, "\u5148\u653B ", entry.total, " \xB7 \u987A\u4F4D ", i + 1)), on ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -8,
        right: 6,
        padding: '1px 5px',
        background: 'var(--accent)',
        color: 'var(--text-on-accent)',
        fontFamily: 'var(--font-label)',
        fontSize: 'var(--type-micro)',
        letterSpacing: 'var(--tracking-label)'
      }
    }, "\u884C\u52A8\u4E2D") : null);
  }));
}
function PresenterMap({
  showBlocked = true,
  dim = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden',
      background: 'var(--surface-sunken)',
      backgroundImage: 'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
      backgroundSize: PGRID + 'px ' + PGRID + 'px',
      opacity: dim ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      zIndex: 10,
      top: 'var(--space-4)',
      left: 'var(--space-4)',
      padding: 'var(--space-2) var(--space-4)',
      background: 'var(--surface-overlay)',
      boxShadow: 'inset 0 0 0 1px var(--bracket-line)',
      backdropFilter: 'blur(8px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--display-weight)',
      fontSize: 'var(--type-display-sm)'
    }
  }, P.campaign.name), /*#__PURE__*/React.createElement("small", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-faint)'
    }
  }, "\u955C\u5934\u8DDF\u968F\u5F53\u524D\u89D2\u8272")), [0, 4, 8, 12].map(n => /*#__PURE__*/React.createElement(React.Fragment, {
    key: n
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 5,
      top: n * PGRID + 3,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--text-faint)'
    }
  }, 'Y' + String(n).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: n * PGRID + 5,
      bottom: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--text-faint)'
    }
  }, 'X' + String(n).padStart(2, '0')))), P.terrain.filter(t => !t.secret).map(t => {
    const circle = t.shape === 'circle';
    return /*#__PURE__*/React.createElement("div", {
      key: t.id,
      style: {
        position: 'absolute',
        left: (t.gridX - (circle ? t.r : 0)) * PGRID,
        top: (t.gridY - (circle ? t.r : 0)) * PGRID,
        width: (circle ? t.r * 2 : t.w) * PGRID,
        height: (circle ? t.h ? t.h : t.r * 2 : t.h) * PGRID,
        borderRadius: circle ? '50%' : 0,
        border: '1px dashed var(--pigment-' + t.tone + '-line)',
        backgroundImage: 'repeating-linear-gradient(45deg, var(--pigment-' + t.tone + '-soft) 0 3px, transparent 3px 7px)',
        display: 'grid',
        placeContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '2px 6px',
        background: 'var(--surface-overlay)',
        fontFamily: 'var(--font-label)',
        fontSize: 'var(--type-micro)',
        letterSpacing: '.06em',
        color: 'var(--pigment-' + t.tone + ')',
        whiteSpace: 'nowrap'
      }
    }, t.name));
  }), showBlocked ? P.blockedCells.map(k => {
    const [x, y] = k.split('_').map(Number);
    return /*#__PURE__*/React.createElement("span", {
      key: k,
      style: {
        position: 'absolute',
        left: x * PGRID,
        top: y * PGRID,
        width: PGRID,
        height: PGRID,
        backgroundImage: 'repeating-linear-gradient(45deg, var(--pigment-madder-soft) 0 4px, transparent 4px 9px)',
        boxShadow: 'inset 0 0 0 1px var(--pigment-madder-line)'
      }
    });
  }) : null, P.characters.map(c => {
    const on = c.id === activeOf(P.presentation).id;
    return /*#__PURE__*/React.createElement("span", {
      key: c.id,
      style: {
        position: 'absolute',
        left: c.gridX * PGRID + 2,
        top: c.gridY * PGRID + 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(MapToken, {
      kind: c.kind,
      name: c.name,
      size: PGRID - 4,
      active: on,
      conditions: c.conditions.length
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        marginTop: 2,
        padding: '0 3px',
        background: 'var(--surface-overlay)',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-muted)'
      }
    }, c.hp, "/", c.maxHp));
  }));
}
function CharacterPanel({
  c
}) {
  if (!c) return /*#__PURE__*/React.createElement("aside", {
    style: {
      display: 'grid',
      placeContent: 'center',
      color: 'var(--text-faint)'
    }
  }, "\u7B49\u5F85\u5F53\u524D\u89D2\u8272\u2026");
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      minWidth: 0,
      overflowY: 'auto',
      padding: 'var(--space-5)',
      background: 'var(--surface-panel)',
      borderLeft: 'var(--border-hairline)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(MapToken, {
    kind: c.kind,
    name: c.name,
    size: 54,
    active: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Key, null, "\u5F53\u524D\u884C\u52A8\u89D2\u8272"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '2px 0 0',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-display-md)',
      fontWeight: 'var(--display-weight)',
      letterSpacing: 'var(--display-tracking)'
    }
  }, c.name))), /*#__PURE__*/React.createElement(Vitals, {
    c: c,
    size: "lg"
  }), /*#__PURE__*/React.createElement(Meter, {
    value: c.hp,
    max: c.maxHp,
    temp: c.tempHp,
    label: "\u751F\u547D\u503C"
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Key, null, "\u72B6\u6001\u6548\u679C"), /*#__PURE__*/React.createElement(Conditions, {
    c: c
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Key, null, "\u52A8\u4F5C\u4E0E\u8D44\u6E90"), /*#__PURE__*/React.createElement(Resources, {
    c: c,
    columns: "1fr"
  })));
}
function PartyScene() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflowY: 'auto',
      padding: '5vh 5vw'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Key, null, "ADVENTURING PARTY"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '6px 0 0',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-display-lg)',
      fontWeight: 'var(--display-weight)',
      letterSpacing: 'var(--display-tracking)'
    }
  }, "\u961F\u4F0D\u72B6\u6001")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '3vh',
      display: 'grid',
      gap: 'var(--space-5)',
      gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))'
    }
  }, P.characters.filter(c => c.kind === 'PC').map(c => /*#__PURE__*/React.createElement("article", {
    key: c.id,
    style: {
      position: 'relative',
      padding: 'var(--space-6)',
      background: 'var(--surface-panel)',
      boxShadow: 'inset 2px 0 0 var(--pigment-woad), inset 0 0 0 1px var(--line-hairline)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(MapToken, {
    kind: c.kind,
    name: c.name,
    size: 50
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-display-sm)',
      fontWeight: 'var(--display-weight)'
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-faint)'
    }
  }, "LV", c.level, " \xB7 ", c.klass))), /*#__PURE__*/React.createElement(Vitals, {
    c: c
  }), /*#__PURE__*/React.createElement(Meter, {
    value: c.hp,
    max: c.maxHp,
    temp: c.tempHp,
    showNumbers: false
  }), /*#__PURE__*/React.createElement(Conditions, {
    c: c
  }), /*#__PURE__*/React.createElement(Resources, {
    c: c
  })))));
}
function StoryScene({
  settings
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'grid',
      placeContent: 'center',
      textAlign: 'center',
      padding: '8vw',
      background: 'var(--surface-app)',
      backgroundImage: 'var(--texture-surface)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Key, null, "STORY SCENE"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 'var(--space-4) 0',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--display-weight)',
      letterSpacing: 'var(--display-tracking)',
      fontSize: 'clamp(2.5rem, 7vw, 6rem)',
      lineHeight: 1.1
    }
  }, settings.storyTitle), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--type-display-md)',
      color: 'var(--text-muted)'
    }
  }, settings.storySubtitle)));
}
function PauseScene({
  settings
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'grid',
      placeContent: 'center',
      textAlign: 'center',
      padding: '8vw'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-pause",
    style: {
      fontSize: '4rem',
      color: 'var(--text-faint)'
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 'var(--space-4) 0',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--display-weight)',
      fontSize: 'clamp(2rem, 5vw, 4rem)'
    }
  }, settings.pausedMessage), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-label)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-faint)'
    }
  }, "DMFORGE \xB7 \u6218\u5F79\u76F4\u64AD\u5C55\u793A")));
}
function PresenterContent({
  settings
}) {
  const active = P.characters.find(c => c.id === activeOf(settings).id);
  if (settings.scene === 'pause') return /*#__PURE__*/React.createElement(PauseScene, {
    settings: settings
  });
  if (settings.scene === 'story') return /*#__PURE__*/React.createElement(StoryScene, {
    settings: settings
  });
  if (settings.scene === 'party') return /*#__PURE__*/React.createElement(PartyScene, null);
  if (settings.scene === 'map') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    }, settings.showInitiative ? /*#__PURE__*/React.createElement(Initiative, null) : null, /*#__PURE__*/React.createElement(PresenterMap, {
      showBlocked: settings.showBlockedCells
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, settings.showInitiative ? /*#__PURE__*/React.createElement(Initiative, null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'grid',
      gridTemplateColumns: settings.showCharacterPanel ? 'minmax(0,1fr) minmax(18rem,25%)' : '1fr'
    }
  }, /*#__PURE__*/React.createElement(PresenterMap, {
    showBlocked: settings.showBlockedCells
  }), settings.showCharacterPanel ? /*#__PURE__*/React.createElement(CharacterPanel, {
    c: active
  }) : null), settings.showPublicEvents ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto',
      display: 'flex',
      gap: 'var(--space-5)',
      padding: 'var(--space-3) var(--space-5)',
      borderTop: 'var(--border-hairline)',
      background: 'var(--surface-panel)',
      overflow: 'hidden'
    }
  }, P.publicEvents.slice(0, 3).map((e, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      gap: 'var(--space-2)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, e.timestamp), e.content))) : null);
}

/** The /presenter route: audience-facing, so it runs in the player type register. */
function PresenterPage({
  theme = 'grimoire',
  scene,
  onScene
}) {
  const [state, setState] = React.useState(P.presentation);
  const set = patch => setState(s => ({
    ...s,
    ...patch
  }));
  const settings = scene ? {
    ...state,
    scene
  } : state;
  return /*#__PURE__*/React.createElement("div", {
    "data-theme": theme,
    "data-view": "player",
    style: {
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--surface-app)',
      fontSize: 'calc(var(--type-body) * ' + settings.fontScale + ')'
    }
  }, /*#__PURE__*/React.createElement(PresenterContent, {
    settings: settings
  }), settings.caption ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      zIndex: 40,
      left: '50%',
      bottom: '5%',
      transform: 'translateX(-50%)',
      maxWidth: '85%',
      padding: 'var(--space-4) var(--space-6)',
      background: 'var(--surface-overlay)',
      boxShadow: 'inset 0 0 0 1px var(--bracket-line), var(--shadow-float)',
      textAlign: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-display-sm)',
      fontWeight: 'var(--display-weight)'
    }
  }, settings.caption) : null, onScene ? null : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      zIndex: 60,
      right: 'var(--space-4)',
      bottom: 'var(--space-4)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-overlay)',
      boxShadow: 'inset 0 0 0 1px var(--bracket-line)',
      backdropFilter: 'blur(8px)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-faint)'
    }
  }, "\u63A7\u5236\u7AEF\u6A21\u62DF"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 420
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    value: settings.scene,
    onChange: s => set({
      scene: s
    }),
    items: SCENES.map(s => ({
      id: s.id,
      label: s.label,
      icon: s.icon
    }))
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    title: "\u5207\u6362\u5168\u5C4F",
    style: {
      position: 'absolute',
      zIndex: 50,
      right: 'var(--space-4)',
      bottom: 'var(--space-4)',
      width: 34,
      height: 34,
      display: 'grid',
      placeContent: 'center',
      opacity: 0.25,
      background: 'var(--surface-panel)',
      border: 'none',
      boxShadow: 'inset 0 0 0 1px var(--bracket-line)',
      color: 'var(--text-body)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-corners-out",
    style: {
      fontSize: 14
    },
    "aria-hidden": "true"
  })));
}

/** DM-side block, lives in the campaign settings modal. */
function PresentationControls({
  settings,
  onChange
}) {
  const set = patch => onChange({
    ...settings,
    ...patch
  });
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--type-display-sm)'
    }
  }, "Discord \u76F4\u64AD\u5C55\u793A\u7A97\u53E3"), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      borderTop: 'var(--rule-dot)'
    }
  }), /*#__PURE__*/React.createElement(StatusDot, {
    state: "synced",
    label: "\u5DF2\u8FDE\u63A5"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--type-body-lh)'
    }
  }, "\u6218\u6597\u548C\u5730\u56FE\u573A\u666F\u76F4\u63A5\u590D\u7528\u5B8C\u6574\u73A9\u5BB6\u5C55\u793A\u7AEF\uFF0C\u5E76\u540C\u6B65\u955C\u5934\u3001\u68CB\u5B50\u62D6\u52A8\u8DEF\u5F84\u548C\u79FB\u52A8\u529B\u4F30\u7B97\uFF1B\u53EA\u63A5\u6536\u8FC7\u6EE4\u540E\u7684\u516C\u5F00\u6570\u636E\uFF0C\u4E0D\u663E\u793A DM \u7B14\u8BB0\u3001\u9690\u85CF\u5730\u5F62\u6216\u540C\u6B65\u4EE4\u724C\u3002"), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: settings.scene,
    onChange: scene => set({
      scene
    }),
    items: SCENES.map(s => ({
      id: s.id,
      label: s.label,
      icon: s.icon
    })),
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "\u955C\u5934\u6A21\u5F0F",
    size: "sm",
    value: settings.cameraMode,
    onChange: e => set({
      cameraMode: e.target.value
    }),
    options: [{
      value: 'follow-active',
      label: '跟随当前行动角色'
    }, {
      value: 'follow-dm',
      label: '跟随 DM 地图镜头'
    }, {
      value: 'independent',
      label: '展示页独立镜头'
    }]
  }), /*#__PURE__*/React.createElement(Slider, {
    label: "\u754C\u9762\u5B57\u53F7",
    min: 0.75,
    max: 1.5,
    step: 0.05,
    value: settings.fontScale,
    onChange: e => set({
      fontScale: Number(e.target.value)
    }),
    format: v => Math.round(v * 100) + '%'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: settings.showInitiative,
    onChange: () => set({
      showInitiative: !settings.showInitiative
    }),
    label: "\u663E\u793A\u5148\u653B\u961F\u5217"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: settings.showCharacterPanel,
    onChange: () => set({
      showCharacterPanel: !settings.showCharacterPanel
    }),
    label: "\u663E\u793A\u89D2\u8272\u9762\u677F"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: settings.showPublicEvents,
    onChange: () => set({
      showPublicEvents: !settings.showPublicEvents
    }),
    label: "\u663E\u793A\u516C\u5F00\u4E8B\u4EF6"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: settings.showBlockedCells,
    onChange: () => set({
      showBlockedCells: !settings.showBlockedCells
    }),
    label: "\u663E\u793A\u73A9\u5BB6\u53EF\u89C1\u963B\u6321\u683C"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: settings.hideCursor,
    onChange: () => set({
      hideCursor: !settings.hideCursor
    }),
    label: "\u9690\u85CF\u9F20\u6807"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-faint)'
    }
  }, "\u76F4\u64AD\u89D2\u8272\u53EF\u89C1\u6027\uFF08\u9ED8\u8BA4\u5168\u90E8\u516C\u5F00\uFF09"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-2)',
      maxHeight: 110,
      overflowY: 'auto',
      padding: 'var(--space-3)',
      background: 'var(--surface-sunken)',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
    }
  }, P.characters.map(c => {
    const hidden = (settings.hiddenCharacterIds || []).includes(c.id);
    return /*#__PURE__*/React.createElement(Checkbox, {
      key: c.id,
      checked: !hidden,
      onChange: () => set({
        hiddenCharacterIds: hidden ? settings.hiddenCharacterIds.filter(id => id !== c.id) : [...settings.hiddenCharacterIds, c.id]
      }),
      label: /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 8,
          height: 8,
          background: c.kind === 'PC' ? 'var(--pigment-woad)' : 'var(--pigment-madder)'
        }
      }), c.name)
    });
  }))), /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    value: settings.caption,
    onChange: e => set({
      caption: e.target.value
    }),
    placeholder: "\u76F4\u64AD\u5B57\u5E55\uFF08\u7559\u7A7A\u5219\u9690\u85CF\uFF09",
    label: "\u5B57\u5E55"
  }), settings.scene === 'story' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    label: "\u5267\u60C5\u6807\u9898",
    value: settings.storyTitle,
    onChange: e => set({
      storyTitle: e.target.value
    })
  }), /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    label: "\u5267\u60C5\u526F\u6807\u9898",
    value: settings.storySubtitle,
    onChange: e => set({
      storySubtitle: e.target.value
    }),
    placeholder: "\u5267\u60C5\u526F\u6807\u9898"
  })) : null, settings.scene === 'pause' ? /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    label: "\u6682\u505C\u753B\u9762\u6587\u5B57",
    value: settings.pausedMessage,
    onChange: e => set({
      pausedMessage: e.target.value
    })
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "monitor-play"
  }, "\u6253\u5F00\u76F4\u64AD\u7A97\u53E3"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "crosshair"
  }, "\u5B9A\u4F4D\u5C55\u793A\u7A97\u53E3"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "corners-out"
  }, "\u8BF7\u6C42\u5168\u5C4F"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    icon: "x"
  }, "\u5173\u95ED")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "\u5F39\u7A97\u88AB\u963B\u6B62\uFF1F\u53EF\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00 ", /*#__PURE__*/React.createElement("code", null, "/presenter?session=", settings.sessionId)));
}
Object.assign(window, {
  PresenterPage,
  PresentationControls,
  PresenterScenes: SCENES
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dm-console/Presenter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dm-console/Shell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DS = window.DMForgeDesignSystem_e4395c;
const {
  Tabs,
  IconButton,
  Button,
  ThemeSwitcher,
  StatusDot,
  StatusLine,
  SegmentedControl,
  Badge,
  ResizeHandle
} = DS;
const D = window.DMF_DATA;

/* Falls back to a local render if the compiled bundle predates StatusLine. */
const Status = StatusLine || function Status({
  items = [],
  right = []
}) {
  const cell = (v, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      gap: 'var(--space-2)',
      whiteSpace: 'nowrap'
    }
  }, v.label ? /*#__PURE__*/React.createElement("span", {
    style: {
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-faint)'
    }
  }, v.label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: v.tone === 'accent' ? 'var(--accent)' : v.tone ? 'var(--pigment-' + v.tone + ')' : 'var(--text-muted)'
    }
  }, v.value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 26,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)',
      padding: '0 var(--space-5)',
      background: 'var(--surface-panel)',
      borderTop: 'var(--border-hairline)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      overflow: 'hidden'
    }
  }, items.map(cell), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), right.map(cell));
};
const THEME_KEY = 'dmforge-kit-theme';
function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'grimoire';
    } catch {
      return 'grimoire';
    }
  });
  const set = t => {
    setTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  };
  return [theme, set];
}
const SCREENS = [{
  id: 'map',
  label: '战术地图主视图'
}, {
  id: 'roster',
  label: '角色名册与角色卡'
}, {
  id: 'dice',
  label: '掷骰器与战役日志'
}, {
  id: 'items',
  label: '物品流转中心'
}, {
  id: 'sheets',
  label: '玩家卡与规则书导入'
}, {
  id: 'settings',
  label: '战役系统设置'
}, {
  id: 'player',
  label: '玩家展示端（只读）'
}, {
  id: 'notes',
  label: '浮动笔记工作台'
}, {
  id: 'presenter',
  label: '直播展示端（Presenter）'
}];
function ScreenPicker({
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: e => onChange(e.target.value),
    "aria-label": "\u9875\u9762",
    style: {
      appearance: 'none',
      height: 'var(--control-h-sm)',
      padding: '0 26px 0 10px',
      background: 'var(--surface-sunken)',
      color: 'var(--text-body)',
      border: 'none',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
      borderRadius: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-meta)',
      cursor: 'pointer'
    }
  }, SCREENS.map((s, i) => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, String(i + 1).padStart(2, '0'), " \xB7 ", s.label))), /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-caret-down",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      right: 9,
      fontSize: 9,
      color: 'var(--text-faint)',
      pointerEvents: 'none'
    }
  }));
}
function Header({
  theme,
  onTheme,
  playerView,
  onPlayerView,
  onSettings,
  screen,
  onScreen
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--shell-header-h)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-5)',
      padding: '0 var(--space-6)',
      background: 'var(--surface-panel)',
      borderBottom: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-3)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 21,
      letterSpacing: '.02em',
      color: 'var(--text-body)'
    }
  }, "D", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "M"), "Forge")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      letterSpacing: '.06em',
      color: 'var(--text-faint)',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, "CAMPAIGN / ", D.campaign.name, " \xB7 ", D.campaign.chapter), playerView ? /*#__PURE__*/React.createElement(Badge, {
    tone: "woad",
    icon: "eye"
  }, "\u73A9\u5BB6\u5C55\u793A\u7AEF (Read-Only)") : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), onScreen ? /*#__PURE__*/React.createElement(ScreenPicker, {
    value: screen,
    onChange: onScreen
  }) : null, /*#__PURE__*/React.createElement(StatusDot, {
    state: "synced",
    label: "\u5DF2\u540C\u6B65 \xB7 2 \u53F0\u8BBE\u5907"
  }), /*#__PURE__*/React.createElement(ThemeSwitcher, {
    value: theme,
    onChange: onTheme
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "eye",
    title: "\u5207\u6362\u73A9\u5BB6\u5C55\u793A\u7AEF",
    active: playerView,
    onClick: onPlayerView
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "floppy-disk",
    title: "\u5BFC\u51FA\u5B8C\u6574 JSON \u5B58\u6863"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "gear-six",
    title: "\u6253\u5F00\u5168\u5C40\u6218\u5F79\u4E0E\u591A\u7AEF\u7CFB\u7EDF\u8BBE\u7F6E\u9762\u677F",
    onClick: onSettings
  })));
}
const WORKSPACES = [{
  id: 'map',
  label: '1ft 战术地图',
  icon: 'map-trifold'
}, {
  id: 'items',
  label: '物品流转中心',
  icon: 'backpack'
}, {
  id: 'excel',
  label: '玩家卡与规则书导入',
  icon: 'table'
}];

/**
 * screen: map | roster | dice | items | sheets | settings | player | notes
 */
function KitPage({
  screen: initialScreen = 'map',
  picker = false
}) {
  const [theme, setTheme] = useTheme();
  const [screen, setScreenState] = React.useState(initialScreen);
  const [tab, setTab] = React.useState(initialScreen === 'items' ? 'items' : initialScreen === 'sheets' ? 'excel' : 'map');
  const [playerView, setPlayerView] = React.useState(initialScreen === 'player');
  const [settingsOpen, setSettingsOpen] = React.useState(initialScreen === 'settings');
  const [activeId, setActiveId] = React.useState('char_player_a');
  const [expandedId, setExpandedId] = React.useState(initialScreen === 'roster' ? 'char_player_a' : null);
  const [notes, setNotes] = React.useState(D.notes);
  const [scene, setScene] = React.useState('battle');
  const setScreen = next => {
    setScreenState(next);
    setTab(next === 'items' ? 'items' : next === 'sheets' ? 'excel' : 'map');
    setPlayerView(next === 'player');
    setSettingsOpen(next === 'settings');
    setExpandedId(next === 'roster' ? 'char_player_a' : null);
  };
  const pickerProps = picker ? {
    screen,
    onScreen: setScreen
  } : {};
  const leftWidth = screen === 'roster' ? 440 : 360;
  const rightWidth = screen === 'dice' ? 400 : 360;
  const showNotes = screen === 'notes' || screen === 'map';
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  React.useEffect(() => {
    window.__dmfSetTheme = setTheme;
    return () => {
      delete window.__dmfSetTheme;
    };
  }, []);
  if (screen === 'presenter') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        minWidth: 1360,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-app)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      "data-theme": theme,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        height: 40,
        flexShrink: 0,
        padding: '0 var(--space-5)',
        background: 'var(--surface-panel)',
        borderBottom: 'var(--border-hairline)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 16
      }
    }, "D", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent)'
      }
    }, "M"), "Forge"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--type-micro)',
        letterSpacing: '.06em',
        color: 'var(--text-faint)',
        whiteSpace: 'nowrap'
      }
    }, "/presenter \xB7 session a7f3c1"), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 540,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(SegmentedControl, {
      value: scene,
      onChange: setScene,
      items: PresenterScenes.map(s => ({
        id: s.id,
        label: s.label,
        icon: s.icon
      }))
    })), /*#__PURE__*/React.createElement(StatusDot, {
      state: "synced",
      label: "\u63A7\u5236\u7AEF\u5DF2\u8FDE\u63A5",
      style: {
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), picker ? /*#__PURE__*/React.createElement(ScreenPicker, {
      value: screen,
      onChange: setScreen
    }) : null, /*#__PURE__*/React.createElement(ThemeSwitcher, {
      value: theme,
      onChange: setTheme
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(PresenterPage, {
      theme: theme,
      scene: scene,
      onScene: setScene
    })));
  }
  const center = /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, !playerView ? /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    items: WORKSPACES
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, tab === 'map' ? /*#__PURE__*/React.createElement(MapWorkspace, {
    activeId: activeId,
    onActive: setActiveId,
    playerView: playerView,
    notes: showNotes ? notes.filter(n => n.open) : [],
    onNote: (id, patch) => setNotes(ns => ns.map(n => n.id === id ? {
      ...n,
      ...patch
    } : n)),
    focusNotes: screen === 'notes'
  }) : tab === 'items' ? /*#__PURE__*/React.createElement(ItemsWorkspace, null) : /*#__PURE__*/React.createElement(SheetsWorkspace, null)));
  if (playerView) {
    return /*#__PURE__*/React.createElement("div", {
      "data-theme": theme,
      "data-view": "player",
      style: shellStyle
    }, /*#__PURE__*/React.createElement(Header, _extends({
      theme: theme,
      onTheme: setTheme,
      playerView: true,
      onPlayerView: () => setPlayerView(false),
      onSettings: () => setSettingsOpen(true)
    }, pickerProps)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex'
      }
    }, center, /*#__PURE__*/React.createElement(ResizeHandle, null), /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 300,
        flexShrink: 0,
        background: 'var(--surface-panel)',
        borderLeft: 'var(--border-hairline)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement(PlayerRoster, {
      activeId: activeId
    }))), /*#__PURE__*/React.createElement(Status, {
      items: [{
        label: 'VIEW',
        value: 'PLAYER · READ-ONLY'
      }, {
        label: 'ROUND',
        value: '03'
      }, {
        label: 'MAP',
        value: D.campaign.width + '×' + D.campaign.height + ' · 1FT=' + D.campaign.cell + 'PX'
      }],
      right: [{
        label: 'LAN',
        value: '192.168.1.24',
        tone: 'verdigris'
      }]
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    "data-theme": theme,
    style: shellStyle
  }, /*#__PURE__*/React.createElement(Header, _extends({
    theme: theme,
    onTheme: setTheme,
    playerView: false,
    onPlayerView: () => setPlayerView(true),
    onSettings: () => setSettingsOpen(true)
  }, pickerProps)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: leftWidth,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: 'var(--surface-panel)',
      borderRight: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(RosterPanel, {
    activeId: activeId,
    expandedId: expandedId,
    onExpand: id => setExpandedId(e => e === id ? null : id),
    onSelect: setActiveId
  })), /*#__PURE__*/React.createElement(ResizeHandle, null), center, /*#__PURE__*/React.createElement(ResizeHandle, null), /*#__PURE__*/React.createElement("aside", {
    style: {
      width: rightWidth,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      minWidth: 0,
      overflow: 'hidden',
      background: 'var(--surface-panel)',
      borderLeft: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(RightRail, {
    defaultPane: screen === 'notes' ? 'notes' : screen === 'dice' ? 'dice' : screen === 'map' ? 'dice' : 'log',
    notes: notes,
    onToggleNote: id => setNotes(ns => ns.map(n => n.id === id ? {
      ...n,
      open: !n.open
    } : n))
  }))), /*#__PURE__*/React.createElement(Status, {
    items: [{
      label: 'ROUND',
      value: '03'
    }, {
      label: 'TURN',
      value: (D.characters.find(c => c.id === activeId) || {}).name,
      tone: 'accent'
    }, {
      label: 'MAP',
      value: D.campaign.width + '×' + D.campaign.height + ' · 1FT=' + D.campaign.cell + 'PX'
    }, {
      label: 'TOOL',
      value: 'ROAM'
    }],
    right: [{
      label: 'SAVE',
      value: '1.2MB / 10MB'
    }, {
      label: 'LAN',
      value: '192.168.1.24',
      tone: 'verdigris'
    }]
  }), /*#__PURE__*/React.createElement(SettingsModal, {
    open: settingsOpen,
    onClose: () => setSettingsOpen(false)
  }));
}
const shellStyle = {
  height: '100%',
  minWidth: 1360,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--surface-app)',
  overflow: 'hidden'
};
Object.assign(window, {
  KitPage,
  Header,
  ScreenPicker,
  SCREENS,
  useTheme
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dm-console/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dm-console/Side.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Panel,
  Button,
  IconButton,
  SegmentedControl,
  TextInput,
  Badge,
  StatPill,
  Meter,
  ResourceSlot,
  EmptyState,
  CharacterCard,
  LogEntry,
  DiceButton,
  RollResult,
  Toolbar,
  ToolbarDivider
} = window.DMForgeDesignSystem_e4395c;
const DD = window.DMF_DATA;
function GroupHeading({
  name,
  count,
  tone = 'neutral'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-4)',
      background: 'var(--surface-sunken)',
      borderTop: 'var(--border-hairline)',
      borderBottom: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-folder",
    style: {
      fontSize: 12,
      color: 'var(--text-faint)'
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      fontWeight: 'var(--weight-medium)'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, count), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "pencil-simple",
    size: "sm",
    title: "\u66F4\u540D\u4E0E\u6539\u8272"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "trash",
    size: "sm",
    tone: "danger",
    title: "\u5220\u9664\u5206\u7EC4"
  }));
}
function CharacterSheet({
  c
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      paddingTop: 'var(--space-3)',
      borderTop: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, Object.entries(c.stats).map(([k, v]) => /*#__PURE__*/React.createElement(StatPill, {
    key: k,
    label: k,
    value: v,
    size: "sm"
  }))), c.resources.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "\u8D44\u6E90\u69FD"), c.resources.map(r => /*#__PURE__*/React.createElement(ResourceSlot, _extends({
    key: r.name
  }, r, {
    onSpend: () => {},
    onRestore: () => {},
    onDelete: () => {}
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    placeholder: "\u65B0\u589E\u69FD\u540D (\u5982: \u6CD5\u672F\u4F4D)"
  }), /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    mono: true,
    placeholder: "\u4E0A\u9650",
    style: {
      width: 68
    },
    fullWidth: false
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "plus",
    title: "\u65B0\u589E\u8D44\u6E90\u69FD"
  }))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "\u7279\u8D28\u4E0E\u6280\u80FD"), Object.entries(c.feats).map(([name, desc]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: 'var(--surface-panel)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-sm)',
      fontWeight: 'var(--weight-medium)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--type-body-lh)'
    }
  }, desc)), /*#__PURE__*/React.createElement(IconButton, {
    icon: "trash",
    size: "sm",
    tone: "danger",
    title: "\u5220\u9664\u6B64\u7279\u8D28/\u6280\u80FD"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "campfire",
    title: "\u5BF9\u9009\u4E2D\u7684\u89D2\u8272\u8FDB\u884C\u77ED\u4F11\uFF08\u6062\u590D50%\u751F\u547D\u503C\uFF0C\u5145\u80FD\u91CD\u7F6E\u77ED\u4F11/\u56DE\u5408\u8D44\u6E90\uFF09"
  }, "\u77ED\u4F11"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "moon-stars",
    title: "\u5BF9\u9009\u4E2D\u7684\u89D2\u8272\u8FDB\u884C\u957F\u4F11\uFF08\u6062\u590D\u5168\u90E8\u751F\u547D\u503C/\u8D44\u6E90\u69FD\uFF0C\u91CD\u7F6E\u79FB\u52A8\u529B\uFF0C\u4E14\u5F7B\u5E95\u6E05\u9664\u8D1F\u9762\u72B6\u6001\uFF09"
  }, "\u957F\u4F11"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    icon: "copy",
    title: "\u5FEB\u901F\u590D\u5236\u6B64\u89D2\u8272\u53CA\u6240\u6709\u5F53\u524D\u5C5E\u6027\u548C\u6280\u80FD\u8D44\u6E90\u69FD"
  }, "\u590D\u5236\u89D2\u8272")));
}
function RosterPanel({
  activeId,
  expandedId,
  onExpand,
  onSelect
}) {
  const [filter, setFilter] = React.useState('ALL');
  const list = DD.characters.filter(c => filter === 'ALL' || (filter === 'PC' ? c.kind === 'PC' : c.kind !== 'PC'));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      borderBottom: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--accent)'
    }
  }, "ROSTER"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--type-display-sm)'
    }
  }, "\u89D2\u8272\u4E0E\u5206\u7EC4"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "plus"
  }, "\u65B0\u5EFA\u89D2\u8272")), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: filter,
    onChange: setFilter,
    items: [{
      id: 'ALL',
      label: '全部',
      count: DD.characters.length
    }, {
      id: 'PC',
      label: '玩家',
      count: DD.characters.filter(c => c.kind === 'PC').length
    }, {
      id: 'NPC',
      label: '怪物与NPC',
      count: DD.characters.filter(c => c.kind !== 'PC').length
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    icon: "folder-plus",
    placeholder: "\u65B0\u5EFA\u5206\u7EC4\u540D\u79F0 (\u5982: \u5730\u7262\u4F0F\u5175)..."
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "check",
    title: "\u521B\u5EFA\u65B0\u89D2\u8272\u5206\u7EC4"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    }
  }, DD.groups.map(g => {
    const members = list.filter(c => c.group === g.id);
    if (!members.length) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: g.id
    }, /*#__PURE__*/React.createElement(GroupHeading, {
      name: g.name,
      count: members.length
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)'
      }
    }, members.map(c => /*#__PURE__*/React.createElement(CharacterCard, {
      key: c.id,
      name: c.name,
      kind: c.kind,
      level: c.level,
      klass: c.klass,
      hp: c.hp,
      maxHp: c.maxHp,
      tempHp: c.tempHp,
      conditions: c.conditions,
      speedRemaining: c.speedRemaining,
      activeTurn: c.id === activeId,
      onSelect: () => {
        onSelect(c.id);
        onExpand(c.id);
      },
      actions: /*#__PURE__*/React.createElement(IconButton, {
        icon: expandedId === c.id ? 'caret-up' : 'caret-down',
        size: "sm",
        title: "\u5C55\u5F00\u89D2\u8272\u5361"
      })
    }, expandedId === c.id ? /*#__PURE__*/React.createElement(CharacterSheet, {
      c: c
    }) : null))));
  })));
}
function PlayerRoster({
  activeId
}) {
  return /*#__PURE__*/React.createElement(Panel, {
    code: "PARTY",
    title: "\u961F\u4F0D\u72B6\u6001",
    tone: "panel"
  }, DD.characters.filter(c => c.kind === 'PC').map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      paddingBottom: 'var(--space-3)',
      borderBottom: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 'var(--type-body-sm)',
      color: 'var(--text-body)'
    }
  }, c.name), c.id === activeId ? /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    size: "sm"
  }, "\u884C\u52A8\u4E2D") : null), /*#__PURE__*/React.createElement(Meter, {
    value: c.hp,
    max: c.maxHp,
    temp: c.tempHp
  }), c.conditions.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, c.conditions.map(x => /*#__PURE__*/React.createElement(Badge, {
    key: x,
    tone: "ochre",
    size: "sm"
  }, x))) : null)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-faint)',
      fontStyle: 'italic',
      lineHeight: 'var(--type-body-lh)'
    }
  }, "\u73A9\u5BB6\u5C55\u793A\u7AEF\u4E3A\u53EA\u8BFB\u89C6\u56FE\uFF1A\u9690\u85CF DM \u79C1\u5BC6\u5730\u5F62\u3001\u7B14\u8BB0\u4E0E\u602A\u7269\u5C5E\u6027\u3002"));
}
function DicePane() {
  const [formula, setFormula] = React.useState('2d20kh1+5');
  const [open, setOpen] = React.useState(false);
  const history = open ? DD.rolls.slice(1) : DD.rolls.slice(1, 2);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 'var(--space-3)'
    }
  }, [4, 6, 8, 10, 12, 20, 100].map(s => /*#__PURE__*/React.createElement(DiceButton, {
    key: s,
    sides: s
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    mono: true,
    value: formula,
    onChange: e => setFormula(e.target.value),
    placeholder: "2d6+4 \u6216 2d20kh1+5"
  }), /*#__PURE__*/React.createElement(Button, {
    icon: "dice-six",
    title: "\u6295\u63B7\u81EA\u5B9A\u4E49\u516C\u5F0F"
  })), /*#__PURE__*/React.createElement(RollResult, _extends({
    emphasis: true
  }, DD.rolls[0])), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(o => !o),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 0,
      background: 'transparent',
      border: 'none',
      color: 'var(--text-faint)',
      fontSize: 'var(--type-micro)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: 'ph-fill ph-caret-' + (open ? 'down' : 'right'),
    style: {
      fontSize: 10
    }
  }), "\u5386\u53F2 ", DD.rolls.length - 1), history.map((r, i) => /*#__PURE__*/React.createElement(RollResult, _extends({
    key: i
  }, r)))));
}
function LogPane() {
  const [cat, setCat] = React.useState('ALL');
  const logs = DD.logs.filter(l => cat === 'ALL' || l.type === cat).slice().reverse();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      minHeight: 0,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    value: cat,
    onChange: setCat,
    items: [{
      id: 'ALL',
      label: '全部',
      icon: 'stack'
    }, {
      id: 'COMBAT',
      label: '战斗',
      icon: 'sword'
    }, {
      id: 'ITEMS',
      label: '物品',
      icon: 'backpack'
    }, {
      id: 'DICE',
      label: '掷骰',
      icon: 'dice-six'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, logs.length ? logs.map((l, i) => /*#__PURE__*/React.createElement(LogEntry, _extends({
    key: i
  }, l))) : /*#__PURE__*/React.createElement(EmptyState, {
    compact: true,
    icon: "scroll",
    text: "\u8BE5\u5206\u7C7B\u4E0B\u6682\u65E0\u8BB0\u5F55\u53D1\u751F\u3002"
  })));
}
function NotesPane({
  notes,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      minHeight: 0,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "plus",
    fullWidth: true
  }, "\u65B0\u5EFA\u60AC\u6D6E\u5BF9\u8BDD\u7B14\u8BB0"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minWidth: 0
    }
  }, notes.length ? notes.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-raised)',
      border: 'var(--border-hairline)',
      borderLeft: '2px solid var(--pigment-' + n.tone + ')',
      borderRadius: 'var(--radius-md)',
      opacity: n.open ? 1 : 0.55,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 'var(--type-meta)',
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, n.title), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: '2px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: n.open ? 'eye' : 'eye-closed',
    size: "sm",
    title: n.open ? '点击隐藏浮动卡片' : '点击显示浮动卡片',
    onClick: () => onToggle(n.id)
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "trash",
    size: "sm",
    tone: "danger",
    title: "\u6C38\u4E45\u5220\u9664"
  })))) : /*#__PURE__*/React.createElement(EmptyState, {
    compact: true,
    icon: "note",
    text: "\u6682\u65E0\u4FDD\u5B58\u7684\u5BF9\u8BDD\u7B14\u8BB0",
    hint: "\u53EF\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u521B\u5EFA\u3002"
  })));
}
const PANES = [{
  id: 'dice',
  label: '掷骰',
  icon: 'dice-six',
  title: '核心掷骰器',
  meta: 'd4 – d100'
}, {
  id: 'log',
  label: '日志',
  icon: 'scroll',
  title: '战役历史记录',
  meta: DD.logs.length + ' 条'
}, {
  id: 'notes',
  label: '笔记',
  icon: 'note',
  title: '对话笔记',
  meta: null
}];

/** One right-hand rail, one pane at a time — replaces the old three stacked panels. */
function RightRail({
  defaultPane = 'dice',
  notes = [],
  onToggleNote
}) {
  const [pane, setPane] = React.useState(defaultPane);
  const active = PANES.find(p => p.id === pane) || PANES[0];
  const meta = pane === 'notes' ? notes.length + ' 条' : active.meta;
  return /*#__PURE__*/React.createElement(Panel, {
    code: active.code,
    title: active.title,
    meta: meta,
    style: {
      flex: 1,
      minHeight: 0,
      border: 'none',
      borderRadius: 0,
      background: 'transparent',
      boxShadow: 'none'
    },
    bodyStyle: {
      padding: 'var(--space-4)',
      gap: 'var(--space-4)',
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      overflowY: 'auto'
    },
    actions: pane === 'log' ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "danger",
      icon: "trash",
      title: "\u6E05\u7A7A\u6240\u6709\u6218\u5F79\u5386\u53F2\u8BB0\u5F55"
    }, "\u6E05\u7A7A") : pane === 'dice' ? /*#__PURE__*/React.createElement(IconButton, {
      icon: "arrow-counter-clockwise",
      size: "sm",
      title: "\u6E05\u7A7A\u6295\u63B7\u5386\u53F2"
    }) : null
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    value: pane,
    onChange: setPane,
    items: PANES.map(p => ({
      id: p.id,
      label: p.label,
      icon: p.icon
    })),
    size: "md"
  }), pane === 'dice' ? /*#__PURE__*/React.createElement(DicePane, null) : pane === 'log' ? /*#__PURE__*/React.createElement(LogPane, null) : /*#__PURE__*/React.createElement(NotesPane, {
    notes: notes,
    onToggle: onToggleNote
  }));
}
Object.assign(window, {
  RosterPanel,
  PlayerRoster,
  RightRail,
  DicePane,
  LogPane,
  NotesPane,
  CharacterSheet
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dm-console/Side.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dm-console/Work.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Panel,
  Button,
  IconButton,
  SegmentedControl,
  TextInput,
  Select,
  Checkbox,
  Badge,
  StatPill,
  EmptyState,
  Modal,
  Toolbar,
  ToolbarDivider,
  ToolbarLabel,
  MapToken,
  TerrainChip,
  ItemRow,
  InitiativeTrack,
  FloatingNoteCard,
  SheetTable,
  StatusDot
} = window.DMForgeDesignSystem_e4395c;
const W = window.DMF_DATA;
const CELL = 40;
function TerrainShape({
  t
}) {
  const hatch = 'repeating-linear-gradient(45deg, var(--pigment-' + t.tone + '-soft) 0 3px, transparent 3px 7px)';
  const base = {
    position: 'absolute',
    backgroundImage: hatch,
    border: (t.secret ? '1px dashed ' : '1px solid ') + 'var(--pigment-' + t.tone + '-line)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: '3px 5px'
  };
  const label = /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      letterSpacing: '.05em',
      color: 'var(--pigment-' + t.tone + ')'
    }
  }, t.name);
  if (t.shape === 'circle') {
    const d = t.r * 2 * CELL;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...base,
        left: (t.gridX - t.r) * CELL,
        top: (t.gridY - t.r) * CELL,
        width: d,
        height: d,
        borderRadius: '50%',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, label);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...base,
      left: t.gridX * CELL,
      top: t.gridY * CELL,
      width: t.w * CELL,
      height: t.h * CELL
    }
  }, label);
}
function MapWorkspace({
  activeId,
  onActive,
  playerView,
  notes = [],
  onNote,
  focusNotes
}) {
  const [tool, setTool] = React.useState('roam');
  const [inCombat, setInCombat] = React.useState(true);
  const visibleTerrain = playerView ? W.terrain.filter(t => !t.secret) : W.terrain;
  const participants = W.characters.filter(c => c.initiative).slice().sort((a, b) => b.initiative - a.initiative).map(c => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    initiative: c.initiative
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, !playerView ? /*#__PURE__*/React.createElement(Toolbar, {
    style: {
      borderBottom: 'var(--border-hairline)',
      background: 'var(--surface-panel)'
    },
    dense: true
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    fullWidth: false,
    options: [{
      value: 'm1',
      label: '村口酒馆大厅 (地上)'
    }, {
      value: 'm2',
      label: '地底秘境遗迹 (地下)'
    }],
    style: {
      width: 210
    }
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "plus",
    title: "\u65B0\u5EFA\u4E00\u5F20\u7A7A\u767D\u63A8\u6F14\u5730\u56FE"
  }, "\u65B0\u5EFA\u5730\u56FE"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    icon: "sliders-horizontal",
    title: "\u914D\u7F6E\u5F53\u524D\u6FC0\u6D3B\u5730\u56FE\u7684\u540D\u5B57\u3001\u80CC\u666F\u56FE\u7247 URL \u4E0E\u7F51\u683C\u5C3A\u5E45"
  }, "\u5730\u56FE\u914D\u7F6E"), /*#__PURE__*/React.createElement(ToolbarDivider, null), /*#__PURE__*/React.createElement(ToolbarLabel, null, "Tools"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "hand",
    active: tool === 'roam',
    onClick: () => setTool('roam'),
    title: "\u9009\u62E9/\u6F2B\u6E38\u6A21\u5F0F\uFF08\u5728\u5730\u56FE\u4E0A\u76F4\u63A5\u62D6\u52A8\u533A\u57DF\u66F4\u6539\u4F4D\u7F6E\uFF0C\u6216\u62D6\u62FD\u8FB9\u7F18\u8FB9\u89D2\u7F29\u653E\u5927\u5C0F\uFF09"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "selection",
    active: tool === 'select',
    onClick: () => setTool('select'),
    title: "\u6846\u9009\u533A\u57DF\u6A21\u5F0F\uFF08\u5728\u5730\u56FE\u4E0A\u62D6\u62FD\u51FA\u9009\u533A\uFF0C\u6846\u5185\u963B\u6321\u683C\u53EF\u8FDB\u884C\u5E73\u79FB\u6216\u6D88\u9664\uFF09"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "wall",
    active: tool === 'wall',
    onClick: () => setTool('wall'),
    title: "\u7ED8\u5236\u5B9E\u4F53\u963B\u6321\u683C"
  }), /*#__PURE__*/React.createElement(ToolbarDivider, null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement("span", null, W.campaign.width, "\xD7", W.campaign.height), /*#__PURE__*/React.createElement("span", null, "1ft = ", CELL, "px")), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), inCombat ? /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "danger",
    icon: "flag-checkered",
    title: "\u9000\u51FA\u5F53\u524D\u6218\u6597\u6A21\u5F0F\uFF0C\u6E05\u9664\u5148\u653B\u884C\u52A8\u961F\u5217",
    onClick: () => setInCombat(false)
  }, "\u7ED3\u675F\u6218\u6597") : /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "sword",
    title: "\u53D1\u8D77\u6218\u6597\u56DE\u5408\uFF0C\u9009\u62E9\u53C2\u6218\u89D2\u8272\u6295\u5148\u653B",
    onClick: () => setInCombat(true)
  }, "\u53D1\u8D77\u6218\u6597")) : null, inCombat && !playerView ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-3) var(--space-4)',
      borderBottom: 'var(--border-hairline)',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement(InitiativeTrack, {
    round: 3,
    activeId: activeId,
    participants: participants,
    onSelect: onActive,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      icon: "arrow-u-up-left",
      title: "\u64A4\u9500\u5F53\u524D\u56DE\u5408\u7684\u68CB\u5B50\u79FB\u52A8\uFF0C\u8FD4\u56DE\u672C\u56DE\u5408\u884C\u52A8\u8D77\u70B9\uFF0C\u5E76\u5B8C\u5168\u590D\u539F\u79FB\u52A8\u529B"
    }, "\u64A4\u9500\u79FB\u52A8"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      icon: "skip-forward",
      title: "\u7ED3\u675F\u8BE5\u89D2\u8272\u5F53\u524D\u56DE\u5408\uFF0C\u79FB\u4EA4\u884C\u52A8\u6743\u7ED9\u4E0B\u4E00\u4F4D\u89D2\u8272"
    }, "\u7ED3\u675F\u56DE\u5408"))
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--surface-sunken)',
      backgroundImage: 'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
      backgroundSize: CELL + 'px ' + CELL + 'px',
      cursor: tool === 'roam' ? 'grab' : 'crosshair'
    }
  }, [0, 4, 8, 12, 16].map(n => /*#__PURE__*/React.createElement(React.Fragment, {
    key: 'g' + n
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 5,
      top: n * CELL + 3,
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '.1em',
      color: 'var(--text-faint)',
      pointerEvents: 'none'
    }
  }, 'Y' + String(n).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: n * CELL + 5,
      bottom: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '.1em',
      color: 'var(--text-faint)',
      pointerEvents: 'none'
    }
  }, 'X' + String(n).padStart(2, '0')))), (() => {
    const a = W.characters.find(c => c.id === activeId);
    if (!a) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: a.gridY * CELL + CELL / 2,
        height: 1,
        background: 'var(--accent-line)',
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: a.gridX * CELL + CELL / 2,
        width: 1,
        background: 'var(--accent-line)',
        pointerEvents: 'none'
      }
    }));
  })(), visibleTerrain.map(t => /*#__PURE__*/React.createElement(TerrainShape, {
    key: t.id,
    t: t
  })), !playerView ? W.blockedCells.map(k => {
    const [x, y] = k.split('_').map(Number);
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        position: 'absolute',
        left: x * CELL,
        top: y * CELL,
        width: CELL,
        height: CELL,
        background: 'var(--surface-hover)',
        border: '1px solid var(--line-strong)'
      }
    });
  }) : null, W.characters.map(c => /*#__PURE__*/React.createElement("span", {
    key: c.id,
    style: {
      position: 'absolute',
      left: c.gridX * CELL + 4,
      top: c.gridY * CELL + 4
    }
  }, /*#__PURE__*/React.createElement(MapToken, {
    kind: c.kind,
    name: c.name,
    size: CELL - 8,
    active: c.id === activeId,
    conditions: c.conditions.length,
    onClick: () => onActive && onActive(c.id)
  }))), notes.map(n => /*#__PURE__*/React.createElement(FloatingNoteCard, {
    key: n.id,
    title: n.title,
    content: n.content,
    tone: n.tone,
    minimized: n.minimized,
    width: focusNotes ? 300 : 280,
    height: focusNotes ? 210 : 180,
    onToggle: () => onNote && onNote(n.id, {
      minimized: !n.minimized
    }),
    onClose: () => onNote && onNote(n.id, {
      open: false
    }),
    onToneChange: tone => onNote && onNote(n.id, {
      tone
    }),
    style: {
      position: 'absolute',
      left: n.x,
      top: n.y,
      zIndex: 20
    }
  })), !playerView ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 'var(--space-4)',
      bottom: 'var(--space-4)',
      width: 240,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    code: "TERRAIN",
    title: "\u5730\u5F62\u533A\u57DF",
    style: {
      background: 'var(--surface-overlay)',
      backdropFilter: 'blur(8px)'
    },
    bodyStyle: {
      padding: 'var(--space-3)',
      gap: 'var(--space-2)'
    }
  }, W.terrain.map(t => /*#__PURE__*/React.createElement(TerrainChip, {
    key: t.id,
    name: t.name,
    shape: t.shape,
    tone: t.tone,
    secret: t.secret,
    blocked: t.blocked,
    meta: t.shape === 'circle' ? 'r' + t.r : t.w + '×' + t.h
  })))) : null, playerView ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 'var(--space-5)',
      bottom: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "woad",
    icon: "eye"
  }, "\u53EA\u8BFB\u5C55\u793A \xB7 DM \u79C1\u5BC6\u5185\u5BB9\u5DF2\u9690\u85CF")) : null));
}
function ItemsWorkspace() {
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('ALL');
  const items = W.items.filter(i => (cat === 'ALL' || i.category === cat) && (!q || i.name.includes(q)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gap: 'var(--space-5)',
      padding: 'var(--space-5)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    code: "ITEMS",
    title: "\u7269\u54C1\u6D41\u8F6C\u4E2D\u5FC3",
    meta: W.items.length + ' 件',
    flush: true,
    scroll: true,
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      icon: "plus"
    }, "\u5165\u5E93")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-3)',
      padding: 'var(--space-4)',
      borderBottom: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    icon: "magnifying-glass",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u7269\u54C1\u540D\u79F0 (\u81EA\u52A8\u5339\u914D\u5DF2\u5B58\u6A21\u677F)",
    style: {
      flex: '1 1 220px',
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 380px',
      minWidth: 340
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    value: cat,
    onChange: setCat,
    items: [{
      id: 'ALL',
      label: '全部'
    }, {
      id: '武器',
      label: '武器'
    }, {
      id: '消耗品',
      label: '消耗品'
    }, {
      id: '护甲',
      label: '护甲'
    }, {
      id: '杂物',
      label: '杂物'
    }]
  }))), items.length ? items.map(i => /*#__PURE__*/React.createElement(ItemRow, _extends({
    key: i.id
  }, i, {
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      icon: "hand-arrow-down",
      size: "sm",
      title: "\u6D88\u80171\u4E2A\u7269\u54C1"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "arrows-left-right",
      size: "sm",
      title: "\u8F6C\u79FB\u5F52\u5C5E"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "trash",
      size: "sm",
      tone: "danger",
      title: "\u5F7B\u5E95\u5220\u9664\u7269\u54C1"
    }))
  }))) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "backpack",
    text: "\u6CA1\u6709\u5339\u914D\u7684\u7269\u54C1",
    hint: "\u6362\u4E2A\u5173\u952E\u5B57\uFF0C\u6216\u4ECE\u53F3\u4FA7\u6A21\u677F\u5FEB\u901F\u5165\u5E93\u3002"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    code: "NEW",
    title: "\u5FEB\u901F\u5165\u5E93"
  }, /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    label: "\u7269\u54C1\u540D\u79F0",
    placeholder: "\u7269\u54C1\u540D\u79F0 (\u81EA\u52A8\u5339\u914D\u5DF2\u5B58\u6A21\u677F)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    mono: true,
    label: "\u6570\u91CF",
    placeholder: "\u6570\u91CF",
    defaultValue: "1"
  }), /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    label: "\u5206\u7C7B",
    options: [{
      value: 'c',
      label: '消耗品'
    }, {
      value: 'w',
      label: '武器'
    }, {
      value: 'a',
      label: '护甲'
    }]
  })), /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    multiline: true,
    rows: 2,
    label: "\u63CF\u8FF0\u6548\u679C",
    placeholder: "\u63CF\u8FF0\u6548\u679C"
  }), /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    label: "\u5F52\u5C5E",
    options: [{
      value: 'WORLD',
      label: '世界物品池'
    }, ...W.characters.map(c => ({
      value: c.id,
      label: c.name
    }))]
  }), /*#__PURE__*/React.createElement(Button, {
    icon: "check",
    fullWidth: true
  }, "\u5165\u5E93")), /*#__PURE__*/React.createElement(Panel, {
    code: "TEMPLATES",
    title: "\u7269\u54C1\u6A21\u677F",
    meta: W.templates.length + ' 个',
    scroll: true
  }, W.templates.map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)'
    }
  }, t), /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-fat-line-down",
    size: "sm",
    title: "\u4ECE\u6A21\u677F\u5165\u5E93"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "trash",
    size: "sm",
    tone: "danger",
    title: "\u5220\u9664\u6B64\u7269\u54C1\u6A21\u677F"
  }))))));
}
function SheetsWorkspace() {
  const [q, setQ] = React.useState('护甲');
  const [size, setSize] = React.useState(14);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: 'var(--space-5)',
      padding: 'var(--space-5)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    code: "SHEETS",
    title: "\u5DF2\u5BFC\u5165\u5361\u7247",
    meta: "1 / 50 \u8868"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: 'var(--accent-soft)',
      border: '1px solid var(--accent-line)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph-fill ph-file-xls",
    style: {
      fontSize: 15,
      color: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 'var(--type-meta)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, W.sheet.title), /*#__PURE__*/React.createElement(IconButton, {
    icon: "trash",
    size: "sm",
    tone: "danger",
    title: "\u5F7B\u5E95\u4ECE\u672C\u6218\u5F79\u4E2D\u79FB\u9664\u6B64\u89D2\u8272\u5361"
  })), /*#__PURE__*/React.createElement(EmptyState, {
    compact: true,
    icon: "file-plus",
    text: "\u62D6\u5165 .xlsx / .xls / .xlsm / .xlsb",
    hint: "\u5355\u6587\u4EF6\u6700\u5927 2MB\uFF0C\u6700\u591A 50 \u4E2A\u5DE5\u4F5C\u8868\uFF1B\u4EC5\u5BFC\u5165\u53EF\u4FE1\u6765\u6E90\u7684\u5DE5\u4F5C\u7C3F\u3002",
    action: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      icon: "upload-simple"
    }, "\u9009\u62E9\u6587\u4EF6")
  })), /*#__PURE__*/React.createElement(Panel, {
    code: "RULEBOOK",
    title: "\u89C4\u5219\u4E66"
  }, /*#__PURE__*/React.createElement(EmptyState, {
    compact: true,
    icon: "book-open-text",
    text: "\u6682\u65E0\u89C4\u5219\u4E66",
    hint: "\u5BFC\u5165\u540E\u53EF\u70B9\u51FB\u6807\u9898\u76F4\u63A5\u91CD\u547D\u540D\u3002"
  }))), /*#__PURE__*/React.createElement(Panel, {
    code: "TABLE",
    title: W.sheet.title,
    flush: true,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(IconButton, {
      icon: "minus",
      size: "sm",
      title: "\u51CF\u5C0F\u5B57\u53F7",
      onClick: () => setSize(s => Math.max(11, s - 1))
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--type-micro)',
        color: 'var(--text-faint)',
        minWidth: 30,
        textAlign: 'center'
      }
    }, size, "px"), /*#__PURE__*/React.createElement(IconButton, {
      icon: "plus",
      size: "sm",
      title: "\u589E\u5927\u5B57\u53F7",
      onClick: () => setSize(s => Math.min(18, s + 1))
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "arrow-counter-clockwise",
      size: "sm",
      title: "\u9ED8\u8BA4\u5B57\u53F7 (14px)",
      onClick: () => setSize(14)
    }))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      padding: 'var(--space-4)',
      borderBottom: 'var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    size: "sm",
    icon: "magnifying-glass",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u8F93\u5165\u5173\u952E\u5B57\u8FDB\u884C\u9AD8\u4EAE\u68C0\u7D22..."
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "x",
    title: "\u6E05\u7A7A\u641C\u7D22",
    onClick: () => setQ('')
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    icon: "note",
    title: "\u4EE5\u6D6E\u52A8\u7B14\u8BB0\u5F62\u5F0F\u9489\u5728\u5730\u56FE\u4E0A"
  }, "\u9489\u4E3A\u7B14\u8BB0")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4)',
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement(SheetTable, {
    columns: W.sheet.columns,
    rows: W.sheet.rows,
    highlight: q,
    fontSize: size
  }))));
}
function SettingsModal({
  open,
  onClose
}) {
  const [lan, setLan] = React.useState(true);
  const [pres, setPres] = React.useState(W.presentation);
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "\u6218\u5F79\u7CFB\u7EDF\u8BBE\u7F6E (Campaign Settings)",
    icon: "gear-six",
    width: 680,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "\u5173\u95ED"), /*#__PURE__*/React.createElement(Button, {
      icon: "check",
      onClick: onClose
    }, "\u4FDD\u5B58\u8BBE\u7F6E"))
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--type-display-sm)'
    }
  }, "\u5C40\u57DF\u7F51\u540C\u6B65"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)',
      background: 'var(--surface-raised)',
      border: 'var(--border-hairline)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement(StatusDot, {
    state: lan ? 'synced' : 'local',
    label: lan ? '已同步 · 2 台设备' : '单机模式 · 仅本地存档'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: lan,
    onChange: () => setLan(!lan),
    label: "\u542F\u7528\u5C40\u57DF\u7F51\u80FD\u529B"
  })), /*#__PURE__*/React.createElement(TextInput, {
    label: "\u540C\u6B65\u4EE4\u724C (Bearer Token)",
    mono: true,
    type: "password",
    defaultValue: "dmforge-lan-9f2c71a4e8",
    hint: "\u8BF7\u52FF\u5206\u4EAB\u7ED9\u4E0D\u53D7\u4FE1\u4EFB\u7684\u4EBA\uFF1B\u4EE4\u724C\u65E0\u6548\u65F6\u5E94\u7528\u81EA\u52A8\u964D\u7EA7\u4E3A\u5355\u673A\u6A21\u5F0F\u3002"
  }), /*#__PURE__*/React.createElement(TextInput, {
    label: "\u914D\u5BF9\u94FE\u63A5 (Paired LAN URL)",
    mono: true,
    defaultValue: "http://192.168.1.24:5173/#syncToken=\u2026",
    suffix: "\u590D\u5236"
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--type-display-sm)'
    }
  }, "\u5B58\u6863"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(StatPill, {
    label: "\u6218\u5F79\u5927\u5C0F",
    value: "1.2MB",
    sub: "\u4E0A\u9650 10MB",
    size: "sm",
    tone: "neutral"
  }), /*#__PURE__*/React.createElement(StatPill, {
    label: "\u89D2\u8272",
    value: W.characters.length,
    size: "sm"
  }), /*#__PURE__*/React.createElement(StatPill, {
    label: "\u5730\u56FE",
    value: W.campaign.maps,
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "upload-simple"
  }, "\u5BFC\u5165 JSON \u5B58\u6863"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "download-simple"
  }, "\u5BFC\u51FA JSON \u5B58\u6863"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    icon: "warning"
  }, "\u91CD\u7F6E\u672C\u5730\u6218\u5F79")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--type-meta)',
      color: 'var(--text-muted)'
    }
  }, "\u8986\u76D6\u524D\u4F1A\u5C06\u65E7\u72B6\u6001\u590D\u5236\u5230 ", /*#__PURE__*/React.createElement("code", null, "campaign_state_backup.json"), "\uFF1B\u5199\u5165\u4F7F\u7528 ETag / If-Match \u68C0\u6D4B\u5E76\u53D1\u51B2\u7A81\u3002")), /*#__PURE__*/React.createElement(PresentationControls, {
    settings: pres,
    onChange: setPres
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--type-display-sm)'
    }
  }, "\u73A9\u5BB6\u5C55\u793A\u7AEF"), /*#__PURE__*/React.createElement(Checkbox, {
    checked: true,
    label: "\u9690\u85CF\u6807\u8BB0\u4E3A\u201C\u4EC5 DM \u53EF\u89C1\u201D\u7684\u5730\u5F62\u4E0E\u7B14\u8BB0",
    hint: "\u73A9\u5BB6\u5C55\u793A\u7AEF (Read-Only) \u6C38\u8FDC\u65E0\u6CD5\u7F16\u8F91\u89D2\u8272\u3001\u7269\u54C1\u6216\u5730\u56FE\u3002"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "\u5728\u5C55\u793A\u7AEF\u9690\u85CF\u602A\u7269\u5177\u4F53\u751F\u547D\u503C\uFF0C\u4EC5\u663E\u793A\u72B6\u6001\u6761"
  })));
}
Object.assign(window, {
  MapWorkspace,
  ItemsWorkspace,
  SheetsWorkspace,
  SettingsModal,
  TerrainShape
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dm-console/Work.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dm-console/data.js
try { (() => {
window.DMF_DATA = {
  presentation: {
    scene: 'battle',
    showInitiative: true,
    showCharacterPanel: true,
    showPublicEvents: true,
    showBlockedCells: true,
    hiddenCharacterIds: [],
    cameraMode: 'follow-active',
    fontScale: 1,
    hideCursor: false,
    caption: '第三通道 · 飞矢陷阱已触发',
    storyTitle: '冒险仍在继续',
    storySubtitle: '北山矿井 · 第三日黄昏',
    pausedMessage: '游戏暂停 · 请稍候',
    sessionId: 'a7f3c1'
  },
  vitals: {
    char_player_a: {
      ac: 18,
      speed: 30
    },
    char_player_b: {
      ac: 14,
      speed: 40
    },
    char_player_c: {
      ac: 13,
      speed: 25
    },
    char_goblin_squad: {
      ac: 12,
      speed: 30
    },
    char_village_elder: {
      ac: 10,
      speed: 20
    }
  },
  publicEvents: [{
    type: 'COMBAT',
    content: '奥利奥（战士）对哥布林斥候 x3 发动横扫攻击，命中 2 个目标。',
    timestamp: '21:03:20'
  }, {
    type: 'DICE',
    content: '莉拉（游荡者）先攻 21，本轮首先行动。',
    timestamp: '21:02:58'
  }, {
    type: 'COMBAT',
    content: '巴克（牧师）进入濒死状态，需要一次医疗检定。',
    timestamp: '21:08:39'
  }],
  turnOrder: [{
    id: 'char_player_b',
    roll: 20,
    modifier: 1,
    total: 21
  }, {
    id: 'char_player_a',
    roll: 17,
    modifier: 1,
    total: 18
  }, {
    id: 'char_goblin_squad',
    roll: 12,
    modifier: 2,
    total: 14
  }, {
    id: 'char_village_elder',
    roll: 5,
    modifier: 0,
    total: 5
  }],
  campaign: {
    name: '村口酒馆大厅 (地上)',
    chapter: '第 3 章 · 北山矿井',
    maps: 2,
    cell: 40,
    width: 60,
    height: 40
  },
  groups: [{
    id: 'group_pcs',
    name: '玩家成员'
  }, {
    id: 'group_npcs',
    name: '怪物与NPC'
  }],
  characters: [{
    id: 'char_player_a',
    name: '奥利奥 (战士)',
    kind: 'PC',
    group: 'group_pcs',
    level: 1,
    klass: '战士',
    hitDice: 'd8',
    hp: 45,
    maxHp: 55,
    tempHp: 4,
    gridX: 5,
    gridY: 5,
    speedRemaining: 30,
    initiative: 18,
    conditions: ['重甲防护'],
    stats: {
      '力量 (Physical)': 16,
      '敏捷 (Agility)': 12,
      '体质 (Fortitude)': 14,
      '感知 (Perception)': 10,
      '智力 (Intellect)': 8,
      '神秘 (Arcane)': 6
    },
    feats: {
      '重甲防护': '受到物理伤害减少3点',
      '横扫攻击': '一次攻击同时打击两个紧挨着的目标'
    },
    resources: [{
      name: '动作',
      value: 1,
      max: 1,
      resetType: 'turn'
    }, {
      name: '附赠动作',
      value: 1,
      max: 1,
      resetType: 'turn'
    }, {
      name: '生命骰 (d8)',
      value: 1,
      max: 1,
      resetType: 'long'
    }]
  }, {
    id: 'char_player_b',
    name: '莉拉 (游荡者)',
    kind: 'PC',
    group: 'group_pcs',
    level: 1,
    klass: '游荡者',
    hp: 28,
    maxHp: 34,
    tempHp: 0,
    gridX: 6,
    gridY: 7,
    speedRemaining: 40,
    initiative: 21,
    conditions: [],
    stats: {
      '力量 (Physical)': 9,
      '敏捷 (Agility)': 17,
      '体质 (Fortitude)': 11,
      '感知 (Perception)': 14,
      '智力 (Intellect)': 12,
      '神秘 (Arcane)': 8
    },
    feats: {
      '暗影潜行': '在阴影中移动不触发被动感知检定'
    },
    resources: [{
      name: '动作',
      value: 1,
      max: 1,
      resetType: 'turn'
    }, {
      name: '偷袭',
      value: 0,
      max: 1,
      resetType: 'turn'
    }]
  }, {
    id: 'char_player_c',
    name: '巴克 (牧师)',
    kind: 'PC',
    group: 'group_pcs',
    level: 1,
    klass: '牧师',
    hp: 9,
    maxHp: 30,
    tempHp: 0,
    gridX: 4,
    gridY: 6,
    speedRemaining: 25,
    initiative: 7,
    conditions: ['流血', '恐慌'],
    stats: {
      '力量 (Physical)': 11,
      '敏捷 (Agility)': 10,
      '体质 (Fortitude)': 13,
      '感知 (Perception)': 15,
      '智力 (Intellect)': 12,
      '神秘 (Arcane)': 16
    },
    feats: {
      '战地祝祷': '一次长休内可为全队追加 1d4 命中加值'
    },
    resources: [{
      name: '法术位 (1环)',
      value: 2,
      max: 4,
      resetType: 'long'
    }, {
      name: '引导神力',
      value: 1,
      max: 1,
      resetType: 'short'
    }]
  }, {
    id: 'char_goblin_squad',
    name: '哥布林斥候 x3',
    kind: 'MONSTER',
    group: 'group_npcs',
    level: 1,
    hp: 15,
    maxHp: 15,
    tempHp: 0,
    gridX: 12,
    gridY: 10,
    speedRemaining: 30,
    initiative: 14,
    conditions: ['潜伏优势'],
    stats: {
      '力量 (Physical)': 8,
      '敏捷 (Agility)': 14,
      '体质 (Fortitude)': 10,
      '感知 (Perception)': 12,
      '智力 (Intellect)': 6,
      '神秘 (Arcane)': 2
    },
    feats: {
      '潜伏优势': '在草丛/阴影处具有伏击优势加成。'
    },
    resources: [{
      name: '动作',
      value: 1,
      max: 1,
      resetType: 'turn'
    }]
  }, {
    id: 'char_village_elder',
    name: '独眼老汉 (村民)',
    kind: 'NPC',
    group: 'group_npcs',
    level: 1,
    hp: 6,
    maxHp: 6,
    tempHp: 0,
    gridX: 9,
    gridY: 4,
    speedRemaining: 20,
    initiative: 5,
    conditions: [],
    stats: {
      '力量 (Physical)': 7,
      '敏捷 (Agility)': 8,
      '体质 (Fortitude)': 9,
      '感知 (Perception)': 13,
      '智力 (Intellect)': 11,
      '神秘 (Arcane)': 4
    },
    feats: {
      '旧矿图': '持有一张北山废弃矿井的手绘地图。'
    },
    resources: []
  }],
  terrain: [{
    id: 't1',
    name: '烈焰熔岩深渊',
    shape: 'rect',
    tone: 'madder',
    gridX: 15,
    gridY: 8,
    w: 8,
    h: 4,
    blocked: true,
    secret: false
  }, {
    id: 't2',
    name: '剧毒腐蚀气溶胶',
    shape: 'circle',
    tone: 'verdigris',
    gridX: 28,
    gridY: 12,
    r: 5,
    blocked: false,
    secret: false
  }, {
    id: 't3',
    name: '隐藏针刺陷阱',
    shape: 'rect',
    tone: 'ochre',
    gridX: 5,
    gridY: 14,
    w: 2,
    h: 2,
    blocked: false,
    secret: true
  }],
  blockedCells: ['8_7', '8_8', '8_9', '9_7', '9_9'],
  items: [{
    id: 'i1',
    name: '远古圣水',
    category: '消耗品',
    quantity: 3,
    owner: '世界物品池',
    description: '饮用后回复20点生命，并对不死生物产生5d6的真实灼烧伤害。'
  }, {
    id: 'i2',
    name: '魔岩大剑',
    category: '武器',
    quantity: 1,
    owner: '世界物品池',
    description: '需要力量15以上。攻击伤害为 2d8+3 物理碎甲伤害。'
  }, {
    id: 'i3',
    name: '初级治疗药水',
    category: '消耗品',
    quantity: 2,
    owner: '奥利奥 (战士)',
    description: '饮用回复1d8+2点生命值。'
  }, {
    id: 'i4',
    name: '矿工皮甲',
    category: '护甲',
    quantity: 1,
    owner: '莉拉 (游荡者)',
    description: '护甲等级 12 + 敏捷调整值，潜行不受惩罚。'
  }, {
    id: 'i5',
    name: '旧矿图残页',
    category: '杂物',
    quantity: 1,
    owner: '世界物品池',
    description: '标注了三条通往矿井下层的路径，其中一条已塌方。'
  }],
  templates: ['远古圣水', '魔岩大剑', '初级治疗药水'],
  logs: [{
    type: 'SYSTEM',
    content: '**DMForge 战役辅助系统** 已成功初始化。',
    timestamp: '20:56:01'
  }, {
    type: 'DICE',
    content: '掷骰 [2d20kh1+5] 结果: **24** (2d20kh1: [7, 18 → Keep High: 18] = 18)',
    timestamp: '21:03:12'
  }, {
    type: 'COMBAT',
    content: '奥利奥 (战士) 对 哥布林斥候 x3 发动横扫攻击，命中 **2** 个目标。',
    timestamp: '21:03:20'
  }, {
    type: 'COMBAT',
    content: '哥布林斥候 x3 受到 **8** 点物理伤害，剩余 **7/15**。',
    timestamp: '21:03:21'
  }, {
    type: 'ITEMS',
    content: '奥利奥 (战士) 获得 **初级治疗药水 ×2**。',
    timestamp: '21:05:44'
  }, {
    type: 'DICE',
    content: '掷骰 [2d6+4] 结果: **13** (2d6: [3 + 6] = 9)',
    timestamp: '21:07:02'
  }, {
    type: 'COMBAT',
    content: '巴克 (牧师) 进入 **濒死** 状态，需要一次医疗检定。',
    timestamp: '21:08:39'
  }],
  rolls: [{
    formula: '2d20kh1+5',
    total: 24,
    detail: '[7, 18 → Keep High: 18] (Mod: 18+5)',
    time: '21:03:12'
  }, {
    formula: '2d6+4',
    total: 13,
    detail: '2d6: [3 + 6] = 9',
    time: '21:07:02'
  }, {
    formula: '1d8+2',
    total: 7,
    detail: '1d8: [5]',
    time: '21:09:50'
  }],
  notes: [{
    id: 'n1',
    title: '酒馆传闻与秘密',
    tone: 'ochre',
    x: 40,
    y: 40,
    open: true,
    minimized: false,
    content: '听酒馆老板娘提起，北山废弃矿井深处，每到月圆之夜就会传出低沉的龙吼声。另外，村口的独眼老汉似乎藏有一张旧矿图...'
  }, {
    id: 'n2',
    title: '地牢隐藏陷阱提示',
    tone: 'madder',
    x: 40,
    y: 268,
    open: true,
    minimized: false,
    content: '注意：第三通道的转角处，第4块和第7块地砖下装有重力压敏机关，踏入会触发两侧墙壁的飞矢陷阱，伤害为 2d6 穿刺。'
  }, {
    id: 'n3',
    title: '哥布林首领台词',
    tone: 'verdigris',
    x: 40,
    y: 500,
    open: true,
    minimized: true,
    content: '“你们的火把在我的矿洞里烧不了多久。”'
  }],
  sheet: {
    title: '玩家卡 · 奥利奥 (战士).xlsx',
    columns: ['属性', '数值', '调整值', '备注'],
    rows: [['力量 (Physical)', 16, '+3', '重甲防护 / 横扫攻击'], ['敏捷 (Agility)', 12, '+1', ''], ['体质 (Fortitude)', 14, '+2', '长休恢复全部生命'], ['感知 (Perception)', 10, '0', ''], ['智力 (Intellect)', 8, '-1', ''], ['神秘 (Arcane)', 6, '-2', '不可施法'], ['护甲等级', 18, '', '链甲 + 盾牌'], ['先攻', 18, '+1', '本轮已行动'], ['移动力', 30, '', '剩余 30ft'], ['生命骰', 'd8', '', '1 / 1']]
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dm-console/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Toolbar = __ds_scope.Toolbar;

__ds_ns.ToolbarDivider = __ds_scope.ToolbarDivider;

__ds_ns.ToolbarLabel = __ds_scope.ToolbarLabel;

__ds_ns.CharacterCard = __ds_scope.CharacterCard;

__ds_ns.FloatingNoteCard = __ds_scope.FloatingNoteCard;

__ds_ns.InitiativeTrack = __ds_scope.InitiativeTrack;

__ds_ns.ItemRow = __ds_scope.ItemRow;

__ds_ns.LogEntry = __ds_scope.LogEntry;

__ds_ns.SheetTable = __ds_scope.SheetTable;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Meter = __ds_scope.Meter;

__ds_ns.ResourceSlot = __ds_scope.ResourceSlot;

__ds_ns.StatPill = __ds_scope.StatPill;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.StatusLine = __ds_scope.StatusLine;

__ds_ns.DiceButton = __ds_scope.DiceButton;

__ds_ns.RollResult = __ds_scope.RollResult;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.TextInput = __ds_scope.TextInput;

__ds_ns.MapToken = __ds_scope.MapToken;

__ds_ns.TerrainChip = __ds_scope.TerrainChip;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.ResizeHandle = __ds_scope.ResizeHandle;

__ds_ns.DMFORGE_THEMES = __ds_scope.DMFORGE_THEMES;

__ds_ns.ThemeSwitcher = __ds_scope.ThemeSwitcher;

})();
