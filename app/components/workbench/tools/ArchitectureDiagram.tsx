import React, { useMemo, useState, useRef, useEffect } from 'react';

interface ArchitectureDiagramProps {
  nodes: any[];
  links: any[];
  showAiGraph: boolean;
}

export function ArchitectureDiagram({ nodes, links, showAiGraph }: ArchitectureDiagramProps) {
  const width = 1600;
  const height = 900;

  // State for Drag-and-Drop
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement>(null);

  // Determine Layer Order based on Mode
  const layerOrder = useMemo(() => {
    if (showAiGraph) {
      return ['frontend', 'backend', 'data', 'external', 'infrastructure'];
    }

    // Dynamic Layer Detection for Offline Mode
    const detectedLayers = new Set<string>();
    nodes.forEach((n) => {
      const name = (n.name || '').toLowerCase();
      const path = (n.filePath || '').toLowerCase();

      if (name.includes('controller') || path.includes('/controller')) {
        detectedLayers.add('controller');
      }

      if (name.includes('service') || path.includes('/service')) {
        detectedLayers.add('service');
      }

      // Only add repository if explicitly found
      if (name.includes('repository') || path.includes('/repository')) {
        detectedLayers.add('repository');
      }

      if (name.includes('model') || name.includes('entity') || name.includes('dto') || path.includes('/model')) {
        detectedLayers.add('model');
      }

      if (name.includes('util') || path.includes('/util')) {
        detectedLayers.add('util');
      }

      // Check for Application/Main entry points
      if (name.includes('application') || name.includes('main')) {
        detectedLayers.add('entry');
      }

      // Check for interfaces
      if (path.includes('/interface')) {
        detectedLayers.add('interface');
      }
    });

    // Define standard order preference
    const standardOrder = ['entry', 'controller', 'service', 'repository', 'model', 'interface', 'util'];

    // Return sorted detected layers, falling back to standard list if empty
    const sortedLayers = standardOrder.filter((l) => detectedLayers.has(l));

    return sortedLayers.length > 0 ? sortedLayers : ['controller', 'service', 'model', 'util'];
  }, [nodes, showAiGraph]);

  const layerTitles: Record<string, string> = {
    frontend: 'FRONTEND',
    backend: 'BACKEND',
    data: 'DATA STORE',
    external: 'EXTERNAL APIs',
    infrastructure: 'INFRASTRUCTURE',
    controller: 'CONTROLLERS',
    service: 'SERVICES',
    repository: 'REPOSITORIES',
    model: 'MODELS / DTOs',
    util: 'UTILITIES',
    entry: 'ENTRY POINT',
    interface: 'INTERFACES',
  };

  const layerColors: Record<string, string> = {
    frontend: '#3B82F6', // Blue
    backend: '#10B981', // Emerald
    data: '#F59E0B', // Amber
    external: '#8B5CF6', // Violet
    infrastructure: '#64748B', // Slate
    controller: '#EC4899', // Pink
    service: '#10B981', // Emerald
    repository: '#F59E0B', // Amber
    model: '#6366F1', // Indigo
    util: '#94A3B8', // Slate
    entry: '#EF4444', // Red
    interface: '#8B5CF6', // Violet
  };

  // Dynamic X Positions for Columns
  const layerX = useMemo(() => {
    const positions: Record<string, number> = {};
    const startX = 200;
    const spacing = 300;

    layerOrder.forEach((layer, index) => {
      positions[layer] = startX + index * spacing;
    });

    // Add AI specific positions if needed, or merge
    if (showAiGraph) {
      return {
        frontend: 200,
        backend: 600,
        data: 1000,
        external: 1400,
        infrastructure: 600,
      };
    }

    return positions;
  }, [layerOrder, showAiGraph]);

  // Helper to categorize nodes
  function getLayer(node: any) {
    if (showAiGraph) {
      return node.layer || 'backend';
    } else {
      // Offline heuristic
      const name = (node.name || '').toLowerCase();
      const path = (node.filePath || '').toLowerCase();

      if (name.includes('application') || name.includes('main')) {
        return 'entry';
      }

      if (name.includes('controller') || path.includes('/controller')) {
        return 'controller';
      }

      if (name.includes('service') || path.includes('/service')) {
        return 'service';
      }

      if (name.includes('repository') || path.includes('/repository')) {
        return 'repository';
      }

      if (name.includes('model') || name.includes('entity') || name.includes('dto') || path.includes('/model')) {
        return 'model';
      }

      if (path.includes('/interface')) {
        return 'interface';
      }

      return 'util';
    }
  }

  // Pre-calculate positions (Deterministic Layout) - Only runs once or when data changes
  const initialPositions = useMemo(() => {
    const layers: Record<string, any[]> = {};
    layerOrder.forEach((l) => (layers[l] = []));

    // Filter and Sort Nodes
    nodes.forEach((n) => {
      // Skip directories in offline mode
      if (!showAiGraph && n.type === 'directory') {
        return;
      }

      const layer = getLayer(n);

      if (layers[layer]) {
        layers[layer].push(n);
      } else {
        // Fallback for unknown layers
        if (!layers.util) {
          layers.util = [];
        } // For offline

        if (!layers.backend) {
          layers.backend = [];
        } // For AI

        const target = showAiGraph ? 'backend' : 'util';

        if (layers[target]) {
          layers[target].push(n);
        }
      }
    });

    const positions: Record<string, any> = {};
    const verticalSpacing = 100;

    layerOrder.forEach((layer) => {
      const items = layers[layer];
      const totalHeight = items.length * verticalSpacing;

      // Special case for infrastructure (bottom center)
      const yOffset = layer === 'infrastructure' && showAiGraph ? 300 : 0;

      items.forEach((node, index) => {
        positions[node.id] = {
          x: layerX[layer],
          y: height / 2 - totalHeight / 2 + index * verticalSpacing + yOffset,
        };
      });
    });

    return positions;
  }, [nodes, showAiGraph]);

  // Sync state with initial positions when they change
  useEffect(() => {
    setNodePositions(initialPositions);
  }, [initialPositions]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setDraggedNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode || !svgRef.current) {
      return;
    }

    const svgRect = svgRef.current.getBoundingClientRect();

    /*
     * Calculate mouse position relative to SVG viewBox
     * Scale factor is needed if SVG is scaled via CSS/Resize
     */
    const scaleX = width / svgRect.width;
    const scaleY = height / svgRect.height;

    const mouseX = (e.clientX - svgRect.left) * scaleX;
    const mouseY = (e.clientY - svgRect.top) * scaleY;

    setNodePositions((prev) => ({
      ...prev,
      [draggedNode]: { x: mouseX, y: mouseY },
    }));
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  // Zoom and Pan State
  const [scale, setScale] = useState(1);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: width, h: height });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();

      const zoomFactor = 0.1;
      const direction = e.deltaY > 0 ? 1 : -1;
      const newScale = Math.max(0.1, Math.min(5, scale - direction * zoomFactor));

      /*
       * Calculate zoom center relative to SVG
       * This is complex, simple scaling for now
       */
      setScale(newScale);

      // Adjust viewBox size
      const newW = width / newScale;
      const newH = height / newScale;

      // Center zoom (simplified)
      const dx = (viewBox.w - newW) / 2;
      const dy = (viewBox.h - newH) / 2;

      setViewBox((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
        w: newW,
        h: newH,
      }));
    } else {
      // Pan
      setViewBox((prev) => ({
        ...prev,
        x: prev.x + e.deltaX,
        y: prev.y + e.deltaY,
      }));
    }
  };

  const handlePanStart = (e: React.MouseEvent) => {
    if (draggedNode) {
      return;
    } // Prioritize node dragging

    setIsPanning(true);
    setStartPan({ x: e.clientX, y: e.clientY });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) {
      return;
    }

    const dx = (startPan.x - e.clientX) / scale; // Adjust for zoom
    const dy = (startPan.y - e.clientY) / scale;

    setViewBox((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    setStartPan({ x: e.clientX, y: e.clientY });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Reset View
  const resetView = () => {
    setScale(1);
    setViewBox({ x: 0, y: 0, w: width, h: height });
  };

  return (
    <div className="w-full h-full overflow-hidden bg-[#050505] relative rounded-lg border border-gray-800">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => {
            const newScale = Math.min(5, scale + 0.2);
            setScale(newScale);

            const newW = width / newScale;
            const newH = height / newScale;
            setViewBox((prev) => ({
              ...prev,
              x: prev.x + (prev.w - newW) / 2,
              y: prev.y + (prev.h - newH) / 2,
              w: newW,
              h: newH,
            }));
          }}
          className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-white"
        >
          +
        </button>
        <button
          onClick={() => {
            const newScale = Math.max(0.1, scale - 0.2);
            setScale(newScale);

            const newW = width / newScale;
            const newH = height / newScale;
            setViewBox((prev) => ({
              ...prev,
              x: prev.x + (prev.w - newW) / 2,
              y: prev.y + (prev.h - newH) / 2,
              w: newW,
              h: newH,
            }));
          }}
          className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-white"
        >
          -
        </button>
        <button onClick={resetView} className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-white text-xs">
          Fit
        </button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handlePanStart}
        onMouseMove={(e) => {
          handleMouseMove(e); // Node dragging
          handlePanMove(e); // Canvas panning
        }}
        onMouseUp={(e) => {
          handleMouseUp();
          handlePanEnd();
        }}
        onMouseLeave={(e) => {
          handleMouseUp();
          handlePanEnd();
        }}
        onWheel={handleWheel}
      >
        {/* Layer Background Columns */}
        {layerOrder.map((layer) => (
          <g key={layer}>
            <rect
              x={layerX[layer] - 120}
              y={50}
              width={240}
              height={height - 100}
              fill="rgba(255, 255, 255, 0.02)"
              rx="12"
            />
            {/* Column Header */}
            <text
              x={layerX[layer]}
              y={90}
              textAnchor="middle"
              fill={layerColors[layer]}
              fontSize="16"
              fontWeight="bold"
              letterSpacing="2"
              style={{ opacity: 0.8 }}
            >
              {layerTitles[layer]}
            </text>
          </g>
        ))}

        {/* Links (Curved Arrows) */}
        {links.map((link, i) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;

          const source = nodePositions[sourceId];
          const target = nodePositions[targetId];

          if (!source || !target) {
            return null;
          }

          /*
           * Calculate orthogonal path with control point offset to reduce overlap
           * We add a deterministic offset based on the index to separate parallel lines
           */
          const offset = ((i % 7) - 3) * 15;
          const midX = (source.x + target.x) / 2 + offset;

          return (
            <g key={i}>
              <path
                d={`M ${source.x + 80} ${source.y} 
                    C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x - 80} ${target.y}`}
                fill="none"
                stroke={source.x < target.x ? 'rgba(96, 165, 250, 0.8)' : 'rgba(255,255,255,0.4)'}
                strokeWidth="2"
                markerEnd={source.x < target.x ? 'url(#arrowhead)' : 'url(#arrowhead-dim)'}
                style={{ transition: 'd 0.1s ease-out' }}
              />
            </g>
          );
        })}

        {/* Arrowhead Definition */}
        <defs>
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />

          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(96, 165, 250, 0.8)" />
          </marker>
          <marker id="arrowhead-dim" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 255, 255, 0.4)" />
          </marker>
        </defs>

        {/* Nodes (Cards) */}
        {nodes.map((node) => {
          const pos = nodePositions[node.id];

          if (!pos) {
            return null;
          }

          const layer = getLayer(node);
          const color = layerColors[layer] || '#64748B';
          const isDragging = draggedNode === node.id;

          return (
            <g
              key={node.id}
              className={`cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity ${isDragging ? 'opacity-90' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
            >
              {/* Card Shadow */}
              <rect
                x={pos.x - 80}
                y={pos.y - 25}
                width="160"
                height="50"
                rx="8"
                fill="rgba(0,0,0,0.5)"
                filter="blur(4px)"
                transform="translate(0, 4)"
              />

              {/* Card Body */}
              <rect
                x={pos.x - 80}
                y={pos.y - 25}
                width="160"
                height="50"
                rx="8"
                fill={color}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                fillOpacity="0.2"
              />

              {/* Card Border Highlight */}
              <rect
                x={pos.x - 80}
                y={pos.y - 25}
                width="160"
                height="50"
                rx="8"
                fill="none"
                stroke={color}
                strokeWidth="2"
              />

              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="500"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)', pointerEvents: 'none' }}
              >
                {node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
