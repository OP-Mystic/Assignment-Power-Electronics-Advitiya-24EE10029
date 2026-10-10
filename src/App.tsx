/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  BridgeType,
  CircuitConfig,
  PhaseType,
  SwitchType,
  simulateRectifier,
} from './simulation/rectifierEngine';
import { CircuitSchematic } from './components/CircuitSchematic';
import { OscilloscopeCanvas } from './components/OscilloscopeCanvas';
import { RotateCcw, Sliders, Activity, Zap, Cpu } from 'lucide-react';

interface PresetCombination {
  id: string;
  label: string;
  shortDesc: string;
  switchType: SwitchType;
  bridgeType: BridgeType;
  phaseType: PhaseType;
  resistance: number;
  inductance: number;
  firingAngleDeg: number;
}

const QUICK_COMBINATIONS: PresetCombination[] = [
  {
    id: '1p-hb-d',
    label: '1Φ Half-Bridge Diode',
    shortDesc: 'Single pulse · Freewheeling inductive tail',
    switchType: 'diode',
    bridgeType: 'half',
    phaseType: 'single',
    resistance: 15,
    inductance: 45,
    firingAngleDeg: 0,
  },
  {
    id: '1p-fb-scr',
    label: '1Φ Full-Bridge Thyristor',
    shortDesc: '2-pulse controlled · Continuous RL mode',
    switchType: 'thyristor',
    bridgeType: 'full',
    phaseType: 'single',
    resistance: 12,
    inductance: 85,
    firingAngleDeg: 45,
  },
  {
    id: '3p-hb-scr',
    label: '3Φ Half-Bridge Thyristor',
    shortDesc: '3-pulse midpoint · Phase delay α = 30°',
    switchType: 'thyristor',
    bridgeType: 'half',
    phaseType: 'three',
    resistance: 18,
    inductance: 40,
    firingAngleDeg: 30,
  },
  {
    id: '3p-fb-d',
    label: '3Φ Full-Bridge Diode',
    shortDesc: '6-pulse Graetz bridge · Low DC ripple',
    switchType: 'diode',
    bridgeType: 'full',
    phaseType: 'three',
    resistance: 20,
    inductance: 60,
    firingAngleDeg: 0,
  },
  {
    id: '3p-fb-scr',
    label: '3Φ Full-Bridge Thyristor',
    shortDesc: '6-pulse industrial SCR drive · α = 40°',
    switchType: 'thyristor',
    bridgeType: 'full',
    phaseType: 'three',
    resistance: 15,
    inductance: 100,
    firingAngleDeg: 40,
  },
];

export default function App() {
  const [config, setConfig] = useState<CircuitConfig>({
    switchType: 'thyristor',
    bridgeType: 'full',
    phaseType: 'single',
    resistance: 12,
    inductance: 85,
    firingAngleDeg: 45,
    vPeakPhase: 170, // ~120 Vrms phase
    frequency: 50,
  });

  const [selectedAngleDeg, setSelectedAngleDeg] = useState<number>(95);

  const simResult = useMemo(() => simulateRectifier(config), [config]);

  const probedPoint = useMemo(() => {
    return (
      simResult.points.find((p) => Math.abs(p.thetaDeg - selectedAngleDeg) < 0.3) ||
      simResult.points[0]
    );
  }, [simResult.points, selectedAngleDeg]);

  const applyPreset = (preset: PresetCombination) => {
    setConfig((prev) => ({
      ...prev,
      switchType: preset.switchType,
      bridgeType: preset.bridgeType,
      phaseType: preset.phaseType,
      resistance: preset.resistance,
      inductance: preset.inductance,
      firingAngleDeg: preset.firingAngleDeg,
    }));
  };

  const handleResetDefaults = () => {
    setConfig({
      switchType: 'diode',
      bridgeType: 'full',
      phaseType: 'single',
      resistance: 20,
      inductance: 50,
      firingAngleDeg: 30,
      vPeakPhase: 170,
      frequency: 50,
    });
    setSelectedAngleDeg(90);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Zone 1 (Single Brand Wordmark) — Zone 2 (Clean Nav Links) — Zone 3 (Primary Action) */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20">
        <a href="#top" className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          RectiScope
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#workbench" className="hover:text-slate-900 transition-colors whitespace-nowrap">
            Simulator Workbench
          </a>
          <a href="#presets" className="hover:text-slate-900 transition-colors whitespace-nowrap">
            Topology Presets
          </a>
          <a href="#matrix" className="hover:text-slate-900 transition-colors whitespace-nowrap">
            8-Circuit Matrix
          </a>
          <a href="#telemetry" className="hover:text-slate-900 transition-colors whitespace-nowrap">
            Load Metrics
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Circuit
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="workbench" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Quick Combination Draft Switcher Bar */}
        <section id="presets" className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Power Electronics Rectifier Schematic &amp; Waveform Simulator
              </h1>
              <p className="text-xs text-slate-500">
                Select any combination of Diode / Thyristor · Half-Bridge / Full-Bridge · Single-Phase / Three-Phase or pick a quick draft preset below.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono whitespace-nowrap">
              <span>Topology Code: {simResult.topologyInfo.code}</span>
              <span aria-hidden="true">·</span>
              <span>{simResult.topologyInfo.pulseNumber}-Pulse</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {QUICK_COMBINATIONS.map((preset) => {
              const isSelected =
                config.switchType === preset.switchType &&
                config.bridgeType === preset.bridgeType &&
                config.phaseType === preset.phaseType;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-sky-50/80 border-sky-500 text-slate-900 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {preset.label}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {preset.shortDesc}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Primary Two-Zone Workbench: Left Parameter Deck (360px) + Right Interactive Schematic & Oscilloscope */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: 2×2×2 Combinatorial Selector & R-L Load Sliders */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-6">
            {/* Combinatorial Topology Selector (3 Pairs -> 1 from each) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-600" />
                  1. Circuit Topology (3 Pairs)
                </h2>
                <span className="text-xs font-mono text-slate-500">8 Combinations</span>
              </div>

              {/* Pair 1: Switch Type (Diode vs Thyristor) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Pair A: Semiconductor Switch
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, switchType: 'diode' }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      config.switchType === 'diode'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Diode Rectifier
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, switchType: 'thyristor' }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      config.switchType === 'thyristor'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Thyristor (SCR)
                  </button>
                </div>
              </div>

              {/* Pair 2: Bridge Configuration (Half Bridge vs Full Bridge) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Pair B: Bridge Configuration
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, bridgeType: 'half' }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      config.bridgeType === 'half'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Half-Bridge
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, bridgeType: 'full' }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      config.bridgeType === 'full'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full-Bridge
                  </button>
                </div>
              </div>

              {/* Pair 3: AC Supply Phase (Single Phase vs Three Phase) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Pair C: AC Supply Phases
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, phaseType: 'single' }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      config.phaseType === 'single'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Single-Phase (1Φ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, phaseType: 'three' }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      config.phaseType === 'three'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Three-Phase (3Φ)
                  </button>
                </div>
              </div>
            </div>

            {/* R-L Load & Firing Angle Controls */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-600" />
                  2. Series R-L Load Parameters
                </h2>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  τ = {simResult.metrics.timeConstantMs.toFixed(1)} ms
                </span>
              </div>

              {/* Load Resistance R */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="r-slider" className="font-medium text-slate-700">
                    Load Resistor (R)
                  </label>
                  <span className="font-mono font-semibold text-sky-700 tabular-nums">
                    {config.resistance} Ω
                  </span>
                </div>
                <input
                  id="r-slider"
                  type="range"
                  min={2}
                  max={100}
                  step={1}
                  value={config.resistance}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, resistance: Number(e.target.value) }))
                  }
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>2 Ω (High Current)</span>
                  <span>50 Ω</span>
                  <span>100 Ω (Light Load)</span>
                </div>
              </div>

              {/* Load Inductance L */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="l-slider" className="font-medium text-slate-700">
                    Load Inductor (L)
                  </label>
                  <span className="font-mono font-semibold text-violet-700 tabular-nums">
                    {config.inductance} mH
                  </span>
                </div>
                <input
                  id="l-slider"
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={config.inductance}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, inductance: Number(e.target.value) }))
                  }
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>0 mH (Pure R)</span>
                  <span>100 mH</span>
                  <span>200 mH (Smooth DC)</span>
                </div>
              </div>

              {/* Thyristor Firing Angle Alpha (active when Thyristor is chosen) */}
              <div className={`space-y-1.5 transition-opacity ${config.switchType === 'diode' ? 'opacity-45' : ''}`}>
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="alpha-slider" className="font-medium text-slate-700">
                    SCR Firing Angle (α)
                  </label>
                  <span className="font-mono font-semibold text-amber-700 tabular-nums">
                    {config.switchType === 'thyristor' ? `${config.firingAngleDeg}°` : '0° (Diode Fixed)'}
                  </span>
                </div>
                <input
                  id="alpha-slider"
                  type="range"
                  min={0}
                  max={135}
                  step={5}
                  disabled={config.switchType === 'diode'}
                  value={config.switchType === 'thyristor' ? config.firingAngleDeg : 0}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, firingAngleDeg: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-600 cursor-pointer disabled:opacity-40"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>0°</span>
                  <span>60°</span>
                  <span>135°</span>
                </div>
              </div>
            </div>

            {/* Active Circuit Explanation & Formula Box */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                {simResult.topologyInfo.title}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {simResult.topologyInfo.summary}
              </p>
              <div className="pt-1 font-mono text-xs text-slate-700">
                Ideal Rule: <span className="font-semibold text-sky-800">{simResult.topologyInfo.idealVdcFormula}</span>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Interactive Schematic + Zoomable Dual-Channel Oscilloscope */}
          <div className="lg:col-span-8 space-y-5">
            {/* Live Interactive Schematic */}
            <CircuitSchematic
              switchType={config.switchType}
              bridgeType={config.bridgeType}
              phaseType={config.phaseType}
              resistance={config.resistance}
              inductance={config.inductance}
              firingAngleDeg={config.firingAngleDeg}
              activeDevices={probedPoint.activeDevices}
              instantaneousCurrent={probedPoint.iOut}
              instantaneousVoltage={probedPoint.vOut}
            />

            {/* Zoomable & Resizable Oscilloscope Waveforms */}
            <OscilloscopeCanvas
              points={simResult.points}
              phaseType={config.phaseType}
              bridgeType={config.bridgeType}
              resistance={config.resistance}
              vPeakPhase={config.vPeakPhase}
              selectedAngleDeg={selectedAngleDeg}
              onSelectAngle={setSelectedAngleDeg}
            />

            {/* Calculated Power Electronics Telemetry Strip */}
            <section
              id="telemetry"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="space-y-0.5">
                <div className="text-xs text-slate-500">Avg DC Voltage (V_dc)</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                    {simResult.metrics.vDcAvg.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1.5">V</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                  V_rms: {simResult.metrics.vRms.toFixed(1)} V
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-xs text-slate-500">Avg Load Current (I_dc)</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-mono font-bold text-emerald-700 tabular-nums">
                    {simResult.metrics.iDcAvg.toFixed(2)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1.5">A</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                  I_rms: {simResult.metrics.iRms.toFixed(2)} A · ΔI_pp: {simResult.metrics.iRipplePeakToPeak.toFixed(2)} A
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-xs text-slate-500">Conduction Regime</div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      simResult.metrics.conductionMode === 'CCM'
                        ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                        : 'bg-amber-500 ring-4 ring-amber-500/20'
                    }`}
                  />
                  <span className="text-base font-mono font-bold text-slate-900">
                    {simResult.metrics.conductionMode === 'CCM' ? '● CCM' : '▲ DCM'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {simResult.metrics.conductionMode === 'CCM'
                    ? 'Continuous Current'
                    : `Extinction β ≈ ${Math.round(simResult.metrics.extinctionAngleDeg)}°`}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-xs text-slate-500">Load Impedance Angle (φ)</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-mono font-bold text-violet-700 tabular-nums">
                    {simResult.metrics.loadImpedanceAngleDeg.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 ml-1">deg</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                  Ripple RF: {(simResult.metrics.rippleFactor * 100).toFixed(1)}%
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* All 8 Combinatorial Topologies Matrix */}
        <section id="matrix" className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600" />
                Complete 8-Combination Rectifier Matrix (2 × 2 × 2)
              </h2>
              <p className="text-xs text-slate-500">
                Click any row in the matrix to load that exact circuit combination into the schematic and oscilloscope above.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Switch Pair</th>
                  <th className="py-2.5 px-3">Bridge Pair</th>
                  <th className="py-2.5 px-3">Phase Pair</th>
                  <th className="py-2.5 px-3">Pulse No.</th>
                  <th className="py-2.5 px-3">Ideal V_dc Expression</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(
                  [
                    ['diode', 'half', 'single', '1Φ-HB-D', '1', 'V_m / π'],
                    ['thyristor', 'half', 'single', '1Φ-HB-SCR', '1', '(V_m / 2π)·(1 + cos α)'],
                    ['diode', 'full', 'single', '1Φ-FB-D', '2', '2·V_m / π'],
                    ['thyristor', 'full', 'single', '1Φ-FB-SCR', '2', '(2·V_m / π)·cos α'],
                    ['diode', 'half', 'three', '3Φ-HB-D', '3', '(3√3 / 2π)·V_mp'],
                    ['thyristor', 'half', 'three', '3Φ-HB-SCR', '3', '(3√3 / 2π)·V_mp·cos α'],
                    ['diode', 'full', 'three', '3Φ-FB-D', '6', '(3√3 / π)·V_mp'],
                    ['thyristor', 'full', 'three', '3Φ-FB-SCR', '6', '(3√3 / π)·V_mp·cos α'],
                  ] as const
                ).map(([sw, br, ph, code, pulse, formula]) => {
                  const isActive =
                    config.switchType === sw &&
                    config.bridgeType === br &&
                    config.phaseType === ph;
                  return (
                    <tr
                      key={code}
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          switchType: sw,
                          bridgeType: br,
                          phaseType: ph,
                        }))
                      }
                      className={`cursor-pointer transition-colors ${
                        isActive ? 'bg-sky-50/90 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-sky-700">{code}</td>
                      <td className="py-2.5 px-3 font-sans capitalize">{sw}</td>
                      <td className="py-2.5 px-3 font-sans capitalize">{br}-Bridge</td>
                      <td className="py-2.5 px-3 font-sans capitalize">{ph}-Phase</td>
                      <td className="py-2.5 px-3 tabular-nums">{pulse}-Pulse</td>
                      <td className="py-2.5 px-3 text-slate-600">{formula}</td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <span
                          className={`text-xs font-medium ${
                            isActive ? 'text-sky-700 underline' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {isActive ? 'Active in Scope' : 'Load Circuit →'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

