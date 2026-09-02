export function compactCharacterName(value) {
  const name = String(value || '');
  const identityMatch = name.match(/^(.*?)(（[^（）]+）)$/u);
  const personalName = (identityMatch ? identityMatch[1] : name).trim();
  const identity = identityMatch?.[2] || '';
  const englishParts = personalName.split(/\s+/).filter(Boolean);
  const isLatinFullName = englishParts.length >= 2 && englishParts.every(part => /^\p{Script=Latin}[\p{Script=Latin}\p{M}'’-]*$/u.test(part));
  return isLatinFullName ? `${englishParts[0]}${identity}` : name;
}
