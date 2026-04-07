import React, {useMemo, useRef, useState} from 'react';

const steps = [
  {
    status:
      '<span class="kw">console</span>.<span class="fn">log</span>(<span class="str">\'start\'</span>) — pushed onto call stack, executes immediately',
    stack: ["console.log('start')"],
    api: [],
    tasks: [],
    micros: [],
    activeZone: 'callstack',
    log: 'start',
  },
  {
    status:
      '<span class="kw">setTimeout</span>(<span class="fn">cb</span>, <span class="num">0</span>) — handed to Web API / libuv. OS timer starts running off the call stack.',
    stack: ['setTimeout(cb, 0)'],
    api: [{name: 'setTimeout', sub: 'delay: 0ms — OS timer running'}],
    tasks: [],
    micros: [],
    activeZone: 'webapi',
    log: null,
  },
  {
    status:
      '<span class="kw">setImmediate</span>(<span class="fn">cb</span>) — handed to Web API / libuv. Will run in the <span class="str">check phase</span> after I/O.',
    stack: ['setImmediate(cb)'],
    api: [
      {name: 'setTimeout', sub: 'delay: 0ms — OS timer running'},
      {name: 'setImmediate', sub: 'check phase — pending'},
    ],
    tasks: [],
    micros: [],
    activeZone: 'webapi',
    log: null,
  },
  {
    status:
      '<span class="kw">Promise</span>.<span class="fn">resolve</span>().<span class="fn">then</span>(<span class="fn">cb</span>) — <span class="str">.then callback</span> queued into microtask queue immediately.',
    stack: ['Promise.resolve().then(cb)'],
    api: [
      {name: 'setTimeout', sub: 'delay: 0ms — OS timer running'},
      {name: 'setImmediate', sub: 'check phase — pending'},
    ],
    tasks: [],
    micros: ['promise callback'],
    activeZone: 'microtask',
    log: null,
  },
  {
    status:
      '<span class="kw">process</span>.<span class="fn">nextTick</span>(<span class="fn">cb</span>) — callback queued at the <span class="str">front</span> of the microtask queue (higher priority than Promise).',
    stack: ['process.nextTick(cb)'],
    api: [
      {name: 'setTimeout', sub: 'delay: 0ms — OS timer running'},
      {name: 'setImmediate', sub: 'check phase — pending'},
    ],
    tasks: [],
    micros: ['nextTick callback', 'promise callback'],
    activeZone: 'microtask',
    log: null,
  },
  {
    status:
      '<span class="kw">console</span>.<span class="fn">log</span>(<span class="str">\'end\'</span>) — last synchronous statement, runs immediately.',
    stack: ["console.log('end')"],
    api: [
      {name: 'setTimeout', sub: 'delay: 0ms — OS timer running'},
      {name: 'setImmediate', sub: 'check phase — pending'},
    ],
    tasks: [],
    micros: ['nextTick callback', 'promise callback'],
    activeZone: 'callstack',
    log: 'end',
  },
  {
    status:
      'Call stack empty. Event loop drains <span class="str">microtask queue</span>. <span class="kw">nextTick</span> callbacks run first (higher priority).',
    stack: [],
    api: [
      {name: 'setTimeout', sub: 'threshold elapsed ✓'},
      {name: 'setImmediate', sub: 'check phase — pending'},
    ],
    tasks: [],
    micros: ['nextTick callback', 'promise callback'],
    activeZone: 'microtask',
    log: null,
  },
  {
    status:
      '<span class="str">nextTick callback</span> executes on call stack.',
    stack: ['nextTick callback'],
    api: [
      {name: 'setTimeout', sub: 'threshold elapsed ✓'},
      {name: 'setImmediate', sub: 'check phase — pending'},
    ],
    tasks: [],
    micros: ['promise callback'],
    activeZone: 'callstack',
    log: 'nextTick',
  },
  {
    status:
      '<span class="str">promise callback</span> executes on call stack. Microtask queue is now empty.',
    stack: ['promise callback'],
    api: [
      {name: 'setTimeout', sub: 'threshold elapsed ✓'},
      {name: 'setImmediate', sub: 'check phase — pending'},
    ],
    tasks: [],
    micros: [],
    activeZone: 'callstack',
    log: 'promise',
  },
  {
    status:
      'libuv signals timer elapsed. <span class="kw">setTimeout</span> callback moves from Web API → <span class="num">task queue</span>.',
    stack: [],
    api: [{name: 'setImmediate', sub: 'check phase — pending'}],
    tasks: ['setTimeout callback'],
    micros: [],
    activeZone: 'taskqueue',
    log: null,
  },
  {
    status:
      'Event loop picks up <span class="kw">setTimeout</span> <span class="fn">callback</span> from task queue — pushed onto call stack.',
    stack: ['setTimeout callback'],
    api: [{name: 'setImmediate', sub: 'check phase — pending'}],
    tasks: [],
    micros: [],
    activeZone: 'callstack',
    log: 'setTimeout',
  },
  {
    status:
      'libuv signals check phase. <span class="kw">setImmediate</span> callback moves from Web API → <span class="num">task queue</span>.',
    stack: [],
    api: [],
    tasks: ['setImmediate callback'],
    micros: [],
    activeZone: 'taskqueue',
    log: null,
  },
  {
    status:
      'Event loop picks up <span class="kw">setImmediate</span> <span class="fn">callback</span> from task queue — pushed onto call stack.',
    stack: ['setImmediate callback'],
    api: [],
    tasks: [],
    micros: [],
    activeZone: 'callstack',
    log: 'setImmediate',
  },
  {
    status:
      '<span class="str">Simulation complete.</span> All queues drained. Event loop idles — waiting for next I/O or timer.',
    stack: [],
    api: [],
    tasks: [],
    micros: [],
    activeZone: null,
    log: null,
  },
];

const initialStep = {
  stack: [],
  api: [],
  tasks: [],
  micros: [],
  activeZone: null,
  status: 'Press <span class="kw">Next step</span> to start the simulation',
};

const zoneColors = {
  callstack: '#d4537e',
  webapi: '#7f77dd',
  taskqueue: '#e85d9a',
  microtask: '#1d9e75',
};

export default function JsEventLoopAnimated() {
  const [current, setCurrent] = useState(-1);
  const [particle, setParticle] = useState({
    left: 0,
    top: 0,
    opacity: 0,
    color: zoneColors.callstack,
  });

  const rootRef = useRef(null);
  const zoneRefs = {
    callstack: useRef(null),
    webapi: useRef(null),
    taskqueue: useRef(null),
    microtask: useRef(null),
  };

  const displayedStep = useMemo(() => {
    return current >= 0 ? steps[current] : initialStep;
  }, [current]);

  const consoleLogs = useMemo(() => {
    if (current < 0) return [];
    return steps
      .slice(0, current + 1)
      .filter((s) => s.log != null)
      .map((s) => s.log);
  }, [current]);

  const animateParticle = (zoneId) => {
    if (!zoneId || !rootRef.current || !zoneRefs[zoneId]?.current) return;

    const rootRect = rootRef.current.getBoundingClientRect();
    const zoneRect = zoneRefs[zoneId].current.getBoundingClientRect();
    const color = zoneColors[zoneId] || zoneColors.callstack;

    setParticle({
      left: zoneRect.left - rootRect.left + zoneRect.width / 2 - 4,
      top: zoneRect.top - rootRect.top + zoneRect.height / 2 - 4,
      opacity: 0,
      color,
    });

    requestAnimationFrame(() => {
      setParticle((prev) => ({...prev, opacity: 1}));
      setTimeout(() => {
        setParticle((prev) => ({...prev, opacity: 0}));
      }, 900);
    });
  };

  const nextStep = () => {
    setCurrent((prev) => {
      if (prev >= steps.length - 1) return prev;
      const next = prev + 1;
      setTimeout(() => animateParticle(steps[next].activeZone), 0);
      return next;
    });
  };

  const reset = () => {
    setCurrent(-1);
    setParticle((prev) => ({...prev, opacity: 0}));
  };

  const isDone = current >= steps.length - 1;

  return (
    <div style={styles.root} ref={rootRef}>
      <style>{css}</style>

      <div className="top-label">JavaScript runtime</div>

      <div className="grid">
        <div
          ref={zoneRefs.callstack}
          className={`zone zone-callstack ${
            displayedStep.activeZone === 'callstack' ? 'active-zone' : ''
          }`}>
          <div className="zone-label">Call stack</div>
          <div className="stack-items">
            {displayedStep.stack.map((item) => (
              <div className="stack-item" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          ref={zoneRefs.webapi}
          className={`zone zone-webapi ${
            displayedStep.activeZone === 'webapi' ? 'active-zone' : ''
          }`}>
          <div className="zone-label">Web APIs / libuv</div>
          <div>
            {displayedStep.api.map((item, i) => (
              <div className="api-item" key={`${item.name}-${i}`}>
                <div className="api-name">{item.name}</div>
                <div className="api-sub">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          ref={zoneRefs.taskqueue}
          className={`zone zone-taskqueue ${
            displayedStep.activeZone === 'taskqueue' ? 'active-zone' : ''
          }`}>
          <div className="zone-label">Task queue</div>
          <div className="queue-items">
            {displayedStep.tasks.map((item) => (
              <div className="queue-item task" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          ref={zoneRefs.microtask}
          className={`zone zone-microtask ${
            displayedStep.activeZone === 'microtask' ? 'active-zone' : ''
          }`}>
          <div className="zone-label">Microtask queue</div>
          <div className="queue-items">
            {displayedStep.micros.map((item) => (
              <div className="queue-item micro" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="event-loop-badge">
          <div className="el-icon" />
          <span className="el-text">Event loop</span>
        </div>
      </div>

      <div
        className="status-bar"
        dangerouslySetInnerHTML={{__html: displayedStep.status}}
      />

      <div className="console-output">
        <div className="console-label">Console output</div>
        {consoleLogs.length === 0 ? (
          <div className="console-empty">— no output yet —</div>
        ) : (
          consoleLogs.map((line, i) => (
            <div className="console-line" key={i}>
              {line}
            </div>
          ))
        )}
      </div>

      <div className="controls">
        <button
          className="btn btn-primary"
          onClick={nextStep}
          disabled={isDone}>
          Next step →
        </button>
        <button className="btn" onClick={reset}>
          Reset
        </button>
        <span className="step-counter">
          {current + 1 < 0 ? 0 : current + 1} / {steps.length - 1}
        </span>
      </div>

      <div
        className="particle"
        style={{
          left: `${particle.left}px`,
          top: `${particle.top}px`,
          opacity: particle.opacity,
          background: particle.color,
          boxShadow: `0 0 8px ${particle.color}`,
        }}
      />
    </div>
  );
}

const styles = {
  root: {
    background: '#111318',
    borderRadius: 14,
    padding: 20,
    fontFamily: 'var(--font-mono, monospace)',
    color: '#c8cad4',
    minHeight: 480,
    position: 'relative',
    overflow: 'hidden',
  },
};

const css = `
  * { box-sizing: border-box; }

  .top-label {
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.12em;
    color: #5a5e70;
    margin-bottom: 16px;
    text-transform: uppercase;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 12px;
  }

  .zone {
    border-radius: 10px;
    padding: 12px;
    min-height: 140px;
    position: relative;
    border: 1.5px solid transparent;
    transition: border-color 0.3s, box-shadow 0.3s;
  }

  .zone-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
    text-transform: uppercase;
  }

  .zone-callstack  { background: #1a1620; border-color: #3a2040; }
  .zone-webapi     { background: #161a28; border-color: #223; }
  .zone-taskqueue  { background: #1a1620; border-color: #3a2040; }
  .zone-microtask  { background: #141e1a; border-color: #1e3028; }

  .zone-callstack .zone-label { color: #d4537e; }
  .zone-webapi .zone-label    { color: #7f77dd; }
  .zone-taskqueue .zone-label { color: #e85d9a; }
  .zone-microtask .zone-label { color: #1d9e75; }

  .zone-callstack.active-zone  { border-color: #d4537e; box-shadow: 0 0 16px #d4537e33; }
  .zone-webapi.active-zone     { border-color: #7f77dd; box-shadow: 0 0 16px #7f77dd33; }
  .zone-taskqueue.active-zone  { border-color: #e85d9a; box-shadow: 0 0 16px #e85d9a33; }
  .zone-microtask.active-zone  { border-color: #1d9e75; box-shadow: 0 0 16px #1d9e7533; }

  .stack-items {
    display: flex;
    flex-direction: column-reverse;
    gap: 4px;
    min-height: 80px;
  }

  .stack-item {
    background: #2a1e30;
    border: 1px solid #3d2a45;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    color: #e8a0c0;
    animation: slideIn 0.25s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .api-item {
    background: #1e1e38;
    border: 1px solid #2e2e58;
    border-radius: 5px;
    padding: 6px 10px;
    font-size: 10px;
    color: #afa9ec;
    margin-bottom: 4px;
  }

  .api-name { color: #7f77dd; font-weight: 600; font-size: 11px; }
  .api-sub  { color: #5a5880; font-size: 10px; margin-top: 1px; }

  .queue-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 80px;
  }

  .queue-item {
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    animation: slideIn 0.25s ease;
  }

  .queue-item.task  { background: #2a1232; border: 1px solid #4a1850; color: #ed93b1; }
  .queue-item.micro { background: #0e2318; border: 1px solid #1a3a28; color: #5dcaa5; }

  .event-loop-badge {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 8px 16px;
    background: #0e1014;
    border-radius: 8px;
    border: 1px solid #222530;
  }

  .el-icon {
    width: 22px;
    height: 22px;
    border: 2px solid #378add;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1.4s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .el-text {
    font-size: 11px;
    color: #378add;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-bar {
    margin-top: 14px;
    background: #0e1014;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    color: #888ba0;
    border: 1px solid #1c1e28;
    min-height: 38px;
    line-height: 1.5;
  }

  .status-bar .kw  { color: #d4537e; }
  .status-bar .fn  { color: #7f77dd; }
  .status-bar .str { color: #5dcaa5; }
  .status-bar .num { color: #EF9F27; }

  .console-output {
    margin-top: 10px;
    background: #0a0c0f;
    border-radius: 8px;
    padding: 10px 14px;
    border: 1px solid #1c1e28;
    min-height: 44px;
    font-size: 12px;
  }

  .console-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #3a3d50;
    margin-bottom: 6px;
  }

  .console-line {
    color: #c8cad4;
    padding: 1px 0;
    line-height: 1.6;
    animation: slideIn 0.2s ease;
  }

  .console-line::before {
    content: '> ';
    color: #378add;
  }

  .console-empty {
    color: #3a3d50;
    font-size: 11px;
  }

  .controls {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    align-items: center;
  }

  .btn {
    background: #1c1e28;
    border: 1px solid #2e3040;
    border-radius: 6px;
    color: #c8cad4;
    font-size: 12px;
    padding: 6px 14px;
    cursor: pointer;
    font-family: var(--font-mono, monospace);
    transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  }

  .btn:hover { background: #242636; border-color: #3a3d50; }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-primary {
    background: #1e1e38;
    border-color: #534AB7;
    color: #afa9ec;
  }

  .btn-primary:hover:not(:disabled) { background: #26264a; }

  .step-counter {
    margin-left: auto;
    font-size: 11px;
    color: #3a3d50;
  }

  .particle {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    pointer-events: none;
    transition:
      left 0.4s cubic-bezier(.4,0,.2,1),
      top 0.4s cubic-bezier(.4,0,.2,1),
      opacity 0.3s;
    z-index: 10;
  }
`;
