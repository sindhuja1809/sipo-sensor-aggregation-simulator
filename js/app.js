/**
 * App Controller - SIPO Sensor Aggregation Simulator
 * EC2201 - Synchronous Sequential Circuits | Unit III
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize State Engine
  const engine = new SIPOEngine('1011');

  // 2. Audio Synthesizer for Digital Edge Clicks
  class SoundFX {
    constructor() {
      this.enabled = true;
      this.audioCtx = null;
    }

    init() {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
    }

    playClick() {
      if (!this.enabled) return;
      try {
        this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, this.audioCtx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.045);
      } catch (e) {
        // Audio policy or unsupported
      }
    }

    playLatch() {
      if (!this.enabled) return;
      try {
        this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1040, this.audioCtx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.085);
      } catch (e) {
        // Audio policy or unsupported
      }
    }
  }

  const sfx = new SoundFX();

  // 3. Grab All DOM Elements (Declared FIRST to prevent TDZ errors)
  const soundToggleBtn = document.getElementById('btn-toggle-sound');

  // Hero & Dashboard UI Elements
  const elQA = document.getElementById('dash-qa');
  const elQB = document.getElementById('dash-qb');
  const elQC = document.getElementById('dash-qc');
  const elQD = document.getElementById('dash-qd');

  const elClock = document.getElementById('dash-clock');
  const elSerialIn = document.getElementById('dash-serial-in');
  const elParallelOut = document.getElementById('dash-parallel-out');
  const elStatus = document.getElementById('dash-status');

  const btnNextClock = document.getElementById('btn-next-clock');
  const btnPrevClock = document.getElementById('btn-prev-clock');
  const btnReset = document.getElementById('btn-reset');
  const btnToggleSim = document.getElementById('btn-toggle-sim');
  const streamSelect = document.getElementById('sample-stream-select');
  const customStreamInput = document.getElementById('custom-stream-input');
  const btnApplyCustom = document.getElementById('btn-apply-custom');
  const speedSlider = document.getElementById('sim-speed-slider');
  const speedLabel = document.getElementById('sim-speed-label');

  // Secondary Controls at Truth Table
  const tableBtnNext = document.getElementById('table-btn-next');
  const tableBtnPrev = document.getElementById('table-btn-prev');
  const tableBtnReset = document.getElementById('table-btn-reset');
  const truthTableBody = document.getElementById('truth-table-body');

  // Flip-Flop Modal Elements
  const dffModal = document.getElementById('dff-modal');
  const dffModalClose = document.getElementById('dff-modal-close');
  const dffCards = document.querySelectorAll('.dff-card-interactive');
  let activeInspectedDFF = 'A';

  // Definition Section Elements
  const btnLearnMore = document.getElementById('btn-learn-more');
  const learnMoreDrawer = document.getElementById('learn-more-drawer');
  const termCards = document.querySelectorAll('.term-card');
  const procSteps = document.querySelectorAll('.process-step');

  // Application Section Elements
  const appModal = document.getElementById('app-modal');
  const appModalClose = document.getElementById('app-modal-close');
  const appCards = document.querySelectorAll('.app-card');
  const btnRunDemo = document.getElementById('btn-run-demo');
  const demoSensorSelect = document.getElementById('demo-sensor-select');
  const demoStepNodes = document.querySelectorAll('.demo-flow-node');
  const demoBitBubble = document.getElementById('demo-bit-bubble');
  const demoParallelVal = document.getElementById('demo-parallel-val');
  const demoGaugeNeedle = document.getElementById('demo-gauge-needle');
  const demoGaugeVal = document.getElementById('demo-gauge-val');
  const demoStatusMsg = document.getElementById('demo-status-msg');

  // Floating Quick Dock Elements
  const dockClk = document.getElementById('dock-clk');
  const dockIn = document.getElementById('dock-in');
  const dockOut = document.getElementById('dock-out');
  const dockPrev = document.getElementById('dock-btn-prev');
  const dockNext = document.getElementById('dock-btn-next');
  const dockAuto = document.getElementById('dock-btn-auto');
  const dockReset = document.getElementById('dock-btn-reset');

  // 4. Data Dictionaries
  const dffDetails = {
    A: {
      name: 'D Flip-Flop A (Stage 1)',
      role: 'Receives the serial data stream directly from the external input pin.',
      equation: 'QA(next) = Serial Input',
      storedBitKey: 'qa',
      inputKey: (st) => (st.appliedBit !== '-' ? st.appliedBit : st.nextBit),
      nextDescription: 'On the next clock edge, DFF A latches the incoming serial bit into QA.'
    },
    B: {
      name: 'D Flip-Flop B (Stage 2)',
      role: 'Receives the output QA of Stage 1, shifting data one step to the right.',
      equation: 'QB(next) = QA(previous)',
      storedBitKey: 'qb',
      inputKey: (st) => st.qa,
      nextDescription: 'On the next clock edge, DFF B latches the current QA value into QB.'
    },
    C: {
      name: 'D Flip-Flop C (Stage 3)',
      role: 'Receives the output QB of Stage 2, shifting data deeper into the register.',
      equation: 'QC(next) = QB(previous)',
      storedBitKey: 'qc',
      inputKey: (st) => st.qb,
      nextDescription: 'On the next clock edge, DFF C latches the current QB value into QC.'
    },
    D: {
      name: 'D Flip-Flop D (Stage 4 / Final Stage)',
      role: 'Receives the output QC of Stage 3. Completes the 4-bit parallel word [QA QB QC QD].',
      equation: 'QD(next) = QC(previous)',
      storedBitKey: 'qd',
      inputKey: (st) => st.qc,
      nextDescription: 'On the next clock edge, DFF D latches the current QC value into QD.'
    }
  };

  const applicationData = {
    1: {
      name: 'Sensor Data Aggregation',
      badge: 'Core College Project Application',
      how: 'Multiple remote physical sensors (temperature, pressure, gas, vibration) output analog readings which ADCs digitize. Instead of routing 8 to 32 parallel wires across a PCB or industrial machinery, data is serialized into a single transmission line and fed into a SIPO shift register at the central controller. The SIPO reconstructs the parallel word for simultaneous CPU processing.',
      scenario: 'Industrial Boiler Monitoring: 4 vibration sensors sample every 50ms. Their readings are packed and transmitted serially across a 2-wire noisy plant harness, converted back into a 4-bit parallel bus via SIPO, and fed simultaneously to the emergency shutdown circuit.',
      whyUseful: 'Reduces wiring harness complexity, weight, PCB trace congestion, and EMI vulnerability while ensuring synchronized bus presentation at the microcontroller input.'
    },
    2: {
      name: 'IoT Devices',
      badge: 'Edge Smart Nodes',
      how: 'Compact IoT sensor motes (ESP32, STM32, Arduino) often have constrained GPIO pin counts. A SIPO register enables reading serial bursts from remote sensor peripherals using only 2 MCU pins (Serial Data + Clock) to populate 4, 8, or 16 parallel internal registers.',
      scenario: 'Smart Agriculture Soil Station: Transmits sensor packets (moisture, pH, ambient light) serially to a central edge gateway where SIPO stages reconstitute the parallel sensor word for cloud transmission.',
      whyUseful: 'Allows minimal-pin microcontrollers to connect with rich high-bitwidth sensor peripherals without expensive port expanders.'
    },
    3: {
      name: 'Embedded Systems',
      badge: 'Microcontroller Peripheral Bus',
      how: 'SIPO serves as the hardware foundation for SPI (Serial Peripheral Interface) and UART receiver modules, converting chronological bit-streams into memory-mapped parallel registers accessible via the system address bus.',
      scenario: 'Automotive Engine Control Unit (ECU): Real-time crankshaft optical sensors stream high-frequency timing bits into a hardware SIPO buffer to present parallel angle data to the injection timer.',
      whyUseful: 'Decouples high-speed serial transceiver lines from parallel CPU word architecture.'
    },
    4: {
      name: 'Data Acquisition Systems (DAQ)',
      badge: 'High-Speed Instrumentation',
      how: 'In multi-channel telemetry and test fixtures, parallel analog-to-digital converters (ADCs) stream samples down a serial pipeline. SIPO shift registers reassemble parallel data words before passing them to FIFO buffers and DMA controllers.',
      scenario: 'Seismic Monitoring Array: 16 distributed geophones stream serialized readings into a centralized FPGA SIPO bank to create synchronized multi-axis seismic vectors.',
      whyUseful: 'Guarantees synchronous multi-channel reconstruction without phase skew between parallel lines.'
    },
    5: {
      name: 'Industrial Monitoring',
      badge: 'SCADA & Factory Automation',
      how: 'Sensors spread across factory conveyor lines send serial pulse trains over RS-485 or optical lines. SIPO shift registers at the programmable logic controller (PLC) rack reconstruct parallel binary fault/status words.',
      scenario: 'Bottling Plant Quality Check: 4 photo-electric inspection sensors inspect bottle height, cap seal, fill level, and label presence. Serialized sensor bits are converted via SIPO into a 4-bit status code driving pneumatic rejection actuators.',
      whyUseful: 'Immunity to high-voltage ground loops and noise pickup associated with long multi-conductor parallel cables.'
    },
    6: {
      name: 'Communication Systems',
      badge: 'Receiver Demultiplexing',
      how: 'Telecommunications systems transmit data serially over long fiber-optic or microwave channels to avoid inter-symbol skew. At the receiver, SIPO circuits deserialize the serial stream back into parallel bytes or words.',
      scenario: 'Satellite Downlink Frame Synchronizer: Serial RF bitstreams from orbiting satellites are pushed through high-speed GaAs SIPO shift registers to reconstruct 8-bit telemetry bytes for frame decoding.',
      whyUseful: 'Eliminates clock skew between parallel lines over long physical communication distances.'
    },
    7: {
      name: 'Microcontroller Input Expansion',
      badge: 'Hardware Pin Conservation',
      how: 'When a microcontroller needs to read a bank of digital switches, keypads, or optical sensors, a SIPO register (or complementary PISO/SIPO pair) allows reading N digital lines using only a clock line and a serial input pin.',
      scenario: 'Digital Security Panel: 8 tamper and door-contact sensors are sampled and converted into a serial stream, allowing a budget 8-pin microcontroller to monitor all 8 zones simultaneously.',
      whyUseful: 'Reduces microcontroller package cost and PCB routing complexity by up to 75%.'
    },
    8: {
      name: 'Digital Measurement Systems',
      badge: 'Precision Metrology',
      how: 'Digital calipers, micrometers, and precision rotary encoders output measurement data as high-speed serial pulses. Test fixtures use SIPO registers to latch the measurement into parallel LED 7-segment drivers or calibration registers.',
      scenario: 'CNC Machine Optical Linear Scale: Serial quadrature encoder pulses are clocked into a SIPO accumulator to generate parallel coordinate words for the servo controller.',
      whyUseful: 'Ensures instantaneous parallel read capability without stopping the high-frequency measurement encoder clock.'
    }
  };

  const sensorPresets = {
    temp: { name: 'Temperature Sensor', reading: '27 °C', binary: '1011', angle: 45 },
    pressure: { name: 'Pressure Sensor', reading: '102 kPa', binary: '0110', angle: -20 },
    humidity: { name: 'Humidity Sensor', reading: '68 %', binary: '1101', angle: 70 },
    light: { name: 'Ambient Light', reading: '450 Lux', binary: '1111', angle: 85 }
  };

  let demoInterval = null;

  // 5. Helper Rendering Functions
  function updateDigitalIndicator(element, val) {
    if (!element) return;
    const valSpan = element.querySelector('.indicator-val');
    if (valSpan) valSpan.textContent = val;
    element.classList.toggle('state-1', val === 1);
    element.classList.toggle('state-0', val === 0);
  }

  function renderBitTape(state) {
    const container = document.getElementById('dashboard-bit-pads');
    const hint = document.getElementById('active-bit-indicator-hint');
    if (!container) return;

    const stream = state.stream;
    const curIdx = state.clock < stream.length ? state.clock : 0;
    if (hint) {
      hint.textContent = `Upcoming input to DFF A: Bit ${curIdx + 1} (${stream[curIdx]})`;
    }

    container.innerHTML = '';
    stream.forEach((bit, idx) => {
      const pad = document.createElement('button');
      pad.className = `bit-pad ${bit === 1 ? 'pad-1' : 'pad-0'} ${idx === curIdx ? 'pad-active' : ''}`;
      pad.title = `Click to toggle Bit ${idx + 1} between 0 and 1`;
      pad.innerHTML = `
        <span class="pad-idx">B${idx + 1}</span>
        <span class="pad-val">${bit}</span>
        <span class="pad-arrow">${idx === curIdx ? '▲' : ' '}</span>
      `;
      pad.addEventListener('click', (e) => {
        e.preventDefault();
        engine.toggleStreamBit(idx);
      });
      container.appendChild(pad);
    });
  }

  function updateFloatingDock(state) {
    if (dockClk) dockClk.textContent = state.clock;
    if (dockIn) dockIn.textContent = state.clock === 0 ? '0' : state.appliedBit;
    if (dockOut) dockOut.textContent = state.parallelOutput;
    if (dockAuto) {
      dockAuto.innerHTML = state.isRunning ? '⏸ Pause' : '▶ Auto';
      dockAuto.classList.toggle('active-play', state.isRunning);
    }
  }

  function renderTruthTable(state) {
    if (!truthTableBody) return;
    
    const currentRows = truthTableBody.querySelectorAll('tr');
    if (currentRows.length !== state.trajectory.length) {
      truthTableBody.innerHTML = '';
      state.trajectory.forEach((row) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-clock', row.clock);
        tr.className = 'table-row-item';
        if (row.clock === state.clock) tr.classList.add('active-row');

        tr.innerHTML = `
          <td class="col-clock"><span class="clk-badge">T${row.clock}</span></td>
          <td class="col-input font-mono"><span class="bit-tag bit-${row.appliedBit}">${row.appliedBit}</span></td>
          <td class="col-bit font-mono val-${row.qa}">${row.qa}</td>
          <td class="col-bit font-mono val-${row.qb}">${row.qb}</td>
          <td class="col-bit font-mono val-${row.qc}">${row.qc}</td>
          <td class="col-bit font-mono val-${row.qd}">${row.qd}</td>
          <td class="col-parallel font-mono">
            <span class="parallel-tag">${row.parallelOutput}</span>
          </td>
        `;

        tr.addEventListener('click', () => {
          engine.jumpToClock(row.clock);
        });

        truthTableBody.appendChild(tr);
      });
    } else {
      currentRows.forEach(tr => {
        const rowClock = parseInt(tr.getAttribute('data-clock'), 10);
        if (rowClock === state.clock) {
          tr.classList.add('active-row');
          tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          tr.classList.remove('active-row');
        }
      });
    }
  }

  function populateDFFModal(key, state = engine.getCurrentState()) {
    activeInspectedDFF = key;
    const info = dffDetails[key];
    if (!info) return;

    const modalTitle = document.getElementById('modal-dff-title');
    const modalRole = document.getElementById('modal-dff-role');
    const modalEq = document.getElementById('modal-dff-eq');
    const modalD = document.getElementById('modal-dff-d');
    const modalQ = document.getElementById('modal-dff-q');
    const modalClk = document.getElementById('modal-dff-clk');
    const modalStored = document.getElementById('modal-dff-stored');
    const modalNext = document.getElementById('modal-dff-next');

    if (modalTitle) modalTitle.textContent = info.name;
    if (modalRole) modalRole.textContent = info.role;
    if (modalEq) modalEq.textContent = info.equation;
    if (modalD) modalD.textContent = info.inputKey(state);
    if (modalQ) modalQ.textContent = state[info.storedBitKey];
    if (modalClk) modalClk.textContent = 'Active Rising Edge (↑)';
    if (modalStored) modalStored.textContent = state[info.storedBitKey];
    if (modalNext) modalNext.textContent = info.nextDescription;
  }

  function updateFlipFlopSection(state) {
    ['a', 'b', 'c', 'd'].forEach(id => {
      const qValElem = document.getElementById(`dff-sec-q-${id}`);
      const dValElem = document.getElementById(`dff-sec-d-${id}`);
      const card = document.getElementById(`card-dff-${id}`);

      let qVal = state[id];
      let dVal = 0;
      if (id === 'a') dVal = state.appliedBit !== '-' ? state.appliedBit : state.nextBit;
      if (id === 'b') dVal = state.qa;
      if (id === 'c') dVal = state.qb;
      if (id === 'd') dVal = state.qc;

      if (qValElem) qValElem.textContent = qVal;
      if (dValElem) dValElem.textContent = dVal;
      if (card) {
        card.classList.toggle('card-state-1', qVal === 1);
        card.classList.toggle('card-state-0', qVal === 0);
      }
    });

    if (dffModal && dffModal.classList.contains('active')) {
      populateDFFModal(activeInspectedDFF, state);
    }
  }

  function runSensorAggregationDemo() {
    if (demoInterval) clearInterval(demoInterval);

    const sensorKey = demoSensorSelect ? demoSensorSelect.value : 'temp';
    const currentPreset = sensorPresets[sensorKey] || sensorPresets.temp;
    const bits = currentPreset.binary.split('');

    btnRunDemo.disabled = true;
    btnRunDemo.textContent = 'Demo Running...';

    demoStepNodes.forEach(node => node.classList.remove('active-node'));
    if (demoBitBubble) demoBitBubble.style.opacity = '0';
    if (demoParallelVal) demoParallelVal.textContent = '----';
    if (demoGaugeVal) demoGaugeVal.textContent = '--';
    if (demoStatusMsg) {
      demoStatusMsg.textContent = `Sampling ${currentPreset.name}: Raw value ${currentPreset.reading} (Binary: ${currentPreset.binary})...`;
    }

    demoStepNodes[0].classList.add('active-node');
    setTimeout(() => {
      demoStepNodes[1].classList.add('active-node');
      if (demoStatusMsg) {
        demoStatusMsg.textContent = `ADC converted reading into 4-bit word: ${currentPreset.binary}. Serializing bits...`;
      }
    }, 600);

    setTimeout(() => {
      demoStepNodes[2].classList.add('active-node');
      if (demoBitBubble) {
        demoBitBubble.style.opacity = '1';
        demoBitBubble.textContent = bits.join(' → ');
      }
      if (demoStatusMsg) {
        demoStatusMsg.textContent = `Transmitting ${currentPreset.binary} one bit per clock cycle over 1-wire serial channel...`;
      }
    }, 1400);

    let clockStep = 0;
    let accumulated = ['0', '0', '0', '0'];

    setTimeout(() => {
      demoStepNodes[3].classList.add('active-node');

      demoInterval = setInterval(() => {
        if (clockStep < 4) {
          const bit = bits[clockStep];
          accumulated.unshift(bit);
          accumulated.pop();
          clockStep++;

          if (demoBitBubble) {
            demoBitBubble.textContent = `Bit ${clockStep}/4: [${bit}] clocked into DFF A`;
          }
          if (demoParallelVal) {
            demoParallelVal.textContent = accumulated.join('');
          }
          if (demoStatusMsg) {
            demoStatusMsg.textContent = `Clock Pulse ${clockStep}: Shifted bit '${bit}'. Register holding: [${accumulated.join('')}]`;
          }
          sfx.playClick();
        } else {
          clearInterval(demoInterval);
          demoInterval = null;

          demoStepNodes[4].classList.add('active-node');
          if (demoParallelVal) demoParallelVal.textContent = currentPreset.binary;

          setTimeout(() => {
            demoStepNodes[5].classList.add('active-node');
            demoStepNodes[6].classList.add('active-node');

            if (demoGaugeNeedle) {
              demoGaugeNeedle.style.transform = `rotate(${currentPreset.angle}deg)`;
            }
            if (demoGaugeVal) {
              demoGaugeVal.textContent = currentPreset.reading;
            }
            if (demoStatusMsg) {
              demoStatusMsg.innerHTML = `<strong>Success!</strong> Parallel Sensor Word <code>${currentPreset.binary}</code> reconstructed & processed. Monitor shows <strong>${currentPreset.reading}</strong>.`;
            }
            sfx.playLatch();

            btnRunDemo.disabled = false;
            btnRunDemo.textContent = '▶ Run Application Demo Again';
          }, 600);
        }
      }, 700);
    }, 2200);
  }

  // 6. Bind All Event Handlers
  if (btnNextClock) {
    btnNextClock.addEventListener('click', () => engine.stepNext());
  }
  if (tableBtnNext) {
    tableBtnNext.addEventListener('click', () => engine.stepNext());
  }

  if (btnPrevClock) {
    btnPrevClock.addEventListener('click', () => engine.stepPrev());
  }
  if (tableBtnPrev) {
    tableBtnPrev.addEventListener('click', () => engine.stepPrev());
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => engine.reset());
  }
  if (tableBtnReset) {
    tableBtnReset.addEventListener('click', () => engine.reset());
  }

  if (btnToggleSim) {
    btnToggleSim.addEventListener('click', () => engine.toggleAuto());
  }

  if (streamSelect) {
    streamSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') {
        if (customStreamInput) customStreamInput.focus();
      } else {
        engine.setStream(val);
        if (customStreamInput) customStreamInput.value = val;
      }
    });
  }

  if (btnApplyCustom && customStreamInput) {
    btnApplyCustom.addEventListener('click', () => {
      const val = customStreamInput.value.trim();
      if (/^[01]{4,8}$/.test(val)) {
        engine.setStream(val);
        if (streamSelect) streamSelect.value = 'custom';
      } else {
        alert('Please enter a valid binary stream between 4 and 8 bits (e.g. 1011, 0101, 11001010).');
      }
    });
  }

  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      const ms = parseInt(e.target.value, 10);
      engine.setSpeed(ms);
      if (speedLabel) {
        const hz = (1000 / ms).toFixed(1);
        speedLabel.textContent = `${hz} Hz (${ms}ms)`;
      }
    });
  }

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      soundToggleBtn.classList.toggle('muted', !sfx.enabled);
      soundToggleBtn.innerHTML = sfx.enabled 
        ? '<span class="icon">🔊</span> Audio: ON' 
        : '<span class="icon">🔇</span> Audio: OFF';
    });
  }

  // Floating dock controls
  if (dockPrev) dockPrev.addEventListener('click', () => engine.stepPrev());
  if (dockNext) dockNext.addEventListener('click', () => engine.stepNext());
  if (dockAuto) dockAuto.addEventListener('click', () => engine.toggleAuto());
  if (dockReset) dockReset.addEventListener('click', () => engine.reset());

  // Definition section triggers
  procSteps.forEach(step => {
    step.style.cursor = 'pointer';
    step.setAttribute('title', 'Click to advance simulation by 1 clock cycle');
    step.addEventListener('click', () => engine.stepNext());
  });

  if (btnLearnMore && learnMoreDrawer) {
    btnLearnMore.addEventListener('click', () => {
      const isExpanded = learnMoreDrawer.classList.toggle('expanded');
      btnLearnMore.innerHTML = isExpanded 
        ? '<span class="icon">▲</span> Collapse Detailed Propagation Steps' 
        : '<span class="icon">▼</span> Learn More: Clock Pulse Propagation';
    });
  }

  termCards.forEach(card => {
    card.addEventListener('click', () => {
      termCards.forEach(c => c.classList.remove('active-term'));
      card.classList.add('active-term');
    });
  });

  // Flip-Flop section triggers
  dffCards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-dff');
      populateDFFModal(key);
      if (dffModal) dffModal.classList.add('active');
    });
  });

  if (dffModalClose) {
    dffModalClose.addEventListener('click', () => {
      if (dffModal) dffModal.classList.remove('active');
    });
  }

  // Application section triggers
  appCards.forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-app-id');
      const data = applicationData[id];
      if (!data) return;

      const title = document.getElementById('modal-app-title');
      const badge = document.getElementById('modal-app-badge');
      const how = document.getElementById('modal-app-how');
      const scenario = document.getElementById('modal-app-scenario');
      const why = document.getElementById('modal-app-why');

      if (title) title.textContent = data.name;
      if (badge) badge.textContent = data.badge;
      if (how) how.textContent = data.how;
      if (scenario) scenario.textContent = data.scenario;
      if (why) why.textContent = data.whyUseful;

      if (appModal) appModal.classList.add('active');
    });
  });

  if (appModalClose) {
    appModalClose.addEventListener('click', () => {
      if (appModal) appModal.classList.remove('active');
    });
  }

  if (btnRunDemo) {
    btnRunDemo.addEventListener('click', () => runSensorAggregationDemo());
  }

  // Modal Backdrops and Keyboard Escape
  [dffModal, appModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dffModal) dffModal.classList.remove('active');
      if (appModal) appModal.classList.remove('active');
    }
  });

  // Smooth Navigation Bar Active Highlighting
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 200;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }, { passive: true });

  // 7. Initialize Circuit & Timing Visualizers
  const circuitDiagram = new CircuitSVG('circuit-diagram-mount', engine);
  const timingDiagram = new TimingSVG('timing-diagram-mount', engine);

  // 8. Subscribe UI to State Updates (At the end so all elements and handlers are active)
  engine.subscribe((state, meta) => {
    updateDigitalIndicator(elQA, state.qa);
    updateDigitalIndicator(elQB, state.qb);
    updateDigitalIndicator(elQC, state.qc);
    updateDigitalIndicator(elQD, state.qd);

    if (elClock) elClock.textContent = state.clock;
    if (elSerialIn) {
      elSerialIn.textContent = state.clock === 0 ? '0' : state.appliedBit;
    }
    if (elParallelOut) {
      elParallelOut.textContent = state.parallelOutput;
    }
    if (elStatus) {
      if (state.isRunning) {
        elStatus.textContent = 'RUNNING';
        elStatus.className = 'status-tag running';
      } else if (state.isCompleted) {
        elStatus.textContent = 'COMPLETED';
        elStatus.className = 'status-tag completed';
      } else {
        elStatus.textContent = state.clock === 0 ? 'READY' : 'PAUSED';
        elStatus.className = 'status-tag ready';
      }
    }

    if (btnToggleSim) {
      if (state.isRunning) {
        btnToggleSim.innerHTML = '<span class="icon">⏸</span> Pause Simulation';
        btnToggleSim.classList.add('active-play');
      } else {
        btnToggleSim.innerHTML = '<span class="icon">▶</span> Start Simulation';
        btnToggleSim.classList.remove('active-play');
      }
    }

    renderBitTape(state);
    updateFloatingDock(state);
    renderTruthTable(state);
    updateFlipFlopSection(state);

    if (meta && meta.action === 'stepNext') {
      sfx.playClick();
    } else if (meta && (meta.action === 'jump' || meta.action === 'bitToggled')) {
      sfx.playLatch();
    }
  });
});
