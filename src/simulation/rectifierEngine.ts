export type SwitchType = 'diode' | 'thyristor';
export type BridgeType = 'half' | 'full';
export type PhaseType = 'single' | 'three';

export interface CircuitConfig {
  switchType: SwitchType;
  bridgeType: BridgeType;
  phaseType: PhaseType;
  resistance: number; // Ohms (1 to 100)
  inductance: number; // mH (0 to 250)
  firingAngleDeg: number; // Degrees (0 to 150) for thyristor
  vPeakPhase: number; // Peak phase voltage in V (default 170V ~ 120Vrms)
  frequency: number; // Hz (default 50Hz)
}

export interface SimulationPoint {
  thetaDeg: number; // 0 to 720 degrees (2 full cycles)
  timeMs: number;
  va: number;
  vb: number;
  vc: number;
  vOut: number;
  iOut: number;
  vR: number;
  vL: number;
  activeDevices: string[]; // e.g., ['D1'], ['T1', 'T2'], ['D1', 'D6'], etc.
}

export interface SimulationResult {
  points: SimulationPoint[];
  metrics: {
    vDcAvg: number;
    vRms: number;
    iDcAvg: number;
    iRms: number;
    iRipplePeakToPeak: number;
    rippleFactor: number;
    conductionMode: 'CCM' | 'DCM';
    extinctionAngleDeg: number;
    loadImpedanceAngleDeg: number;
    timeConstantMs: number;
  };
  topologyInfo: {
    code: string;
    title: string;
    pulseNumber: number;
    summary: string;
    idealVdcFormula: string;
    devicesList: string[];
  };
}

const DEG_TO_RAD = Math.PI / 180;

export function getTopologyMetadata(
  switchType: SwitchType,
  bridgeType: BridgeType,
  phaseType: PhaseType
) {
  const swLabel = switchType === 'diode' ? 'Diode (Uncontrolled)' : 'Thyristor / SCR (Controlled)';
  const brLabel = bridgeType === 'half' ? 'Half-Bridge (Midpoint / Half-Wave)' : 'Full-Bridge (Graetz)';
  const phLabel = phaseType === 'single' ? 'Single-Phase (1Φ)' : 'Three-Phase (3Φ)';

  const key = `${phaseType}-${bridgeType}-${switchType}`;

  const map: Record<
    string,
    {
      code: string;
      title: string;
      pulseNumber: number;
      summary: string;
      idealVdcFormula: string;
      devicesList: string[];
    }
  > = {
    'single-half-diode': {
      code: '1Φ-HB-D',
      title: 'Single-Phase Half-Bridge Diode Rectifier',
      pulseNumber: 1,
      summary:
        'Single diode conducts during positive half-cycle. Inductive load extends conduction beyond 180° until stored magnetic energy is depleted.',
      idealVdcFormula: 'V_dc = V_m / π',
      devicesList: ['D1'],
    },
    'single-half-thyristor': {
      code: '1Φ-HB-SCR',
      title: 'Single-Phase Half-Bridge Thyristor Rectifier',
      pulseNumber: 1,
      summary:
        'Phase-controlled SCR triggered at angle α. Inductor forces current conduction past 180° into negative voltage region until extinction angle β.',
      idealVdcFormula: 'V_dc = (V_m / 2π) · (1 - cos β + cos α - ...)',
      devicesList: ['T1'],
    },
    'single-full-diode': {
      code: '1Φ-FB-D',
      title: 'Single-Phase Full-Bridge Diode Rectifier',
      pulseNumber: 2,
      summary:
        'Four-diode Graetz bridge rectifies both half-cycles (D1-D2 positive, D3-D4 negative). Higher L smooths the 2-pulse DC load current.',
      idealVdcFormula: 'V_dc = 2·V_m / π ≈ 0.637·V_m',
      devicesList: ['D1', 'D2', 'D3', 'D4'],
    },
    'single-full-thyristor': {
      code: '1Φ-FB-SCR',
      title: 'Single-Phase Full-Bridge Thyristor Rectifier',
      pulseNumber: 2,
      summary:
        'Four SCRs triggered in pairs (T1-T2 at α, T3-T4 at π+α). In continuous conduction (high L), negative voltage excursions occur before commutation.',
      idealVdcFormula: 'V_dc (CCM) = (2·V_m / π) · cos α',
      devicesList: ['T1', 'T2', 'T3', 'T4'],
    },
    'three-half-diode': {
      code: '3Φ-HB-D',
      title: 'Three-Phase Half-Bridge (Midpoint) Diode Rectifier',
      pulseNumber: 3,
      summary:
        'Three common-cathode diodes conduct for 120° each when their respective phase voltage is highest. Natural commutation occurs at 30°, 150°, 270°.',
      idealVdcFormula: 'V_dc = (3√3 / 2π) · V_mp ≈ 0.827·V_mp',
      devicesList: ['D1', 'D2', 'D3'],
    },
    'three-half-thyristor': {
      code: '3Φ-HB-SCR',
      title: 'Three-Phase Half-Bridge Thyristor Rectifier',
      pulseNumber: 3,
      summary:
        'Three SCRs delayed by firing angle α relative to natural 30° commutation point. With RL load, continuous or discontinuous 3-pulse current flows.',
      idealVdcFormula: 'V_dc (CCM) = (3√3 / 2π) · V_mp · cos α',
      devicesList: ['T1', 'T2', 'T3'],
    },
    'three-full-diode': {
      code: '3Φ-FB-D',
      title: 'Three-Phase Full-Bridge (6-Pulse) Diode Rectifier',
      pulseNumber: 6,
      summary:
        'Six-diode bridge conducts in pairs (one upper group D1/D3/D5, one lower group D4/D6/D2), yielding low-ripple 6-pulse line-to-line output.',
      idealVdcFormula: 'V_dc = (3√3 / π) · V_mp ≈ 1.654·V_mp',
      devicesList: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'],
    },
    'three-full-thyristor': {
      code: '3Φ-FB-SCR',
      title: 'Three-Phase Full-Bridge (6-Pulse) Thyristor Rectifier',
      pulseNumber: 6,
      summary:
        'Industry-standard 6-pulse controlled converter. Pairs of SCRs commutate every 60° delayed by firing angle α, adjusting DC output smoothly.',
      idealVdcFormula: 'V_dc (CCM) = (3√3 / π) · V_mp · cos α',
      devicesList: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    },
  };

  return (
    map[key] || {
      code: 'RECT',
      title: `${phLabel} ${brLabel} ${swLabel}`,
      pulseNumber: 2,
      summary: 'Power electronics rectifier circuit with series RL load.',
      idealVdcFormula: 'V_dc = f(V_m, α)',
      devicesList: ['D1'],
    }
  );
}

/**
 * Simulates the steady-state time-domain waveforms for all 8 rectifier topologies
 * with series R-L load using a high-resolution RK4 / Euler numerical solver over
 * 4 cycles and extracting the settled 2 cycles (0° to 720°).
 */
export function simulateRectifier(config: CircuitConfig): SimulationResult {
  const {
    switchType,
    bridgeType,
    phaseType,
    resistance,
    inductance,
    firingAngleDeg,
    vPeakPhase,
    frequency,
  } = config;

  const R = Math.max(0.5, resistance);
  const L = Math.max(0, inductance) * 1e-3; // Convert mH to H
  const omega = 2 * Math.PI * frequency;
  const alphaDeg = switchType === 'thyristor' ? Math.max(0, Math.min(150, firingAngleDeg)) : 0;

  // Step size: 0.5 degree per step
  const dThetaDeg = 0.5;
  const dThetaRad = dThetaDeg * DEG_TO_RAD;
  const dt = dThetaRad / omega;

  // Run 10 cycles (3600 degrees) so even high-inductance / low-resistance RL loads
  // (up to tau = L/R = 100 ms) settle >99.9% into periodic steady state,
  // then record the last 2 cycles (720 degrees).
  const totalCycles = 10;
  const stepsPerCycle = Math.round(360 / dThetaDeg);
  const totalSteps = totalCycles * stepsPerCycle;
  const recordStartStep = (totalCycles - 2) * stepsPerCycle;

  let iOut = 0;
  let activeDevices: string[] = [];
  let conductionState = 0; // tracks which switch/pair is currently latched on

  const recordedPoints: SimulationPoint[] = [];

  for (let step = 0; step <= totalSteps; step++) {
    const totalThetaDeg = step * dThetaDeg;
    const cycThetaDeg = ((totalThetaDeg % 360) + 360) % 360;
    const rad = totalThetaDeg * DEG_TO_RAD;

    const va = vPeakPhase * Math.sin(rad);
    const vb = phaseType === 'three' ? vPeakPhase * Math.sin(rad - (2 * Math.PI) / 3) : 0;
    const vc = phaseType === 'three' ? vPeakPhase * Math.sin(rad - (4 * Math.PI) / 3) : 0;

    let vOut = 0;
    const pfx = switchType === 'diode' ? 'D' : 'T';

    // Narrow SCR gate pulse width (6 degrees) so that if current extinguishes in DCM
    // (when L is small and alpha is large), the SCR turns OFF at the voltage zero-crossing
    // and remains OFF until the next scheduled firing pulse.
    const PULSE_WIDTH_DEG = 6;

    if (phaseType === 'single' && bridgeType === 'half') {
      // 1-Phase Half-Wave (1-Pulse: D1 or T1)
      if (switchType === 'diode') {
        if (va > 0) {
          conductionState = 1;
        }
      } else {
        // Thyristor gate pulse at alphaDeg
        if (
          cycThetaDeg >= alphaDeg &&
          cycThetaDeg < Math.min(180, alphaDeg + PULSE_WIDTH_DEG) &&
          va > 0
        ) {
          conductionState = 1;
        }
      }

      if (conductionState === 1) {
        vOut = va;
        activeDevices = [`${pfx}1`];
      } else {
        vOut = 0;
        activeDevices = [];
      }
    } else if (phaseType === 'single' && bridgeType === 'full') {
      // 1-Phase Full-Bridge (2-Pulse Graetz Bridge)
      // State 1: (D1, D2) or (T1, T2) -> vOut = +va
      // State 2: (D3, D4) or (T3, T4) -> vOut = -va
      if (switchType === 'diode') {
        if (va >= 0) {
          conductionState = 1;
        } else {
          conductionState = 2;
        }
      } else {
        // Thyristor Full-Bridge
        // Pair (T1, T2) receives gate pulse at alphaDeg
        // Pair (T3, T4) receives gate pulse at 180 + alphaDeg
        const rel1 = (cycThetaDeg - alphaDeg + 720) % 360;
        const rel2 = (cycThetaDeg - (180 + alphaDeg) + 720) % 360;
        if (rel1 >= 0 && rel1 < PULSE_WIDTH_DEG && va > 0) {
          conductionState = 1;
        } else if (rel2 >= 0 && rel2 < PULSE_WIDTH_DEG && -va > 0) {
          conductionState = 2;
        }
      }

      if (conductionState === 1) {
        vOut = va;
        activeDevices = [`${pfx}1`, `${pfx}2`];
      } else if (conductionState === 2) {
        vOut = -va;
        activeDevices = [`${pfx}3`, `${pfx}4`];
      } else {
        vOut = 0;
        activeDevices = [];
      }
    } else if (phaseType === 'three' && bridgeType === 'half') {
      // 3-Phase Half-Bridge (3-Pulse Midpoint Rectifier)
      // Phase voltages: v_a (State 1), v_b (State 2), v_c (State 3)
      const phaseVoltages = [va, vb, vc];

      if (switchType === 'diode') {
        // Uncontrolled diodes: whichever phase has the maximum positive voltage conducts,
        // or if all are negative and iOut > 0, the currently conducting diode stays on until iOut -> 0.
        let maxIdx = 0;
        if (vb > phaseVoltages[maxIdx]) maxIdx = 1;
        if (vc > phaseVoltages[maxIdx]) maxIdx = 2;

        if (phaseVoltages[maxIdx] > 0) {
          conductionState = maxIdx + 1;
        }
      } else {
        // Controlled 3-pulse SCR rectifier:
        // Natural commutation points are 30° (T1), 150° (T2), 270° (T3).
        // Each SCR k receives a gate pulse at (30 + 120*k + alpha)°.
        const currentV =
          conductionState >= 1 && conductionState <= 3 ? phaseVoltages[conductionState - 1] : 0;

        for (let k = 0; k < 3; k++) {
          const naturalAngle = 30 + k * 120;
          const relAngle = (cycThetaDeg - naturalAngle - alphaDeg + 720) % 360;
          if (relAngle >= 0 && relAngle < PULSE_WIDTH_DEG) {
            const vCand = phaseVoltages[k];
            if (conductionState === 0) {
              if (vCand > 0) {
                conductionState = k + 1;
              }
            } else if (conductionState !== k + 1) {
              if (vCand > currentV) {
                conductionState = k + 1;
              }
            }
          }
        }
      }

      if (conductionState >= 1 && conductionState <= 3) {
        vOut = phaseVoltages[conductionState - 1];
        activeDevices = [`${pfx}${conductionState}`];
      } else {
        vOut = 0;
        activeDevices = [];
      }
    } else if (phaseType === 'three' && bridgeType === 'full') {
      // 3-Phase Full-Bridge (6-Pulse Graetz Bridge)
      // 6 line-to-line commutation states in natural order starting at 30°:
      // State 1 (30°..90°):   v_ab = va - vb  (D1/T1, D6/T6)
      // State 2 (90°..150°):  v_ac = va - vc  (D1/T1, D2/T2)
      // State 3 (150°..210°): v_bc = vb - vc  (D3/T3, D2/T2)
      // State 4 (210°..270°): v_ba = vb - va  (D3/T3, D4/T4)
      // State 5 (270°..330°): v_ca = vc - va  (D5/T5, D4/T4)
      // State 6 (330°..390°): v_cb = vc - vb  (D5/T5, D6/T6)
      const lineVoltages = [va - vb, va - vc, vb - vc, vb - va, vc - va, vc - vb];
      const pairMap = [
        [`${pfx}1`, `${pfx}6`],
        [`${pfx}1`, `${pfx}2`],
        [`${pfx}3`, `${pfx}2`],
        [`${pfx}3`, `${pfx}4`],
        [`${pfx}5`, `${pfx}4`],
        [`${pfx}5`, `${pfx}6`],
      ];

      if (switchType === 'diode') {
        // For a 6-pulse diode bridge, the maximum line-to-line voltage is always >= 1.5 * V_peak > 0
        let maxIdx = 0;
        for (let k = 1; k < 6; k++) {
          if (lineVoltages[k] > lineVoltages[maxIdx]) {
            maxIdx = k;
          }
        }
        conductionState = maxIdx + 1;
      } else {
        // For a 6-pulse SCR bridge (double-pulsing industrial gate drive):
        // Pair k (0..5) has natural commutation at (30 + 60*k)° and receives a synchronized
        // double-pulse at (30 + 60*k + alpha)° with width PULSE_WIDTH_DEG.
        const currentV =
          conductionState >= 1 && conductionState <= 6 ? lineVoltages[conductionState - 1] : 0;

        for (let k = 0; k < 6; k++) {
          const naturalAngle = 30 + k * 60;
          const relAngle = (cycThetaDeg - naturalAngle - alphaDeg + 720) % 360;
          if (relAngle >= 0 && relAngle < PULSE_WIDTH_DEG) {
            const vCand = lineVoltages[k];
            if (conductionState === 0) {
              if (vCand > 0) {
                conductionState = k + 1;
              }
            } else if (conductionState !== k + 1) {
              if (vCand > currentV) {
                conductionState = k + 1;
              }
            }
          }
        }
      }

      if (conductionState >= 1 && conductionState <= 6) {
        vOut = lineVoltages[conductionState - 1];
        activeDevices = pairMap[conductionState - 1];
      } else {
        vOut = 0;
        activeDevices = [];
      }
    }

    // Solve RL differential equation: L * di/dt + R * i = vOut
    let nextI = 0;
    let vL = 0;
    let vR = 0;

    if (L <= 1e-6) {
      // Purely resistive load (L = 0)
      if (vOut > 0 && conductionState !== 0) {
        nextI = vOut / R;
        vR = vOut;
        vL = 0;
      } else {
        nextI = 0;
        vOut = 0;
        vR = 0;
        vL = 0;
        conductionState = 0;
        activeDevices = [];
      }
    } else {
      // Unconditionally stable exponential integrator for L * di/dt + R * i = vOut
      if (conductionState !== 0) {
        const expFactor = Math.exp(-(R / L) * dt);
        nextI = iOut * expFactor + (vOut / R) * (1 - expFactor);

        // For 1-phase half-wave with passive R-L load, current physically must extinguish
        // at or before 360° because the volt-second integral of a full sine wave is zero
        // and passive R > 0 dissipates energy.
        const isOnePhaseHalfWaveWrap =
          phaseType === 'single' &&
          bridgeType === 'half' &&
          cycThetaDeg >= 359.5;

        if ((nextI <= 1e-5 && vOut <= 0) || isOnePhaseHalfWaveWrap) {
          // Current extinguished (unidirectional switches block reverse current)
          nextI = 0;
          vOut = 0;
          vR = 0;
          vL = 0;
          conductionState = 0;
          activeDevices = [];
        } else {
          nextI = Math.max(0, nextI);
          vR = nextI * R;
          vL = vOut - vR;
        }
      } else {
        nextI = 0;
        vOut = 0;
        vR = 0;
        vL = 0;
        activeDevices = [];
      }
    }

    iOut = nextI;

    if (step >= recordStartStep) {
      const displayTheta = (step - recordStartStep) * dThetaDeg;
      recordedPoints.push({
        thetaDeg: displayTheta,
        timeMs: (displayTheta / 360) * (1000 / frequency),
        va,
        vb,
        vc,
        vOut,
        iOut,
        vR,
        vL,
        activeDevices: [...activeDevices],
      });
    }
  }

  // Compute aggregate metrics over 1 full cycle (first 360 degrees of recorded data)
  const oneCyclePoints = recordedPoints.filter((p) => p.thetaDeg < 360);
  const n = oneCyclePoints.length || 1;

  let sumV = 0;
  let sumV2 = 0;
  let sumI = 0;
  let sumI2 = 0;
  let minI = Infinity;
  let maxI = -Infinity;
  let zeroCurrentCount = 0;
  let extinctionAngleDeg = 180;

  for (let idx = 0; idx < oneCyclePoints.length; idx++) {
    const pt = oneCyclePoints[idx];
    sumV += pt.vOut;
    sumV2 += pt.vOut * pt.vOut;
    sumI += pt.iOut;
    sumI2 += pt.iOut * pt.iOut;
    if (pt.iOut < minI) minI = pt.iOut;
    if (pt.iOut > maxI) maxI = pt.iOut;
    if (pt.iOut <= 1e-3) {
      zeroCurrentCount++;
    }
    if (idx > 0 && oneCyclePoints[idx - 1].iOut > 1e-3 && pt.iOut <= 1e-3) {
      extinctionAngleDeg = pt.thetaDeg;
    }
  }

  const vDcAvg = sumV / n;
  const vRms = Math.sqrt(sumV2 / n);
  const iDcAvg = sumI / n;
  const iRms = Math.sqrt(sumI2 / n);
  const iRipplePeakToPeak = Math.max(0, maxI - minI);

  const vAcRms = Math.sqrt(Math.max(0, vRms * vRms - vDcAvg * vDcAvg));
  const rippleFactor = vDcAvg > 0.1 ? vAcRms / vDcAvg : 0;

  const isSingleHalf = phaseType === 'single' && bridgeType === 'half';
  const conductionMode: 'CCM' | 'DCM' =
    isSingleHalf || zeroCurrentCount > 2 ? 'DCM' : 'CCM';
  if (conductionMode === 'CCM') {
    extinctionAngleDeg = 360;
  }

  const xl = omega * L;
  const loadImpedanceAngleDeg = (Math.atan2(xl, R) * 180) / Math.PI;
  const timeConstantMs = (L / R) * 1000;

  return {
    points: recordedPoints,
    metrics: {
      vDcAvg,
      vRms,
      iDcAvg,
      iRms,
      iRipplePeakToPeak,
      rippleFactor,
      conductionMode,
      extinctionAngleDeg,
      loadImpedanceAngleDeg,
      timeConstantMs,
    },
    topologyInfo: getTopologyMetadata(switchType, bridgeType, phaseType),
  };
}
