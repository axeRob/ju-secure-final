/**
 * One leaked service → arrows to every other account that shares its password
 * (from the Deliver-phase prototype). Handles groups of any size by stacking the targets.
 */
const NODE_WIDTH = 112;
const NODE_HEIGHT = 44;
const GAP = 12;
const LABEL_SPACE = 18;

export function LeakDiagram({ leaked, others }: { leaked: string; others: string[] }) {
  if (others.length === 0) return null;
  const listFormat = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
  const stackHeight = others.length * NODE_HEIGHT + (others.length - 1) * GAP;
  const bodyHeight = Math.max(stackHeight, 50);
  const height = LABEL_SPACE + bodyHeight + 2;
  const centerY = LABEL_SPACE + bodyHeight / 2;
  const stackTop = LABEL_SPACE + (bodyHeight - stackHeight) / 2;
  const targets = others.map((name, index) => ({ name, y: stackTop + index * (NODE_HEIGHT + GAP) }));
  const total = others.length + 1;
  return (
    <figure className="leak-diagram" data-testid="leak-diagram">
      <svg
        viewBox={`0 0 320 ${height}`}
        role="img"
        aria-label={`${leaked} leaks its password. It is tried on ${listFormat.format(others)}, and it works there too.`}
      >
        <defs>
          <marker id="leak-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" className="leak-arrow-head" />
          </marker>
        </defs>
        <text x="159" y="12" textAnchor="middle" className="leak-label">Password tried</text>
        <rect x="6" y={centerY - 25} width={NODE_WIDTH} height="50" rx="10" className="leak-node-leaked" />
        <text x="62" y={centerY - 3} textAnchor="middle" className="leak-node-name">{leaked}</text>
        <text x="62" y={centerY + 14} textAnchor="middle" className="leak-node-status leak-status-leaked">Leaked</text>
        {targets.map(target => (
          <line key={`line-${target.name}`} x1="120" y1={centerY} x2="198" y2={target.y + NODE_HEIGHT / 2} className="leak-arrow" markerEnd="url(#leak-arrow)" />
        ))}
        {targets.map(target => (
          <g key={target.name}>
            <rect x="202" y={target.y} width={NODE_WIDTH} height={NODE_HEIGHT} rx="10" className="leak-node-target" />
            <text x="258" y={target.y + 19} textAnchor="middle" className="leak-node-name">{target.name}</text>
            <text x="258" y={target.y + 35} textAnchor="middle" className="leak-node-status leak-status-open">Gets in</text>
          </g>
        ))}
      </svg>
      <figcaption>One leak, {total} accounts open</figcaption>
    </figure>
  );
}
