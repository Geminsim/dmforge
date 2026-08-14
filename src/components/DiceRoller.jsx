import React, { useState } from 'react';
import { Sparkles, History } from 'lucide-react';
import { evaluateArithmetic } from '../utils/arithmetic';

function DiceRoller({ addLog }) {
  const [customFormula, setCustomFormula] = useState('');
  const [history, setHistory] = useState([]);
  const [isRolling, setIsRolling] = useState(false);

  const commonDice = [4, 6, 8, 10, 12, 20, 100];

  const parseAndRoll = (formulaStr) => {
    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 400); // 400ms match roll animation

    const cleanFormula = formulaStr.toLowerCase().replace(/\s+/g, '');
    
    // Regex to match NdS + modifiers or simple rolls
    // e.g. 2d6+4, 1d20-2, 3d10
    const diceRegex = /(\d*)d(\d+)(kh1|kl1)?/g;
    
    let rollDetails = [];
    // Process dice parts
    let match;
    let replacedText = cleanFormula;

    while ((match = diceRegex.exec(cleanFormula)) !== null) {
      const fullMatch = match[0];
      const count = parseInt(match[1] || '1', 10);
      const sides = parseInt(match[2], 10);
      const keep = match[3]; // kh1 = keep highest 1, kl1 = keep lowest 1

      let rolls = [];
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

    // Now calculate modifiers using a safe math evaluator
    // Only allow safe math tokens: digits, +, -, *, /, (, )
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
      details: rollDetails.join(' | ') + (replacedText !== cleanFormula && cleanFormula !== replacedText ? ` (Mod: ${replacedText})` : ''),
      time: timestamp
    };

    setHistory(prev => [resultObj, ...prev].slice(0, 10));
    
    if (addLog) {
      addLog({
        type: 'DICE',
        content: `🎲 掷骰 [${formulaStr}] 结果: **${finalResult}** (${resultObj.details})`,
        timestamp: timestamp
      });
    }
  };

  const handleQuickRoll = (sides) => {
    parseAndRoll(`1d${sides}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customFormula.trim()) return;
    parseAndRoll(customFormula);
  };

  return (
    <div className="glass-panel panel-content" style={{ gap: '16px' }}>
      <div className="panel-title">
        <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
        <span>🎲 核心掷骰器</span>
      </div>

      {/* Quick Roll Grid */}
      <div className="dice-grid">
        {commonDice.map(sides => (
          <button 
            key={sides} 
            className={`dice-button ${isRolling ? 'roll-animation' : ''}`}
            onClick={() => handleQuickRoll(sides)}
          >
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>D</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{sides}</span>
          </button>
        ))}
      </div>

      {/* Custom Formula Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          className="input-text" 
          placeholder="自定义公式如: 2d6+4 或 2d20kh1+5" 
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary">
          投掷
        </button>
      </form>

      {/* Roll History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="panel-title" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          <History size={14} />
          <span>投掷历史</span>
        </div>
        <div style={{ 
          maxHeight: '150px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px',
          paddingRight: '4px'
        }}>
          {history.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              暂无掷骰历史
            </span>
          ) : (
            history.map((h, i) => (
              <div 
                key={i} 
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{h.formula}</span>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold', fontSize: '15px' }}>{h.result}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {h.details}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(DiceRoller);
