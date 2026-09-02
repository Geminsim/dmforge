function cleanHeading(line, prefix) {
  return line.slice(prefix.length).trim();
}

/**
 * Converts the maintained Markdown guide into the hierarchy used by the
 * in-app rules compendium. Keeping the parser deliberately small means the
 * Markdown document remains the single source of truth without adding a
 * runtime Markdown dependency to the application.
 */
export function parseGuideMarkdown(source = '') {
  const guide = { title: 'DMForge 使用指南', introduction: [], sections: [] };
  let section = null;
  let topic = null;

  String(source).replace(/\r\n/g, '\n').split('\n').forEach(line => {
    if (line.startsWith('# ')) {
      guide.title = cleanHeading(line, '# ');
      return;
    }
    if (line.startsWith('## ')) {
      section = { title: cleanHeading(line, '## '), content: [], topics: [] };
      guide.sections.push(section);
      topic = null;
      return;
    }
    if (line.startsWith('### ') && section) {
      topic = { title: cleanHeading(line, '### '), content: [] };
      section.topics.push(topic);
      return;
    }

    if (topic) topic.content.push(line);
    else if (section) section.content.push(line);
    else guide.introduction.push(line);
  });

  return guide;
}

export function guideEntryText(entry) {
  return [
    entry?.title,
    ...(entry?.content || []),
    ...(entry?.topics || []).flatMap(topic => [topic.title, ...(topic.content || [])])
  ].filter(Boolean).join('\n').toLowerCase();
}

export function filterGuideSections(sections = [], query = '') {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return sections;
  return sections.filter(section => guideEntryText(section).includes(normalized));
}
