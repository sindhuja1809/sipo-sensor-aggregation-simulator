/**
 * TimingSVG - Interactive SVG Timing Diagram for SIPO Shift Register
 * EC2201 - Synchronous Sequential Circuits | Unit III
 */

class TimingSVG {
  constructor(containerId, engine) {
    this.container = document.getElementById(containerId);
    this.engine = engine;
    this.width = 1020;
    this.height = 420;
    this.leftMargin = 130;
    this.rightMargin = 40;
    this.topMargin = 50;
    this.rowHeight = 55;
    this.init();
  }

  init() {
    this.renderBaseContainer();
    this.bindEvents();
    this.engine.subscribe((state, meta) => this.update(state, meta));
  }

  bindEvents() {
    const btnNext = document.getElementById('timing-btn-next');
    const btnPrev = document.getElementById('timing-btn-prev');
    const btnReset = document.getElementById('timing-btn-reset');

    if (btnNext) btnNext.addEventListener('click', () => this.engine.stepNext());
    if (btnPrev) btnPrev.addEventListener('click', () => this.engine.stepPrev());
    if (btnReset) btnReset.addEventListener('click', () => this.engine.reset());

    // Click anywhere on SVG to scrub/jump to clock cycle!
    const svgElem = document.getElementById('sipo-timing-svg');
    if (svgElem) {
      svgElem.style.cursor = 'crosshair';
      svgElem.addEventListener('click', (e) => {
        const pt = svgElem.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svgElem.getScreenCTM().inverse());
        
        if (this.slotWidth && svgP.x >= this.leftMargin - 20) {
          const clickedCycle = Math.round((svgP.x - this.leftMargin) / this.slotWidth);
          const maxCycle = this.engine.trajectory.length - 1;
          const target = Math.max(0, Math.min(maxCycle, clickedCycle));
          this.engine.jumpToClock(target);
        }
      });
    }
  }

  renderBaseContainer() {
    this.container.innerHTML = `
      <div class="timing-wrapper">
        <div class="timing-header-controls">
          <div class="cycle-status-pill">
            <span class="pulse-indicator"></span>
            <span class="cycle-title">Current Clock Cycle:</span>
            <span class="cycle-val" id="timing-cycle-val">0</span>
          </div>

          <div class="timing-quick-actions">
            <button class="btn-diag-action" id="timing-btn-prev" title="Step Back 1 Clock">⏮ Prev</button>
            <button class="btn-diag-action btn-diag-pulse" id="timing-btn-next" title="Pulse Clock Edge (↑)">Next Clock ⏭</button>
            <button class="btn-diag-action" id="timing-btn-reset" title="Reset Simulation">↺ Reset</button>
          </div>

          <div class="timing-sync-info">
            <span class="sync-icon">⚡</span>
            <span>Click any point on the waveform or use controls to scrub clock time.</span>
          </div>
        </div>

        <div class="svg-timing-scroll">
          <svg viewBox="0 0 ${this.width} ${this.height}" class="timing-svg-canvas" id="sipo-timing-svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="cursor-glow" x="-50%" y="-10%" width="200%" height="120%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Background Grid Layer -->
            <g id="timing-grid-layer"></g>

            <!-- Active Cycle Highlight Column -->
            <rect id="active-cycle-rect" x="0" y="${this.topMargin - 15}" width="0" height="${this.height - this.topMargin}" 
                  fill="rgba(0, 240, 255, 0.08)" stroke="rgba(0, 240, 255, 0.3)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>

            <!-- Signal Labels & Rows -->
            <g id="timing-labels-layer"></g>

            <!-- Waveform Traces Layer -->
            <g id="timing-traces-layer"></g>

            <!-- Rising Edge Markers Layer -->
            <g id="timing-edge-markers-layer"></g>

            <!-- Interactive Cursor Layer -->
            <g id="timing-cursor-group" transform="translate(0, 0)">
              <line id="timing-cursor-line" x1="0" y1="${this.topMargin - 20}" x2="0" y2="${this.height - 10}" 
                    stroke="#00f0ff" stroke-width="2.5" filter="url(#cursor-glow)" />
              <polygon points="-8,${this.topMargin - 25} 8,${this.topMargin - 25} 0,${this.topMargin - 15}" fill="#00f0ff" filter="url(#cursor-glow)"/>
              <rect x="-24" y="${this.topMargin - 46}" width="48" height="20" rx="4" fill="#00f0ff" />
              <text x="0" y="${this.topMargin - 32}" text-anchor="middle" fill="#080c14" font-size="11" font-weight="bold" id="cursor-t-label">T0</text>
            </g>
          </svg>
        </div>
      </div>
    `;
  }

  update(state, meta) {
    const cycleValElem = document.getElementById('timing-cycle-val');
    if (cycleValElem) {
      cycleValElem.textContent = state.clock;
    }

    // If stream or trajectory changed, redraw waveforms
    this.renderWaveforms(state);

    // Update cursor position smoothly
    this.updateCursor(state.clock, state.trajectory.length - 1);
  }

  renderWaveforms(state) {
    const trajectory = state.trajectory;
    const numCycles = trajectory.length - 1; // e.g. 4 for '1011'
    const totalSlots = Math.max(numCycles, 4);
    const availableWidth = this.width - this.leftMargin - this.rightMargin;
    const slotWidth = availableWidth / (totalSlots + 0.5);
    this.slotWidth = slotWidth;

    const gridLayer = document.getElementById('timing-grid-layer');
    const labelsLayer = document.getElementById('timing-labels-layer');
    const tracesLayer = document.getElementById('timing-traces-layer');
    const edgeMarkersLayer = document.getElementById('timing-edge-markers-layer');

    if (!gridLayer || !labelsLayer || !tracesLayer) return;

    // Reset layers
    gridLayer.innerHTML = '';
    labelsLayer.innerHTML = '';
    tracesLayer.innerHTML = '';
    edgeMarkersLayer.innerHTML = '';

    const signals = [
      { name: 'CLK', color: '#10b981', key: 'clk' },
      { name: 'Serial In', color: '#f59e0b', key: 'serialIn' },
      { name: 'QA', color: '#00f0ff', key: 'qa' },
      { name: 'QB', color: '#38bdf8', key: 'qb' },
      { name: 'QC', color: '#818cf8', key: 'qc' },
      { name: 'QD', color: '#c084fc', key: 'qd' }
    ];

    // 1. Draw Time Headers (T0, T1, T2...) and Vertical Cycle Gridlines
    for (let i = 0; i <= totalSlots; i++) {
      const x = this.leftMargin + i * slotWidth;

      // Header label
      const tText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tText.setAttribute('x', x + slotWidth / 2);
      tText.setAttribute('y', this.topMargin - 28);
      tText.setAttribute('text-anchor', 'middle');
      tText.setAttribute('class', 'timing-t-label');
      tText.textContent = `T${i}`;
      gridLayer.appendChild(tText);

      // Vertical dashed grid line
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', x);
      vLine.setAttribute('y1', this.topMargin - 15);
      vLine.setAttribute('x2', x);
      vLine.setAttribute('y2', this.height - 15);
      vLine.setAttribute('class', 'timing-grid-line');
      gridLayer.appendChild(vLine);
    }

    // 2. Draw Signal Rows & Labels
    signals.forEach((sig, idx) => {
      const yBase = this.topMargin + idx * this.rowHeight;
      const yHigh = yBase + 8;
      const yLow = yBase + 38;

      // Signal Name Pill
      const gLabel = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gLabel.setAttribute('transform', `translate(15, ${yBase})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 8);
      rect.setAttribute('width', 95);
      rect.setAttribute('height', 30);
      rect.setAttribute('rx', 6);
      rect.setAttribute('fill', 'rgba(15, 23, 42, 0.8)');
      rect.setAttribute('stroke', sig.color);
      rect.setAttribute('stroke-width', '1.2');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 47);
      text.setAttribute('y', 27);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', sig.color);
      text.setAttribute('font-family', 'var(--font-mono)');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.textContent = sig.name;

      // Level 1 / 0 indicators
      const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text1.setAttribute('x', 115);
      text1.setAttribute('y', yHigh + 5);
      text1.setAttribute('class', 'level-indicator');
      text1.textContent = '1';

      const text0 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text0.setAttribute('x', 115);
      text0.setAttribute('y', yLow + 4);
      text0.setAttribute('class', 'level-indicator');
      text0.textContent = '0';

      gLabel.appendChild(rect);
      gLabel.appendChild(text);
      labelsLayer.appendChild(gLabel);
      labelsLayer.appendChild(text1);
      labelsLayer.appendChild(text0);

      // Baseline reference (Logic 0 line)
      const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      baseLine.setAttribute('x1', this.leftMargin);
      baseLine.setAttribute('y1', yLow);
      baseLine.setAttribute('x2', this.width - this.rightMargin);
      baseLine.setAttribute('y2', yLow);
      baseLine.setAttribute('class', 'timing-baseline');
      gridLayer.appendChild(baseLine);

      // 3. Generate Signal Path
      let pathD = '';
      if (sig.key === 'clk') {
        // Clock square wave: For each cycle i:
        // Starts low at boundary, rises up, stays high half cycle, drops low
        let curX = this.leftMargin;
        pathD = `M ${curX} ${yLow}`;
        for (let i = 0; i <= totalSlots; i++) {
          const xCycleStart = this.leftMargin + i * slotWidth;
          const xCycleMid = xCycleStart + slotWidth * 0.5;
          const xCycleEnd = xCycleStart + slotWidth;

          // Rising edge at cycle start (or small offset)
          pathD += ` L ${xCycleStart} ${yLow} L ${xCycleStart} ${yHigh} L ${xCycleMid} ${yHigh} L ${xCycleMid} ${yLow} L ${xCycleEnd} ${yLow}`;

          // Draw little rising edge arrow
          const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          arrow.setAttribute('d', `M ${xCycleStart - 3} ${yLow - 4} L ${xCycleStart} ${yHigh + 8} L ${xCycleStart + 3} ${yLow - 4}`);
          arrow.setAttribute('fill', 'none');
          arrow.setAttribute('stroke', '#10b981');
          arrow.setAttribute('stroke-width', '1.5');
          edgeMarkersLayer.appendChild(arrow);
        }
      } else if (sig.key === 'serialIn') {
        // Serial Input stream:
        // stream values: for cycle 0, stream[0], cycle 1 stream[1], etc.
        let curX = this.leftMargin;
        const getBit = (c) => {
          if (c < state.stream.length) return state.stream[c];
          return 0;
        };

        let lastLevel = getBit(0) === 1 ? yHigh : yLow;
        pathD = `M ${curX} ${lastLevel}`;

        for (let i = 0; i <= totalSlots; i++) {
          const bitVal = getBit(i);
          const targetLevel = bitVal === 1 ? yHigh : yLow;
          const xStart = this.leftMargin + i * slotWidth;
          const xEnd = xStart + slotWidth;

          if (targetLevel !== lastLevel) {
            pathD += ` L ${xStart} ${lastLevel} L ${xStart} ${targetLevel}`;
            lastLevel = targetLevel;
          }
          pathD += ` L ${xEnd} ${targetLevel}`;
        }
      } else {
        // Register Flip-Flops QA, QB, QC, QD
        // Read values from trajectory: trajectory[c][sig.key]
        let curX = this.leftMargin;
        let lastLevel = trajectory[0][sig.key] === 1 ? yHigh : yLow;
        pathD = `M ${curX} ${lastLevel}`;

        for (let i = 0; i <= totalSlots; i++) {
          const stepData = i < trajectory.length ? trajectory[i] : trajectory[trajectory.length - 1];
          const bitVal = stepData[sig.key];
          const targetLevel = bitVal === 1 ? yHigh : yLow;
          const xStart = this.leftMargin + i * slotWidth;
          const xEnd = xStart + slotWidth;

          if (targetLevel !== lastLevel) {
            // Transitions on clock rising edge at xStart
            pathD += ` L ${xStart} ${lastLevel} L ${xStart} ${targetLevel}`;
            lastLevel = targetLevel;
          }
          pathD += ` L ${xEnd} ${targetLevel}`;
        }
      }

      // Draw Waveform Path
      const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElem.setAttribute('d', pathD);
      pathElem.setAttribute('fill', 'none');
      pathElem.setAttribute('stroke', sig.color);
      pathElem.setAttribute('stroke-width', '2.5');
      pathElem.setAttribute('stroke-linejoin', 'round');
      pathElem.setAttribute('class', 'waveform-path');
      tracesLayer.appendChild(pathElem);
    });
  }

  updateCursor(currentClock, maxClock) {
    if (!this.slotWidth) return;

    const xPos = this.leftMargin + currentClock * this.slotWidth;
    const cursorGroup = document.getElementById('timing-cursor-group');
    const labelElem = document.getElementById('cursor-t-label');
    const activeRect = document.getElementById('active-cycle-rect');

    if (cursorGroup) {
      cursorGroup.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      cursorGroup.style.transform = `translateX(${xPos}px)`;
    }

    if (labelElem) {
      labelElem.textContent = `T${currentClock}`;
    }

    // Highlight active cycle region
    if (activeRect) {
      activeRect.setAttribute('x', xPos);
      activeRect.setAttribute('width', this.slotWidth);
      activeRect.setAttribute('opacity', '1');
    }
  }
}

window.TimingSVG = TimingSVG;
