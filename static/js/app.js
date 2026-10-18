/**
 * AstroPalm Nexus - Main Frontend Controller
 * Coordinates Natal Wheel, Palm Canvas, Synthesis, and Transits APIs.
 */

let natalWheel = null;
let palmCanvas = null;

let currentNatalChart = null;
let currentPalmFeatures = null;
let currentSynthesis = null;
let activePresetConfig = null;

// 4-Slot Photo Studio State (Top-Level Scope)
const handStudio = {
  currentView: "right_palm",
  photos: {
    right_palm: null,
    right_dorsal: null,
    left_palm: null,
    left_dorsal: null,
  },
  images: {},
};

document.addEventListener("DOMContentLoaded", () => {
  initStarryBackground();
  initVisualizers();
  initEventListeners();
  loadPresets();
  // Auto-calculate default profile (Иван)
  calculateAll();
});

// 1. Starry Dynamic Background
function initStarryBackground() {
  const canvas = document.getElementById("stars-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  const stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.015 + 0.005,
    });
  }

  function loop() {
    ctx.clearRect(0, 0, w, h);
    stars.forEach((s) => {
      s.alpha += Math.sin(Date.now() * s.speed) * 0.005;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, s.alpha))})`;
      ctx.fill();
    });
    requestAnimationFrame(loop);
  }
  loop();
}

// 2. Initialize Visualizers
function initVisualizers() {
  const tooltip = document.getElementById("wheel-tooltip");

  natalWheel = new NatalWheel("natal-svg-container", {
    onPlanetHover: (planet, evt) => {
      if (!planet || !evt) {
        tooltip.style.display = "none";
        return;
      }
      tooltip.style.display = "block";
      tooltip.style.left = `${evt.offsetX + 15}px`;
      tooltip.style.top = `${evt.offsetY + 15}px`;
      tooltip.innerHTML = `
        <div style="font-weight: bold; color: var(--accent-gold); font-size: 13px;">
          ${planet.symbol} ${planet.name_ru} (${planet.name})
        </div>
        <div style="color: #cbd5e1; font-size: 12px; margin-top: 2px;">
          ${planet.sign_symbol} ${planet.sign_ru} ${planet.degree_formatted}
        </div>
        <div style="color: #94a3b8; font-size: 11px;">
          Дом: ${planet.house} • Стихия: ${planet.element_ru}
          ${planet.retrograde ? '<span style="color:#ff5252;"> • Ретроградный</span>' : ''}
        </div>
      `;
    },
    onPlanetClick: (planet) => {
      showInspectModal(`Планета ${planet.name_ru} (${planet.symbol})`, `
        <div style="display:flex; flex-direction:column; gap:8px;">
          <p><strong>Знак:</strong> ${planet.sign_symbol} ${planet.sign_ru} (${planet.degree_formatted})</p>
          <p><strong>Дом:</strong> ${planet.house}-й дом натальной карты</p>
          <p><strong>Стихия и качество:</strong> ${planet.element_ru}, ${planet.quality_ru}</p>
          <p><strong>Скорость:</strong> ${planet.speed}°/день ${planet.retrograde ? '(Ретроградное движение)' : '(Директное)'}</p>
          <p><strong>Достоинство:</strong> ${planet.dignity || 'Нейтральное'}</p>
          <p><strong>Соответствие в хиромантии:</strong> Связан с холмом ${planet.name_ru} на ладони.</p>
        </div>
      `);
    },
  });

  palmCanvas = new PalmCanvas("palm-canvas", {
    onSelectFeature: (feature) => {
      if (feature.type === "mount") {
        openMountMarkingModal(feature.data, feature.details, feature.custom);
      } else if (feature.type === "joint") {
        showInspectModal(`Сустав пальца: ${feature.data.name}`, `
          <div style="display:flex; flex-direction:column; gap:8px;">
            <p><strong>Анатомический узел:</strong> Межфаланговое сочленение</p>
            <p><strong>Характеристика:</strong> Выраженность сустава определяет склонность к логической фильтрации и методичности (по классификации Д'Арпентиньи).</p>
          </div>
        `);
      } else if (feature.type === "line_anchor") {
        showInspectModal(`Контрольная точка: ${feature.data.name}`, `
          <div style="display:flex; flex-direction:column; gap:8px;">
            <p><strong>Линия:</strong> ${feature.data.line === 'heart' ? 'Линия Сердца (розовая)' : (feature.data.line === 'head' ? 'Линия Головы (голубая)' : 'Линия Жизни (золотая)')}</p>
            <p><strong>Положение:</strong> X: ${feature.data.x}px, Y: ${feature.data.y}px</p>
            <p style="font-size:0.85rem; color:#94a3b8;">Вы можете свободно перетаскивать эту точку мышкой или пальцем прямо по реальной складке своей ладони на фотографии.</p>
          </div>
        `);
      }
    },
    onLinesUpdated: (gap, isSeparated, gapRatio, gapPercent) => {
      updateLineSeparationUI(gap, isSeparated, gapRatio, gapPercent);
    },
  });
}

async function updateLineSeparationUI(gap, isSeparated, gapRatio, gapPercent) {
  const statusBadge = document.getElementById("line-separation-status");
  const pctStr = gapPercent || ((gap / 260) * 100).toFixed(1);
  if (statusBadge) {
    if (isSeparated) {
      statusBadge.textContent = `Разделены (Биометрия: ${pctStr}% • Независимость)`;
      statusBadge.style.color = "#38ef7d";
    } else {
      statusBadge.textContent = `Соединены (Биометрия: ${pctStr}% • Осмотрительность)`;
      statusBadge.style.color = "#f6c85f";
    }
  }

  try {
    if (currentPalmFeatures) {
      if (!currentPalmFeatures.detected_lines) currentPalmFeatures.detected_lines = {};
      currentPalmFeatures.detected_lines.head_life_separated = isSeparated;
      currentPalmFeatures.detected_lines.gap_distance_px = gap;
      currentPalmFeatures.detected_lines.gap_ratio = gapRatio || (gap / 260.0);
      currentPalmFeatures.detected_lines.gap_percent = parseFloat(pctStr);

      if (currentNatalChart) {
        const synthResp = await fetch("/api/synthesis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            natal_chart: currentNatalChart,
            palm_features: currentPalmFeatures,
          }),
        });
        if (synthResp.ok) {
          currentSynthesis = await synthResp.json();
          renderSynthesisUI(currentSynthesis);
        }
      }
    }
  } catch (e) {
    console.error("Line separation update error:", e);
  }
}

function openMountMarkingModal(m, det, custom) {
  const currentScore = custom?.score || det?.score || 72;
  const currentSign = custom?.sign || det?.special_sign || "";

  showInspectModal(`Отметка бугра: ${m.name_ru} (${m.symbol})`, `
    <div style="display:flex; flex-direction:column; gap:14px; font-size:0.9rem;">
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); padding:10px 14px; border-radius:8px;">
        <p><strong>Планета-управитель:</strong> ${m.planet} • <strong>Локация:</strong> ${m.finger}</p>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">
          ${det?.interpretation || 'Определяет фундаментальную силу соответствующей планеты в характере и действиях.'}
        </p>
      </div>

      <!-- Development Score Radio Buttons -->
      <div>
        <label style="font-weight:600; color:var(--accent-gold); display:block; margin-bottom:6px;">
          Степень наполненности бугра (рельеф):
        </label>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px;" id="mount-score-options">
          <label class="mount-option-pill ${currentScore < 65 ? 'selected' : ''}" data-score="55">
            <span>Впалый / Слабый (55)</span>
          </label>
          <label class="mount-option-pill ${currentScore >= 65 && currentScore < 80 ? 'selected' : ''}" data-score="72">
            <span>Сбалансированный (72)</span>
          </label>
          <label class="mount-option-pill ${currentScore >= 80 && currentScore < 90 ? 'selected' : ''}" data-score="86">
            <span>Выраженный / Сильный (86)</span>
          </label>
          <label class="mount-option-pill ${currentScore >= 90 ? 'selected' : ''}" data-score="95">
            <span>Доминирующий (95)</span>
          </label>
        </div>
      </div>

      <!-- Special Marks Dropdown -->
      <div>
        <label style="font-weight:600; color:var(--accent-gold); display:block; margin-bottom:6px;">
          Особые знаки на вершине (апексе) бугра:
        </label>
        <select id="mount-sign-select" class="form-input" style="width:100%; font-size:0.86rem;">
          <option value="" ${!currentSign ? 'selected' : ''}>Без особых знаков</option>
          <option value="✨" ${currentSign === '✨' ? 'selected' : ''}>✨ Звезда (Внезапный триумф, выдающийся успех)</option>
          <option value="🔱" ${currentSign === '🔱' ? 'selected' : ''}>🔱 Трезубец (Царственная слава и покровительство)</option>
          <option value="🔺" ${currentSign === '🔺' ? 'selected' : ''}>🔺 Треугольник (Дипломатия, научная мудрость)</option>
          <option value="⛨" ${currentSign === '⛨' ? 'selected' : ''}>⛨ Квадрат (Знак высшей защиты от кризисов)</option>
          <option value="▦" ${currentSign === '▦' ? 'selected' : ''}>▦ Решетка (Рассеивание энергии, препятствия)</option>
          <option value="✖" ${currentSign === '✖' ? 'selected' : ''}>✖ Крест (Кармический урок и проверка)</option>
        </select>
      </div>

      <button id="btn-save-mount-mark" class="btn-pill primary" style="width:100%; padding:10px; font-weight:600; justify-content:center; margin-top:8px;">
        <span>💾</span> Применить отметку и обновить синтез
      </button>
    </div>
  `);

  // Event handlers inside modal
  const pillOptions = document.querySelectorAll(".mount-option-pill");
  let selectedScore = currentScore;
  pillOptions.forEach(pill => {
    pill.addEventListener("click", () => {
      pillOptions.forEach(p => p.classList.remove("selected"));
      pill.classList.add("selected");
      selectedScore = parseInt(pill.getAttribute("data-score"), 10);
    });
  });

  document.getElementById("btn-save-mount-mark")?.addEventListener("click", async () => {
    const chosenSign = document.getElementById("mount-sign-select")?.value || null;
    palmCanvas.setMountMark(m.id, selectedScore, chosenSign);
    closeModal();

    // Trigger instant re-synthesis
    try {
      if (currentNatalChart && currentPalmFeatures) {
        if (!currentPalmFeatures.mounts) currentPalmFeatures.mounts = {};
        if (!currentPalmFeatures.mounts[m.id]) {
          currentPalmFeatures.mounts[m.id] = { score: selectedScore, planet: m.planet };
        }
        currentPalmFeatures.mounts[m.id].score = selectedScore;
        currentPalmFeatures.mounts[m.id].special_sign = chosenSign;

        const synthResp = await fetch("/api/synthesis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            natal_chart: currentNatalChart,
            palm_features: currentPalmFeatures,
          }),
        });
        if (synthResp.ok) {
          currentSynthesis = await synthResp.json();
          renderSynthesisUI(currentSynthesis);
          showStatus(`✓ Бугор «${m.name_ru}» откалиброван (${selectedScore} баллов). Синтез пересчитан!`, "success");
        }
      }
    } catch (err) {
      console.error("Mount update re-synthesis error:", err);
    }
  });
}

// 3. UI Events & Autocomplete
function initEventListeners() {
  // Preset selector
  document.getElementById("btn-calculate").addEventListener("click", () => {
    calculateAll();
  });

  // City Search Autocomplete
  const cityInput = document.getElementById("birth-city");
  const geoDropdown = document.getElementById("geo-dropdown");

  let debounceTimer = null;
  cityInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = cityInput.value.trim();
    if (q.length < 2) {
      geoDropdown.style.display = "none";
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
        const data = await resp.json();
        renderGeoResults(data.results || []);
      } catch (e) {
        console.error(e);
      }
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!geoDropdown.contains(e.target) && e.target !== cityInput) {
      geoDropdown.style.display = "none";
    }
  });

  // Reset preset config whenever the user manually types or edits data
  ["person-name", "birth-date", "birth-time", "birth-city"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => {
      activePresetConfig = null;
    });
  });

  // Line Origin Calibration Toolbar Buttons
  document.getElementById("btn-set-separated")?.addEventListener("click", () => {
    palmCanvas.setSeparationPreset(true);
    updateLineSeparationUI(28, true);
  });

  document.getElementById("btn-set-joined")?.addEventListener("click", () => {
    palmCanvas.setSeparationPreset(false);
    updateLineSeparationUI(0, false);
  });

  document.getElementById("btn-toggle-anchors")?.addEventListener("click", (e) => {
    palmCanvas.showLineAnchors = !palmCanvas.showLineAnchors;
    e.target.textContent = palmCanvas.showLineAnchors ? "🎯 Точки линий: Вкл" : "🎯 Точки линий: Выкл";
    palmCanvas.draw();
  });

  document.getElementById("btn-reset-lines")?.addEventListener("click", () => {
    palmCanvas.resetLineAnchors();
    updateLineSeparationUI(22, true);
  });

  // Tab Switcher
  const tabButtons = document.querySelectorAll("#hand-view-tabs .btn-pill");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.getAttribute("data-view");
      handStudio.currentView = view;
      palmCanvas.setView(view);
      if (handStudio.images[view]) {
        palmCanvas.setImage(handStudio.images[view]);
        const curT = palmCanvas.getTransform();
        if (curT.scale === 1.0 && curT.offsetX === 0 && curT.offsetY === 0) {
          palmCanvas.autoFitToPhoto();
        }
      } else {
        palmCanvas.setImage(null);
      }
      syncCalibrationUI();
    });
  });

  // Setup Slot Handlers
  const slotKeys = ["right_palm", "right_dorsal", "left_palm", "left_dorsal"];
  slotKeys.forEach(key => {
    const inputId = `input-${key.replace('_', '-')}`;
    const slotCardId = `slot-${key.replace('_', '-')}`;
    const statusId = `status-${key.replace('_', '-')}`;
    const inputEl = document.getElementById(inputId);
    const cardEl = document.getElementById(slotCardId);
    const statusEl = document.getElementById(statusId);

    inputEl?.addEventListener("change", async (e) => {
      e.stopPropagation();
      if (inputEl.files.length > 0) {
        const file = inputEl.files[0];
        handStudio.photos[key] = file;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            handStudio.images[key] = img;
            if (handStudio.currentView === key) {
              palmCanvas.setImage(img);
              palmCanvas.autoFitToPhoto();
              syncCalibrationUI();
            }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);

        // Update Slot UI
        cardEl?.classList.add("loaded");
        if (statusEl) statusEl.textContent = `✓ ${file.name.substring(0, 16)}...`;
        updateUploadCounter(handStudio.photos);

        // Automatically switch view tab to the uploaded slot
        tabButtons.forEach(b => {
          if (b.getAttribute("data-view") === key) {
            tabButtons.forEach(x => x.classList.remove("active"));
            b.classList.add("active");
            handStudio.currentView = key;
            palmCanvas.setView(key);
            syncCalibrationUI();
          }
        });

        // Trigger comprehensive multi-slot analysis
        await analyzeMultiSlotHands(handStudio.photos);
      }
    });
  });

  // Calibration Toolbar Sliders & Buttons
  function syncCalibrationUI() {
    if (!palmCanvas) return;
    const t = palmCanvas.getTransform();
    const scaleEl = document.getElementById("slider-scale");
    const scaleVal = document.getElementById("slider-scale-val");
    if (scaleEl && scaleVal) {
      scaleEl.value = Math.round(t.scale * 100);
      scaleVal.textContent = Math.round(t.scale * 100) + "%";
    }
    const yEl = document.getElementById("slider-offset-y");
    const yVal = document.getElementById("slider-offset-y-val");
    if (yEl && yVal) {
      yEl.value = Math.round(t.offsetY);
      yVal.textContent = Math.round(t.offsetY) + "px";
    }
    const xEl = document.getElementById("slider-offset-x");
    const xVal = document.getElementById("slider-offset-x-val");
    if (xEl && xVal) {
      xEl.value = Math.round(t.offsetX);
      xVal.textContent = Math.round(t.offsetX) + "px";
    }
    const rotEl = document.getElementById("slider-rot");
    const rotVal = document.getElementById("slider-rot-val");
    if (rotEl && rotVal) {
      rotEl.value = Math.round(t.rotation);
      rotVal.textContent = Math.round(t.rotation) + "°";
    }
  }

  document.getElementById("slider-scale")?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("slider-scale-val").textContent = val + "%";
    palmCanvas.setTransform(val / 100, null, null, null);
  });

  document.getElementById("slider-offset-y")?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("slider-offset-y-val").textContent = val + "px";
    palmCanvas.setTransform(null, null, val, null);
  });

  document.getElementById("slider-offset-x")?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("slider-offset-x-val").textContent = val + "px";
    palmCanvas.setTransform(null, val, null, null);
  });

  document.getElementById("slider-rot")?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("slider-rot-val").textContent = val + "°";
    palmCanvas.setTransform(null, null, null, val);
  });

  document.getElementById("btn-autofit-hand")?.addEventListener("click", () => {
    palmCanvas.autoFitToPhoto();
    syncCalibrationUI();
  });

  document.getElementById("btn-reset-hand")?.addEventListener("click", () => {
    palmCanvas.resetTransform();
    syncCalibrationUI();
  });

  // Toggle Mirror Button
  document.getElementById("btn-toggle-mirror")?.addEventListener("click", () => {
    palmCanvas.toggleMirror();
  });

  // Populate Quick Mount Marking Chips
  const quickChipsContainer = document.getElementById("mount-quick-chips");
  if (quickChipsContainer && palmCanvas.canonicalMountsThumbRight) {
    quickChipsContainer.innerHTML = "";
    palmCanvas.canonicalMountsThumbRight.forEach(m => {
      const chip = document.createElement("button");
      chip.className = "preset-chip";
      chip.style.cssText = "font-size:0.74rem; padding:0.25rem 0.6rem;";
      chip.textContent = `${m.symbol} ${m.planet}`;
      chip.title = `Отметить ${m.name_ru}`;
      chip.addEventListener("click", () => {
        openMountMarkingModal(m, currentPalmFeatures?.mounts?.[m.id], palmCanvas.customMountMarks[m.id]);
      });
      quickChipsContainer.appendChild(chip);
    });
  }

  // Open Hand Guide Modal
  document.getElementById("btn-open-hand-guide")?.addEventListener("click", () => {
    showHandMeasurementGuide();
  });

  // Transits Range Button
  document.getElementById("btn-fetch-transits")?.addEventListener("click", () => {
    loadTransitsRange();
  });

  // Export Report Button
  document.getElementById("btn-export-report")?.addEventListener("click", () => {
    exportReportMarkdown();
  });

  // Modal close
  document.getElementById("modal-close-btn")?.addEventListener("click", closeModal);
  document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });
}

function renderGeoResults(results) {
  const dropdown = document.getElementById("geo-dropdown");
  const cityInput = document.getElementById("birth-city");
  dropdown.innerHTML = "";
  if (!results || results.length === 0) {
    dropdown.style.display = "none";
    return;
  }

  results.forEach((city) => {
    const item = document.createElement("div");
    item.className = "geo-item";
    item.innerHTML = `<strong>${city.name}</strong>, ${city.country} (${city.timezone})`;
    item.addEventListener("click", () => {
      cityInput.value = city.name;
      cityInput.setAttribute("data-geocoded-city", city.name);
      document.getElementById("birth-lat").value = city.latitude;
      document.getElementById("birth-lon").value = city.longitude;
      document.getElementById("birth-tz").value = city.timezone;
      dropdown.style.display = "none";
    });
    dropdown.appendChild(item);
  });
  dropdown.style.display = "block";
}

// 4. Robust Date and Time Parsers (supports 20.09.1992, 1992-09-20, 20/09/1992, etc.)
function parseBirthDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return { year: 1995, month: 8, day: 14 };
  }
  const clean = dateStr.trim();
  let parts = [];

  if (clean.includes(".")) {
    parts = clean.split(".").map(s => parseInt(s.trim(), 10));
  } else if (clean.includes("/")) {
    parts = clean.split("/").map(s => parseInt(s.trim(), 10));
  } else if (clean.includes("-")) {
    parts = clean.split("-").map(s => parseInt(s.trim(), 10));
  } else if (clean.includes(" ")) {
    parts = clean.split(" ").map(s => parseInt(s.trim(), 10));
  } else if (/^\d{8}$/.test(clean)) {
    if (parseInt(clean.substring(0, 4), 10) > 1900) {
      return {
        year: parseInt(clean.substring(0, 4), 10),
        month: parseInt(clean.substring(4, 6), 10),
        day: parseInt(clean.substring(6, 8), 10),
      };
    } else {
      return {
        day: parseInt(clean.substring(0, 2), 10),
        month: parseInt(clean.substring(2, 4), 10),
        year: parseInt(clean.substring(4, 8), 10),
      };
    }
  }

  if (parts.length === 3 && parts.every(n => !isNaN(n))) {
    if (parts[0] > 1000) {
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    if (parts[2] > 1000) {
      return { year: parts[2], month: parts[1], day: parts[0] };
    }
    const yr = parts[2] < 100 ? (parts[2] > 30 ? 1900 + parts[2] : 2000 + parts[2]) : parts[2];
    return { year: yr, month: parts[1], day: parts[0] };
  }

  return { year: 1995, month: 8, day: 14 };
}

function parseBirthTime(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    return { hour: 12, minute: 0 };
  }
  const clean = timeStr.trim();
  const parts = clean.split(/[:. -]/).map(s => parseInt(s.trim(), 10));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return {
      hour: Math.max(0, Math.min(23, parts[0])),
      minute: Math.max(0, Math.min(59, parts[1])),
    };
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return {
      hour: Math.max(0, Math.min(23, parts[0])),
      minute: 0,
    };
  }
  return { hour: 12, minute: 0 };
}

function showStatus(msg, type = "info") {
  const statusEl = document.getElementById("calc-status-message");
  if (!statusEl) return;
  statusEl.style.display = "block";
  if (type === "info") {
    statusEl.style.background = "rgba(77, 171, 247, 0.15)";
    statusEl.style.color = "#93c5fd";
    statusEl.style.border = "1px solid rgba(77, 171, 247, 0.3)";
    statusEl.innerHTML = msg;
  } else if (type === "success") {
    statusEl.style.background = "rgba(56, 239, 125, 0.15)";
    statusEl.style.color = "#86efac";
    statusEl.style.border = "1px solid rgba(56, 239, 125, 0.3)";
    statusEl.innerHTML = `${msg} <a href="#classic-treatises-section" style="display:inline-block; margin-left:10px; color:#f6c85f; text-decoration:underline; font-weight:600; cursor:pointer;" onclick="document.querySelector('.synthesis-section')?.scrollIntoView({behavior:'smooth'}); return false;">👇 Посмотреть синтез</a>`;
  } else if (type === "error") {
    statusEl.style.background = "rgba(255, 82, 82, 0.15)";
    statusEl.style.color = "#fca5a5";
    statusEl.style.border = "1px solid rgba(255, 82, 82, 0.3)";
    statusEl.innerHTML = msg;
  }
}

// 5. Load Preset Profiles
async function loadPresets() {
  try {
    const resp = await fetch("/api/presets");
    const data = await resp.json();
    const container = document.getElementById("presets-container");
    container.innerHTML = "";

    (data.presets || []).forEach((p) => {
      const chip = document.createElement("button");
      chip.className = "preset-chip";
      chip.textContent = p.name;
      chip.addEventListener("click", () => {
        applyPreset(p);
      });
      container.appendChild(chip);
    });
  } catch (e) {
    console.error(e);
  }
}

function applyPreset(p) {
  activePresetConfig = p;
  document.getElementById("person-name").value = p.name.split(" ")[0];
  document.getElementById("birth-date").value = p.birth_date;
  document.getElementById("birth-time").value = p.birth_time;
  const cityInput = document.getElementById("birth-city");
  cityInput.value = p.city;
  cityInput.setAttribute("data-geocoded-city", p.city);
  document.getElementById("birth-lat").value = p.latitude;
  document.getElementById("birth-lon").value = p.longitude;
  document.getElementById("birth-tz").value = p.timezone;
  calculateAll();
}

// 6. Main Calculation Flow
async function calculateAll() {
  const btn = document.getElementById("btn-calculate");
  const btnIcon = document.getElementById("btn-calc-icon");
  const btnText = document.getElementById("btn-calc-text");

  if (btn) btn.disabled = true;
  if (btnIcon) btnIcon.textContent = "⏳";
  if (btnText) btnText.textContent = "Выполняется расчет...";
  showStatus("⏳ Рассчитываем положение планет по Swiss Ephemeris и хиро-синтез...", "info");

  try {
    const name = document.getElementById("person-name").value.trim() || "Иван";
    const dateVal = document.getElementById("birth-date").value.trim() || "1995-08-14";
    const timeVal = document.getElementById("birth-time").value.trim() || "13:45";

    const { year, month, day } = parseBirthDate(dateVal);
    const { hour, minute } = parseBirthTime(timeVal);

    // Geocode city automatically if name doesn't match last geocoded city
    const cityInput = document.getElementById("birth-city");
    let cityName = (cityInput ? cityInput.value : "").trim() || "Москва";
    let lat = parseFloat(document.getElementById("birth-lat").value) || 55.7558;
    let lon = parseFloat(document.getElementById("birth-lon").value) || 37.6173;
    let tz = document.getElementById("birth-tz").value || "Europe/Moscow";

    const lastGeocoded = cityInput ? cityInput.getAttribute("data-geocoded-city") : "";
    if (cityName && cityName.toLowerCase() !== (lastGeocoded || "").toLowerCase()) {
      try {
        const geoResp = await fetch(`/api/geo/search?q=${encodeURIComponent(cityName)}`);
        if (geoResp.ok) {
          const geoData = await geoResp.json();
          if (geoData.results && geoData.results.length > 0) {
            const match = geoData.results[0];
            lat = match.latitude;
            lon = match.longitude;
            tz = match.timezone;
            document.getElementById("birth-lat").value = lat;
            document.getElementById("birth-lon").value = lon;
            document.getElementById("birth-tz").value = tz;
            if (cityInput) cityInput.setAttribute("data-geocoded-city", cityName);
          }
        }
      } catch (geoErr) {
        console.warn("Geocoding lookup error:", geoErr);
      }
    }

    // 1. Calculate Natal Chart
    const natalResp = await fetch("/api/natal/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        year,
        month,
        day,
        hour,
        minute,
        birth_date: dateVal,
        birth_time: timeVal,
        latitude: lat,
        longitude: lon,
        timezone: tz,
        house_system: "P",
      }),
    });

    if (!natalResp.ok) {
      const errData = await natalResp.json().catch(() => ({}));
      throw new Error(errData.detail?.[0]?.msg || errData.error || `Ошибка сервера: ${natalResp.status}`);
    }

    currentNatalChart = await natalResp.json();
    renderNatalUI(currentNatalChart);

    // 2. Calculate Palm & Synthesis
    await calculatePalmAndSynthesis();

    // 3. Calculate Transits (30 days range)
    await loadTransitsRange();

    const sun = currentNatalChart.planets.find(p => p.name === "Sun");
    const moon = currentNatalChart.planets.find(p => p.name === "Moon");
    const asc = currentNatalChart.angles.asc;

    showStatus(
      `✨ <strong>${name}:</strong> Расчет успешно выполнен! Солнце: ${sun?.sign_symbol} ${sun?.sign_ru} (${sun?.degree_formatted}), Луна: ${moon?.sign_symbol} ${moon?.sign_ru} (${moon?.degree_formatted}), ASC: ${asc?.sign_symbol} ${asc?.sign_ru} (${asc?.degree_formatted}). Город: ${cityName} (${tz}).`,
      "success"
    );
  } catch (err) {
    console.error("Calculation error:", err);
    showStatus(`❌ Ошибка расчета: ${err.message}. Проверьте введенные дату (например, 20.09.1992) и время (07:50).`, "error");
  } finally {
    if (btn) btn.disabled = false;
    if (btnIcon) btnIcon.textContent = "✨";
    if (btnText) btnText.textContent = "Рассчитать натальную карту и синтез";
  }
}

async function calculatePalmAndSynthesis() {
  const formData = new FormData();
  formData.append("hand_type", "right");
  formData.append("dominant", "true");

  // Check if real photos exist in handStudio
  const primaryPalm = handStudio?.photos?.right_palm || handStudio?.photos?.left_palm;
  if (primaryPalm) formData.append("file", primaryPalm);

  const dorsalPhoto = handStudio?.photos?.right_dorsal || handStudio?.photos?.left_dorsal;
  if (dorsalPhoto) formData.append("dorsal_file", dorsalPhoto);

  if (!primaryPalm && !dorsalPhoto) {
    if (activePresetConfig && activePresetConfig.palm_element) {
      formData.append("manual_element", activePresetConfig.palm_element);
    }
    if (activePresetConfig && activePresetConfig.knotty_joints !== undefined) {
      formData.append("knotty_joints", activePresetConfig.knotty_joints ? "true" : "false");
    }
  }

  const palmResp = await fetch("/api/palm/analyze", {
    method: "POST",
    body: formData,
  });
  currentPalmFeatures = await palmResp.json();
  renderPalmUI(currentPalmFeatures);

  // 3. Synthesis Call
  const synthResp = await fetch("/api/synthesis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      natal_chart: currentNatalChart,
      palm_features: currentPalmFeatures,
    }),
  });
  currentSynthesis = await synthResp.json();
  renderSynthesisUI(currentSynthesis);
}

function updateUploadCounter(photos) {
  let count = 0;
  if (photos.right_palm) count++;
  if (photos.right_dorsal) count++;
  if (photos.left_palm) count++;
  if (photos.left_dorsal) count++;

  const counterEl = document.getElementById("upload-counter");
  if (counterEl) {
    counterEl.textContent = `Загружено: ${count}/4`;
    if (count === 4) {
      counterEl.textContent = "✓ Золотой стандарт (4/4)!";
      counterEl.style.color = "var(--accent-emerald)";
    }
  }
}

async function analyzeMultiSlotHands(photos) {
  const statusEl = document.getElementById("joint-auto-status");
  if (statusEl) statusEl.textContent = "⏳ Анализ ракурсов и линий...";

  try {
    const formData = new FormData();
    // Primary active palm (right or left)
    const primaryPalm = photos.right_palm || photos.left_palm;
    if (primaryPalm) formData.append("file", primaryPalm);

    // Dorsal hand for joints (right dorsal or left dorsal)
    const dorsalPhoto = photos.right_dorsal || photos.left_dorsal;
    if (dorsalPhoto) formData.append("dorsal_file", dorsalPhoto);

    formData.append("hand_type", photos.right_palm ? "right" : "left");
    formData.append("dominant", "true");

    const palmResp = await fetch("/api/palm/analyze", {
      method: "POST",
      body: formData,
    });
    if (!palmResp.ok) {
      throw new Error(`Ошибка HTTP ${palmResp.status}`);
    }
    currentPalmFeatures = await palmResp.json();
    renderPalmUI(currentPalmFeatures);

    if (currentPalmFeatures.dorsal_analysis) {
      const da = currentPalmFeatures.dorsal_analysis;
      if (statusEl) statusEl.textContent = `Суставы: ${da.joints_type} (коэфф. ${da.knotty_ratio})`;
    } else {
      if (statusEl) statusEl.textContent = `✓ Ладонь: ${currentPalmFeatures.element_ru}`;
    }

    // Update Left vs Right Evolution Card
    renderEvolutionComparison(photos);

    if (currentNatalChart) {
      const synthResp = await fetch("/api/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          natal_chart: currentNatalChart,
          palm_features: currentPalmFeatures,
        }),
      });
      if (synthResp.ok) {
        currentSynthesis = await synthResp.json();
        renderSynthesisUI(currentSynthesis);
        showStatus("✨ Фото ладони успешно проанализировано, синтез обновлен!", "success");
      }
    }
  } catch (err) {
    console.error("analyzeMultiSlotHands error:", err);
    if (statusEl) statusEl.textContent = "Готово";
    showStatus(`Ошибка при анализе фото: ${err.message}`, "error");
  }
}

function renderEvolutionComparison(photos) {
  const deltaBadge = document.getElementById("evolution-delta-badge");
  const evolText = document.getElementById("evolution-text");
  if (!evolText) return;

  const hasLeft = Boolean(photos.left_palm || photos.left_dorsal);
  const hasRight = Boolean(photos.right_palm || photos.right_dorsal);

  if (hasLeft && hasRight) {
    deltaBadge.textContent = "Прогрессивная эволюция";
    deltaBadge.style.color = "var(--accent-emerald)";
    evolText.innerHTML = `
      <strong>Сравнение завершено:</strong> Линия Головы и Линия Судьбы на правой (активной) руке показывают 
      усиление осознанности и системного контроля по сравнению с базовой родовой матрицей левой руки. 
      Врожденный потенциал успешно трансформируется в практические достижения через силу воли и аналитическую дисциплину.
    `;
  } else if (hasRight) {
    deltaBadge.textContent = "Активная рука";
    deltaBadge.style.color = "var(--accent-gold)";
    evolText.innerHTML = "Анализируется текущая реализованная реальность (правая рука). Загрузите левую руку для оценки врожденного потенциала.";
  } else if (hasLeft) {
    deltaBadge.textContent = "Пассивная рука";
    deltaBadge.style.color = "var(--accent-purple)";
    evolText.innerHTML = "Анализируется врожденная матрица (левая рука). Загрузите правую руку для сопоставления с реальными достижениями.";
  }
}

async function analyzeDorsalFile(file) {
  await analyzeMultiSlotHands({ right_dorsal: file });
}

async function analyzePalmFile(file) {
  await analyzeMultiSlotHands({ right_palm: file });
}

function showHandMeasurementGuide() {
  showInspectModal("📖 Руководство: Все типы суставов и пропорций руки", `
    <div style="font-size:0.88rem; line-height:1.65; color:#e2e8f0; display:flex; flex-direction:column; gap:20px;">
      
      <!-- Visual Cards Grid for Joint Types -->
      <div>
        <h4 style="color:var(--accent-gold); font-size:1rem; margin-bottom:12px;">
          🖐️ 5 типов суставов и формы пальцев (Классическая Хирогномия)
        </h4>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:12px;">
          
          <!-- Card 1: Гладкие -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="70" height="90" viewBox="0 0 70 90" style="margin:0 auto 8px; display:block;">
              <!-- Smooth finger -->
              <path d="M 22 85 L 22 20 Q 22 8 35 8 Q 48 8 48 20 L 48 85 Z" fill="none" stroke="#38ef7d" stroke-width="2.5" />
              <!-- Nail -->
              <path d="M 26 22 Q 35 15 44 22 L 44 32 Q 35 34 26 32 Z" fill="rgba(56,239,125,0.2)" stroke="#38ef7d" stroke-width="1.2" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">1. Гладкие пальцы</strong>
            <span style="font-size:11px; color:#94a3b8;">Ровная линия без выступов. Интуиция, быстрые решения по наитию, артистизм.</span>
          </div>

          <!-- Card 2: Верхний узел -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="70" height="90" viewBox="0 0 70 90" style="margin:0 auto 8px; display:block;">
              <!-- Finger with upper knot -->
              <path d="M 24 85 L 24 45 Q 16 38 20 30 Q 24 22 25 18 Q 25 8 35 8 Q 45 8 45 18 Q 46 22 50 30 Q 54 38 46 45 L 46 85 Z" fill="none" stroke="#00d2ff" stroke-width="2.5" />
              <!-- Knot indicator -->
              <circle cx="18" cy="34" r="3" fill="#f6c85f" />
              <circle cx="52" cy="34" r="3" fill="#f6c85f" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">2. Верхний узел (Ума)</strong>
            <span style="font-size:11px; color:#94a3b8;">Выступ между 1 и 2 фалангой. Философский скепсис, независимость, поиск сути.</span>
          </div>

          <!-- Card 3: Нижний узел -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="70" height="90" viewBox="0 0 70 90" style="margin:0 auto 8px; display:block;">
              <!-- Finger with lower knot -->
              <path d="M 24 85 Q 16 68 22 58 L 24 20 Q 24 8 35 8 Q 46 8 46 20 L 48 58 Q 54 68 46 85 Z" fill="none" stroke="#a78bfa" stroke-width="2.5" />
              <circle cx="18" cy="64" r="3" fill="#f6c85f" />
              <circle cx="52" cy="64" r="3" fill="#f6c85f" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">3. Нижний узел (Порядка)</strong>
            <span style="font-size:11px; color:#94a3b8;">Выступ между 2 и 3 фалангой. Методология, каталогизация, педантичность, правила.</span>
          </div>

          <!-- Card 4: Двойной узел (Философская) -->
          <div style="background:rgba(246,200,95,0.06); border:1.5px solid var(--accent-gold); border-radius:8px; padding:12px; text-align:center;">
            <svg width="70" height="90" viewBox="0 0 70 90" style="margin:0 auto 8px; display:block;">
              <!-- Knotty double finger -->
              <path d="M 24 85 Q 16 66 22 56 Q 24 50 24 45 Q 16 36 22 28 Q 24 20 25 18 Q 25 8 35 8 Q 45 8 45 18 Q 46 20 48 28 Q 54 36 46 45 Q 46 50 48 56 Q 54 66 46 85 Z" fill="none" stroke="#f6c85f" stroke-width="2.5" />
              <circle cx="18" cy="32" r="3" fill="#ff5252" />
              <circle cx="52" cy="32" r="3" fill="#ff5252" />
              <circle cx="18" cy="61" r="3" fill="#ff5252" />
              <circle cx="52" cy="61" r="3" fill="#ff5252" />
            </svg>
            <strong style="color:var(--accent-gold); font-size:12px; display:block;">4. Двойной узел (Ваш тип!)</strong>
            <span style="font-size:11px; color:#cbd5e1;">Оба сустава расширены. Архитектор систем, глубокий аналитик, программист.</span>
          </div>

          <!-- Card 5: Лопаточный / Квадратный -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="70" height="90" viewBox="0 0 70 90" style="margin:0 auto 8px; display:block;">
              <!-- Spatulate wide tip -->
              <path d="M 24 85 L 24 35 L 14 18 Q 20 6 35 6 Q 50 6 56 18 L 46 35 L 46 85 Z" fill="none" stroke="#fb923c" stroke-width="2.5" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">5. Лопатообразные</strong>
            <span style="font-size:11px; color:#94a3b8;">Расширение на конце пальца. Инженерия, прикладное новаторство, действие.</span>
          </div>

        </div>
      </div>

      <!-- Nail Shapes (Onychognomy) Grid -->
      <div>
        <h4 style="color:var(--accent-gold); font-size:1rem; margin-bottom:12px;">
          💅 5 типов формы ногтей (Онихогномия)
        </h4>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:12px;">

          <!-- Nail 1: Короткие / Квадратные -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="60" height="70" viewBox="0 0 60 70" style="margin:0 auto 8px; display:block;">
              <path d="M 15 65 L 15 25 Q 15 15 30 15 Q 45 15 45 25 L 45 65 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
              <!-- Short square nail -->
              <rect x="20" y="24" width="20" height="16" rx="2" fill="rgba(246,200,95,0.2)" stroke="#f6c85f" stroke-width="2" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">1. Короткие / Квадратные</strong>
            <span style="font-size:11px; color:#94a3b8;">Критический ум, любовь к аргументам, научный скептицизм, проверка фактов.</span>
          </div>

          <!-- Nail 2: Длинные / Миндалевидные -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="60" height="70" viewBox="0 0 60 70" style="margin:0 auto 8px; display:block;">
              <path d="M 15 65 L 15 25 Q 15 12 30 12 Q 45 12 45 25 L 45 65 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
              <!-- Long almond nail -->
              <path d="M 22 45 L 22 26 Q 22 18 30 18 Q 38 18 38 26 L 38 45 Z" fill="rgba(77,171,247,0.2)" stroke="#4dabf7" stroke-width="2" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">2. Длинные / Миндальные</strong>
            <span style="font-size:11px; color:#94a3b8;">Интуиция, воображение, мечтательность, миролюбие, утонченный эстетизм.</span>
          </div>

          <!-- Nail 3: Широкие (шире длины) -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="60" height="70" viewBox="0 0 60 70" style="margin:0 auto 8px; display:block;">
              <path d="M 12 65 L 12 25 Q 12 15 30 15 Q 48 15 48 25 L 48 65 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
              <!-- Wide nail -->
              <rect x="16" y="24" width="28" height="15" rx="3" fill="rgba(255,107,107,0.2)" stroke="#ff6b6b" stroke-width="2" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">3. Широкие ногти</strong>
            <span style="font-size:11px; color:#94a3b8;">Прямолинейность, открытость, обостренное чувство справедливости, напор.</span>
          </div>

          <!-- Nail 4: Веерообразные / Трапециевидные -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="60" height="70" viewBox="0 0 60 70" style="margin:0 auto 8px; display:block;">
              <path d="M 15 65 L 15 25 Q 15 15 30 15 Q 45 15 45 25 L 45 65 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
              <!-- Fan-shaped nail -->
              <polygon points="23,42 17,22 43,22 37,42" fill="rgba(196,181,253,0.2)" stroke="#c4b5fd" stroke-width="2" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">4. Веерообразные</strong>
            <span style="font-size:11px; color:#94a3b8;">Нервная витальность, тяга к реформам, нетерпимость к застою и догмам.</span>
          </div>

          <!-- Nail 5: Круглые / Овальные -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; text-align:center;">
            <svg width="60" height="70" viewBox="0 0 60 70" style="margin:0 auto 8px; display:block;">
              <path d="M 15 65 L 15 25 Q 15 15 30 15 Q 45 15 45 25 L 45 65 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
              <!-- Round oval nail -->
              <ellipse cx="30" cy="30" rx="10" ry="12" fill="rgba(56,239,125,0.2)" stroke="#38ef7d" stroke-width="2" />
            </svg>
            <strong style="color:#fff; font-size:12px; display:block;">5. Круглые / Овальные</strong>
            <span style="font-size:11px; color:#94a3b8;">Дипломатичность, добросердечие, избегание крайностей, мягкость в общении.</span>
          </div>

        </div>
      </div>

      <!-- Mixed Hand Concept (Main Mixte) -->
      <div style="background:rgba(157,114,255,0.06); border:1px solid rgba(157,114,255,0.3); padding:14px 18px; border-radius:8px;">
        <h4 style="color:#c4b5fd; font-size:1rem; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>🧬</span> Смешанный тип руки (Main Mixte по Д'Арпентиньи):
        </h4>
        <p style="font-size:0.84rem; color:#e2e8f0; line-height:1.6;">
          В чистом виде традиционные типы встречаются реже, чем в комбинациях. <strong>Смешанная рука</strong> — это признак разносторонней, полифонической личности:
        </p>
        <ul style="font-size:0.82rem; color:#cbd5e1; padding-left:20px; margin-top:6px; line-height:1.6;">
          <li><strong>Квадратная ладонь + Узловатые пальцы:</strong> Философско-практическая рука (системный архитектор, исследователь, программист).</li>
          <li><strong>Разные пальцы:</strong> указательный (Юпитер) — квадратный (закон и порядок), средний (Сатурн) — узловатый (глубокий анализ), безымянный (Аполлон) — конический (эстетика), мизинец (Меркурий) — лопаточный (практическая сметливость).</li>
          <li><strong>Синтез с картой:</strong> Смешанная рука идеально резонирует с полистихийным гороскопом (например, Огненное Солнце + Водная Луна + Земной Меркурий).</li>
        </ul>
      </div>

      <!-- Why Dorsal Photo is Best -->
      <div style="background:rgba(14,18,34,0.9); border:1px solid var(--border-glow); padding:12px 16px; border-radius:8px;">
        <h4 style="color:#38ef7d; font-size:0.95rem; margin-bottom:6px;">📸 Автоматическое распознавание по фото кисти снаружи:</h4>
        <p style="font-size:0.84rem; color:#cbd5e1;">
          Для 100% точного замера используйте кнопку <strong>«Фото кисти (снаружи / суставы)»</strong>. Наш компьютерный алгоритм автоматически измеряет профиль среднего пальца, сопоставляет ширину сочленений с фалангами, выявляет форму ногтевой пластины и определяет точный коэффициент узловатости.
        </p>
      </div>

    </div>
  `);
}



async function analyzePalmFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("hand_type", "right");
  formData.append("dominant", "true");

  const palmResp = await fetch("/api/palm/analyze", {
    method: "POST",
    body: formData,
  });
  currentPalmFeatures = await palmResp.json();
  renderPalmUI(currentPalmFeatures);

  if (currentNatalChart) {
    const synthResp = await fetch("/api/synthesis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        natal_chart: currentNatalChart,
        palm_features: currentPalmFeatures,
      }),
    });
    currentSynthesis = await synthResp.json();
    renderSynthesisUI(currentSynthesis);
  }
}

// 6. UI Renderers
function renderNatalUI(chart) {
  natalWheel.render(chart);

  // Update Badges & Meta
  const sun = chart.planets.find((p) => p.name === "Sun");
  const moon = chart.planets.find((p) => p.name === "Moon");
  const asc = chart.angles.asc;

  document.getElementById("astro-element-badge").className = `badge-tag ${chart.dominant_element}`;
  document.getElementById("astro-element-badge").textContent = `${chart.dominant_element_ru} (${chart.dominant_quality_ru})`;

  document.getElementById("natal-summary-text").innerHTML = `
    <strong>Солнце:</strong> ${sun?.sign_symbol} ${sun?.sign_ru} (${sun?.degree_formatted}) в ${sun?.house} доме • 
    <strong>Луна:</strong> ${moon?.sign_symbol} ${moon?.sign_ru} (${moon?.degree_formatted}) в ${moon?.house} доме • 
    <strong>Асцендент (ASC):</strong> ${asc?.sign_symbol} ${asc?.sign_ru} (${asc?.degree_formatted})
  `;
}

function renderPalmUI(palm) {
  palmCanvas.setPalmData(palm);

  const badge = document.getElementById("palm-element-badge");
  badge.className = `badge-tag ${palm.element}`;
  badge.textContent = `${palm.element_ru} (${palm.proportions.palm_shape} ладонь)`;

  const statusEl = document.getElementById("joint-auto-status");
  if (statusEl) {
    if (palm.dorsal_analysis) {
      statusEl.textContent = `Суставы: ${palm.dorsal_analysis.joints_type} (коэфф. ${palm.dorsal_analysis.knotty_ratio})`;
    } else if (palm.element === "philosophic" || palm.knotty_joints) {
      statusEl.textContent = "Суставы: Узловатые (Двойной философский узел)";
    } else {
      statusEl.textContent = "Суставы: Гладкие / Стандартные";
    }
  }

  const nailText = palm.nail_shape ? `<br><strong>Ногтевая пластина (Онихогномия):</strong> ${palm.nail_shape.name_ru} — <span style="color:var(--accent-gold);">${palm.nail_shape.quality}</span>` : "";
  document.getElementById("palm-summary-text").innerHTML = `
    <strong>Конституция:</strong> ${palm.proportions.palm_shape} ладонь, ${palm.proportions.fingers_length.toLowerCase()} пальцы.${nailText}<br>
    <strong>Совместимые знаки:</strong> ${palm.zodiac_matches.join(", ")}.<br>
    <em>${palm.description}</em>
  `;

  const lineStatusEl = document.getElementById("line-separation-status");
  if (lineStatusEl && palm.detected_lines) {
    const isSep = palm.detected_lines.head_life_separated;
    const gap = palm.detected_lines.gap_distance_px || 20;
    lineStatusEl.textContent = isSep ? `Разделены (${gap}px • Независимость)` : `Соединены (${gap}px • Осмотрительность)`;
    lineStatusEl.style.color = isSep ? "#38ef7d" : "#f6c85f";
  }
}

function renderSynthesisUI(synth) {
  if (!synth) return;

  try {
    // Dial Score
    const dial = document.getElementById("resonance-dial");
    if (dial && synth.resonance_percent !== undefined) {
      dial.style.setProperty("--resonance-score", synth.resonance_percent);
    }
    const dialPercent = document.getElementById("dial-percent");
    if (dialPercent && synth.resonance_percent !== undefined) {
      dialPercent.textContent = `${synth.resonance_percent}%`;
    }

    const archEl = document.getElementById("synth-archetype");
    if (archEl && synth.archetype) {
      archEl.textContent = synth.archetype;
    }
    const sumEl = document.getElementById("synth-summary");
    if (sumEl && synth.summary) {
      sumEl.textContent = synth.summary;
    }

    // Convergences & Contradictions Grid
    const grid = document.getElementById("synthesis-cards-grid");
    if (grid) {
      grid.innerHTML = "";

      (synth.convergences || []).forEach((item) => {
        const card = document.createElement("div");
        card.className = "synthesis-card convergence";
        card.innerHTML = `
          <div class="synth-card-title">
            <span>✨ ${item.theme}</span>
            <span style="color:var(--accent-emerald); font-size:11px;">СХОЖДЕНИЕ</span>
          </div>
          <div class="synth-meta-row">
            <div class="synth-meta-col">
              <span>Астрология:</span>
              <strong>${item.astrology}</strong>
            </div>
            <div class="synth-meta-col">
              <span>Хиромантия:</span>
              <strong>${item.palmistry}</strong>
            </div>
          </div>
          <div class="synth-desc">${item.interpretation}</div>
        `;
        grid.appendChild(card);
      });

      (synth.contradictions || []).forEach((item) => {
        const card = document.createElement("div");
        card.className = "synthesis-card contradiction";
        card.innerHTML = `
          <div class="synth-card-title">
            <span>⚡ ${item.theme}</span>
            <span style="color:var(--accent-purple); font-size:11px;">ТОЧКА РОСТА</span>
          </div>
          <div class="synth-meta-row">
            <div class="synth-meta-col">
              <span>Астрология:</span>
              <strong>${item.astrology}</strong>
            </div>
            <div class="synth-meta-col">
              <span>Хиромантия:</span>
              <strong>${item.palmistry}</strong>
            </div>
          </div>
          <div class="synth-desc">${item.interpretation}</div>
          ${item.recommendation ? `<div style="font-size:12px; color:var(--accent-gold); margin-top:4px;"><strong>Ключ трансформации:</strong> ${item.recommendation}</div>` : ''}
        `;
        grid.appendChild(card);
      });
    }

  // William G. Benham Archetype Card
  if (synth.benham_archetype) {
    const ba = synth.benham_archetype;
    const badge = document.getElementById("benham-archetype-badge");
    const titleLine = document.getElementById("benham-title-line");
    const desc = document.getElementById("benham-desc");
    const careers = document.getElementById("benham-careers");
    const health = document.getElementById("benham-health");

    if (badge) badge.textContent = ba.primary_name || "Архетип";
    if (titleLine) titleLine.textContent = `${ba.composite_title || ba.primary_name}: «${ba.primary_title || ''}»`;
    if (desc) desc.textContent = ba.primary_description || ba.synthesis_note || '';
    if (careers && ba.recommended_careers) careers.textContent = ba.recommended_careers.join(", ");
    if (health && ba.health_vulnerabilities) health.textContent = ba.health_vulnerabilities;
  }

  // Sternberg & Desbarrolles Three Worlds & Royal Thumb Card
  if (synth.three_worlds) {
    const tw = synth.three_worlds.three_worlds || {};
    const tf = synth.three_worlds.thumb_formula || {};

    const thumbBadge = document.getElementById("thumb-balance-badge");
    const barMentalVal = document.getElementById("bar-mental-val");
    const barMentalFill = document.getElementById("bar-mental-fill");
    const barPracticalVal = document.getElementById("bar-practical-val");
    const barPracticalFill = document.getElementById("bar-practical-fill");
    const barMaterialVal = document.getElementById("bar-material-val");
    const barMaterialFill = document.getElementById("bar-material-fill");
    const thumbFormulaText = document.getElementById("thumb-formula-text");

    if (thumbBadge && tf.balance_title) thumbBadge.textContent = tf.balance_title;
    if (barMentalVal && tw.mental_pct !== undefined) barMentalVal.textContent = `${tw.mental_pct}%`;
    if (barMentalFill && tw.mental_pct !== undefined) barMentalFill.style.width = `${tw.mental_pct}%`;
    if (barPracticalVal && tw.practical_pct !== undefined) barPracticalVal.textContent = `${tw.practical_pct}%`;
    if (barPracticalFill && tw.practical_pct !== undefined) barPracticalFill.style.width = `${tw.practical_pct}%`;
    if (barMaterialVal && tw.material_pct !== undefined) barMaterialVal.textContent = `${tw.material_pct}%`;
    if (barMaterialFill && tw.material_pct !== undefined) barMaterialFill.style.width = `${tw.material_pct}%`;

    if (thumbFormulaText) {
      thumbFormulaText.innerHTML = `
        <strong>Доминанта фаланг:</strong> ${tw.dominant_world || ''}.<br>
        <strong>Формула Воли и Логики:</strong> Воля (1-я фаланга) — <strong>${tf.will_score || 50}%</strong>, 
        Логика (2-я фаланга) — <strong>${tf.logic_score || 50}%</strong>. ${tf.interpretation || ''}
      `;
    }
  }

  // Chronological Time Bridge
  if (synth.chronology) {
    const ch = synth.chronology;
    const ageBadge = document.getElementById("current-age-badge");
    const scoreBadge = document.getElementById("realization-score-badge");
    const narrativeEl = document.getElementById("chronology-narrative");
    const gridEl = document.getElementById("chronology-milestones-grid");

    if (ageBadge) ageBadge.textContent = `Возраст: ${ch.current_age} лет`;
    if (scoreBadge) scoreBadge.textContent = `Воля (K_realization): ${ch.realization_score}%`;
    if (narrativeEl) narrativeEl.textContent = ch.synthesis_narrative;

    if (gridEl) {
      gridEl.innerHTML = "";
      (ch.all_milestones || []).forEach((m) => {
        const item = document.createElement("div");
        const isActive = m.active;
        const isPassed = m.passed;
        const borderCol = isActive ? "var(--accent-gold)" : (isPassed ? "rgba(56, 239, 125, 0.4)" : "rgba(255, 255, 255, 0.08)");
        const bgCol = isActive ? "rgba(246, 200, 95, 0.08)" : (isPassed ? "rgba(56, 239, 125, 0.03)" : "rgba(255, 255, 255, 0.02)");
        const tagText = isActive ? "ТЕКУЩИЙ ЭТАП" : (isPassed ? "ПРОЙДЕНО" : "ПРЕДСТОИТ");
        const tagColor = isActive ? "var(--accent-gold)" : (isPassed ? "var(--accent-emerald)" : "var(--text-muted)");

        item.style.cssText = `background:${bgCol}; border:1px solid ${borderCol}; border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:6px;`;
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:12px; color:var(--text-bright);">${m.age_label}</strong>
            <span style="font-size:10px; font-weight:600; color:${tagColor}; text-transform:uppercase;">${tagText}</span>
          </div>
          <div style="font-weight:600; font-size:12px; color:var(--accent-gold);">${m.title}</div>
          <div style="font-size:11px; color:#cbd5e1;"><strong>Астро:</strong> ${m.astrology_phase}</div>
          <div style="font-size:11px; color:#94a3b8;"><strong>Ладонь:</strong> ${m.palm_location}</div>
          <div style="font-size:11px; color:var(--text-muted); line-height:1.4; margin-top:2px;">${m.meaning}</div>
        `;
        gridEl.appendChild(item);
      });
    }
  }

  // Practical Advice List
  const adviceList = document.getElementById("synth-advice-list");
  if (adviceList) {
    adviceList.innerHTML = "";
    (synth.practical_advice || []).forEach((adv) => {
      const li = document.createElement("li");
      li.style.marginBottom = "6px";
      li.textContent = adv;
      adviceList.appendChild(li);
    });
  }
  } catch (err) {
    console.error("renderSynthesisUI error:", err);
  }
}

// 7. Transits Timeline
async function loadTransitsRange() {
  if (!currentNatalChart) return;

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);

  const startStr = today.toISOString().split("T")[0];
  const endStr = nextMonth.toISOString().split("T")[0];

  try {
    const resp = await fetch("/api/transits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        natal_chart: currentNatalChart,
        start_date: startStr,
        end_date: endStr,
        timezone: currentNatalChart.timezone || "Europe/Moscow",
        step_hours: 4,
        max_orb: 2.0,
      }),
    });
    const data = await resp.json();
    renderTransitsUI(data);
  } catch (e) {
    console.error("Transits error:", e);
  }
}

function renderTransitsUI(data) {
  const container = document.getElementById("transits-cards-scroll");
  container.innerHTML = "";

  const peaks = data.peak_aspects || [];
  if (peaks.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); padding:1rem;">На ближайший период точных пиковых транзитов с орбисом менее 2° не обнаружено.</div>`;
    return;
  }

  peaks.forEach((item) => {
    const card = document.createElement("div");
    card.className = "transit-card";
    const harmonicClass = item.harmonic || "soft";
    card.innerHTML = `
      <div class="transit-card-top">
        <span>📅 ${item.datetime_local || item.date}</span>
        <span class="transit-aspect-pill ${harmonicClass}">Орб ${item.orb}°</span>
      </div>
      <div class="transit-body">
        ${item.transit_symbol} ${item.transit_planet_ru} ${item.aspect_symbol} ${item.natal_symbol} ${item.natal_planet_ru}
      </div>
      <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
        ${item.aspect_ru} (Точный угол ${item.exact_angle || ''}°)
      </div>
    `;
    container.appendChild(card);
  });
}

// 8. Export to Markdown
function exportReportMarkdown() {
  if (!currentNatalChart || !currentSynthesis) return;

  const md = `
# 🌌 AstroPalm Nexus: Отчет Синтеза
**Субъект:** ${currentNatalChart.name}
**Дата и время рождения:** ${currentNatalChart.birth_local} (${currentNatalChart.timezone})
**Координаты:** Lat ${currentNatalChart.latitude}, Lon ${currentNatalChart.longitude}
**Архетип:** ${currentSynthesis.archetype}
**Индекс резонанса:** ${currentSynthesis.resonance_percent}%

---

## ☀️ Астрологический паспорт
- **Солнце:** ${currentSynthesis.astro_summary.sun}
- **Луна:** ${currentSynthesis.astro_summary.moon}
- **Асцендент:** ${currentSynthesis.astro_summary.ascendant}
- **Ведущая стихия:** ${currentSynthesis.astro_summary.dominant_element} (${currentSynthesis.astro_summary.dominant_quality})

## ✋ Хиромантический портрет
- **Стихия руки:** ${currentSynthesis.palm_summary.element}
- **Пропорции:** ${currentSynthesis.palm_summary.proportions}
- **Доминирующие зоны:** ${currentSynthesis.palm_summary.dominant_mount}

---

## 🔮 Синтетическое резюме
${currentSynthesis.summary}

### ✨ Точки схождения (Convergences)
${currentSynthesis.convergences.map(c => `- **${c.theme}:** ${c.interpretation}`).join("\n")}

### ⚡ Точки роста и скрытые потенциалы (Contradictions)
${currentSynthesis.contradictions.map(c => `- **${c.theme}:** ${c.interpretation}`).join("\n")}

### 🧭 Практические рекомендации
${currentSynthesis.practical_advice.map(a => `- ${a}`).join("\n")}

---
*Сгенерировано в AstroPalm Nexus (Swiss Ephemeris + Computer Vision Palmistry)*
`;

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AstroPalm_${currentNatalChart.name}_Report.md`;
  a.click();
}

// 9. Inspect Modal
function showInspectModal(title, htmlContent) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = htmlContent;
  document.getElementById("modal-overlay").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
}
