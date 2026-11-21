const signalDemo = document.querySelector('[data-signal-demo]');
const signalCanvas = signalDemo?.querySelector('canvas');
const signalContext = signalCanvas?.getContext('2d');

if (signalContext) {
  const sampleRate = 1000;
  const duration = 4;
  const sampleCount = sampleRate * duration + 1;
  const channels = [
    { delay: 0, amplitude: .92, baseline: .12, color: '#88b5ff', dash: [] },
    { delay: 120, amplitude: .83, baseline: .15, color: '#c3a9fa', dash: [7, 4] },
    { delay: 255, amplitude: 1.25, baseline: .10, color: '#f5b681', dash: [2, 4] },
  ];
  const meanStyle = { color: '#f2f5ff', dash: [], weight: 3 };

  function peakIndex(values, limit = values.length) {
    let peak = 0;
    for (let index = 1; index < limit; index += 1) {
      if (values[index] > values[peak]) peak = index;
    }
    return peak;
  }

  const padding = Math.max(...channels.map((channel) => channel.delay));
  const recordings = channels.map((channel) =>
    Array.from({ length: sampleCount + padding }, (_, index) => {
      const offset = (index - channel.delay) / sampleRate - .28;
      const distance = offset - Math.round(offset);
      const pulse = Math.exp(-.5 * (distance / .11) ** 2);
      return channel.baseline + channel.amplitude * pulse;
    })
  );

  const firstPeaks = recordings.map((trace) => peakIndex(trace, sampleRate));
  const firstReference = Math.min(...firstPeaks);
  const raw = recordings.map((trace) => trace.slice(0, sampleCount));
  const aligned = recordings.map((trace, index) => {
    const shift = firstPeaks[index] - firstReference;
    return trace.slice(shift, shift + sampleCount);
  });

  function summarize(records) {
    const mean = records[0].map((_, index) =>
      records.reduce((sum, trace) => sum + trace[index], 0) / records.length
    );
    const peaks = records.map((trace) => peakIndex(trace, sampleRate));
    return {
      records,
      mean,
      spread: (Math.max(...peaks) - Math.min(...peaks)) * 1000 / sampleRate,
      peak: mean[peakIndex(mean)],
    };
  }

  const samples = { raw: summarize(raw), aligned: summarize(aligned) };
  const meanToggle = signalDemo.querySelector('[data-signal-mean]');
  const meanKey = signalDemo.querySelector('[data-mean-key]');
  const spreadOutput = signalDemo.querySelector('[data-signal-spread]');
  const peakOutput = signalDemo.querySelector('[data-signal-peak]');
  const downloadButton = signalDemo.querySelector('[data-signal-export]');

  function selectedMode() {
    return signalDemo.querySelector('input[name="signal-mode"]:checked').value;
  }

  function draw() {
    const width = signalCanvas.clientWidth;
    const height = signalCanvas.clientHeight;
    if (!width || !height) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    signalCanvas.width = Math.round(width * pixelRatio);
    signalCanvas.height = Math.round(height * pixelRatio);
    const context = signalContext;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const left = 44;
    const top = 29;
    const right = width - 14;
    const bottom = height - 44;
    const yMax = 1.6;
    const x = (time) => left + time / duration * (right - left);
    const y = (displacement) => bottom - displacement / yMax * (bottom - top);
    const current = samples[selectedMode()];

    context.font = '12px system-ui, sans-serif';
    context.fillStyle = '#c4cde0';
    context.strokeStyle = '#303d5a';
    context.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick += 1) {
      const level = tick * .4;
      context.beginPath();
      context.moveTo(left, y(level));
      context.lineTo(right, y(level));
      context.stroke();
      context.textAlign = 'right';
      context.fillText(level.toFixed(1), left - 8, y(level) + 4);

      context.beginPath();
      context.moveTo(x(tick), top);
      context.lineTo(x(tick), bottom);
      context.stroke();
      context.textAlign = 'center';
      context.fillText(String(tick), x(tick), bottom + 17);
    }
    context.textAlign = 'left';
    context.fillText('Displacement (mm)', left, 16);
    context.textAlign = 'center';
    context.fillText('Time (s)', (left + right) / 2, height - 7);

    function plot(values, style) {
      context.beginPath();
      context.strokeStyle = style.color;
      context.lineWidth = style.weight ?? 1.6;
      context.setLineDash(style.dash);
      const stride = Math.max(1, Math.floor(sampleCount / (width * 2)));
      for (let index = 0; index < sampleCount; index += stride) {
        const sampleX = x(index / sampleRate);
        const sampleY = y(values[index]);
        if (index === 0) context.moveTo(sampleX, sampleY);
        else context.lineTo(sampleX, sampleY);
      }
      context.lineTo(right, y(values[sampleCount - 1]));
      context.stroke();
    }

    current.records.forEach((trace, index) => plot(trace, channels[index]));
    if (meanToggle.checked) plot(current.mean, meanStyle);
  }

  function update() {
    const selected = selectedMode();
    const values = samples[selected];
    meanKey.hidden = !meanToggle.checked;
    spreadOutput.textContent = `${values.spread} ms`;
    peakOutput.textContent = `${values.peak.toFixed(2)} mm`;
    signalCanvas.setAttribute('aria-label',
      `${selected === 'raw' ? 'Raw' : 'Aligned'} synthetic displacement traces over four seconds with a peak timing spread of ${values.spread} milliseconds.`
    );
    draw();
  }

  function exportSamples() {
    const mode = selectedMode();
    const { records, mean } = samples[mode];
    const rows = ['time_s,lvdt_1_mm,lvdt_2_mm,lvdt_3_mm,mean_mm'];
    for (let index = 0; index < sampleCount; index += 1) {
      const readings = records.map((trace) => trace[index].toFixed(5));
      rows.push([(index / sampleRate).toFixed(3), ...readings, mean[index].toFixed(5)].join(','));
    }

    const url = URL.createObjectURL(new Blob([rows.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `synthetic-displacement-${mode}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  signalDemo.addEventListener('change', update);
  downloadButton.addEventListener('click', exportSamples);
  signalDemo.hidden = false;
  update();
  const observer = new ResizeObserver(draw);
  observer.observe(signalCanvas);
}
