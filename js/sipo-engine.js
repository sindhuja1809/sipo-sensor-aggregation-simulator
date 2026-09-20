/**
 * SIPOEngine - Reactive State Engine for Serial-In Parallel-Out Shift Register
 * EC2201 - Synchronous Sequential Circuits | Unit III
 */

class SIPOEngine {
  constructor(initialStream = '1011') {
    this.subscribers = new Set();
    this.timer = null;
    this.autoSpeedMs = 1200;
    this.isRunning = false;
    this.setStream(initialStream);
  }

  setStream(streamStr) {
    // Sanitize to binary only, at least 4 bits, default '1011'
    let clean = (streamStr || '').replace(/[^01]/g, '');
    if (clean.length === 0) clean = '1011';
    this.stream = clean.split('').map(Number);
    this.reset();
  }

  reset() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.clock = 0;
    this.qa = 0;
    this.qb = 0;
    this.qc = 0;
    this.qd = 0;

    // Rebuild full truth table trajectory for the stream
    this.recomputeTrajectory();
    this.notify({ action: 'reset' });
  }

  recomputeTrajectory() {
    // Computes state at each clock cycle from 0 to stream.length (or beyond)
    this.trajectory = [];
    
    // T0 initial state
    let curQA = 0, curQB = 0, curQC = 0, curQD = 0;
    this.trajectory.push({
      clock: 0,
      serialIn: this.stream[0] !== undefined ? this.stream[0] : 0, // Upcoming bit
      appliedBit: '-', // Bit consumed at active edge
      qa: curQA,
      qb: curQB,
      qc: curQC,
      qd: curQD,
      parallelOutput: `${curQA}${curQB}${curQC}${curQD}`
    });

    for (let c = 1; c <= this.stream.length; c++) {
      const bit = this.stream[c - 1];
      const nextQA = bit;
      const nextQB = curQA;
      const nextQC = curQB;
      const nextQD = curQC;

      curQA = nextQA;
      curQB = nextQB;
      curQC = nextQC;
      curQD = nextQD;

      const upcomingBit = c < this.stream.length ? this.stream[c] : 0;

      this.trajectory.push({
        clock: c,
        serialIn: upcomingBit,
        appliedBit: bit,
        qa: curQA,
        qb: curQB,
        qc: curQC,
        qd: curQD,
        parallelOutput: `${curQA}${curQB}${curQC}${curQD}`
      });
    }
  }

  stepNext() {
    const prevQA = this.qa;
    const prevQB = this.qb;
    const prevQC = this.qc;
    const prevQD = this.qd;
    const bitToApply = this.clock < this.stream.length ? this.stream[this.clock] : 0;

    if (this.clock < this.trajectory.length - 1) {
      this.clock++;
      const current = this.trajectory[this.clock];
      this.qa = current.qa;
      this.qb = current.qb;
      this.qc = current.qc;
      this.qd = current.qd;
      this.notify({ 
        action: 'stepNext', 
        clock: this.clock,
        appliedBit: bitToApply,
        prevQA,
        prevQB,
        prevQC,
        prevQD
      });
      return true;
    } else {
      // Continuous loop: Wrap smoothly back to Clock 0
      this.clock = 0;
      const current = this.trajectory[0];
      this.qa = current.qa;
      this.qb = current.qb;
      this.qc = current.qc;
      this.qd = current.qd;
      this.notify({ 
        action: 'stepNext', 
        clock: this.clock, 
        wrapped: true,
        appliedBit: this.stream[0],
        prevQA,
        prevQB,
        prevQC,
        prevQD
      });
      return true;
    }
  }

  stepPrev() {
    if (this.clock > 0) {
      this.clock--;
    } else {
      this.clock = this.trajectory.length - 1;
    }
    const current = this.trajectory[this.clock];
    this.qa = current.qa;
    this.qb = current.qb;
    this.qc = current.qc;
    this.qd = current.qd;
    this.notify({ action: 'stepPrev', clock: this.clock });
    return true;
  }

  toggleRegisterBit(key) {
    if (['qa', 'qb', 'qc', 'qd'].includes(key)) {
      this[key] = this[key] === 1 ? 0 : 1;
      this.notify({ action: 'registerToggled', key, val: this[key] });
    }
  }

  toggleStreamBit(index) {
    if (index >= 0 && index < this.stream.length) {
      this.stream[index] = this.stream[index] === 1 ? 0 : 1;
      this.recomputeTrajectory();
      if (this.clock >= this.trajectory.length) this.clock = this.trajectory.length - 1;
      const current = this.trajectory[this.clock];
      this.qa = current.qa;
      this.qb = current.qb;
      this.qc = current.qc;
      this.qd = current.qd;
      this.notify({ action: 'bitToggled', index });
    }
  }

  jumpToClock(targetClock) {
    if (targetClock >= 0 && targetClock < this.trajectory.length) {
      this.clock = targetClock;
      const current = this.trajectory[this.clock];
      this.qa = current.qa;
      this.qb = current.qb;
      this.qc = current.qc;
      this.qd = current.qd;
      this.notify({ action: 'jump', clock: this.clock });
    }
  }

  toggleAuto() {
    if (this.isRunning) {
      this.stopAuto();
    } else {
      this.startAuto();
    }
  }

  startAuto() {
    this.isRunning = true;
    this.notify({ action: 'start' });

    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.stepNext();
    }, this.autoSpeedMs);
  }

  stopAuto() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.isRunning) {
      this.isRunning = false;
      this.notify({ action: 'stop' });
    }
  }

  setSpeed(speedMs) {
    this.autoSpeedMs = speedMs;
    if (this.isRunning) {
      this.stopAuto();
      this.startAuto();
    }
  }

  getCurrentState() {
    if (!this.trajectory || this.trajectory.length === 0) {
      this.recomputeTrajectory();
    }
    const step = this.trajectory[this.clock] || this.trajectory[0];
    const nextBit = this.clock < this.stream.length ? this.stream[this.clock] : 0;
    
    // Predicted next state on next clock edge
    const nextQA = nextBit;
    const nextQB = this.qa;
    const nextQC = this.qb;
    const nextQD = this.qc;

    return {
      clock: this.clock,
      totalClocks: this.trajectory.length - 1,
      stream: this.stream,
      streamStr: this.stream.join(''),
      appliedBit: step.appliedBit,
      nextBit: nextBit,
      qa: this.qa,
      qb: this.qb,
      qc: this.qc,
      qd: this.qd,
      parallelOutput: `${this.qa}${this.qb}${this.qc}${this.qd}`,
      nextParallelOutput: `${nextQA}${nextQB}${nextQC}${nextQD}`,
      isRunning: this.isRunning,
      trajectory: this.trajectory,
      isCompleted: this.clock >= this.trajectory.length - 1
    };
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    // Initial emission
    try {
      callback(this.getCurrentState());
    } catch (err) {
      console.error('Initial SIPO subscriber error:', err);
    }
    return () => this.subscribers.delete(callback);
  }

  notify(meta = {}) {
    const state = this.getCurrentState();
    for (const callback of this.subscribers) {
      try {
        callback(state, meta);
      } catch (err) {
        console.error('SIPO subscriber error:', err);
      }
    }
  }
}

// Export to window for browser use
window.SIPOEngine = SIPOEngine;
