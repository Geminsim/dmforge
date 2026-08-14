export function evaluateArithmetic(expression) {
  const input = expression.replace(/\s+/g, '');
  if (!input || !/^[0-9+\-*/().]+$/.test(input)) throw new Error('Unsafe arithmetic expression');
  let position = 0;

  const parseNumber = () => {
    const start = position;
    while (/[0-9.]/.test(input[position] || '')) position += 1;
    const token = input.slice(start, position);
    if (!token || (token.match(/\./g) || []).length > 1) throw new Error('Invalid number');
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error('Invalid number');
    return value;
  };
  const parseFactor = () => {
    if (input[position] === '+' || input[position] === '-') {
      const sign = input[position++] === '-' ? -1 : 1;
      return sign * parseFactor();
    }
    if (input[position] === '(') {
      position += 1;
      const value = parseExpression();
      if (input[position++] !== ')') throw new Error('Unclosed parenthesis');
      return value;
    }
    return parseNumber();
  };
  const parseTerm = () => {
    let value = parseFactor();
    while (input[position] === '*' || input[position] === '/') {
      const operator = input[position++];
      const right = parseFactor();
      value = operator === '*' ? value * right : value / right;
      if (!Number.isFinite(value)) throw new Error('Invalid arithmetic result');
    }
    return value;
  };
  const parseExpression = () => {
    let value = parseTerm();
    while (input[position] === '+' || input[position] === '-') {
      const operator = input[position++];
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (position !== input.length) throw new Error('Unexpected arithmetic token');
  return result;
}
