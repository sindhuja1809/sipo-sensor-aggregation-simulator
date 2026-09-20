/**
 * CircuitSVG - Interactive SVG Logic Diagram for 4-bit SIPO Shift Register
 * EC2201 - Synchronous Sequential Circuits | Unit III
 */

class CircuitSVG {
  constructor(containerId, engine) {
    this.container = document.getElementById(containerId);
    this.engine = engine;
    this.width = 1020;
    this.height = 460;
    this.animating = false;
    this.init();
  }

  init() {
    this.renderBaseSVG();
    this.bindEvents();
    this.engine.subscribe((state, meta) => this.update(state, meta));
  }

  bindEvents() {
    // 1. Quick action buttons
    const btnPulse = document.getElementById('diag-btn-pulse');
    const btnPrev = document.getElementById('diag-btn-prev');
    const btnToggle = document.getElementById('diag-btn-toggle');
    const btnReset = document.getElementById('diag-btn-reset');

    if (btnPulse) btnPulse.addEventListener('click', () => this.engine.stepNext());
    if (btnPrev) btnPrev.addEventListener('click', () => this.engine.stepPrev());
    if (btnToggle) btnToggle.addEventListener('click', () => this.engine.toggleAuto());
    if (btnReset) btnReset.addEventListener('click', () => this.engine.reset());

    // 2. Interactive Clock Port: Click to trigger Clock Edge
    const clkPort = document.getElementById('clock-in-port');
    if (clkPort) {
      clkPort.style.cursor = 'pointer';
      clkPort.addEventListener('click', () => this.engine.stepNext());
    }

    // 3. Interactive Serial Input Port: Click to toggle incoming bit
    const serialPort = document.getElementById('serial-in-port');
    if (serialPort) {
      serialPort.style.cursor = 'pointer';
      serialPort.addEventListener('click', () => {
        const curIdx = this.engine.clock < this.engine.stream.length ? this.engine.clock : 0;
        this.engine.toggleStreamBit(curIdx);
      });
    }

    // 4. Interactive Flip-Flops in SVG:
    // Clicking the flip-flop body directly toggles its stored bit (QA, QB, QC, QD)!
    ['a', 'b', 'c', 'd'].forEach(id => {
      const g = document.getElementById(`dff-${id}-group`);
      if (g) {
        g.style.cursor = 'pointer';
        g.setAttribute('title', `Click to toggle Q${id.toUpperCase()} (0 ↔ 1), or click 🔍 to inspect`);
        g.addEventListener('click', (e) => {
          // If clicked the inspect badge, open modal
          if (e.target.closest('.dff-svg-inspect')) {
            e.stopPropagation();
            const card = document.getElementById(`card-dff-${id}`);
            if (card) card.click();
            return;
          }
          // Otherwise toggle the flip-flop's stored bit directly!
          this.engine.toggleRegisterBit(`q${id}`);
        });
      }
    });
  }

  renderBaseSVG() {
    this.container.innerHTML = `
      <div class="circuit-wrapper">
        <div class="circuit-header-info">
          <div class="state-badge-group">
            <div class="state-badge current">
              <span class="badge-label">CURRENT STATE [QA QB QC QD]</span>
              <span class="badge-val" id="diag-cur-state">0000</span>
            </div>
            <div class="state-badge next">
              <span class="badge-label">NEXT STATE ON CLOCK ↑</span>
              <span class="badge-val" id="diag-next-state">1000</span>
            </div>
          </div>

          <!-- In-Diagram Interactive Control Toolbar -->
          <div class="circuit-quick-actions">
            <button class="btn-diag-action" id="diag-btn-prev" title="Step Back 1 Clock">⏮ Prev</button>
            <button class="btn-diag-action btn-diag-pulse" id="diag-btn-pulse" title="Trigger Clock Pulse (↑)">Next Clock ⏭</button>
            <button class="btn-diag-action" id="diag-btn-toggle" title="Toggle Continuous Shift Simulation">▶ Auto Shift</button>
            <button class="btn-diag-action" id="diag-btn-reset" title="Reset Shift Register">↺ Reset</button>
          </div>

          <div class="clock-edge-indicator" id="clock-edge-banner">
            <span class="pulse-dot"></span>
            <span class="edge-text" id="clock-banner-text">CLOCK: <strong>EDGE TRIGGERED (RISING ↑)</strong></span>
          </div>
        </div>

        <svg viewBox="0 0 1020 460" class="sipo-svg-canvas" id="sipo-logic-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <!-- Glowing Filters -->
            <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <!-- Marker for Signal Flow Arrows -->
            <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#00f0ff" />
            </marker>
            <marker id="arrow-slate" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
            </marker>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
          </defs>

          <!-- Circuit Grid Background subtle lines -->
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <!-- ================= SERIAL INPUT PORT ================= -->
          <g id="serial-in-port" transform="translate(30, 130)" class="interactive-svg-port">
            <rect x="0" y="0" width="105" height="50" rx="8" fill="#0d1527" stroke="#f59e0b" stroke-width="2" id="serial-port-box"/>
            <text x="52" y="22" class="svg-label-main">SERIAL INPUT</text>
            <text x="52" y="40" class="svg-label-sub" id="svg-serial-val" fill="#f59e0b">Bit: 1</text>
            <title>Click to toggle Serial Input Bit (0 ↔ 1)</title>
          </g>

          <!-- Serial In to DFF A Wire -->
          <path d="M 135 155 L 180 155" class="circuit-wire" id="wire-serial-in" stroke="#00f0ff" stroke-width="3" fill="none" marker-end="url(#arrow-cyan)"/>

          <!-- ================= FLIP-FLOP A ================= -->
          <g id="dff-a-group" transform="translate(180, 90)">
            <!-- Main IC Body -->
            <rect x="0" y="0" width="150" height="150" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#334155" stroke-width="1.8" id="dff-rect-a"/>
            <!-- Header bar -->
            <rect x="0" y="0" width="150" height="32" rx="10" fill="rgba(30, 41, 59, 0.85)"/>
            <text x="75" y="21" class="dff-title">DFF A (QA)</text>
            <!-- Pin labels -->
            <text x="18" y="70" class="pin-label">D</text>
            <text x="132" y="70" class="pin-label">Q</text>
            <!-- Clock Pin Dynamic Triangle -->
            <path d="M 0 115 L 16 125 L 0 135 Z" class="clk-triangle" id="clk-tri-a" fill="none" stroke="#10b981" stroke-width="2"/>
            <text x="24" y="129" class="pin-label clk-text">CLK</text>
            <!-- Active Stored State Glow Badge -->
            <rect x="42" y="55" width="66" height="48" rx="8" fill="#0a0f1d" stroke="#1e293b" stroke-width="1.5" id="pod-a"/>
            <text x="75" y="87" class="q-val-display" id="q-val-a" fill="#475569">0</text>
            <text x="75" y="130" class="sub-d-role">Stage 1 • Click to flip</text>
            <!-- Inspect button badge -->
            <g class="dff-svg-inspect" transform="translate(125, 6)">
              <circle cx="10" cy="10" r="9" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" stroke-width="1"/>
              <text x="10" y="14" font-size="10" text-anchor="middle" fill="#00f0ff">🔍</text>
              <title>Click to open Technical Inspector</title>
            </g>
          </g>

          <!-- Interconnect QA -> DFF B (D_B) -->
          <path d="M 330 155 L 390 155" class="circuit-wire" id="wire-qa-qb" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-slate)"/>
          <!-- Branch Dot for QA Output -->
          <circle cx="360" cy="155" r="5" class="branch-dot" id="dot-qa" fill="#475569"/>
          <!-- QA Downward Tap -->
          <path d="M 360 155 L 360 300" class="circuit-wire" id="wire-tap-qa" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-slate)"/>

          <!-- ================= FLIP-FLOP B ================= -->
          <g id="dff-b-group" transform="translate(390, 90)">
            <rect x="0" y="0" width="150" height="150" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#334155" stroke-width="1.8" id="dff-rect-b"/>
            <rect x="0" y="0" width="150" height="32" rx="10" fill="rgba(30, 41, 59, 0.85)"/>
            <text x="75" y="21" class="dff-title">DFF B (QB)</text>
            <text x="18" y="70" class="pin-label">D</text>
            <text x="132" y="70" class="pin-label">Q</text>
            <path d="M 0 115 L 16 125 L 0 135 Z" class="clk-triangle" id="clk-tri-b" fill="none" stroke="#10b981" stroke-width="2"/>
            <text x="24" y="129" class="pin-label clk-text">CLK</text>
            <rect x="42" y="55" width="66" height="48" rx="8" fill="#0a0f1d" stroke="#1e293b" stroke-width="1.5" id="pod-b"/>
            <text x="75" y="87" class="q-val-display" id="q-val-b" fill="#475569">0</text>
            <text x="75" y="130" class="sub-d-role">Stage 2 • Click to flip</text>
            <g class="dff-svg-inspect" transform="translate(125, 6)">
              <circle cx="10" cy="10" r="9" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" stroke-width="1"/>
              <text x="10" y="14" font-size="10" text-anchor="middle" fill="#00f0ff">🔍</text>
              <title>Click to open Technical Inspector</title>
            </g>
          </g>

          <!-- Interconnect QB -> DFF C (D_C) -->
          <path d="M 540 155 L 600 155" class="circuit-wire" id="wire-qb-qc" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-slate)"/>
          <circle cx="570" cy="155" r="5" class="branch-dot" id="dot-qb" fill="#475569"/>
          <!-- QB Downward Tap -->
          <path d="M 570 155 L 570 300" class="circuit-wire" id="wire-tap-qb" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-slate)"/>

          <!-- ================= FLIP-FLOP C ================= -->
          <g id="dff-c-group" transform="translate(600, 90)">
            <rect x="0" y="0" width="150" height="150" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#334155" stroke-width="1.8" id="dff-rect-c"/>
            <rect x="0" y="0" width="150" height="32" rx="10" fill="rgba(30, 41, 59, 0.85)"/>
            <text x="75" y="21" class="dff-title">DFF C (QC)</text>
            <text x="18" y="70" class="pin-label">D</text>
            <text x="132" y="70" class="pin-label">Q</text>
            <path d="M 0 115 L 16 125 L 0 135 Z" class="clk-triangle" id="clk-tri-c" fill="none" stroke="#10b981" stroke-width="2"/>
            <text x="24" y="129" class="pin-label clk-text">CLK</text>
            <rect x="42" y="55" width="66" height="48" rx="8" fill="#0a0f1d" stroke="#1e293b" stroke-width="1.5" id="pod-c"/>
            <text x="75" y="87" class="q-val-display" id="q-val-c" fill="#475569">0</text>
            <text x="75" y="130" class="sub-d-role">Stage 3 • Click to flip</text>
            <g class="dff-svg-inspect" transform="translate(125, 6)">
              <circle cx="10" cy="10" r="9" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" stroke-width="1"/>
              <text x="10" y="14" font-size="10" text-anchor="middle" fill="#00f0ff">🔍</text>
              <title>Click to open Technical Inspector</title>
            </g>
          </g>

          <!-- Interconnect QC -> DFF D (D_D) -->
          <path d="M 750 155 L 810 155" class="circuit-wire" id="wire-qc-qd" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-slate)"/>
          <circle cx="780" cy="155" r="5" class="branch-dot" id="dot-qc" fill="#475569"/>
          <!-- QC Downward Tap -->
          <path d="M 780 155 L 780 300" class="circuit-wire" id="wire-tap-qc" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-slate)"/>

          <!-- ================= FLIP-FLOP D ================= -->
          <g id="dff-d-group" transform="translate(810, 90)">
            <rect x="0" y="0" width="150" height="150" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#334155" stroke-width="1.8" id="dff-rect-d"/>
            <rect x="0" y="0" width="150" height="32" rx="10" fill="rgba(30, 41, 59, 0.85)"/>
            <text x="75" y="21" class="dff-title">DFF D (QD)</text>
            <text x="18" y="70" class="pin-label">D</text>
            <text x="132" y="70" class="pin-label">Q</text>
            <path d="M 0 115 L 16 125 L 0 135 Z" class="clk-triangle" id="clk-tri-d" fill="none" stroke="#10b981" stroke-width="2"/>
            <text x="24" y="129" class="pin-label clk-text">CLK</text>
            <rect x="42" y="55" width="66" height="48" rx="8" fill="#0a0f1d" stroke="#1e293b" stroke-width="1.5" id="pod-d"/>
            <text x="75" y="87" class="q-val-display" id="q-val-d" fill="#475569">0</text>
            <text x="75" y="130" class="sub-d-role">Stage 4 • Click to flip</text>
            <g class="dff-svg-inspect" transform="translate(125, 6)">
              <circle cx="10" cy="10" r="9" fill="rgba(0, 240, 255, 0.15)" stroke="#00f0ff" stroke-width="1"/>
              <text x="10" y="14" font-size="10" text-anchor="middle" fill="#00f0ff">🔍</text>
              <title>Click to open Technical Inspector</title>
            </g>
          </g>

          <!-- QD Output Wire and Tap -->
          <path d="M 960 155 L 980 155 L 980 300" class="circuit-wire" id="wire-tap-qd" stroke="#334155" stroke-width="3" fill="none" marker-end="url(#arrow-slate)"/>
          <circle cx="960" cy="155" r="5" class="branch-dot" id="dot-qd" fill="#475569"/>

          <!-- ================= COMMON CLOCK BUS ================= -->
          <!-- Clock generator input block on left -->
          <g id="clock-in-port" transform="translate(30, 260)" class="interactive-svg-port">
            <rect x="0" y="0" width="105" height="46" rx="8" fill="#0d1527" stroke="#10b981" stroke-width="2" id="clk-input-box"/>
            <text x="52" y="20" class="svg-label-main">COMMON CLK</text>
            <text x="52" y="36" class="svg-label-sub" id="svg-clk-state" fill="#10b981">Pulse: ↑ Edge</text>
            <title>Click to pulse Common Clock Edge (↑)</title>
          </g>

          <!-- Common Clock horizontal rail -->
          <path d="M 135 283 L 810 283" class="circuit-wire clk-bus" id="clk-main-bus" stroke="#10b981" stroke-width="3" fill="none"/>

          <!-- Clock vertical taps into each DFF -->
          <path d="M 180 283 L 180 215" class="circuit-wire clk-tap" id="clk-tap-a" stroke="#10b981" stroke-width="2.5" fill="none"/>
          <circle cx="180" cy="283" r="4" class="branch-dot clk-dot" fill="#10b981"/>

          <path d="M 390 283 L 390 215" class="circuit-wire clk-tap" id="clk-tap-b" stroke="#10b981" stroke-width="2.5" fill="none"/>
          <circle cx="390" cy="283" r="4" class="branch-dot clk-dot" fill="#10b981"/>

          <path d="M 600 283 L 600 215" class="circuit-wire clk-tap" id="clk-tap-c" stroke="#10b981" stroke-width="2.5" fill="none"/>
          <circle cx="600" cy="283" r="4" class="branch-dot clk-dot" fill="#10b981"/>

          <path d="M 810 283 L 810 215" class="circuit-wire clk-tap" id="clk-tap-d" stroke="#10b981" stroke-width="2.5" fill="none"/>
          <circle cx="810" cy="283" r="4" class="branch-dot clk-dot" fill="#10b981"/>

          <!-- ================= PARALLEL OUTPUT BUS ================= -->
          <!-- Terminals QA, QB, QC, QD -->
          <g id="terminal-qa" transform="translate(325, 305)">
            <rect x="0" y="0" width="70" height="42" rx="6" fill="#0d1527" stroke="#334155" stroke-width="1.8" id="term-box-qa"/>
            <text x="35" y="18" class="term-name">QA</text>
            <text x="35" y="34" class="term-val" id="term-val-qa" fill="#475569">0</text>
          </g>

          <g id="terminal-qb" transform="translate(535, 305)">
            <rect x="0" y="0" width="70" height="42" rx="6" fill="#0d1527" stroke="#334155" stroke-width="1.8" id="term-box-qb"/>
            <text x="35" y="18" class="term-name">QB</text>
            <text x="35" y="34" class="term-val" id="term-val-qb" fill="#475569">0</text>
          </g>

          <g id="terminal-qc" transform="translate(745, 305)">
            <rect x="0" y="0" width="70" height="42" rx="6" fill="#0d1527" stroke="#334155" stroke-width="1.8" id="term-box-qc"/>
            <text x="35" y="18" class="term-name">QC</text>
            <text x="35" y="34" class="term-val" id="term-val-qc" fill="#475569">0</text>
          </g>

          <g id="terminal-qd" transform="translate(945, 305)">
            <rect x="0" y="0" width="70" height="42" rx="6" fill="#0d1527" stroke="#334155" stroke-width="1.8" id="term-box-qd"/>
            <text x="35" y="18" class="term-name">QD</text>
            <text x="35" y="34" class="term-val" id="term-val-qd" fill="#475569">0</text>
          </g>

          <!-- Bus convergence bracket -->
          <path d="M 360 355 L 360 380 L 670 380 L 670 400 M 670 380 L 980 380 L 980 355 M 570 355 L 570 380 M 780 355 L 780 380" 
                class="bus-bracket" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="5 3" id="parallel-bus-wires"/>

          <!-- Big Parallel Output Combined Block -->
          <g id="parallel-bus-block" transform="translate(490, 400)">
            <rect x="0" y="0" width="360" height="46" rx="8" fill="rgba(14, 165, 233, 0.12)" stroke="#00f0ff" stroke-width="1.8" id="bus-rect"/>
            <text x="180" y="18" class="bus-title">4-BIT PARALLEL OUTPUT [QA QB QC QD]</text>
            <text x="180" y="37" class="bus-bits-readout" id="svg-bus-readout" fill="#00f0ff">0 0 0 0</text>
          </g>

          <!-- ================= GLOWING FLYING DATA PACKETS LAYER ================= -->
          <g id="animated-packets-layer">
            <!-- Incoming bit packet (Serial In -> DFF A) -->
            <g id="packet-in" class="flying-data-packet" opacity="0" transform="translate(135, 155)">
              <circle r="14" fill="#f59e0b" filter="url(#glow-amber)" stroke="#fff" stroke-width="2"/>
              <text id="packet-in-txt" text-anchor="middle" dy="5" fill="#080c14" font-weight="800" font-family="var(--font-mono)" font-size="13">1</text>
            </g>
            <!-- QA -> QB packet -->
            <g id="packet-ab" class="flying-data-packet" opacity="0" transform="translate(330, 155)">
              <circle r="14" fill="#00f0ff" filter="url(#glow-cyan)" stroke="#fff" stroke-width="2"/>
              <text id="packet-ab-txt" text-anchor="middle" dy="5" fill="#080c14" font-weight="800" font-family="var(--font-mono)" font-size="13">0</text>
            </g>
            <!-- QB -> QC packet -->
            <g id="packet-bc" class="flying-data-packet" opacity="0" transform="translate(540, 155)">
              <circle r="14" fill="#00f0ff" filter="url(#glow-cyan)" stroke="#fff" stroke-width="2"/>
              <text id="packet-bc-txt" text-anchor="middle" dy="5" fill="#080c14" font-weight="800" font-family="var(--font-mono)" font-size="13">0</text>
            </g>
            <!-- QC -> QD packet -->
            <g id="packet-cd" class="flying-data-packet" opacity="0" transform="translate(750, 155)">
              <circle r="14" fill="#00f0ff" filter="url(#glow-cyan)" stroke="#fff" stroke-width="2"/>
              <text id="packet-cd-txt" text-anchor="middle" dy="5" fill="#080c14" font-weight="800" font-family="var(--font-mono)" font-size="13">0</text>
            </g>

            <!-- Downward parallel tap pulses -->
            <circle id="packet-tap-a" cx="360" cy="155" r="7" fill="#00f0ff" filter="url(#glow-cyan)" opacity="0"/>
            <circle id="packet-tap-b" cx="570" cy="155" r="7" fill="#00f0ff" filter="url(#glow-cyan)" opacity="0"/>
            <circle id="packet-tap-c" cx="780" cy="155" r="7" fill="#00f0ff" filter="url(#glow-cyan)" opacity="0"/>
            <circle id="packet-tap-d" cx="980" cy="155" r="7" fill="#00f0ff" filter="url(#glow-cyan)" opacity="0"/>
          </g>
        </svg>
      </div>
    `;
  }

  update(state, meta) {
    const nextBit = state.nextBit;
    const curState = state.parallelOutput;
    const nextState = state.nextParallelOutput;

    // Update state readouts
    const curElem = document.getElementById('diag-cur-state');
    const nextElem = document.getElementById('diag-next-state');
    if (curElem) curElem.textContent = curState;
    if (nextElem) nextElem.textContent = nextState;

    // Update Serial in port text
    const serialVal = document.getElementById('svg-serial-val');
    if (serialVal) {
      serialVal.textContent = `Bit: ${nextBit}`;
      serialVal.setAttribute('fill', nextBit === 1 ? '#f59e0b' : '#64748b');
    }

    // Update DFF Q displays
    this.updateDFF('a', state.qa, nextBit);
    this.updateDFF('b', state.qb, state.qa);
    this.updateDFF('c', state.qc, state.qb);
    this.updateDFF('d', state.qd, state.qc);

    // Update Terminals
    this.updateTerminal('qa', state.qa);
    this.updateTerminal('qb', state.qb);
    this.updateTerminal('qc', state.qc);
    this.updateTerminal('qd', state.qd);

    // Update Bus Readout
    const busReadout = document.getElementById('svg-bus-readout');
    if (busReadout) {
      busReadout.textContent = `${state.qa}  ${state.qb}  ${state.qc}  ${state.qd}`;
    }

    // Update Wires directly with SVG attributes
    this.updateWire('wire-serial-in', nextBit);
    this.updateWire('wire-qa-qb', state.qa);
    this.updateWire('wire-tap-qa', state.qa);
    this.updateWire('wire-qb-qc', state.qb);
    this.updateWire('wire-tap-qb', state.qb);
    this.updateWire('wire-qc-qd', state.qc);
    this.updateWire('wire-tap-qc', state.qc);
    this.updateWire('wire-tap-qd', state.qd);

    // Trigger visual bit-shifting animation on clock edge!
    if (meta && meta.action === 'stepNext') {
      const incoming = meta.appliedBit !== undefined ? meta.appliedBit : nextBit;
      const pQA = meta.prevQA !== undefined ? meta.prevQA : state.qa;
      const pQB = meta.prevQB !== undefined ? meta.prevQB : state.qb;
      const pQC = meta.prevQC !== undefined ? meta.prevQC : state.qc;

      this.triggerClockFlash();
      this.triggerFlyingPackets(incoming, pQA, pQB, pQC);
    }
  }

  updateDFF(id, qVal, dVal) {
    const qText = document.getElementById(`q-val-${id}`);
    const pod = document.getElementById(`pod-${id}`);
    const rect = document.getElementById(`dff-rect-${id}`);

    if (qText) {
      qText.textContent = qVal;
      qText.setAttribute('fill', qVal === 1 ? '#00f0ff' : '#475569');
      if (qVal === 1) {
        qText.setAttribute('filter', 'url(#glow-cyan)');
      } else {
        qText.removeAttribute('filter');
      }
    }
    if (pod) {
      pod.setAttribute('stroke', qVal === 1 ? '#00f0ff' : '#1e293b');
      pod.setAttribute('fill', qVal === 1 ? 'rgba(0, 240, 255, 0.18)' : '#0a0f1d');
      pod.classList.toggle('val-high', qVal === 1);
      pod.classList.toggle('val-low', qVal === 0);
    }
    if (rect) {
      rect.setAttribute('stroke', qVal === 1 ? 'rgba(0, 240, 255, 0.5)' : '#334155');
      rect.classList.toggle('active-stage', qVal === 1);
    }
  }

  updateTerminal(id, val) {
    const termVal = document.getElementById(`term-val-${id}`);
    const box = document.getElementById(`term-box-${id}`);
    if (termVal) {
      termVal.textContent = val;
      termVal.setAttribute('fill', val === 1 ? '#00f0ff' : '#475569');
    }
    if (box) {
      box.setAttribute('stroke', val === 1 ? '#00f0ff' : '#334155');
      box.setAttribute('fill', val === 1 ? 'rgba(0, 240, 255, 0.18)' : '#0d1527');
      box.classList.toggle('term-high', val === 1);
      box.classList.toggle('term-low', val === 0);
    }
  }

  updateWire(wireId, val) {
    const wire = document.getElementById(wireId);
    if (wire) {
      wire.setAttribute('stroke', val === 1 ? '#00f0ff' : '#334155');
      wire.setAttribute('filter', val === 1 ? 'url(#glow-cyan)' : 'none');
      wire.setAttribute('marker-end', val === 1 ? 'url(#arrow-cyan)' : 'url(#arrow-slate)');
    }
  }

  triggerClockFlash() {
    const clkBus = document.getElementById('clk-main-bus');
    const clkBox = document.getElementById('clk-input-box');
    const banner = document.getElementById('clock-edge-banner');
    const bannerText = document.getElementById('clock-banner-text');

    // Flash clock lines and dynamic triangles
    ['a', 'b', 'c', 'd'].forEach(id => {
      const tap = document.getElementById(`clk-tap-${id}`);
      const tri = document.getElementById(`clk-tri-${id}`);
      if (tap) tap.setAttribute('stroke', '#34d399');
      if (tri) {
        tri.setAttribute('fill', '#10b981');
        tri.setAttribute('filter', 'url(#glow-green)');
      }
    });

    if (clkBus) {
      clkBus.setAttribute('stroke', '#34d399');
      clkBus.setAttribute('stroke-width', '4.5');
      clkBus.setAttribute('filter', 'url(#glow-green)');
    }
    if (clkBox) {
      clkBox.setAttribute('fill', 'rgba(16, 185, 129, 0.35)');
      clkBox.setAttribute('filter', 'url(#glow-green)');
    }
    if (banner) {
      banner.classList.add('edge-pulse-active');
      if (bannerText) bannerText.innerHTML = 'CLOCK: <strong style="color:#34d399">ACTIVE RISING EDGE (↑) — BITS SHIFTED!</strong>';
    }

    setTimeout(() => {
      ['a', 'b', 'c', 'd'].forEach(id => {
        const tap = document.getElementById(`clk-tap-${id}`);
        const tri = document.getElementById(`clk-tri-${id}`);
        if (tap) tap.setAttribute('stroke', '#10b981');
        if (tri) {
          tri.setAttribute('fill', 'none');
          tri.removeAttribute('filter');
        }
      });
      if (clkBus) {
        clkBus.setAttribute('stroke', '#10b981');
        clkBus.setAttribute('stroke-width', '3');
        clkBus.removeAttribute('filter');
      }
      if (clkBox) {
        clkBox.setAttribute('fill', '#0d1527');
        clkBox.removeAttribute('filter');
      }
      if (banner) {
        banner.classList.remove('edge-pulse-active');
        if (bannerText) bannerText.innerHTML = 'CLOCK: <strong>EDGE TRIGGERED (RISING ↑)</strong>';
      }
    }, 450);
  }

  triggerFlyingPackets(incomingBit, prevQA, prevQB, prevQC) {
    const pIn = document.getElementById('packet-in');
    const pInTxt = document.getElementById('packet-in-txt');
    const pAB = document.getElementById('packet-ab');
    const pABTxt = document.getElementById('packet-ab-txt');
    const pBC = document.getElementById('packet-bc');
    const pBCTxt = document.getElementById('packet-bc-txt');
    const pCD = document.getElementById('packet-cd');
    const pCDTxt = document.getElementById('packet-cd-txt');

    const tapA = document.getElementById('packet-tap-a');
    const tapB = document.getElementById('packet-tap-b');
    const tapC = document.getElementById('packet-tap-c');
    const tapD = document.getElementById('packet-tap-d');

    if (!pIn || !pAB || !pBC || !pCD) return;

    // Set packet payload values
    if (pInTxt) pInTxt.textContent = incomingBit;
    if (pABTxt) pABTxt.textContent = prevQA;
    if (pBCTxt) pBCTxt.textContent = prevQB;
    if (pCDTxt) pCDTxt.textContent = prevQC;

    const duration = 420;
    const startTime = performance.now();

    const animateFrame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth ease-in-out curve
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      // Linear interpolation along wires
      // 1. Serial In (135 -> 180)
      const xIn = 135 + (180 - 135) * ease;
      pIn.setAttribute('transform', `translate(${xIn}, 155)`);
      pIn.setAttribute('opacity', progress < 0.9 ? '1' : `${(1 - progress) * 10}`);

      // 2. QA -> QB (330 -> 390)
      const xAB = 330 + (390 - 330) * ease;
      pAB.setAttribute('transform', `translate(${xAB}, 155)`);
      pAB.setAttribute('opacity', progress < 0.9 ? '1' : `${(1 - progress) * 10}`);

      // 3. QB -> QC (540 -> 600)
      const xBC = 540 + (600 - 540) * ease;
      pBC.setAttribute('transform', `translate(${xBC}, 155)`);
      pBC.setAttribute('opacity', progress < 0.9 ? '1' : `${(1 - progress) * 10}`);

      // 4. QC -> QD (750 -> 810)
      const xCD = 750 + (810 - 750) * ease;
      pCD.setAttribute('transform', `translate(${xCD}, 155)`);
      pCD.setAttribute('opacity', progress < 0.9 ? '1' : `${(1 - progress) * 10}`);

      // 5. Downward taps into terminals (155 -> 305)
      const yTap = 155 + (305 - 155) * ease;
      if (tapA) { tapA.setAttribute('cy', yTap); tapA.setAttribute('opacity', progress < 0.9 ? '1' : '0'); }
      if (tapB) { tapB.setAttribute('cy', yTap); tapB.setAttribute('opacity', progress < 0.9 ? '1' : '0'); }
      if (tapC) { tapC.setAttribute('cy', yTap); tapC.setAttribute('opacity', progress < 0.9 ? '1' : '0'); }
      if (tapD) { tapD.setAttribute('cy', yTap); tapD.setAttribute('opacity', progress < 0.9 ? '1' : '0'); }

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        pIn.setAttribute('opacity', '0');
        pAB.setAttribute('opacity', '0');
        pBC.setAttribute('opacity', '0');
        pCD.setAttribute('opacity', '0');
        if (tapA) tapA.setAttribute('opacity', '0');
        if (tapB) tapB.setAttribute('opacity', '0');
        if (tapC) tapC.setAttribute('opacity', '0');
        if (tapD) tapD.setAttribute('opacity', '0');
      }
    };

    requestAnimationFrame(animateFrame);
  }
}

window.CircuitSVG = CircuitSVG;
