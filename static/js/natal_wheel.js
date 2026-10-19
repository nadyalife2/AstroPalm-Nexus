/**
 * Interactive SVG Natal Chart Wheel
 * Renders professional astrological wheel with houses, planets, aspects, and hover inspection.
 */

class NatalWheel {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      size: 560,
      cx: 280,
      cy: 280,
      rOuter: 260,
      rZodiacInner: 215,
      rPlanets: 175,
      rAspects: 135,
      onPlanetClick: null,
      onPlanetHover: null,
    }, options);

    this.chartData = null;
    this.svg = null;
    this.hoveredPlanet = null;
    this.init();
  }

  init() {
    this.container.innerHTML = "";
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("viewBox", `0 0 ${this.options.size} ${this.options.size}`);
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.style.overflow = "visible";
    this.container.appendChild(this.svg);
  }

  render(chartData) {
    this.chartData = chartData;
    this.svg.innerHTML = "";

    if (!chartData || !chartData.angles || !chartData.angles.asc) {
      return;
    }

    const { cx, cy, rOuter, rZodiacInner, rPlanets, rAspects } = this.options;
    // In western astrology, Ascendant is at 9 o'clock (180 deg in standard math coordinates)
    const ascLon = chartData.angles.asc.longitude;
    const rotateOffset = 180 - ascLon;

    // Helper: convert absolute zodiac longitude to screen (x, y)
    const lonToScreen = (lon, r) => {
      const screenAngleDeg = (lon + rotateOffset) % 360;
      const rad = (screenAngleDeg * Math.PI) / 180;
      return {
        x: cx + r * Math.cos(rad),
        y: cy - r * Math.sin(rad),
        rad: rad,
        screenAngleDeg: screenAngleDeg,
      };
    };

    // 1. Defs & Gradients
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <radialGradient id="wheelCenterGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0a0d1e" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#121832" stop-opacity="0.8" />
      </radialGradient>
      <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `;
    this.svg.appendChild(defs);

    // 2. Base Background Circles
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", cx);
    bgCircle.setAttribute("cy", cy);
    bgCircle.setAttribute("r", rOuter);
    bgCircle.setAttribute("fill", "url(#wheelCenterGrad)");
    bgCircle.setAttribute("stroke", "rgba(255, 255, 255, 0.15)");
    bgCircle.setAttribute("stroke-width", "1.5");
    this.svg.appendChild(bgCircle);

    // 3. Zodiac Ring (12 Signs)
    const zodiacSigns = [
      { name: "Aries", symbol: "♈", elem: "fire", color: "#ff6b6b" },
      { name: "Taurus", symbol: "♉", elem: "earth", color: "#51cf66" },
      { name: "Gemini", symbol: "♊", elem: "air", color: "#ffd43b" },
      { name: "Cancer", symbol: "♋", elem: "water", color: "#4dabf7" },
      { name: "Leo", symbol: "♌", elem: "fire", color: "#ff6b6b" },
      { name: "Virgo", symbol: "♍", elem: "earth", color: "#51cf66" },
      { name: "Libra", symbol: "♎", elem: "air", color: "#ffd43b" },
      { name: "Scorpio", symbol: "♏", elem: "water", color: "#4dabf7" },
      { name: "Sagittarius", symbol: "♐", elem: "fire", color: "#ff6b6b" },
      { name: "Capricorn", symbol: "♑", elem: "earth", color: "#51cf66" },
      { name: "Aquarius", symbol: "♒", elem: "air", color: "#ffd43b" },
      { name: "Pisces", symbol: "♓", elem: "water", color: "#4dabf7" },
    ];

    const zodiacGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    zodiacGroup.setAttribute("class", "zodiac-ring");

    zodiacSigns.forEach((sign, idx) => {
      const startLon = idx * 30;
      const endLon = (idx + 1) * 30;
      const p1 = lonToScreen(startLon, rOuter);
      const p2 = lonToScreen(endLon, rOuter);
      const p3 = lonToScreen(endLon, rZodiacInner);
      const p4 = lonToScreen(startLon, rZodiacInner);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rZodiacInner} ${rZodiacInner} 0 0 1 ${p4.x} ${p4.y} Z`);
      path.setAttribute("fill", idx % 2 === 0 ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.06)");
      path.setAttribute("stroke", "rgba(255, 255, 255, 0.12)");
      path.setAttribute("stroke-width", "1");
      zodiacGroup.appendChild(path);

      // Sign Glyph Symbol
      const midLon = startLon + 15;
      const glyphPos = lonToScreen(midLon, (rOuter + rZodiacInner) / 2);
      const glyphText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      glyphText.setAttribute("x", glyphPos.x);
      glyphText.setAttribute("y", glyphPos.y + 5);
      glyphText.setAttribute("text-anchor", "middle");
      glyphText.setAttribute("fill", sign.color);
      glyphText.setAttribute("font-size", "16");
      glyphText.setAttribute("font-weight", "bold");
      glyphText.setAttribute("style", "user-select: none;");
      glyphText.textContent = sign.symbol;
      zodiacGroup.appendChild(glyphText);
    });

    this.svg.appendChild(zodiacGroup);

    // 4. House Cusps Lines and Numbers
    const housesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    housesGroup.setAttribute("class", "houses-layer");

    (chartData.houses || []).forEach((h) => {
      const isAngle = [1, 4, 7, 10].includes(h.number);
      const linePOuter = lonToScreen(h.longitude, rZodiacInner);
      const linePInner = lonToScreen(h.longitude, rAspects);

      const cuspLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      cuspLine.setAttribute("x1", linePInner.x);
      cuspLine.setAttribute("y1", linePInner.y);
      cuspLine.setAttribute("x2", linePOuter.x);
      cuspLine.setAttribute("y2", linePOuter.y);
      cuspLine.setAttribute("stroke", isAngle ? "var(--accent-gold)" : "rgba(255, 255, 255, 0.18)");
      cuspLine.setAttribute("stroke-width", isAngle ? "2" : "1");
      if (!isAngle) cuspLine.setAttribute("stroke-dasharray", "3,3");
      housesGroup.appendChild(cuspLine);

      // House Number
      const nextHouseLon = chartData.houses[h.number % 12].longitude;
      let midHouseLon = (h.longitude + nextHouseLon) / 2;
      if (nextHouseLon < h.longitude) midHouseLon = (h.longitude + nextHouseLon + 360) / 2 % 360;
      const numPos = lonToScreen(midHouseLon, (rZodiacInner + rAspects) / 2);

      const numText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      numText.setAttribute("x", numPos.x);
      numText.setAttribute("y", numPos.y + 4);
      numText.setAttribute("text-anchor", "middle");
      numText.setAttribute("fill", "rgba(255, 255, 255, 0.45)");
      numText.setAttribute("font-size", "11");
      numText.setAttribute("font-family", "Cinzel, serif");
      numText.textContent = h.number;
      housesGroup.appendChild(numText);
    });

    // Mark ASC and MC with glowing badges
    const ascPos = lonToScreen(ascLon, rOuter + 14);
    const ascText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    ascText.setAttribute("x", ascPos.x);
    ascText.setAttribute("y", ascPos.y + 4);
    ascText.setAttribute("text-anchor", "middle");
    ascText.setAttribute("fill", "var(--accent-gold)");
    ascText.setAttribute("font-size", "12");
    ascText.setAttribute("font-weight", "bold");
    ascText.textContent = "ASC";
    housesGroup.appendChild(ascText);

    const mcPos = lonToScreen(chartData.angles.mc.longitude, rOuter + 14);
    const mcText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    mcText.setAttribute("x", mcPos.x);
    mcText.setAttribute("y", mcPos.y + 4);
    mcText.setAttribute("text-anchor", "middle");
    mcText.setAttribute("fill", "var(--accent-gold)");
    mcText.setAttribute("font-size", "12");
    mcText.setAttribute("font-weight", "bold");
    mcText.textContent = "MC";
    housesGroup.appendChild(mcText);

    this.svg.appendChild(housesGroup);

    // 5. Aspects Inner Network
    const aspectsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    aspectsGroup.setAttribute("class", "aspects-network");

    const validPlanets = (chartData.planets || []).filter(p => typeof p.longitude === "number");
    const planetMap = new Map();
    validPlanets.forEach(p => planetMap.set(p.name, p));

    (chartData.aspects || []).forEach((asp, idx) => {
      const p1 = planetMap.get(asp.planet1);
      const p2 = planetMap.get(asp.planet2);
      if (!p1 || !p2) return;

      const pt1 = lonToScreen(p1.longitude, rAspects);
      const pt2 = lonToScreen(p2.longitude, rAspects);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", pt1.x);
      line.setAttribute("y1", pt1.y);
      line.setAttribute("x2", pt2.x);
      line.setAttribute("y2", pt2.y);
      line.setAttribute("data-p1", asp.planet1);
      line.setAttribute("data-p2", asp.planet2);

      let strokeColor = "rgba(255, 255, 255, 0.2)";
      let strokeWidth = "1.2";

      if (asp.harmonic === "soft") {
        // Trine, Sextile
        strokeColor = "rgba(56, 239, 125, 0.45)";
      } else if (asp.harmonic === "hard") {
        // Square, Opposition
        strokeColor = "rgba(255, 82, 82, 0.45)";
      } else {
        // Conjunction
        strokeColor = "rgba(246, 200, 95, 0.6)";
        strokeWidth = "2";
      }

      line.setAttribute("stroke", strokeColor);
      line.setAttribute("stroke-width", strokeWidth);
      line.setAttribute("class", `aspect-chord p-${asp.planet1} p-${asp.planet2}`);
      aspectsGroup.appendChild(line);
    });

    this.svg.appendChild(aspectsGroup);

    // 6. Planets Markers and Glyphs Layer (with anti-collision orbital staggering for conjunctions)
    const planetsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    planetsGroup.setAttribute("class", "planets-layer");

    const sortedPlanets = [...validPlanets].sort((a, b) => a.longitude - b.longitude);
    sortedPlanets.forEach((p, i) => {
      p._renderRadius = rPlanets;
      if (i > 0) {
        const prev = sortedPlanets[i - 1];
        let diff = Math.abs(p.longitude - prev.longitude);
        if (diff > 180) diff = 360 - diff;
        if (diff < 8.0 && prev._renderRadius === rPlanets) {
          p._renderRadius = rPlanets - 25; // Shift conjunction to inner orbital tier
        }
      }
    });

    sortedPlanets.forEach((p) => {
      const pPos = lonToScreen(p.longitude, p._renderRadius || rPlanets);
      const pGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      pGroup.setAttribute("class", "planet-node");
      pGroup.setAttribute("style", "cursor: pointer;");

      // Outer circle
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", pPos.x);
      dot.setAttribute("cy", pPos.y);
      dot.setAttribute("r", "13");
      dot.setAttribute("fill", "#11162d");
      dot.setAttribute("stroke", p.retrograde ? "#ff5252" : "var(--accent-gold)");
      dot.setAttribute("stroke-width", "1.5");
      dot.setAttribute("class", "planet-dot");
      pGroup.appendChild(dot);

      // Symbol text
      const symText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      symText.setAttribute("x", pPos.x);
      symText.setAttribute("y", pPos.y + 4.5);
      symText.setAttribute("text-anchor", "middle");
      symText.setAttribute("fill", "#fff");
      symText.setAttribute("font-size", "14");
      symText.setAttribute("font-weight", "bold");
      symText.textContent = p.symbol || p.name.substring(0, 2);
      pGroup.appendChild(symText);

      // Retrograde tiny badge
      if (p.retrograde) {
        const rBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
        rBadge.setAttribute("x", pPos.x + 10);
        rBadge.setAttribute("y", pPos.y - 8);
        rBadge.setAttribute("fill", "#ff5252");
        rBadge.setAttribute("font-size", "9");
        rBadge.setAttribute("font-weight", "bold");
        rBadge.textContent = "℞";
        pGroup.appendChild(rBadge);
      }

      // Interactivity: Hover & Click
      pGroup.addEventListener("mouseenter", (e) => {
        this.highlightPlanet(p.name);
        if (this.options.onPlanetHover) this.options.onPlanetHover(p, e);
      });

      pGroup.addEventListener("mouseleave", () => {
        this.clearHighlight();
        if (this.options.onPlanetHover) this.options.onPlanetHover(null);
      });

      pGroup.addEventListener("click", () => {
        if (this.options.onPlanetClick) this.options.onPlanetClick(p);
      });

      planetsGroup.appendChild(pGroup);
    });

    this.svg.appendChild(planetsGroup);
  }

  highlightPlanet(planetName) {
    const allChords = this.svg.querySelectorAll(".aspect-chord");
    allChords.forEach(chord => {
      const p1 = chord.getAttribute("data-p1");
      const p2 = chord.getAttribute("data-p2");
      if (p1 === planetName || p2 === planetName) {
        chord.setAttribute("stroke-width", "3");
        chord.setAttribute("stroke", "#fff");
        chord.setAttribute("filter", "url(#glowFilter)");
      } else {
        chord.setAttribute("stroke-opacity", "0.1");
      }
    });
  }

  clearHighlight() {
    const allChords = this.svg.querySelectorAll(".aspect-chord");
    allChords.forEach(chord => {
      chord.removeAttribute("stroke-width");
      chord.removeAttribute("stroke");
      chord.removeAttribute("stroke-opacity");
      chord.removeAttribute("filter");
      // Restore default classes/attributes
      const p1 = chord.getAttribute("data-p1");
      const p2 = chord.getAttribute("data-p2");
      const asp = (this.chartData?.aspects || []).find(a => 
        (a.planet1 === p1 && a.planet2 === p2) || (a.planet1 === p2 && a.planet2 === p1)
      );
      if (asp) {
        if (asp.harmonic === "soft") chord.setAttribute("stroke", "rgba(56, 239, 125, 0.45)");
        else if (asp.harmonic === "hard") chord.setAttribute("stroke", "rgba(255, 82, 82, 0.45)");
        else chord.setAttribute("stroke", "rgba(246, 200, 95, 0.6)");
        chord.setAttribute("stroke-width", asp.harmonic === "neutral" ? "2" : "1.2");
      }
    });
  }
}
