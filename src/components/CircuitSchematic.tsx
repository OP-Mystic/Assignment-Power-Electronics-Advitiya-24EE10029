import React from 'react';
import { BridgeType, PhaseType, SwitchType } from '../simulation/rectifierEngine';

interface CircuitSchematicProps {
  switchType: SwitchType;
  bridgeType: BridgeType;
  phaseType: PhaseType;
  resistance: number;
  inductance: number;
  firingAngleDeg: number;
  activeDevices: string[];
  instantaneousCurrent: number;
  instantaneousVoltage: number;
}

/**
 * Helper to render a crisp IEEE-standard Diode or Thyristor (SCR) symbol
 * pointing downward or rightward depending on orientation.
 */
function SwitchSymbol({
  x,
  y,
  label,
  isThyristor,
  isActive,
  direction = 'down',
}: {
  x: number;
  y: number;
  label: string;
  isThyristor: boolean;
  isActive: boolean;
  direction?: 'down' | 'right';
}) {
  const strokeColor = isActive ? '#0284c7' : '#334155';
  const fillColor = isActive ? '#38bdf8' : '#f8fafc';
  const glowFilter = isActive ? 'url(#activeGlow)' : undefined;

  if (direction === 'right') {
    return (
      <g transform={`translate(${x}, ${y})`} filter={glowFilter}>
        {/* Lead wires */}
        <line x1={-22} y1={0} x2={-10} y2={0} stroke={strokeColor} strokeWidth={2.2} />
        <line x1={10} y1={0} x2={22} y2={0} stroke={strokeColor} strokeWidth={2.2} />
        {/* Anode triangle pointing right */}
        <polygon
          points="-10,-10 -10,10 10,0"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Cathode bar */}
        <line x1={10} y1={-11} x2={10} y2={11} stroke={strokeColor} strokeWidth={2.5} />
        {/* Thyristor Gate lead */}
        {isThyristor && (
          <polyline
            points="10,-4 16,-12 22,-12"
            fill="none"
            stroke={isActive ? '#d97706' : '#475569'}
            strokeWidth={1.8}
          />
        )}
        {/* Device label */}
        <text
          x={0}
          y={-16}
          textAnchor="middle"
          className="font-mono text-[11px] font-semibold select-none"
          fill={isActive ? '#0369a1' : '#334155'}
        >
          {label}
        </text>
      </g>
    );
  }

  // Default: pointing UP (standard bridge arm where current flows UP from AC node to Top DC+ rail, or from Bottom DC- rail to AC node)
  // Actually in standard power electronics schematics, bridge legs have switches pointing UP (cathode at top DC+ rail, anode at bottom DC- rail).
  return (
    <g transform={`translate(${x}, ${y})`} filter={glowFilter}>
      {/* Vertical lead segments */}
      <line x1={0} y1={-22} x2={0} y2={-10} stroke={strokeColor} strokeWidth={2.2} />
      <line x1={0} y1={10} x2={0} y2={22} stroke={strokeColor} strokeWidth={2.2} />
      {/* Triangle pointing UP (Anode at bottom y=+10, Cathode at top y=-10) */}
      <polygon
        points="-10,10 10,10 0,-10"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Cathode bar at top */}
      <line x1={-11} y1={-10} x2={11} y2={-10} stroke={strokeColor} strokeWidth={2.5} />
      {/* Thyristor Gate lead at cathode */}
      {isThyristor && (
        <polyline
          points="5,-10 13,-16 19,-16"
          fill="none"
          stroke={isActive ? '#d97706' : '#475569'}
          strokeWidth={1.8}
        />
      )}
      {/* Device label */}
      <text
        x={-16}
        y={4}
        textAnchor="end"
        className="font-mono text-[11px] font-semibold select-none"
        fill={isActive ? '#0369a1' : '#334155'}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Renders the RL Load branch on the right side of the schematic
 */
function RLLoadBranch({
  x,
  topY,
  bottomY,
  resistance,
  inductance,
  isConducting,
}: {
  x: number;
  topY: number;
  bottomY: number;
  resistance: number;
  inductance: number;
  isConducting: boolean;
}) {
  const midY = (topY + bottomY) / 2;
  const rStartY = topY + 26;
  const lStartY = midY + 12;
  const wireColor = isConducting ? '#0284c7' : '#334155';

  return (
    <g>
      {/* Top rail connection to R */}
      <line x1={x} y1={topY} x2={x} y2={rStartY} stroke={wireColor} strokeWidth={2.2} />

      {/* Current arrow I_out */}
      <polygon
        points={`${x - 4},${topY + 14} ${x + 4},${topY + 14} ${x},${topY + 22}`}
        fill={isConducting ? '#059669' : '#64748b'}
      />
      <text
        x={x + 10}
        y={topY + 19}
        className="font-mono text-[11px] font-semibold"
        fill={isConducting ? '#059669' : '#475569'}
      >
        i_out
      </text>

      {/* Zig-zag Resistor R */}
      <polyline
        points={`
          ${x},${rStartY}
          ${x - 8},${rStartY + 6}
          ${x + 8},${rStartY + 14}
          ${x - 8},${rStartY + 22}
          ${x + 8},${rStartY + 30}
          ${x - 8},${rStartY + 38}
          ${x},${rStartY + 44}
        `}
        fill="none"
        stroke="#0f172a"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      {/* Resistor Label */}
      <text x={x + 14} y={rStartY + 20} className="font-sans text-[11px] font-semibold fill-slate-800">
        R Load
      </text>
      <text x={x + 14} y={rStartY + 34} className="font-mono text-[11px] fill-sky-700 font-medium">
        {resistance} Ω
      </text>

      {/* Wire between R and L */}
      <line x1={x} y1={rStartY + 44} x2={x} y2={lStartY} stroke={wireColor} strokeWidth={2.2} />

      {/* Coiled Inductor L */}
      <path
        d={`
          M ${x} ${lStartY}
          C ${x + 12} ${lStartY + 2}, ${x + 12} ${lStartY + 12}, ${x} ${lStartY + 14}
          C ${x + 12} ${lStartY + 16}, ${x + 12} ${lStartY + 26}, ${x} ${lStartY + 28}
          C ${x + 12} ${lStartY + 30}, ${x + 12} ${lStartY + 40}, ${x} ${lStartY + 42}
          C ${x + 12} ${lStartY + 44}, ${x + 12} ${lStartY + 54}, ${x} ${lStartY + 56}
        `}
        fill="none"
        stroke={inductance > 0 ? '#7c3aed' : '#94a3b8'}
        strokeWidth={2.2}
      />
      {/* Inductor Label */}
      <text x={x + 16} y={lStartY + 24} className="font-sans text-[11px] font-semibold fill-slate-800">
        L Load
      </text>
      <text x={x + 16} y={lStartY + 38} className="font-mono text-[11px] fill-violet-700 font-medium">
        {inductance} mH
      </text>

      {/* Bottom connection to DC- rail */}
      <line x1={x} y1={lStartY + 56} x2={x} y2={bottomY} stroke={wireColor} strokeWidth={2.2} />

      {/* V_out polarity markers */}
      <text x={x - 18} y={topY + 18} className="font-mono text-xs font-bold fill-sky-600">
        +
      </text>
      <text x={x - 28} y={midY + 4} className="font-mono text-[11px] font-semibold fill-slate-500">
        v_out
      </text>
      <text x={x - 18} y={bottomY - 8} className="font-mono text-xs font-bold fill-slate-600">
        −
      </text>
    </g>
  );
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  switchType,
  bridgeType,
  phaseType,
  resistance,
  inductance,
  firingAngleDeg,
  activeDevices,
  instantaneousCurrent,
}) => {
  const isThyristor = switchType === 'thyristor';
  const pfx = isThyristor ? 'T' : 'D';
  const isConducting = instantaneousCurrent > 0.02;
  const isDevActive = (id: string) => activeDevices.includes(id);

  return (
    <div className="relative w-full bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Top schematic header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Active Circuit Schematic</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-mono text-slate-600">
            {phaseType === 'single' ? '1-Phase AC Source' : '3-Phase Wye Source'}
          </span>
          {isThyristor && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono text-amber-700 font-medium">
                Gate α = {firingAngleDeg}°
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                activeDevices.length > 0 ? 'bg-sky-500 ring-2 ring-sky-500/25' : 'bg-slate-300'
              }`}
            />
            Conducting: {activeDevices.length > 0 ? activeDevices.join(', ') : 'None (Blocked)'}
          </span>
        </div>
      </div>

      {/* Responsive SVG Schematic Canvas */}
      <div className="w-full flex items-center justify-center p-2">
        <svg
          viewBox="0 0 600 280"
          className="w-full h-auto max-h-[275px] select-none"
          role="img"
          aria-label="Interactive Power Electronics Rectifier Circuit Schematic"
        >
          <defs>
            <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#0ea5e9" floodOpacity="0.45" />
            </filter>
            {/* Subtle technical grid pattern */}
            <pattern id="schemGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect width="600" height="280" fill="url(#schemGrid)" />

          {/* CASE 1: Single-Phase Half-Bridge */}
          {phaseType === 'single' && bridgeType === 'half' && (
            <g>
              {/* AC Source on left */}
              <line x1={90} y1={50} x2={90} y2={115} stroke="#334155" strokeWidth={2.2} />
              <line x1={90} y1={165} x2={90} y2={230} stroke="#334155" strokeWidth={2.2} />
              <circle cx={90} cy={140} r={25} fill="#ffffff" stroke="#0f172a" strokeWidth={2.2} />
              <path
                d="M 76 140 Q 83 126, 90 140 T 104 140"
                fill="none"
                stroke="#0284c7"
                strokeWidth={2}
              />
              <text x={55} y={136} textAnchor="end" className="font-mono text-xs font-semibold fill-slate-700">
                v_s(t)
              </text>
              <text x={55} y={150} textAnchor="end" className="font-mono text-[10px] fill-slate-500">
                1Φ AC
              </text>

              {/* Top wire from source through Switch D1/T1 to RL load */}
              <line x1={90} y1={50} x2={248} y2={50} stroke="#334155" strokeWidth={2.2} />
              <SwitchSymbol
                x={270}
                y={50}
                label={`${pfx}1`}
                isThyristor={isThyristor}
                isActive={isDevActive(`${pfx}1`)}
                direction="right"
              />
              <line
                x1={292}
                y1={50}
                x2={450}
                y2={50}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />

              {/* Bottom return rail */}
              <line
                x1={90}
                y1={230}
                x2={450}
                y2={230}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />

              {/* RL Load on right */}
              <RLLoadBranch
                x={450}
                topY={50}
                bottomY={230}
                resistance={resistance}
                inductance={inductance}
                isConducting={isConducting}
              />
            </g>
          )}

          {/* CASE 2: Single-Phase Full-Bridge */}
          {phaseType === 'single' && bridgeType === 'full' && (
            <g>
              {/* AC Source */}
              <line x1={75} y1={105} x2={75} y2={115} stroke="#334155" strokeWidth={2.2} />
              <line x1={75} y1={165} x2={75} y2={175} stroke="#334155" strokeWidth={2.2} />
              <circle cx={75} cy={140} r={24} fill="#ffffff" stroke="#0f172a" strokeWidth={2.2} />
              <path
                d="M 62 140 Q 68.5 127, 75 140 T 88 140"
                fill="none"
                stroke="#0284c7"
                strokeWidth={2}
              />
              <text x={43} y={144} textAnchor="end" className="font-mono text-xs font-semibold fill-slate-700">
                v_s
              </text>

              {/* AC Feed lines to Bridge Midpoints */}
              {/* Node A at Leg 1 midpoint (210, 130) */}
              <polyline
                points="75,105 75,85 155,85 155,140 210,140"
                fill="none"
                stroke="#334155"
                strokeWidth={2}
              />
              <circle cx={210} cy={140} r={3.5} fill="#0f172a" />

              {/* Node B at Leg 2 midpoint (310, 140) */}
              <polyline
                points="75,175 75,195 155,195 155,160 310,160"
                fill="none"
                stroke="#334155"
                strokeWidth={2}
              />
              <circle cx={310} cy={160} r={3.5} fill="#0f172a" />

              {/* Leg 1 (x = 210): D1 (upper), D4 (lower) */}
              <line x1={210} y1={40} x2={210} y2={68} stroke="#334155" strokeWidth={2.2} />
              <SwitchSymbol
                x={210}
                y={90}
                label={`${pfx}1`}
                isThyristor={isThyristor}
                isActive={isDevActive(`${pfx}1`)}
              />
              <line x1={210} y1={112} x2={210} y2={168} stroke="#334155" strokeWidth={2.2} />
              <SwitchSymbol
                x={210}
                y={190}
                label={`${pfx}4`}
                isThyristor={isThyristor}
                isActive={isDevActive(`${pfx}4`)}
              />
              <line x1={210} y1={212} x2={210} y2={240} stroke="#334155" strokeWidth={2.2} />

              {/* Leg 2 (x = 310): D3 (upper), D2 (lower) */}
              <line x1={310} y1={40} x2={310} y2={68} stroke="#334155" strokeWidth={2.2} />
              <SwitchSymbol
                x={310}
                y={90}
                label={`${pfx}3`}
                isThyristor={isThyristor}
                isActive={isDevActive(`${pfx}3`)}
              />
              <line x1={310} y1={112} x2={310} y2={168} stroke="#334155" strokeWidth={2.2} />
              <SwitchSymbol
                x={310}
                y={190}
                label={`${pfx}2`}
                isThyristor={isThyristor}
                isActive={isDevActive(`${pfx}2`)}
              />
              <line x1={310} y1={212} x2={310} y2={240} stroke="#334155" strokeWidth={2.2} />

              {/* Top DC+ Rail & Bottom DC- Rail */}
              <line
                x1={210}
                y1={40}
                x2={460}
                y2={40}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />
              <line
                x1={210}
                y1={240}
                x2={460}
                y2={240}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />

              {/* RL Load */}
              <RLLoadBranch
                x={460}
                topY={40}
                bottomY={240}
                resistance={resistance}
                inductance={inductance}
                isConducting={isConducting}
              />
            </g>
          )}

          {/* CASE 3: Three-Phase Half-Bridge (3-Pulse Midpoint) */}
          {phaseType === 'three' && bridgeType === 'half' && (
            <g>
              {/* Neutral Return Line at bottom (y = 240) */}
              <line x1={65} y1={65} x2={65} y2={240} stroke="#475569" strokeWidth={2} />
              <circle cx={65} cy={125} r={3} fill="#0f172a" />
              <circle cx={65} cy={185} r={3} fill="#0f172a" />
              <text x={55} y={244} textAnchor="end" className="font-mono text-[11px] font-semibold fill-slate-500">
                N
              </text>

              {/* 3 Phase AC Sources (v_a, v_b, v_c) */}
              {[
                { label: 'v_a', y: 65, color: '#0284c7', dev: `${pfx}1` },
                { label: 'v_b', y: 125, color: '#d97706', dev: `${pfx}2` },
                { label: 'v_c', y: 185, color: '#059669', dev: `${pfx}3` },
              ].map((ph) => (
                <g key={ph.label}>
                  <line x1={65} y1={ph.y} x2={96} y2={ph.y} stroke="#334155" strokeWidth={2} />
                  <circle cx={114} cy={ph.y} r={18} fill="#ffffff" stroke={ph.color} strokeWidth={2} />
                  <path
                    d={`M 104 ${ph.y} Q 109 ${ph.y - 9}, 114 ${ph.y} T 124 ${ph.y}`}
                    fill="none"
                    stroke={ph.color}
                    strokeWidth={1.8}
                  />
                  <text
                    x={114}
                    y={ph.y - 22}
                    textAnchor="middle"
                    className="font-mono text-[11px] font-semibold"
                    fill={ph.color}
                  >
                    {ph.label}
                  </text>
                  <line x1={132} y1={ph.y} x2={228} y2={ph.y} stroke="#334155" strokeWidth={2} />
                  <SwitchSymbol
                    x={250}
                    y={ph.y}
                    label={ph.dev}
                    isThyristor={isThyristor}
                    isActive={isDevActive(ph.dev)}
                    direction="right"
                  />
                  <line x1={272} y1={ph.y} x2={340} y2={ph.y} stroke="#334155" strokeWidth={2} />
                  <circle cx={340} cy={ph.y} r={3} fill="#0f172a" />
                </g>
              ))}

              {/* Common Cathode Collector Bus (x = 340) */}
              <line x1={340} y1={50} x2={340} y2={185} stroke="#0284c7" strokeWidth={2.4} />
              <line
                x1={340}
                y1={50}
                x2={460}
                y2={50}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />
              <line
                x1={65}
                y1={240}
                x2={460}
                y2={240}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />

              {/* RL Load */}
              <RLLoadBranch
                x={460}
                topY={50}
                bottomY={240}
                resistance={resistance}
                inductance={inductance}
                isConducting={isConducting}
              />
            </g>
          )}

          {/* CASE 4: Three-Phase Full-Bridge (6-Pulse Bridge) */}
          {phaseType === 'three' && bridgeType === 'full' && (
            <g>
              {/* 3 Phase Sources on Left */}
              <line x1={48} y1={105} x2={48} y2={175} stroke="#475569" strokeWidth={2} />
              {[
                { label: 'v_a', y: 105, color: '#0284c7', legX: 190 },
                { label: 'v_b', y: 140, color: '#d97706', legX: 270 },
                { label: 'v_c', y: 175, color: '#059669', legX: 350 },
              ].map((ph) => (
                <g key={ph.label}>
                  <line x1={48} y1={ph.y} x2={68} y2={ph.y} stroke="#334155" strokeWidth={2} />
                  <circle cx={82} cy={ph.y} r={13} fill="#ffffff" stroke={ph.color} strokeWidth={1.8} />
                  <path
                    d={`M 74 ${ph.y} Q 78 ${ph.y - 6}, 82 ${ph.y} T 90 ${ph.y}`}
                    fill="none"
                    stroke={ph.color}
                    strokeWidth={1.6}
                  />
                  <text
                    x={38}
                    y={ph.y + 4}
                    textAnchor="end"
                    className="font-mono text-[11px] font-semibold"
                    fill={ph.color}
                  >
                    {ph.label}
                  </text>
                  {/* Feed wire to corresponding bridge leg midpoint */}
                  <line x1={95} y1={ph.y} x2={ph.legX} y2={ph.y} stroke="#64748b" strokeWidth={1.8} />
                  <circle cx={ph.legX} cy={ph.y} r={3.5} fill={ph.color} />
                </g>
              ))}

              {/* 3 Bridge Legs:
                  Leg A (x=190): D1 (upper), D4 (lower)
                  Leg B (x=270): D3 (upper), D6 (lower)
                  Leg C (x=350): D5 (upper), D2 (lower)
              */}
              {[
                { x: 190, up: `${pfx}1`, dn: `${pfx}4` },
                { x: 270, up: `${pfx}3`, dn: `${pfx}6` },
                { x: 350, up: `${pfx}5`, dn: `${pfx}2` },
              ].map((leg) => (
                <g key={leg.x}>
                  <line x1={leg.x} y1={35} x2={leg.x} y2={58} stroke="#334155" strokeWidth={2.2} />
                  <SwitchSymbol
                    x={leg.x}
                    y={80}
                    label={leg.up}
                    isThyristor={isThyristor}
                    isActive={isDevActive(leg.up)}
                  />
                  <line x1={leg.x} y1={102} x2={leg.x} y2={178} stroke="#334155" strokeWidth={2.2} />
                  <SwitchSymbol
                    x={leg.x}
                    y={200}
                    label={leg.dn}
                    isThyristor={isThyristor}
                    isActive={isDevActive(leg.dn)}
                  />
                  <line x1={leg.x} y1={222} x2={leg.x} y2={245} stroke="#334155" strokeWidth={2.2} />
                </g>
              ))}

              {/* Top DC+ Rail & Bottom DC- Rail */}
              <line
                x1={190}
                y1={35}
                x2={465}
                y2={35}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />
              <line
                x1={190}
                y1={245}
                x2={465}
                y2={245}
                stroke={isConducting ? '#0284c7' : '#334155'}
                strokeWidth={2.2}
              />

              {/* RL Load */}
              <RLLoadBranch
                x={465}
                topY={35}
                bottomY={245}
                resistance={resistance}
                inductance={inductance}
                isConducting={isConducting}
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
