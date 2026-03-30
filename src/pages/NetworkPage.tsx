import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

const EDGE_COLORS = [
  'hsl(263, 70%, 66%)',  // purple
  'hsl(142, 71%, 45%)',  // green
  'hsl(38, 92%, 50%)',   // amber
  'hsl(217, 91%, 60%)',  // blue
  'hsl(340, 82%, 52%)',  // pink
  'hsl(180, 70%, 50%)',  // cyan
];

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
  PHP: '#4F5D95', Scala: '#c22d40', Kotlin: '#A97BFF', Shell: '#89e051',
  HTML: '#e34c26', CSS: '#563d7c', Dart: '#00B4AB', Swift: '#F05138',
};

interface NodePos { x: number; y: number }

interface RepoNodeData {
  id: string; name: string; type: 'repo';
  language: string | null; stars: number; forks: number; issues: number; description: string | null;
}

interface ContribNodeData {
  id: string; name: string; type: 'contributor';
  contributions: number; avatar: string; repoCount: number;
}

type GraphNode = RepoNodeData | ContribNodeData;

interface Edge {
  from: string; to: string; weight: number; repoName: string;
}

export default function NetworkPage() {
  const { repos, contributors, allContributors } = useAppStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePos>>(new Map());
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const velocityRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());
  const positionRef = useRef(nodePositions);

  useEffect(() => {
    positionRef.current = nodePositions;
  }, [nodePositions]);

  const { repoNodes, contribNodes, edges } = useMemo(() => {
    const repoNodes: RepoNodeData[] = repos.slice(0, 40).map((r, i) => ({
      id: `repo-${r.name}`, name: r.name, type: 'repo',
      language: r.language, stars: r.stargazers_count, forks: r.forks_count,
      issues: r.open_issues_count, description: r.description,
      x: 0, y: 0,
    }));

    const contribRepoCount = new Map<string, number>();
    contributors.forEach(contribs => {
      contribs.forEach(c => contribRepoCount.set(c.login, (contribRepoCount.get(c.login) || 0) + 1));
    });

    const contribNodes: ContribNodeData[] = allContributors.slice(0, 30).map((c, i) => ({
      id: `user-${c.login}`, name: c.login, type: 'contributor',
      contributions: c.contributions, avatar: c.avatar_url,
      repoCount: contribRepoCount.get(c.login) || 1,
      x: 0, y: 0,
    }));

    const edges: Edge[] = [];
    contributors.forEach((contribs, repoName) => {
      contribs.slice(0, 8).forEach(c => {
        if (allContributors.slice(0, 30).find(ac => ac.login === c.login)) {
          edges.push({ from: `user-${c.login}`, to: `repo-${repoName}`, weight: c.contributions, repoName });
        }
      });
    });

    return { repoNodes, contribNodes, edges };
  }, [repos, contributors, allContributors]);

  // Reset velocities when the node set changes
  useEffect(() => {
    const vel = new Map<string, { vx: number; vy: number }>();
    [...repoNodes, ...contribNodes].forEach(n => vel.set(n.id, { vx: 0, vy: 0 }));
    velocityRef.current = vel;
  }, [repoNodes, contribNodes]);

  // Initialize positions with force-directed-like layout
  useEffect(() => {
    const pos = new Map<string, NodePos>();
    const cx = 550, cy = 300;

    // Place repos in upper area in a grid
    repoNodes.forEach((n, i) => {
      const cols = Math.ceil(Math.sqrt(repoNodes.length));
      const row = Math.floor(i / cols);
      const col = i % cols;
      pos.set(n.id, {
        x: 120 + col * 110 + (Math.random() - 0.5) * 20,
        y: 60 + row * 90 + (Math.random() - 0.5) * 15,
      });
    });

    // Place contributors in lower area
    contribNodes.forEach((n, i) => {
      const cols = Math.ceil(Math.sqrt(contribNodes.length));
      const row = Math.floor(i / cols);
      const col = i % cols;
      pos.set(n.id, {
        x: 150 + col * 120 + (Math.random() - 0.5) * 20,
        y: 380 + row * 90 + (Math.random() - 0.5) * 15,
      });
    });

    setNodePositions(pos);
  }, [repoNodes, contribNodes]);

  // Lightweight force simulation to keep graph alive and dynamic
  useEffect(() => {
    let frame: number;

    const tick = () => {
      const width = svgRef.current?.clientWidth ?? 1100;
      const height = svgRef.current?.clientHeight ?? 650;
      const padding = 40;

      const nodes: GraphNode[] = [...repoNodes, ...contribNodes];
      if (nodes.length === 0) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const positions = new Map(positionRef.current);
      const velocities = new Map(velocityRef.current);

      // Ensure every node has velocity
      nodes.forEach(n => {
        if (!velocities.has(n.id)) velocities.set(n.id, { vx: 0, vy: 0 });
        if (!positions.has(n.id)) positions.set(n.id, { x: width / 2, y: height / 2 });
      });

      const repulsion = 12000;
      const spring = 0.0025;
      const ideal = 180;
      const friction = 0.9;
      const maxSpeed = 6;

      // Pairwise repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const pa = positions.get(a.id)!;
          const pb = positions.get(b.id)!;
          const dx = pa.x - pb.x;
          const dy = pa.y - pb.y;
          const dist = Math.hypot(dx, dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (force * dx) / dist;
          const fy = (force * dy) / dist;
          if (dragNode !== a.id) {
            const va = velocities.get(a.id)!;
            va.vx += fx;
            va.vy += fy;
          }
          if (dragNode !== b.id) {
            const vb = velocities.get(b.id)!;
            vb.vx -= fx;
            vb.vy -= fy;
          }
        }
      }

      // Edge attraction
      edges.forEach(edge => {
        const pa = positions.get(edge.from);
        const pb = positions.get(edge.to);
        if (!pa || !pb) return;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const force = spring * (dist - ideal);
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        if (dragNode !== edge.from) {
          const va = velocities.get(edge.from)!;
          va.vx -= fx;
          va.vy -= fy;
        }
        if (dragNode !== edge.to) {
          const vb = velocities.get(edge.to)!;
          vb.vx += fx;
          vb.vy += fy;
        }
      });

      // Integrate positions
      const next = new Map<string, NodePos>();
      nodes.forEach(node => {
        const pos = positions.get(node.id)!;
        const vel = velocities.get(node.id)!;
        if (dragNode === node.id) {
          next.set(node.id, pos);
          vel.vx = vel.vy = 0;
          return;
        }
        vel.vx *= friction;
        vel.vy *= friction;
        vel.vx = Math.max(-maxSpeed, Math.min(maxSpeed, vel.vx));
        vel.vy = Math.max(-maxSpeed, Math.min(maxSpeed, vel.vy));
        const nx = Math.min(width - padding, Math.max(padding, pos.x + vel.vx));
        const ny = Math.min(height - padding, Math.max(padding, pos.y + vel.vy));
        next.set(node.id, { x: nx, y: ny });
      });

      velocityRef.current = velocities;
      positionRef.current = next;
      setNodePositions(next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [repoNodes, contribNodes, edges, dragNode]);

  const getPos = useCallback((id: string): NodePos => {
    return nodePositions.get(id) || { x: 0, y: 0 };
  }, [nodePositions]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pos = nodePositions.get(nodeId);
    if (!pos) return;
    dragStartRef.current = { offsetX: e.clientX - rect.left - pos.x, offsetY: e.clientY - rect.top - pos.y };
    setDragNode(nodeId);
  }, [nodePositions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (dragNode) {
      setNodePositions(prev => {
        const next = new Map(prev);
        next.set(dragNode, {
          x: e.clientX - rect.left - dragStartRef.current.offsetX,
          y: e.clientY - rect.top - dragStartRef.current.offsetY,
        });
        return next;
      });
    }
  }, [dragNode]);

  const handleMouseUp = useCallback(() => setDragNode(null), []);

  const maxStars = Math.max(1, ...repoNodes.map(r => r.stars));
  const maxContrib = Math.max(1, ...contribNodes.map(c => c.contributions));
  const maxEdgeWeight = Math.max(1, ...edges.map(e => e.weight));

  // Edges connected to hovered node
  const hoveredEdges = hoveredNode
    ? new Set(edges.filter(e => e.from === hoveredNode.id || e.to === hoveredNode.id).map((_, i) => i))
    : null;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Network Graph</h2>
          <p className="text-sm text-muted-foreground">
            Contributor ↔ Repository connections — drag nodes to rearrange
          </p>
        </div>
      </motion.div>

      <div className="bg-surface-card border border-border rounded-xl overflow-hidden relative" style={{ height: '650px' }}>
        <svg
          ref={svgRef} width="100%" height="100%"
          className="absolute inset-0"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setHoveredNode(null); }}
          style={{ cursor: dragNode ? 'grabbing' : 'default' }}
        >
          {/* Edges with colored lines based on weight */}
          {edges.map((edge, i) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from.x && !from.y) return null;
            const normalizedWeight = edge.weight / maxEdgeWeight;
            const strokeWidth = 1 + normalizedWeight * 4;
            const color = EDGE_COLORS[i % EDGE_COLORS.length];
            const isHighlighted = hoveredEdges ? hoveredEdges.has(i) : false;
            const opacity = hoveredEdges ? (isHighlighted ? 0.7 : 0.06) : 0.2 + normalizedWeight * 0.3;

            return (
              <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={color} strokeOpacity={opacity}
                strokeWidth={isHighlighted ? strokeWidth + 1 : strokeWidth}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Repo Nodes (Squares) */}
          {repoNodes.map(node => {
            const size = 10 + (node.stars / maxStars) * 18;
            const color = LANG_COLORS[node.language || ''] || 'hsl(263, 70%, 66%)';
            const pos = getPos(node.id);
            const isHovered = hoveredNode?.id === node.id;
            const dimmed = hoveredNode && !isHovered && hoveredEdges && !edges.some(
              (e, i) => hoveredEdges.has(i) && (e.from === node.id || e.to === node.id)
            );

            return (
              <g key={node.id}
                onMouseDown={e => handleMouseDown(e, node.id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => { if (!dragNode) setHoveredNode(null); }}
                style={{ cursor: dragNode === node.id ? 'grabbing' : 'grab' }}
                opacity={dimmed ? 0.2 : 1}
              >
                {isHovered && (
                  <rect x={pos.x - size - 5} y={pos.y - size - 5} width={(size + 5) * 2} height={(size + 5) * 2}
                    rx={4} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.4}
                    className="animate-pulse" />
                )}
                <rect
                  x={pos.x - (isHovered ? size + 2 : size)}
                  y={pos.y - (isHovered ? size + 2 : size)}
                  width={(isHovered ? size + 2 : size) * 2}
                  height={(isHovered ? size + 2 : size) * 2}
                  rx={3}
                  fill={color} fillOpacity={isHovered ? 0.9 : 0.7}
                  stroke={color} strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-200"
                />
                <text x={pos.x} y={pos.y + size + 14} textAnchor="middle"
                  fill="hsl(220, 10%, 55%)" fontSize={9} fontFamily="Inter">
                  {node.name.length > 12 ? node.name.slice(0, 12) + '…' : node.name}
                </text>
              </g>
            );
          })}

          {/* Contributor Nodes (Circles) */}
          {contribNodes.map(node => {
            const size = 8 + (node.contributions / maxContrib) * 16;
            const pos = getPos(node.id);
            const isHovered = hoveredNode?.id === node.id;
            const dimmed = hoveredNode && !isHovered && hoveredEdges && !edges.some(
              (e, i) => hoveredEdges.has(i) && (e.from === node.id || e.to === node.id)
            );

            return (
              <g key={node.id}
                onMouseDown={e => handleMouseDown(e, node.id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => { if (!dragNode) setHoveredNode(null); }}
                style={{ cursor: dragNode === node.id ? 'grabbing' : 'grab' }}
                opacity={dimmed ? 0.2 : 1}
              >
                {isHovered && (
                  <circle cx={pos.x} cy={pos.y} r={size + 6} fill="none"
                    stroke="hsl(263, 70%, 66%)" strokeWidth={2} strokeOpacity={0.4}
                    className="animate-pulse" />
                )}
                <circle cx={pos.x} cy={pos.y} r={isHovered ? size + 3 : size}
                  fill="hsl(263, 70%, 66%)" fillOpacity={isHovered ? 0.85 : 0.6}
                  stroke="hsl(263, 70%, 66%)" strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-200"
                />
                <text x={pos.x} y={pos.y + size + 12} textAnchor="middle"
                  fill="hsl(220, 10%, 55%)" fontSize={8} fontFamily="Inter">
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredNode && !dragNode && (
          <div
            className="absolute pointer-events-none z-50 bg-surface-overlay/95 backdrop-blur-md rounded-lg p-3 border border-border shadow-xl text-xs max-w-[260px]"
            style={{
              left: Math.min(mousePos.x + 16, (svgRef.current?.clientWidth || 800) - 280),
              top: Math.min(mousePos.y - 10, (svgRef.current?.clientHeight || 600) - 160),
            }}
          >
            {hoveredNode.type === 'repo' ? (
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground text-sm">{hoveredNode.name}</p>
                {hoveredNode.description && (
                  <p className="text-muted-foreground line-clamp-2">{hoveredNode.description}</p>
                )}
                <div className="flex gap-3 text-muted-foreground">
                  <span>⭐ {hoveredNode.stars}</span>
                  <span>🍴 {hoveredNode.forks}</span>
                  <span>🐛 {hoveredNode.issues}</span>
                </div>
                {hoveredNode.language && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANG_COLORS[hoveredNode.language] || 'hsl(263,70%,66%)' }} />
                    <span className="text-muted-foreground">{hoveredNode.language}</span>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground/80 space-y-0.5">
                  <p className="text-muted-foreground/70">Top contributors:</p>
                  {edges
                    .filter(e => e.to === hoveredNode.id)
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 4)
                    .map(e => (
                      <div key={`${e.from}-${e.to}`} className="flex items-center gap-1">
                        <span className="font-medium text-foreground">{e.from.replace('user-', '')}</span>
                        <span className="text-muted-foreground/60">· {e.weight} commits</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <img src={hoveredNode.avatar} alt="" className="w-6 h-6 rounded-full" />
                  <p className="font-semibold text-foreground text-sm">{hoveredNode.name}</p>
                </div>
                <p className="text-muted-foreground">
                  {hoveredNode.contributions.toLocaleString()} contributions across {hoveredNode.repoCount} repos
                </p>
                <div className="text-[10px] text-muted-foreground/70 space-y-0.5">
                  <p className="text-muted-foreground/70">Top repos:</p>
                  {edges
                    .filter(e => e.from === hoveredNode.id)
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 5)
                    .map(e => (
                      <div key={`${e.from}-${e.to}`} className="flex items-center gap-1">
                        <span className="font-mono text-primary">{e.repoName}</span>
                        <span className="text-muted-foreground/60">· {e.weight} commits</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-surface-overlay/80 backdrop-blur-sm rounded-lg p-3 border border-border text-xs">
          <p className="text-foreground font-medium mb-2">{repoNodes.length} repos · {contribNodes.length} contributors · {edges.length} connections</p>
          <p className="text-muted-foreground mb-2">🖱️ Drag nodes to rearrange</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary/70" /> Repositories (square)</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary/60" /> Contributors (circle)</div>
          </div>
          <p className="text-muted-foreground mt-2 text-[10px]">Edge width = contribution count</p>
        </div>
      </div>
    </div>
  );
}
