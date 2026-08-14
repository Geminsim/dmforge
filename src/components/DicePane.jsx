import React, { useState } from 'react';
import { DiceButton, TextInput, Button, RollResult, EmptyState } from '../ds';
import { evaluateArithmetic } from '../utils/arithmetic';

const COMMON_DICE = [4, 6, 8, 10, 12, 20, 100];

/**
 * Dice pane of the right rail. The roll parser is unchanged from the original
 * DiceRoller — only the presentation moved onto the design system, and the
 * 400ms shake animation is gone (the system allows fades and a 2px rise, and
 * nothing else).
 */
function DicePane({ addLog }) {
  const [customFormula, setCustomFormula] = useState('');
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const parseAndRoll = (formulaStr) => {
    const cleanFormula = formulaStr.toLowerCase().replace(/\s+/g, '');

    // e.g. 2d6+4, 1d20-2, 3d10, 2d20kh1
    const diceRegex = /(\d*)d(\d+)(kh1|kl1)?/g;

    const rollDetails = [];
    let match;
    let replacedText = cleanFormula;

    while ((match = diceRegex.exec(cleanFormula)) !== null) {
      const fullMatch = match[0];
      const count = parseInt(match[1] || '1', 10);
      const sides = parseInt(match[2], 10);
      const keep = match[3]; // kh1 = keep highest 1, kl1 = keep lowest 1

      const rolls = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }

      let subtotal;
      let rollExplanation;

      if (keep === 'kh1') {
        const highest = Math.max(...rolls);
        subtotal = highest;
        rollExplanation = `[${rolls.join(', ')} -> Keep High: ${highest}]`;
      } else if (keep === 'kl1') {
        const lowest = Math.min(...rolls);
        subtotal = lowest;
        rollExplanation = `[${rolls.join(', ')} -> Keep Low: ${lowest}]`;
      } else {
        subtotal = rolls.reduce((a, b) => a + b, 0);
        rollExplanation = `[${rolls.join(' + ')}]`;
      }

      rollDetails.push(`${fullMatch}: ${rollExplanation} = ${subtotal}`);
      replacedText = replacedText.replace(fullMatch, subtotal);
    }

    // Only allow safe math tokens: digits, + - * / ( ) .
    let finalResult;
    const isSafe = /^[0-9+\-*/().\s]+$/.test(replacedText);

    if (isSafe) {
      try {
        finalResult = evaluateArithmetic(replacedText);
      } catch {
        finalResult = 'Error';
      }
    } else {
      finalResult = 'Error/Unsafe';
    }

    const timestamp = new Date().toLocaleTimeString();
    const resultObj = {
      formula: formulaStr,
      result: finalResult,
      details: rollDetails.join(' | ') + (replacedText !== cleanFormula ? ` (Mod: ${replacedText})` : ''),
      time: timestamp
    };

    setHistory(prev => [resultObj, ...prev].slice(0, 10));

    if (addLog) {
      addLog({
        type: 'DICE',
        content: `掷骰 [${formulaStr}] 结果: **${finalResult}** (${resultObj.details})`,
        timestamp
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customFormula.trim()) return;
    parseAndRoll(customFormula);
  };

  const latest = history[0];
  const older = historyOpen ? history.slice(1) : history.slice(1, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
        {COMMON_DICE.map(sides => (
          <DiceButton key={sides} sides={sides} onClick={() => parseAndRoll(`1d${sides}`)} />
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-3)', minWidth: 0 }}>
        <TextInput
          mono
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          placeholder="自定义公式如: 2d6+4 或 2d20kh1+5"
        />
        <Button type="submit" icon="dice-six" title="投掷自定义公式" />
      </form>

      {latest ? (
        <RollResult emphasis formula={latest.formula} total={latest.result} detail={latest.details} time={latest.time} />
      ) : (
        <EmptyState compact icon="dice-six" text="暂无掷骰历史" />
      )}

      {history.length > 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setHistoryOpen(o => !o)}
            title="展开或收起本次会话的投掷历史"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-faint)',
              fontFamily: 'var(--font-label)',
              fontSize: 'var(--type-micro)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            <i className={`ph-fill ph-caret-${historyOpen ? 'down' : 'right'}`} style={{ fontSize: 10 }} aria-hidden="true" />
            历史 {history.length - 1}
          </button>
          {older.map((h, i) => (
            <RollResult key={i} formula={h.formula} total={h.result} detail={h.details} time={h.time} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default React.memo(DicePane);
