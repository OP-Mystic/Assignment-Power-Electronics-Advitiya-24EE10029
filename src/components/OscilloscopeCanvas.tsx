import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { PhaseType, SimulationPoint } from '../simulation/rectifierEngine';

interface OscilloscopeCanvasProps {
  points: SimulationPoint[];
  phaseType: PhaseType;
  bridgeType: 'half' | 'full';
  resistance: number;
  vPeakPhase: number;
  selectedAngleDeg: number;
  onSelectAngle: (thetaDeg: number) => void;
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({
  points,
  phaseType,
  bridgeType,
  resistance,
  vPeakPhase,
  selectedAngleDeg,
  onSelectAngle,
}) => {
  // Time-axis zoom (Horizontal X-scale: 1x = 720 deg, 2x = 360 deg, 4x = 180 deg)
  const [timeZoom, setTimeZoom] = useState<number>(1);
  // Amplitude-axis zoom (Vertical Y-scale multiplier: 0.5x to 2.5x)
  const [ampZoom, setAmpZoom] = useState<number>(1);
  // Expanded oscilloscope height mode ("change the size of the waveforms")
  const [expandedSize, setExpandedSize] = useState<boolean>(false);
  // Pan offset in degrees when zoomed in horizontally
  const [panStartDeg, setPanStartDeg] = useState<number>(0);
  // Channel visibility toggles
  const [showSourcePhases, setShowSourcePhases] = useState<boolean>(true);
  const [showVL, setShowVL] = useState<boolean>(true);
  const [showVR, setShowVR] = useState<boolean>(true);

  const visibleSpanDeg = 720 / timeZoom;
  const maxStartDeg = Math.max(0, 720 - visibleSpanDeg);
  const clampedStartDeg = Math.min(panStartDeg, maxStartDeg);
  const endDeg = clampedStartDeg + visibleSpanDeg;

  const visiblePoints = points.filter(
    (p) => p.thetaDeg >= clampedStartDeg && p.thetaDeg <= endDeg
  );

  const handleTimeZoomIn = () => {
    setTimeZoom((prev) => Math.min(4, Number((prev * 1.5).toFixed(2))));
  };

  const handleTimeZoomOut = () => {
    setTimeZoom((prev) => {
      const next = Math.max(1, Number((prev / 1.5).toFixed(2)));
      if (next === 1) setPanStartDeg(0);
      return next;
    });
  };

  const handleAmpZoomIn = () => {
    setAmpZoom((prev) => Math.min(2.5, Number((prev + 0.25).toFixed(2))));
  };

  const handleAmpZoomOut = () => {
    setAmpZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  };

  const handleResetZoom = () => {
    setTimeZoom(1);
    setAmpZoom(1);
    setPanStartDeg(0);
  };

  // Handle wheel zoom directly on oscilloscope canvas
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (e.shiftKey) {
      // Shift + wheel adjusts vertical amplitude scale
      if (e.deltaY < 0) handleAmpZoomIn();
      else handleAmpZoomOut();
    } else {
      // Standard wheel adjusts horizontal time zoom
      if (e.deltaY < 0) handleTimeZoomIn();
      else handleTimeZoomOut();
    }
  };

  // SVG Coordinate System
  const width = 820;
  const vPlotHeight = expandedSize ? 260 : 185;
  const iPlotHeight = expandedSize ? 190 : 135;
  const gapHeight = 34;
  const totalHeight = vPlotHeight + iPlotHeight + gapHeight + 36;

  const padLeft = 58;
  const padRight = 24;
  const plotWidth = width - padLeft - padRight;

  // Voltage scale bounds
  const maxVoltageRef = (phaseType === 'three' ? vPeakPhase * 1.85 : vPeakPhase * 1.15) / ampZoom;
  const vZeroY = 18 + vPlotHeight * 0.56;
  const vScale = (vPlotHeight * 0.44) / Math.max(10, maxVoltageRef);

  // Current scale bounds: anchor vertical axis to the resistive peak current (V_max / R)
  // so that sliding Inductance L from 0 mH to 200 mH visibly flattens the current ripple on screen
  // without auto-scaling rescaling the Y axis to hide the change!
  const vMaxCircuit = phaseType === 'three' && bridgeType === 'full' ? vPeakPhase * 1.75 : vPeakPhase * 1.05;
  const resistivePeakI = vMaxCircuit / Math.max(1, resistance);
  const actualPeakI = Math.max(0.5, ...points.map((p) => p.iOut));
  const maxCurrentRef = Math.max(resistivePeakI, actualPeakI * 1.1) / ampZoom;
  const iTopY = vPlotHeight + gapHeight;
  const iZeroY = iTopY + iPlotHeight - 16;
  const iScale = (iPlotHeight - 28) / Math.max(0.5, maxCurrentRef);

  const thetaToX = (theta: number) =>
    padLeft + ((theta - clampedStartDeg) / visibleSpanDeg) * plotWidth;

  const vToY = (v: number) => {
    const rawY = vZeroY - v * vScale;
    return Math.max(12, Math.min(vPlotHeight + 10, rawY));
  };

  const iToY = (i: number) => {
    const rawY = iZeroY - i * iScale;
    return Math.max(iTopY + 8, Math.min(iZeroY + 4, rawY));
  };

  const buildPolyline = (getter: (p: SimulationPoint) => number, yMapper: (val: number) => number) => {
    if (visiblePoints.length === 0) return '';
    return visiblePoints
      .map((p) => `${thetaToX(p.thetaDeg).toFixed(1)},${yMapper(getter(p)).toFixed(1)}`)
      .join(' ');
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    if (relX >= padLeft && relX <= width - padRight) {
      const ratio = (relX - padLeft) / plotWidth;
      const deg = clampedStartDeg + ratio * visibleSpanDeg;
      const snappedDeg = Math.round(deg * 2) / 2;
      onSelectAngle(Math.max(0, Math.min(720, snappedDeg)));
    }
  };

  const probedPoint =
    points.find((p) => Math.abs(p.thetaDeg - selectedAngleDeg) < 0.3) || points[0];

  // Degree grid ticks
  const stepDeg = visibleSpanDeg <= 240 ? 30 : visibleSpanDeg <= 480 ? 60 : 90;
  const degreeTicks: number[] = [];
  for (
    let d = Math.ceil(clampedStartDeg / stepDeg) * stepDeg;
    d <= endDeg;
    d += stepDeg
  ) {
    degreeTicks.push(d);
  }

  return (
    <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
      {/* Oscilloscope Control & Zoom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
          <span className="text-xs font-semibold tracking-wide text-slate-200">
            Dual-Channel Digital Oscilloscope
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-mono text-xs text-sky-400 tabular-nums">
            Time Zoom: {timeZoom.toFixed(2)}× ({Math.round(visibleSpanDeg)}° window)
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-mono text-xs text-amber-400 tabular-nums">
            Amp Scale: {ampZoom.toFixed(2)}×
          </span>
        </div>

        {/* Interactive Waveform Zoom & Sizing Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Time Zoom Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            <span className="px-2 text-[11px] font-mono text-slate-400">Time (X):</span>
            <button
              type="button"
              onClick={handleTimeZoomOut}
              disabled={timeZoom <= 1}
              title="Zoom Out Time Axis"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleTimeZoomIn}
              disabled={timeZoom >= 4}
              title="Zoom In Time Axis"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Amplitude Zoom Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            <span className="px-2 text-[11px] font-mono text-slate-400">Gain (Y):</span>
            <button
              type="button"
              onClick={handleAmpZoomOut}
              disabled={ampZoom <= 0.5}
              title="Decrease Waveform Amplitude Size"
              className="px-2 py-1 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded transition-colors"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleAmpZoomIn}
              disabled={ampZoom >= 2.5}
              title="Increase Waveform Amplitude Size"
              className="px-2 py-1 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded transition-colors"
            >
              +
            </button>
          </div>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset 1×
          </button>

          {/* Toggle Canvas Height Size */}
          <button
            type="button"
            onClick={() => setExpandedSize((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/70 border border-sky-800/60 rounded-md transition-colors whitespace-nowrap"
          >
            {expandedSize ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Compact View
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Expand Scope
              </>
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Pan Slider & Channel Toggles Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={showSourcePhases}
              onChange={(e) => setShowSourcePhases(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
            />
            <span>Show AC Input Reference</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={showVL}
              onChange={(e) => setShowVL(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-violet-500 focus:ring-0"
            />
            <span>Show Inductor Voltage v_L(t) [Violet]</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={showVR}
              onChange={(e) => setShowVR(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
            />
            <span>Show Resistor Voltage v_R(t) = i·R [Emerald]</span>
          </label>
        </div>

        {timeZoom > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">
              Window Pan ({Math.round(clampedStartDeg)}° – {Math.round(endDeg)}°):
            </span>
            <input
              type="range"
              min={0}
              max={maxStartDeg}
              step={5}
              value={clampedStartDeg}
              onChange={(e) => setPanStartDeg(Number(e.target.value))}
              className="w-32 accent-sky-400 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Interactive SVG Oscilloscope Graticule & Waveforms */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${totalHeight}`}
          onWheel={handleWheel}
          onMouseMove={handleSvgMouseMove}
          className="w-full h-auto cursor-crosshair select-none block"
        >
          {/* Background */}
          <rect width={width} height={totalHeight} fill="#090d16" />

          {/* Vertical Degree Grid Lines */}
          {degreeTicks.map((deg) => {
            const x = thetaToX(deg);
            return (
              <g key={deg}>
                <line
                  x1={x}
                  y1={12}
                  x2={x}
                  y2={vPlotHeight + 10}
                  stroke="#1e293b"
                  strokeWidth={1}
                  strokeDasharray={deg % 180 === 0 ? undefined : '3 3'}
                />
                <line
                  x1={x}
                  y1={iTopY + 8}
                  x2={x}
                  y2={iZeroY}
                  stroke="#1e293b"
                  strokeWidth={1}
                  strokeDasharray={deg % 180 === 0 ? undefined : '3 3'}
                />
                <text
                  x={x}
                  y={totalHeight - 8}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-slate-400"
                >
                  {deg}°
                </text>
              </g>
            );
          })}

          {/* CHANNEL 1: VOLTAGE AXIS & WAVEFORMS */}
          <line
            x1={padLeft}
            y1={vZeroY}
            x2={width - padRight}
            y2={vZeroY}
            stroke="#334155"
            strokeWidth={1.2}
          />
          <text
            x={padLeft - 8}
            y={vZeroY + 3}
            textAnchor="end"
            className="font-mono text-[10px] fill-slate-400"
          >
            0 V
          </text>
          <text
            x={padLeft - 8}
            y={24}
            textAnchor="end"
            className="font-mono text-[10px] fill-sky-400"
          >
            +{Math.round(maxVoltageRef)}V
          </text>
          <text
            x={padLeft - 8}
            y={vPlotHeight + 6}
            textAnchor="end"
            className="font-mono text-[10px] fill-slate-500"
          >
            −{Math.round(maxVoltageRef * 0.7)}V
          </text>

          {/* Channel 1 Label */}
          <text
            x={padLeft + 8}
            y={24}
            className="font-mono text-[11px] font-semibold fill-sky-400"
          >
            CH1: Output Voltage v_out(t) [Cyan] {showVL ? ' & Inductor v_L(t) [Violet]' : ''}
          </text>

          {/* Reference AC Phase or Line-to-Line Waveforms (Dashed) */}
          {showSourcePhases && (
            <>
              {phaseType === 'three' && bridgeType === 'full' ? (
                /* 6-Pulse Full-Bridge: Show the 6 line-to-line reference envelopes (v_ab, v_ac, v_bc, v_ba, v_ca, v_cb) */
                <>
                  <polyline
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={1.1}
                    strokeDasharray="3 3"
                    opacity={0.5}
                    points={buildPolyline((p) => p.va - p.vb, vToY)}
                  />
                  <polyline
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth={1.1}
                    strokeDasharray="3 3"
                    opacity={0.45}
                    points={buildPolyline((p) => p.va - p.vc, vToY)}
                  />
                  <polyline
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={1.1}
                    strokeDasharray="3 3"
                    opacity={0.5}
                    points={buildPolyline((p) => p.vb - p.vc, vToY)}
                  />
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.1}
                    strokeDasharray="3 3"
                    opacity={0.45}
                    points={buildPolyline((p) => p.vb - p.va, vToY)}
                  />
                  <polyline
                    fill="none"
                    stroke="#059669"
                    strokeWidth={1.1}
                    strokeDasharray="3 3"
                    opacity={0.5}
                    points={buildPolyline((p) => p.vc - p.va, vToY)}
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1.1}
                    strokeDasharray="3 3"
                    opacity={0.45}
                    points={buildPolyline((p) => p.vc - p.vb, vToY)}
                  />
                </>
              ) : (
                /* 1-Phase or 3-Phase Half-Bridge: Show Phase Voltages v_a, v_b, v_c */
                <>
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={1.2}
                    strokeDasharray="4 4"
                    opacity={0.55}
                    points={buildPolyline((p) => p.va, vToY)}
                  />
                  {phaseType === 'single' && bridgeType === 'full' && (
                    <polyline
                      fill="none"
                      stroke="#64748b"
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                      opacity={0.45}
                      points={buildPolyline((p) => -p.va, vToY)}
                    />
                  )}
                  {phaseType === 'three' && (
                    <>
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={1.2}
                        strokeDasharray="4 4"
                        opacity={0.55}
                        points={buildPolyline((p) => p.vb, vToY)}
                      />
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={1.2}
                        strokeDasharray="4 4"
                        opacity={0.55}
                        points={buildPolyline((p) => p.vc, vToY)}
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Inductor Voltage v_L(t) */}
          {showVL && (
            <polyline
              fill="none"
              stroke="#a78bfa"
              strokeWidth={1.6}
              opacity={0.85}
              points={buildPolyline((p) => p.vL, vToY)}
            />
          )}

          {/* Resistor Voltage v_R(t) = i_out(t) * R (Directly shows L smoothing on CH1) */}
          {showVR && (
            <polyline
              fill="none"
              stroke="#34d399"
              strokeWidth={2}
              opacity={0.9}
              points={buildPolyline((p) => p.vR, vToY)}
            />
          )}

          {/* Rectified Output Voltage v_out(t) */}
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2.6}
            strokeLinejoin="round"
            points={buildPolyline((p) => p.vOut, vToY)}
          />

          {/* CHANNEL 2: CURRENT AXIS & WAVEFORMS */}
          <line
            x1={padLeft}
            y1={iZeroY}
            x2={width - padRight}
            y2={iZeroY}
            stroke="#334155"
            strokeWidth={1.2}
          />
          <text
            x={padLeft - 8}
            y={iZeroY + 3}
            textAnchor="end"
            className="font-mono text-[10px] fill-slate-400"
          >
            0 A
          </text>
          <text
            x={padLeft - 8}
            y={iTopY + 18}
            textAnchor="end"
            className="font-mono text-[10px] fill-emerald-400"
          >
            +{maxCurrentRef.toFixed(1)}A
          </text>

          {/* Channel 2 Label */}
          <text
            x={padLeft + 8}
            y={iTopY + 18}
            className="font-mono text-[11px] font-semibold fill-emerald-400"
          >
            CH2: Load Current i_out(t) [Emerald]
          </text>

          {/* Load Current i_out(t) */}
          <polyline
            fill="none"
            stroke="#34d399"
            strokeWidth={2.6}
            strokeLinejoin="round"
            points={buildPolyline((p) => p.iOut, iToY)}
          />

          {/* Interactive Crosshair Probe Line */}
          {selectedAngleDeg >= clampedStartDeg && selectedAngleDeg <= endDeg && (
            <g>
              <line
                x1={thetaToX(selectedAngleDeg)}
                y1={12}
                x2={thetaToX(selectedAngleDeg)}
                y2={iZeroY}
                stroke="#f59e0b"
                strokeWidth={1.4}
                strokeDasharray="3 3"
              />
              <circle
                cx={thetaToX(selectedAngleDeg)}
                cy={vToY(probedPoint.vOut)}
                r={4.5}
                fill="#38bdf8"
                stroke="#090d16"
                strokeWidth={1.5}
              />
              <circle
                cx={thetaToX(selectedAngleDeg)}
                cy={iToY(probedPoint.iOut)}
                r={4.5}
                fill="#34d399"
                stroke="#090d16"
                strokeWidth={1.5}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Live Probe Telemetry Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-t border-slate-800 font-mono text-xs tabular-nums">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-amber-400 font-medium">
            Probe ωt = {probedPoint.thetaDeg.toFixed(1)}° ({probedPoint.timeMs.toFixed(2)} ms)
          </span>
          <span className="text-sky-400">
            v_out = {probedPoint.vOut.toFixed(1)} V
          </span>
          <span className="text-emerald-400">
            i_out = {probedPoint.iOut.toFixed(2)} A
          </span>
          <span className="text-violet-400">
            v_L = {probedPoint.vL.toFixed(1)} V
          </span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Tip: Scroll wheel on scope to zoom time · Shift+Scroll to scale amplitude
        </div>
      </div>
    </div>
  );
};
