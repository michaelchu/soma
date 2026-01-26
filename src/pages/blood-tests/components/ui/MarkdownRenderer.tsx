/**
 * Simple markdown renderer for AI responses
 * Supports headers, bold text, italic text, bullet lists, and numbered lists
 */
export function MarkdownRenderer({ content }) {
  const renderMarkdown = (text) => {
    if (!text) return null;

    // Split into lines for processing
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {processInlineMarkdown(item)}
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const processInlineMarkdown = (text) => {
      // Process bold **text** and *text*
      const parts = [];
      let remaining = text;
      let key = 0;

      while (remaining) {
        // Bold with **
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        // Bold/italic with *
        const italicMatch = remaining.match(/\*(.+?)\*/);

        if (boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index)) {
          if (boldMatch.index > 0) {
            parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
          }
          parts.push(
            <strong key={key++} className="font-semibold text-foreground">
              {boldMatch[1]}
            </strong>
          );
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        } else if (italicMatch) {
          if (italicMatch.index > 0) {
            parts.push(<span key={key++}>{remaining.slice(0, italicMatch.index)}</span>);
          }
          parts.push(
            <em key={key++} className="italic">
              {italicMatch[1]}
            </em>
          );
          remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
        } else {
          parts.push(<span key={key++}>{remaining}</span>);
          break;
        }
      }

      return parts.length > 0 ? parts : text;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h4 key={index} className="font-semibold text-foreground mt-3 mb-1">
            {processInlineMarkdown(trimmed.slice(4))}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={index} className="font-bold text-foreground mt-3 mb-2">
            {processInlineMarkdown(trimmed.slice(3))}
          </h3>
        );
      } else if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h2 key={index} className="font-bold text-foreground text-lg mt-3 mb-2">
            {processInlineMarkdown(trimmed.slice(2))}
          </h2>
        );
      }
      // Bullet lists
      else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
        currentList.push(trimmed.slice(2));
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(trimmed)) {
        currentList.push(trimmed.replace(/^\d+\.\s/, ''));
      }
      // Empty line
      else if (trimmed === '') {
        flushList();
        elements.push(<div key={index} className="h-2" />);
      }
      // Regular paragraph
      else {
        flushList();
        elements.push(
          <p key={index} className="text-sm text-muted-foreground leading-relaxed">
            {processInlineMarkdown(trimmed)}
          </p>
        );
      }
    });

    flushList();
    return elements;
  };

  return <div className="space-y-1">{renderMarkdown(content)}</div>;
}
