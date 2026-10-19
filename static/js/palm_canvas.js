/**
 * AstroPalm Nexus - Professional Palm & Dorsal Canvas Controller
 * 
 * Anatomically exact projection:
 * - ПРАВАЯ ЛАДОНЬ (Right Palm): Большой палец СПРАВА (анатомический стандарт)
 * - ЛЕВАЯ ЛАДОНЬ (Left Palm): Большой палец СЛЕВА
 * - ПРАВАЯ СНАРУЖИ (Right Dorsal): Тыл кисти, большой палец СЛЕВА
 * - ЛЕВАЯ СНАРУЖИ (Left Dorsal): Тыл кисти, большой палец СПРАВА
 * 
 * Supports interactive mount marking (отметка бугров, знаков и степеней развития),
 * and one-click manual horizontal mirroring toggle.
 */

class PalmCanvas {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.options = Object.assign({
      onSelectFeature: null,
      onMountMarked: null,
    }, options);

    this.palmData = null;
    this.userImage = null;
    this.hoveredFeature = null;
    this.selectedFeature = null;

    // Current active view
    this.currentView = "right_palm";

    // Orientation: 'right' means thumb is on the RIGHT side of the canvas.
    // 'left' means thumb is on the LEFT side of the canvas.
    // Default for right_palm: thumb on the RIGHT.
    this.thumbSide = "right";

    // Canonical mounts when thumb is on the RIGHT (width 400, height 500)
    // Thumb is on right (x ~ 275..360), Pinky is on left (x ~ 60..100)
    this.canonicalMountsThumbRight = [
      { id: "jupiter", name_ru: "Холм Юпитера", planet: "Юпитер", symbol: "♃", x: 270, y: 245, r: 24, color: "#38ef7d", finger: "Указательный палец" },
      { id: "saturn", name_ru: "Холм Сатурна", planet: "Сатурн", symbol: "♄", x: 200, y: 235, r: 23, color: "#9d72ff", finger: "Средний палец" },
      { id: "apollo", name_ru: "Холм Солнца (Аполлона)", planet: "Солнце", symbol: "☉", x: 135, y: 245, r: 23, color: "#f6c85f", finger: "Безымянный палец" },
      { id: "mercury", name_ru: "Холм Меркурия", planet: "Меркурий", symbol: "☿", x: 75, y: 265, r: 20, color: "#00d2ff", finger: "Мизинец" },
      { id: "mars_upper", name_ru: "Верхний Марс (пассивный)", planet: "Марс", symbol: "♂", x: 68, y: 325, r: 22, color: "#ff5252", finger: "Ребро ладони" },
      { id: "moon", name_ru: "Холм Луны (гипотенар)", planet: "Луна", symbol: "☽", x: 95, y: 415, r: 36, color: "#a5b4fc", finger: "Основание ладони" },
      { id: "venus", name_ru: "Холм Венеры (тенар)", planet: "Венера", symbol: "♀", x: 275, y: 385, r: 44, color: "#f472b6", finger: "Большой палец" },
      { id: "mars_lower", name_ru: "Нижний Марс (активный)", planet: "Марс", symbol: "♂", x: 275, y: 310, r: 20, color: "#fb923c", finger: "Основание большого пальца" },
      { id: "mars_plain", name_ru: "Равнина Марса (центр)", planet: "Марс", symbol: "⚔", x: 185, y: 330, r: 26, color: "#e2e8f0", finger: "Центр ладони" },
    ];

    // Canonical dorsal joints when thumb is on the RIGHT
    this.canonicalJointsThumbRight = [
      { id: "middle_pip", name: "Нижний узел (PIP)", x: 200, y: 175, r: 12, knotty: true },
      { id: "middle_dip", name: "Верхний узел (DIP)", x: 200, y: 110, r: 10, knotty: true },
      { id: "index_pip", name: "Узел указательного", x: 265, y: 190, r: 11, knotty: false },
      { id: "ring_pip", name: "Узел безымянного", x: 135, y: 190, r: 11, knotty: false },
    ];

    // Local override of mount scores and special signs marked by the user
    this.customMountMarks = {};

    // Transform per view (scale, offsetX, offsetY, rotation)
    this.transforms = {
      right_palm: { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 },
      left_palm: { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 },
      right_dorsal: { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 },
      left_dorsal: { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 },
    };

    // Freehand customized positions for points when dragged by user
    this.customFeaturePositions = {
      right_palm: {},
      left_palm: {},
      right_dorsal: {},
      left_dorsal: {},
    };

    // Custom draggable line anchors (Heart, Head, Life line points)
    this.customLineAnchors = {
      right_palm: null,
      left_palm: null,
    };
    this.showLineAnchors = true;

    // Dragging state
    this.isDragging = false;
    this.draggedFeature = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hasMoved = false;

    this.initEvents();
  }

  setView(viewKey) {
    this.currentView = viewKey;
    if (viewKey === "right_palm") {
      this.thumbSide = "right";
    } else if (viewKey === "left_palm") {
      this.thumbSide = "left";
    } else if (viewKey === "right_dorsal") {
      this.thumbSide = "left";
    } else if (viewKey === "left_dorsal") {
      this.thumbSide = "right";
    }
    this.hoveredFeature = null;
    this.draw();
  }

  setTransform(scale, offsetX, offsetY, rotation) {
    const t = this.transforms[this.currentView];
    if (!t) return;
    if (scale !== undefined && scale !== null) t.scale = parseFloat(scale);
    if (offsetX !== undefined && offsetX !== null) t.offsetX = parseFloat(offsetX);
    if (offsetY !== undefined && offsetY !== null) t.offsetY = parseFloat(offsetY);
    if (rotation !== undefined && rotation !== null) t.rotation = parseFloat(rotation);
    this.draw();
  }

  getTransform() {
    return this.transforms[this.currentView] || { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 };
  }

  resetTransform() {
    this.transforms[this.currentView] = { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 };
    this.customFeaturePositions[this.currentView] = {};
    this.draw();
  }

  autoFitToPhoto() {
    if (!this.userImage) {
      this.resetTransform();
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const isDorsal = this.currentView.endsWith("_dorsal");

    try {
      // 1. Analyze userImage geometry using an offscreen canvas
      const offCanvas = document.createElement("canvas");
      const scanW = 200;
      const scanH = 250;
      offCanvas.width = scanW;
      offCanvas.height = scanH;
      const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

      const imgW = this.userImage.naturalWidth || this.userImage.width;
      const imgH = this.userImage.naturalHeight || this.userImage.height;
      const imgAspect = imgW / imgH;
      const canvasAspect = w / h;

      let drawW, drawH, drawX, drawY;
      if (imgAspect > canvasAspect) {
        drawH = scanH;
        drawW = scanH * imgAspect;
        drawX = (scanW - drawW) / 2;
        drawY = 0;
      } else {
        drawW = scanW;
        drawH = scanW / imgAspect;
        drawX = 0;
        drawY = (scanH - drawH) / 2;
      }

      offCtx.drawImage(this.userImage, drawX, drawY, drawW, drawH);
      const imgData = offCtx.getImageData(0, 0, scanW, scanH).data;

      // 2. Scan for skin & hand pixels
      let minX = scanW, maxX = 0, minY = scanH, maxY = 0;
      let handPixelCount = 0;
      const rowCounts = new Int32Array(scanH);
      const colCounts = new Int32Array(scanW);

      for (let y = 0; y < scanH; y++) {
        for (let x = 0; x < scanW; x++) {
          const idx = (y * scanW + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];

          if (a > 120) {
            // General skin tone condition
            const isSkin = (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 8 && (r - b) > 12);
            // Also accept bright hand palm under normal indoor lighting
            const isHand = isSkin || (r > 120 && g > 100 && b > 80 && Math.abs(r - g) < 55 && r > b);

            if (isHand) {
              rowCounts[y]++;
              colCounts[x]++;
              handPixelCount++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      }

      const scaleFactorX = w / scanW;
      const scaleFactorY = h / scanH;

      if (handPixelCount > 300 && maxY > minY + 30) {
        // Find top of fingers (ignore top 1% noise)
        let topY = minY;
        for (let y = minY; y <= maxY; y++) {
          if (rowCounts[y] > 4) { topY = y; break; }
        }
        let bottomY = maxY;
        for (let y = maxY; y >= minY; y--) {
          if (rowCounts[y] > 8) { bottomY = y; break; }
        }

        const handH = (bottomY - topY) * scaleFactorY;
        const handTopCanvasY = topY * scaleFactorY;
        const handBottomCanvasY = bottomY * scaleFactorY;

        // Middle axis of the hand
        const leftX = minX * scaleFactorX;
        const rightX = maxX * scaleFactorX;
        const handMidX = (leftX + rightX) / 2;

        if (isDorsal) {
          // Dorsal view:
          const knuckleY = handTopCanvasY + handH * 0.44;
          const fingerLen = Math.max(80, knuckleY - handTopCanvasY);

          // Target DIP (~35% down finger) and PIP (~68% down finger)
          const targetDIP = handTopCanvasY + fingerLen * 0.35;
          const targetPIP = handTopCanvasY + fingerLen * 0.68;
          const targetSpan = targetPIP - targetDIP;
          const canonicalSpan = 65; // 175 - 110
          const autoScale = Math.max(0.70, Math.min(1.30, targetSpan / canonicalSpan));
          const cy = h * 0.40;
          const autoOffsetY = Math.round(targetPIP - (cy + (175 - cy) * autoScale));
          const autoOffsetX = Math.round(handMidX - 200);

          this.transforms[this.currentView] = {
            scale: parseFloat(autoScale.toFixed(2)),
            offsetX: autoOffsetX,
            offsetY: autoOffsetY,
            rotation: 0
          };
        } else {
          // Palmar view:
          // Knuckles line is at ~42% of hand height
          const knuckleY = handTopCanvasY + handH * 0.42;
          const palmH = Math.max(160, handBottomCanvasY - knuckleY);
          // Canonical palm height is approx 265px
          const autoScale = Math.max(0.80, Math.min(1.25, palmH / 265));

          // Center of transformation is cy = h * 0.58 = 290
          const cy = h * 0.58;
          // Desired Saturn mount Y is knuckleY + 25px
          const targetMountY = knuckleY + 25;
          const autoOffsetY = Math.round(targetMountY - (cy + (235 - cy) * autoScale));
          const autoOffsetX = Math.round(handMidX - 200);

          this.transforms[this.currentView] = {
            scale: parseFloat(autoScale.toFixed(2)),
            offsetX: autoOffsetX,
            offsetY: autoOffsetY,
            rotation: 0
          };
        }
      } else {
        // Fallback comfortable defaults
        this.transforms[this.currentView] = {
          scale: 1.0,
          offsetX: 0,
          offsetY: isDorsal ? 25 : 10,
          rotation: 0
        };
      }
    } catch (err) {
      console.warn("Auto-fit vision analysis error, falling back:", err);
      this.transforms[this.currentView] = { scale: 1.0, offsetX: 0, offsetY: isDorsal ? 25 : 10, rotation: 0 };
    }

    this.draw();
  }

  toggleMirror() {
    this.thumbSide = (this.thumbSide === "right") ? "left" : "right";
    const viewKey = this.currentView;
    if (this.customLineAnchors[viewKey]) {
      Object.values(this.customLineAnchors[viewKey]).forEach(a => {
        a.isCustomDragged = false;
      });
    }
    this.draw();
  }

  setImage(img) {
    this.userImage = img;
    this.draw();
  }

  setPalmData(data) {
    this.palmData = data;
    this.draw();
  }

  setMountMark(mountId, score, sign = null) {
    this.customMountMarks[mountId] = { score, sign };
    if (this.palmData?.mounts?.[mountId]) {
      this.palmData.mounts[mountId].score = score;
      if (score >= 90) {
        this.palmData.mounts[mountId].development_ru = "Доминирующий";
      } else if (score >= 80) {
        this.palmData.mounts[mountId].development_ru = "Выраженный";
      } else if (score >= 65) {
        this.palmData.mounts[mountId].development_ru = "Сбалансированный";
      } else {
        this.palmData.mounts[mountId].development_ru = "Слабый / Впалый";
      }
      this.palmData.mounts[mountId].special_sign = sign;
    }
    this.draw();
  }

  getActiveMounts() {
    const isPalmar = this.currentView.endsWith("_palm");
    if (!isPalmar) return [];

    const w = this.canvas.width;
    const h = this.canvas.height;
    const isThumbOnRight = (this.thumbSide === "right");
    const t = this.transforms[this.currentView] || { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 };
    const customPos = this.customFeaturePositions[this.currentView] || {};

    // Center of transformation (middle of palm)
    const cx = w / 2;
    const cy = h * 0.58;
    const rad = (t.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return this.canonicalMountsThumbRight.map(m => {
      let x, y;
      if (customPos[m.id]) {
        x = customPos[m.id].x;
        y = customPos[m.id].y;
      } else {
        const baseX = isThumbOnRight ? m.x : (w - m.x);
        const baseY = m.y;
        const dx = (baseX - cx) * t.scale;
        const dy = (baseY - cy) * t.scale;
        x = cx + (dx * cos - dy * sin) + t.offsetX;
        y = cy + (dx * sin + dy * cos) + t.offsetY;
      }

      const custom = this.customMountMarks[m.id];
      const apiScore = this.palmData?.mounts?.[m.id]?.score;
      const score = custom?.score || apiScore || 72;
      const sign = custom?.sign || this.palmData?.mounts?.[m.id]?.special_sign || null;

      return Object.assign({}, m, { x, y, score, sign });
    });
  }

  getActiveJoints() {
    const isDorsal = this.currentView.endsWith("_dorsal");
    if (!isDorsal) return [];

    const w = this.canvas.width;
    const h = this.canvas.height;
    const isThumbOnRight = (this.thumbSide === "right");
    const t = this.transforms[this.currentView] || { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 };
    const customPos = this.customFeaturePositions[this.currentView] || {};

    const cx = w / 2;
    const cy = h * 0.40;
    const rad = (t.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return this.canonicalJointsThumbRight.map(j => {
      let x, y;
      if (customPos[j.id]) {
        x = customPos[j.id].x;
        y = customPos[j.id].y;
      } else {
        const baseX = isThumbOnRight ? j.x : (w - j.x);
        const baseY = j.y;
        const dx = (baseX - cx) * t.scale;
        const dy = (baseY - cy) * t.scale;
        x = cx + (dx * cos - dy * sin) + t.offsetX;
        y = cy + (dx * sin + dy * cos) + t.offsetY;
      }
      return Object.assign({}, j, { x, y });
    });
  }

  getActiveLineAnchors() {
    const isPalmar = this.currentView.endsWith("_palm");
    if (!isPalmar) return [];

    const w = this.canvas.width;
    const h = this.canvas.height;
    const isThumbOnRight = (this.thumbSide === "right");
    const viewKey = this.currentView;
    const t = this.transforms[this.currentView] || { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 };

    const cx = w / 2;
    const cy = h * 0.58;
    const rad = (t.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // If not yet initialized for this view, build from detected_lines or anatomical default
    if (!this.customLineAnchors[viewKey]) {
      const detected = this.palmData?.detected_lines?.lines;
      if (detected) {
        this.customLineAnchors[viewKey] = {
          heart_start: { id: "heart_start", line: "heart", name: "Начало Линии Сердца (под мизинцем)", baseX: detected.heart.start.x, baseY: detected.heart.start.y, color: "#f472b6" },
          heart_mid: { id: "heart_mid", line: "heart", name: "Изгиб Линии Сердца", baseX: detected.heart.mid.x, baseY: detected.heart.mid.y, color: "#f472b6" },
          heart_end: { id: "heart_end", line: "heart", name: "Окончание Линии Сердца", baseX: detected.heart.end.x, baseY: detected.heart.end.y, color: "#f472b6" },

          head_start: { id: "head_start", line: "head", name: "Исток Линии Головы (Ума)", baseX: detected.head.start.x, baseY: detected.head.start.y, color: "#00d2ff" },
          head_mid: { id: "head_mid", line: "head", name: "Равнина Марса (Линия Головы)", baseX: detected.head.mid.x, baseY: detected.head.mid.y, color: "#00d2ff" },
          head_end: { id: "head_end", line: "head", name: "Окончание Линии Головы (к Луне)", baseX: detected.head.end.x, baseY: detected.head.end.y, color: "#00d2ff" },

          life_start: { id: "life_start", line: "life", name: "Исток Линии Жизни", baseX: detected.life.start.x, baseY: detected.life.start.y, color: "#f6c85f" },
          life_mid: { id: "life_mid", line: "life", name: "Апекс Линии Жизни (обход Венеры)", baseX: detected.life.mid.x, baseY: detected.life.mid.y, color: "#f6c85f" },
          life_end: { id: "life_end", line: "life", name: "Окончание Линии Жизни (запястье)", baseX: detected.life.end.x, baseY: detected.life.end.y, color: "#f6c85f" },
        };
      } else {
        // Base canonical coordinates (Thumb on RIGHT)
        this.customLineAnchors[viewKey] = {
          heart_start: { id: "heart_start", line: "heart", name: "Начало Линии Сердца (под мизинцем)", baseX: 75, baseY: 280, color: "#f472b6" },
          heart_mid: { id: "heart_mid", line: "heart", name: "Изгиб Линии Сердца (под Сатурном)", baseX: 185, baseY: 295, color: "#f472b6" },
          heart_end: { id: "heart_end", line: "heart", name: "Окончание Линии Сердца (под Юпитером)", baseX: 275, baseY: 265, color: "#f472b6" },

          head_start: { id: "head_start", line: "head", name: "Исток Линии Головы (Ума)", baseX: 295, baseY: 290, color: "#00d2ff" },
          head_mid: { id: "head_mid", line: "head", name: "Равнина Марса (Линия Головы)", baseX: 195, baseY: 345, color: "#00d2ff" },
          head_end: { id: "head_end", line: "head", name: "Окончание Линии Головы (к Луне)", baseX: 115, baseY: 385, color: "#00d2ff" },

          life_start: { id: "life_start", line: "life", name: "Исток Линии Жизни", baseX: 320, baseY: 325, color: "#f6c85f" },
          life_mid: { id: "life_mid", line: "life", name: "Апекс Линии Жизни (обход Венеры)", baseX: 265, baseY: 410, color: "#f6c85f" },
          life_end: { id: "life_end", line: "life", name: "Окончание Линии Жизни (запястье)", baseX: 275, baseY: 485, color: "#f6c85f" },
        };
      }
    }

    return Object.values(this.customLineAnchors[viewKey]).map(a => {
      let x, y;
      if (a.isCustomDragged) {
        x = a.x;
        y = a.y;
      } else {
        const rawX = (a.baseX !== undefined) ? a.baseX : (a.x || 200);
        const rawY = (a.baseY !== undefined) ? a.baseY : (a.y || 250);
        const baseX = isThumbOnRight ? rawX : (w - rawX);
        const baseY = rawY;
        const dx = (baseX - cx) * t.scale;
        const dy = (baseY - cy) * t.scale;
        x = cx + (dx * cos - dy * sin) + t.offsetX;
        y = cy + (dx * sin + dy * cos) + t.offsetY;
      }
      return Object.assign(a, { x, y });
    });
  }

  resetLineAnchors() {
    this.customLineAnchors[this.currentView] = null;
    this.draw();
  }

  setSeparationPreset(isSeparated) {
    const isThumbOnRight = (this.thumbSide === "right");
    const viewKey = this.currentView;
    if (!this.customLineAnchors[viewKey]) {
      this.getActiveLineAnchors();
    }
    const anchors = this.customLineAnchors[viewKey];
    if (anchors) {
      if (isSeparated) {
        anchors.head_start.baseX = 295;
        anchors.head_start.baseY = 290;
        anchors.head_start.isCustomDragged = false;
        anchors.life_start.baseX = 320;
        anchors.life_start.baseY = 325;
        anchors.life_start.isCustomDragged = false;
      } else {
        // Joined together
        const commonX = 305;
        const commonY = 305;
        anchors.head_start.baseX = commonX;
        anchors.head_start.baseY = commonY;
        anchors.head_start.isCustomDragged = false;
        anchors.life_start.baseX = commonX;
        anchors.life_start.baseY = commonY;
        anchors.life_start.isCustomDragged = false;
      }
      this.draw();
      const active = this.getActiveLineAnchors();
      const hs = active.find(a => a.id === "head_start");
      const ls = active.find(a => a.id === "life_start");
      if (hs && ls && this.options.onLinesUpdated) {
        const gap = Math.round(Math.hypot(hs.x - ls.x, hs.y - ls.y));
        const refPalmH = 260.0 * (this.calibration.scale || 1.0);
        const gapRatio = Number((gap / refPalmH).toFixed(4));
        const gapPercent = (gapRatio * 100).toFixed(1);
        this.options.onLinesUpdated(gap, gapRatio >= 0.045, gapRatio, gapPercent);
      }
    }
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.canvas.width / rect.width),
        y: (clientY - rect.top) * (this.canvas.height / rect.height),
      };
    };

    const handleDown = (e) => {
      const pos = getPos(e);
      this.checkHover(pos.x, pos.y);
      if (this.hoveredFeature) {
        this.isDragging = true;
        this.draggedFeature = this.hoveredFeature;
        this.dragStartX = pos.x;
        this.dragStartY = pos.y;
        this.hasMoved = false;
        this.canvas.style.cursor = "grabbing";
        if (e.cancelable) e.preventDefault();
      }
    };

    const handleMove = (e) => {
      const pos = getPos(e);
      if (this.isDragging && this.draggedFeature) {
        const dx = pos.x - this.dragStartX;
        const dy = pos.y - this.dragStartY;
        if (Math.hypot(dx, dy) > 3) {
          this.hasMoved = true;
        }

        if (this.draggedFeature.type === "line_anchor") {
          const aid = this.draggedFeature.data.id;
          const viewKey = this.currentView;
          if (this.customLineAnchors[viewKey]?.[aid]) {
            this.customLineAnchors[viewKey][aid].x = Math.round(pos.x);
            this.customLineAnchors[viewKey][aid].y = Math.round(pos.y);
            this.customLineAnchors[viewKey][aid].isCustomDragged = true;
          }
          this.draw();
          if (e.cancelable) e.preventDefault();
          return;
        }

        const fid = this.draggedFeature.data.id;
        this.customFeaturePositions[this.currentView][fid] = {
          x: Math.round(pos.x),
          y: Math.round(pos.y),
        };
        this.draw();
        if (e.cancelable) e.preventDefault();
        return;
      }
      this.checkHover(pos.x, pos.y);
    };

    const handleUp = () => {
      if (this.isDragging) {
        if (!this.hasMoved && this.draggedFeature) {
          // If clicked without dragging, trigger feature inspect modal
          this.selectedFeature = this.draggedFeature;
          if (this.options.onSelectFeature) {
            this.options.onSelectFeature(this.draggedFeature);
          }
        }

        if (this.draggedFeature?.type === "line_anchor") {
          const viewKey = this.currentView;
          const anchors = this.customLineAnchors[viewKey];
          if (anchors?.head_start && anchors?.life_start) {
            const gap = Math.round(Math.hypot(anchors.head_start.x - anchors.life_start.x, anchors.head_start.y - anchors.life_start.y));
            const refPalmH = 260.0 * (this.calibration.scale || 1.0);
            const gapRatio = Number((gap / refPalmH).toFixed(4));
            const gapPercent = (gapRatio * 100).toFixed(1);
            const isSeparated = gapRatio >= 0.045;
            if (this.options.onLinesUpdated) {
              this.options.onLinesUpdated(gap, isSeparated, gapRatio, gapPercent);
            }
          }
        }

        this.isDragging = false;
        this.draggedFeature = null;
        this.canvas.style.cursor = "crosshair";
        this.draw();
      }
    };

    this.canvas.addEventListener("mousedown", handleDown);
    this.canvas.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    this.canvas.addEventListener("touchstart", handleDown, { passive: false });
    this.canvas.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);

    this.canvas.addEventListener("mouseleave", () => {
      if (!this.isDragging) {
        this.hoveredFeature = null;
        this.draw();
      }
    });
  }

  checkHover(x, y) {
    let found = null;

    // 1. Check Line Anchors first
    if (this.showLineAnchors && this.currentView.endsWith("_palm")) {
      const anchors = this.getActiveLineAnchors();
      for (const a of anchors) {
        const dist = Math.hypot(x - a.x, y - a.y);
        if (dist <= 12) {
          found = {
            type: "line_anchor",
            data: a,
          };
          break;
        }
      }
    }

    // 2. Check Mounts
    if (!found) {
      const mounts = this.getActiveMounts();
      for (const mount of mounts) {
        const dist = Math.hypot(x - mount.x, y - mount.y);
        if (dist <= mount.r * 1.15) {
          found = {
            type: "mount",
            data: mount,
            details: this.palmData?.mounts?.[mount.id],
            custom: this.customMountMarks[mount.id],
          };
          break;
        }
      }
    }

    // 3. Check Joints
    if (!found) {
      const joints = this.getActiveJoints();
      for (const joint of joints) {
        const dist = Math.hypot(x - joint.x, y - joint.y);
        if (dist <= joint.r * 1.25) {
          found = {
            type: "joint",
            data: joint,
          };
          break;
        }
      }
    }

    if (found !== this.hoveredFeature) {
      this.hoveredFeature = found;
      this.canvas.style.cursor = found ? "pointer" : "crosshair";
      this.draw();
    }
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    const isPalmar = this.currentView.endsWith("_palm");
    const isThumbOnRight = (this.thumbSide === "right");

    // 1. Draw User Image or Anatomical Silhouette
    if (this.userImage) {
      ctx.save();
      ctx.globalAlpha = 0.65;

      const imgW = this.userImage.naturalWidth || this.userImage.width;
      const imgH = this.userImage.naturalHeight || this.userImage.height;
      const imgAspect = imgW / imgH;
      const canvasAspect = w / h;

      let drawW, drawH, drawX, drawY;
      if (imgAspect > canvasAspect) {
        // Image is wider than canvas -> match height
        drawH = h;
        drawW = h * imgAspect;
        drawX = (w - drawW) / 2;
        drawY = 0;
      } else {
        // Image is taller than canvas -> match width
        drawW = w;
        drawH = w / imgAspect;
        drawX = 0;
        drawY = (h - drawH) / 2;
      }

      ctx.drawImage(this.userImage, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      if (isPalmar) {
        this.drawPalmarSilhouette(ctx, w, h, isThumbOnRight);
      } else {
        this.drawDorsalSilhouette(ctx, w, h, isThumbOnRight);
      }
    }

    // 2. Draw Palmar Lines and Mounts or Dorsal Features
    if (isPalmar) {
      this.drawPalmLines(ctx, w, h, isThumbOnRight);
      this.drawMountZones(ctx);
    } else {
      this.drawDorsalFeatures(ctx);
    }

    // 3. Draw CV Landmarks if active
    if (this.palmData?.landmarks && this.palmData.has_cv_detection) {
      ctx.save();
      this.palmData.landmarks.forEach(lm => {
        ctx.beginPath();
        ctx.arc(lm.x, lm.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#f6c85f";
        ctx.fill();
      });
      ctx.restore();
    }

    // 4. View Orientation Watermark
    this.drawOrientationWatermark(ctx, w, h);

    // 5. Tooltip for Hovered Feature
    if (this.hoveredFeature) {
      this.drawFeatureTooltip(ctx, w, h, this.hoveredFeature);
    }
  }

  /**
   * Draws palmar surface silhouette.
   * Canonical contour is built with THUMB ON THE RIGHT.
   * If isThumbOnRight is false, it flips horizontally across w.
   */
  drawPalmarSilhouette(ctx, w, h, isThumbOnRight) {
    ctx.save();

    if (!isThumbOnRight) {
      // Flip across center line
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    // Organic Palm with Thumb on RIGHT
    ctx.beginPath();
    // Wrist base on the left (under pinky/moon)
    ctx.moveTo(95, 475);

    // Hypothenar (Moon) curve on left edge
    ctx.quadraticCurveTo(55, 420, 50, 360);
    ctx.quadraticCurveTo(45, 290, 66, 235); // Base of pinky

    // Pinky Finger (Меркурий) on left
    ctx.lineTo(66, 150);
    ctx.quadraticCurveTo(70, 128, 84, 128);
    ctx.quadraticCurveTo(98, 128, 102, 150);
    ctx.lineTo(106, 205);

    // Ring Finger (Аполлон)
    ctx.lineTo(122, 85);
    ctx.quadraticCurveTo(126, 60, 142, 60);
    ctx.quadraticCurveTo(158, 60, 160, 85);
    ctx.lineTo(174, 195);

    // Middle Finger (Сатурн - длиннейший)
    ctx.lineTo(182, 50);
    ctx.quadraticCurveTo(184, 22, 202, 22);
    ctx.quadraticCurveTo(220, 22, 222, 50);
    ctx.lineTo(236, 195);

    // Index Finger (Юпитер)
    ctx.lineTo(242, 105);
    ctx.quadraticCurveTo(244, 75, 260, 75);
    ctx.quadraticCurveTo(276, 75, 278, 105);
    ctx.lineTo(276, 200);

    // Webbing between Index and Thumb
    ctx.quadraticCurveTo(274, 240, 278, 275);

    // Thumb (Венера) extending out to the RIGHT
    ctx.quadraticCurveTo(288, 265, 298, 235);
    ctx.quadraticCurveTo(308, 195, 332, 185);
    ctx.quadraticCurveTo(355, 185, 355, 230);
    ctx.quadraticCurveTo(345, 275, 335, 340);
    ctx.quadraticCurveTo(330, 420, 285, 475); // Wrist base on the right

    ctx.closePath();

    // Palmar surface gradient
    const palmarGrad = ctx.createRadialGradient(190, 310, 30, 190, 310, 220);
    palmarGrad.addColorStop(0, "rgba(28, 36, 70, 0.45)");
    palmarGrad.addColorStop(0.7, "rgba(16, 22, 45, 0.6)");
    palmarGrad.addColorStop(1, "rgba(9, 12, 28, 0.75)");

    ctx.fillStyle = palmarGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(157, 114, 255, 0.45)";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Fleshy Palm Pads shading
    // Venus Pad (Thenar) on the RIGHT
    ctx.beginPath();
    ctx.ellipse(265, 345, 38, 55, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(244, 114, 182, 0.06)";
    ctx.fill();

    // Moon Pad (Hypothenar) on the LEFT
    ctx.beginPath();
    ctx.ellipse(100, 385, 32, 50, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(165, 180, 252, 0.06)";
    ctx.fill();

    // Wrist Rascettes (Браслеты расцетты)
    ctx.beginPath();
    ctx.moveTo(115, 465);
    ctx.quadraticCurveTo(190, 475, 265, 465);
    ctx.moveTo(120, 480);
    ctx.quadraticCurveTo(190, 490, 260, 480);
    ctx.strokeStyle = "rgba(246, 200, 95, 0.35)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();
  }

  drawDorsalSilhouette(ctx, w, h, isThumbOnRight) {
    ctx.save();

    if (!isThumbOnRight) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    // Dorsal anatomical contour (thumb on RIGHT)
    ctx.beginPath();
    ctx.moveTo(95, 475);
    ctx.quadraticCurveTo(55, 420, 50, 360);
    ctx.quadraticCurveTo(45, 290, 66, 235);

    // Pinky
    ctx.lineTo(66, 150);
    ctx.quadraticCurveTo(70, 128, 84, 128);
    ctx.quadraticCurveTo(98, 128, 102, 150);
    ctx.lineTo(106, 205);

    // Ring finger
    ctx.lineTo(122, 85);
    ctx.quadraticCurveTo(126, 60, 142, 60);
    ctx.quadraticCurveTo(158, 60, 160, 85);
    ctx.lineTo(174, 195);

    // Middle finger with Knots
    ctx.lineTo(182, 135);
    ctx.quadraticCurveTo(176, 125, 182, 115); // Lower knot
    ctx.lineTo(182, 85);
    ctx.quadraticCurveTo(176, 75, 182, 65); // Upper knot
    ctx.lineTo(182, 50);
    ctx.quadraticCurveTo(184, 22, 202, 22);
    ctx.quadraticCurveTo(220, 22, 222, 50);
    ctx.lineTo(222, 65);
    ctx.quadraticCurveTo(228, 75, 222, 85); // Upper knot
    ctx.lineTo(222, 115);
    ctx.quadraticCurveTo(228, 125, 222, 135); // Lower knot
    ctx.lineTo(236, 195);

    // Index finger
    ctx.lineTo(242, 105);
    ctx.quadraticCurveTo(244, 75, 260, 75);
    ctx.quadraticCurveTo(276, 75, 278, 105);
    ctx.lineTo(276, 200);

    // Thumb on RIGHT
    ctx.quadraticCurveTo(274, 240, 278, 275);
    ctx.quadraticCurveTo(288, 265, 298, 235);
    ctx.quadraticCurveTo(308, 195, 332, 185);
    ctx.quadraticCurveTo(355, 185, 355, 230);
    ctx.quadraticCurveTo(345, 275, 335, 340);
    ctx.quadraticCurveTo(330, 420, 285, 475);
    ctx.closePath();

    ctx.fillStyle = "rgba(18, 22, 45, 0.65)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 210, 255, 0.4)";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Draw Fingernails on Dorsal View
    this.drawFingernailsOnCanvas(ctx);

    ctx.restore();
  }

  drawFingernailsOnCanvas(ctx) {
    ctx.save();
    // Middle nail
    ctx.beginPath();
    ctx.rect(192, 32, 20, 18);
    ctx.fillStyle = "rgba(246, 200, 95, 0.25)";
    ctx.strokeStyle = "#f6c85f";
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();

    // Ring nail
    ctx.beginPath();
    ctx.rect(133, 70, 18, 16);
    ctx.stroke();

    // Index nail
    ctx.beginPath();
    ctx.rect(250, 85, 18, 16);
    ctx.stroke();

    // Pinky nail
    ctx.beginPath();
    ctx.rect(80, 136, 14, 14);
    ctx.stroke();

    ctx.restore();
  }

  drawPalmLines(ctx, w, h, isThumbOnRight) {
    ctx.save();
    ctx.shadowBlur = 10;

    const anchorsList = this.getActiveLineAnchors();
    const getA = (id) => anchorsList.find(a => a.id === id);

    const hs = getA("heart_start");
    const hm = getA("heart_mid");
    const he = getA("heart_end");

    const hds = getA("head_start");
    const hdm = getA("head_mid");
    const hde = getA("head_end");

    const ls = getA("life_start");
    const lm = getA("life_mid");
    const le = getA("life_end");

    // 1. Heart Line (Pink): Starts under Mercury, flows under Apollo & Saturn, terminates near Jupiter
    if (hs && hm && he) {
      ctx.beginPath();
      ctx.moveTo(hs.x, hs.y);
      ctx.quadraticCurveTo(hm.x, hm.y, he.x, he.y);
      ctx.strokeStyle = "#f472b6";
      ctx.shadowColor = "#f472b6";
      ctx.lineWidth = 3.2;
      ctx.stroke();
    }

    // 2. Head Line (Cyan): Starts at hds, traverses Plain of Mars, curves toward Moon/Upper Mars
    if (hds && hdm && hde) {
      ctx.beginPath();
      ctx.moveTo(hds.x, hds.y);
      ctx.quadraticCurveTo(hdm.x, hdm.y, hde.x, hde.y);
      ctx.strokeStyle = "#00d2ff";
      ctx.shadowColor = "#00d2ff";
      ctx.lineWidth = 3.2;
      ctx.stroke();
    }

    // 3. Life Line (Gold): Starts at ls, wraps around Venus mount down to wrist
    if (ls && lm && le) {
      ctx.beginPath();
      ctx.moveTo(ls.x, ls.y);
      ctx.quadraticCurveTo(lm.x, lm.y, le.x, le.y);
      ctx.strokeStyle = "#f6c85f";
      ctx.shadowColor = "#f6c85f";
      ctx.lineWidth = 3.4;
      ctx.stroke();
    }

    // 4. Measure Relative Biometric Gap between Life Start and Head Start
    if (hds && ls) {
      const gap = Math.round(Math.hypot(hds.x - ls.x, hds.y - ls.y));
      const refPalmH = 260.0 * (this.calibration.scale || 1.0);
      const gapRatio = Number((gap / refPalmH).toFixed(4));
      const gapPercent = (gapRatio * 100).toFixed(1);
      const isSeparated = gapRatio >= 0.045;

      // Draw subtle dashed connector line between origins
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isSeparated ? "rgba(56, 239, 125, 0.8)" : "rgba(246, 200, 95, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hds.x, hds.y);
      ctx.lineTo(ls.x, ls.y);
      ctx.stroke();

      // Clean glowing text label without any dark box background
      if (this.showLineAnchors && isSeparated) {
        const midX = (hds.x + ls.x) / 2;
        const midY = (hds.y + ls.y) / 2;
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#38ef7d";
        ctx.fillText(`⟷ ${gapPercent}%`, midX, midY - 6);
      }
      ctx.restore();
    }

    // 5. Fate Line (Purple): Rises from wrist base through Plain of Mars into Saturn
    const mounts = this.getActiveMounts();
    const sat = mounts.find(m => m.id === "saturn") || { x: w / 2, y: h / 2, r: 20 };
    const ven = mounts.find(m => m.id === "venus") || { x: w / 2, y: h / 2, r: 20 };
    const moon = mounts.find(m => m.id === "moon") || { x: w / 2, y: h / 2, r: 20 };
    const apo = mounts.find(m => m.id === "apollo") || { x: w / 2, y: h / 2, r: 20 };
    const plain = mounts.find(m => m.id === "mars_plain") || { x: w / 2, y: h / 2, r: 20 };

    const fateStartX = (ven.x + moon.x) / 2;
    const fateStartY = Math.min(h - 18, Math.max(ven.y, moon.y) + 30);
    ctx.beginPath();
    ctx.moveTo(fateStartX, fateStartY);
    ctx.quadraticCurveTo(plain.x, plain.y, sat.x, sat.y + sat.r * 0.9);
    ctx.strokeStyle = "#9d72ff";
    ctx.shadowColor = "#9d72ff";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Sun Line (Amber): Rises into Mount Apollo
    ctx.beginPath();
    ctx.moveTo((plain.x + apo.x) / 2, plain.y + 40);
    ctx.lineTo(apo.x, apo.y + apo.r * 0.9);
    ctx.strokeStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 7. Draggable Anchor Points
    if (this.showLineAnchors) {
      anchorsList.forEach(a => {
        const isHovered = (this.hoveredFeature?.type === "line_anchor" && this.hoveredFeature?.data?.id === a.id);
        const r = isHovered ? 8 : 5.5;

        ctx.beginPath();
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? "#ffffff" : a.color;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        if (a.id === "head_start" || a.id === "life_start") {
          ctx.beginPath();
          ctx.arc(a.x, a.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = a.color;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });
    }

    ctx.restore();
  }

  drawMountZones(ctx) {
    const mounts = this.getActiveMounts();

    mounts.forEach(mount => {
      const isHovered = this.hoveredFeature?.type === "mount" && this.hoveredFeature.data.id === mount.id;
      const isSelected = this.selectedFeature?.type === "mount" && this.selectedFeature.data.id === mount.id;
      const score = mount.score || 70;
      const radius = mount.r * (isHovered ? 1.25 : (isSelected ? 1.15 : 1.0));

      ctx.save();
      ctx.beginPath();
      ctx.arc(mount.x, mount.y, radius, 0, Math.PI * 2);

      // Glowing Radial Gradient
      const grad = ctx.createRadialGradient(mount.x, mount.y, 0, mount.x, mount.y, radius);
      const intensity = score >= 85 ? "bb" : (score >= 70 ? "66" : "33");
      grad.addColorStop(0, mount.color + intensity);
      grad.addColorStop(0.65, mount.color + "22");
      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = (isHovered || isSelected) ? "#ffffff" : mount.color;
      ctx.lineWidth = (isHovered || isSelected) ? 2.5 : 1.4;
      ctx.stroke();

      // Apex Center Point
      ctx.beginPath();
      ctx.arc(mount.x, mount.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = (isHovered || isSelected) ? "#ffffff" : mount.color;
      ctx.fill();

      // Mount Label: Symbol & Name
      ctx.font = isHovered ? "bold 11px Inter, sans-serif" : "10px Inter, sans-serif";
      ctx.fillStyle = (isHovered || isSelected) ? "#ffffff" : "rgba(255, 255, 255, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText(`${mount.symbol} ${mount.planet}`, mount.x, mount.y + 14);

      // If user marked a special sign (✨, 🔱, 🔺, ⛨, ▦, ✖)
      if (mount.sign) {
        ctx.font = "14px Inter, sans-serif";
        ctx.fillText(mount.sign, mount.x, mount.y - 10);
      }

      ctx.restore();
    });
  }

  drawDorsalFeatures(ctx) {
    const joints = this.getActiveJoints();
    const getJ = (id) => joints.find(j => j.id === id);

    const mDip = getJ("middle_dip");
    const mPip = getJ("middle_pip");
    const iPip = getJ("index_pip");
    const rPip = getJ("ring_pip");

    // Draw connecting skeleton lines between finger nodes
    ctx.save();
    ctx.strokeStyle = "rgba(0, 210, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);

    if (mDip && mPip) {
      ctx.beginPath();
      ctx.moveTo(mDip.x, mDip.y);
      ctx.lineTo(mPip.x, mPip.y);
      ctx.stroke();
    }
    if (iPip && mPip) {
      ctx.beginPath();
      ctx.moveTo(iPip.x, iPip.y);
      ctx.lineTo(mPip.x, mPip.y);
      ctx.stroke();
    }
    if (rPip && mPip) {
      ctx.beginPath();
      ctx.moveTo(rPip.x, rPip.y);
      ctx.lineTo(mPip.x, mPip.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Draw joint nodes
    joints.forEach(j => {
      const isHovered = this.hoveredFeature?.type === "joint" && this.hoveredFeature.data.id === j.id;

      ctx.save();
      ctx.beginPath();
      ctx.arc(j.x, j.y, j.r * (isHovered ? 1.3 : 1.0), 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "rgba(246, 200, 95, 0.4)" : "rgba(0, 210, 255, 0.25)";
      ctx.strokeStyle = isHovered ? "#f6c85f" : "#00d2ff";
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(j.x, j.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "#f6c85f" : "#00d2ff";
      ctx.fill();

      ctx.font = "9px Inter, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.textAlign = "center";
      ctx.fillText(j.name, j.x, j.y + j.r + 12);
      ctx.restore();
    });
  }

  drawOrientationWatermark(ctx, w, h) {
    ctx.save();
    ctx.font = "600 11px Inter, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.textAlign = "left";

    const sideText = (this.thumbSide === "right") ? "Большой палец СПРАВА" : "Большой палец СЛЕВА";
    let viewRu = "ПРАВАЯ ЛАДОНЬ";
    if (this.currentView === "left_palm") viewRu = "ЛЕВАЯ ЛАДОНЬ";
    else if (this.currentView === "right_dorsal") viewRu = "ПРАВАЯ СНАРУЖИ";
    else if (this.currentView === "left_dorsal") viewRu = "ЛЕВАЯ СНАРУЖИ";

    ctx.fillText(`Ракурс: ${viewRu} (${sideText})`, 12, h - 14);
    ctx.restore();
  }

  drawFeatureTooltip(ctx, w, h, feat) {
    // Completely suppress any tooltip box for line anchors so lines remain 100% visible and unblocked
    if (!feat || feat.type === "line_anchor") return;

    ctx.save();
    const hudX = 12;
    const hudY = 10;
    const hudW = w - 24;
    const hudH = 30;

    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.strokeStyle = "rgba(246, 200, 95, 0.4)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    if (feat.type === "mount") {
      const m = feat.data;
      const score = m.score || 72;
      const statusRu = score >= 90 ? "Доминирующий" : (score >= 80 ? "Выраженный" : (score >= 65 ? "Сбалансированный" : "Слабый"));
      const signLabel = m.sign ? ` ${m.sign}` : "";

      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillStyle = "#f6c85f";
      ctx.fillText(`${m.symbol} ${m.name_ru}${signLabel}`, hudX + 10, hudY + 19);

      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      ctx.fillText(`${statusRu} (${score} б.) • Кликните для настройки`, hudX + hudW - 10, hudY + 19);
    } else if (feat.type === "joint") {
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillStyle = "#00d2ff";
      ctx.fillText(`🔹 ${feat.data.name}`, hudX + 10, hudY + 19);

      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      ctx.fillText("Суставное сочленение фаланг", hudX + hudW - 10, hudY + 19);
    }

    ctx.restore();
  }
}
