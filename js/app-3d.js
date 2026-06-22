let roomState = { angle: 0, wall: 0, animating: false };

const wallConfig = [
  { label: "正面", className: "front", angle: 0 },
  { label: "右侧", className: "right", angle: 90 },
  { label: "背面", className: "back", angle: 180 },
  { label: "左侧", className: "left", angle: 270 }
];

const wallClueLayouts = [
  [
    { x: "10%", y: "6%", z: "28px", r: "-6deg", s: "0.93", cx: 21, cy: 9 },
    { x: "68%", y: "4%", z: "44px", r: "5deg", s: "0.96", cx: 79, cy: 7 },
    { x: "38%", y: "32%", z: "66px", r: "-2deg", s: "1", cx: 49, cy: 35 },
    { x: "12%", y: "62%", z: "32px", r: "4deg", s: "0.92", cx: 23, cy: 65 },
    { x: "64%", y: "60%", z: "48px", r: "-5deg", s: "0.95", cx: 75, cy: 63 }
  ],
  [
    { x: "63%", y: "6%", z: "34px", r: "6deg", s: "0.95", cx: 74, cy: 9 },
    { x: "31%", y: "12%", z: "56px", r: "-7deg", s: "1", cx: 42, cy: 15 },
    { x: "69%", y: "38%", z: "38px", r: "4deg", s: "0.94", cx: 80, cy: 41 },
    { x: "7%", y: "48%", z: "50px", r: "-5deg", s: "0.97", cx: 18, cy: 51 },
    { x: "37%", y: "66%", z: "30px", r: "7deg", s: "0.93", cx: 48, cy: 69 }
  ],
  [
    { x: "37.5%", y: "8%", z: "42px", r: "-5deg", s: "0.96", cx: 48.5, cy: 11 },
    { x: "9.5%", y: "5%", z: "30px", r: "8deg", s: "0.93", cx: 20.5, cy: 8 },
    { x: "66.5%", y: "34%", z: "68px", r: "2deg", s: "1", cx: 77.5, cy: 37 },
    { x: "13.5%", y: "62%", z: "36px", r: "5deg", s: "0.94", cx: 24.5, cy: 65 },
    { x: "61.5%", y: "64%", z: "50px", r: "-6deg", s: "0.97", cx: 72.5, cy: 67 }
  ],
  [
    { x: "70.5%", y: "10%", z: "40px", r: "5deg", s: "0.96", cx: 81.5, cy: 13 },
    { x: "36.5%", y: "6%", z: "34px", r: "-4deg", s: "0.94", cx: 47.5, cy: 9 },
    { x: "10.5%", y: "40%", z: "58px", r: "-7deg", s: "0.98", cx: 21.5, cy: 43 },
    { x: "66.5%", y: "42%", z: "44px", r: "6deg", s: "0.95", cx: 77.5, cy: 45 },
    { x: "38.5%", y: "68%", z: "32px", r: "-3deg", s: "0.94", cx: 49.5, cy: 71 }
  ]
];

const wallClueLinks = [
  [[0, 2], [1, 2], [2, 3], [2, 4], [0, 1], [3, 4]],
  [[0, 1], [0, 3], [1, 2], [3, 4], [4, 2], [0, 4]],
  [[1, 2], [0, 2], [2, 4], [2, 3], [4, 3], [1, 4]],
  [[0, 2], [1, 3], [2, 4], [3, 4], [0, 1], [2, 3]]
];

const wallCardSizes = [
  { width: "clamp(170px, 13.4vw, 186px)", minHeight: "218px", pad: "13px" },
  { width: "clamp(196px, 15.1vw, 212px)", minHeight: "238px", pad: "14px" },
  { width: "clamp(218px, 16.8vw, 234px)", minHeight: "258px", pad: "15px" },
  { width: "clamp(184px, 14.2vw, 202px)", minHeight: "228px", pad: "14px" },
  { width: "clamp(206px, 15.8vw, 224px)", minHeight: "248px", pad: "15px" }
];

function getWallLayout(wallIndex) {
  return wallClueLayouts[wallIndex % wallClueLayouts.length];
}

function getWallLinks(wallIndex) {
  return wallClueLinks[wallIndex % wallClueLinks.length];
}

function wallPathD(from, to, linkIndex, wallIndex) {
  return `M ${from.cx} ${from.cy} L ${to.cx} ${to.cy}`;
}

function wallBloodDrops(pathId, linkIndex, wallIndex) {
  const drops = [0, 1, 2].map((_, dropIndex) => {
    const length = (1.55 + ((linkIndex + dropIndex) % 3) * 0.42).toFixed(2);
    const height = 0.24;
    const radius = height / 2;
    const duration = (2.75 + ((wallIndex + dropIndex) % 3) * 0.42).toFixed(2);
    const delay = -(wallIndex * 0.31 + linkIndex * 0.19 + dropIndex * 0.72).toFixed(2);
    return `<rect class="blood-segment blood-segment-${dropIndex + 1}" x="${(-Number(length) / 2).toFixed(2)}" y="${(-height / 2).toFixed(2)}" width="${length}" height="${height}" rx="${radius}">
      <animateMotion dur="${duration}s" begin="${delay}s" repeatCount="indefinite" rotate="auto">
        <mpath href="#${pathId}" />
      </animateMotion>
    </rect>`;
  }).join("");
  return `<g class="blood-stream">${drops}</g>`;
}

function distributeToWalls(projects) {
  const size = Math.ceil(projects.length / 4);
  return Array.from({ length: 4 }, (_, i) => projects.slice(i * size, i * size + size));
}

function wallCardMarkup(project, index, localIndex, wallIndex) {
  const layout = getWallLayout(wallIndex);
  const pos = layout[localIndex % layout.length];
  const size = wallCardSizes[localIndex % wallCardSizes.length];
  const wind = getCardWindStyle(index + wallIndex, 0.6);
  return `<article class="project-card reveal-card" style="${wind}--wall-x:${pos.x}; --wall-y:${pos.y}; --wall-z:${pos.z}; --wall-rot:${pos.r}; --wall-scale:${pos.s}; --wall-card-width:${size.width}; --wall-card-min-height:${size.minHeight}; --wall-card-pad:${size.pad};" data-project="${escapeHtml(project.id)}" data-clue-index="${index}" data-wall-local="${localIndex}" aria-labelledby="project-title-${escapeHtml(project.id)}">
    <span class="card-dot card-dot-head" data-dot="${index}" aria-hidden="true"></span>
    <button class="cover project-play" type="button" data-play="${escapeHtml(project.id)}" aria-label="播放 ${escapeHtml(project.title)}">
      ${coverMarkup(project)}
    </button>
    <div>
      <div class="project-top"><span class="project-index">${String(index + 1).padStart(2, "0")}</span><span class="tag">${escapeHtml(project.category)}</span></div>
      <h3 class="project-title" id="project-title-${escapeHtml(project.id)}">${escapeHtml(project.title)}</h3>
      <div class="project-meta">${escapeHtml(project.year)} / ${escapeHtml(project.duration)} / ${escapeHtml(project.plays)} views</div>
    </div>
  </article>`;
}

function wallNetworkMarkup(wallProjects, startIndex, wallIndex) {
  const points = getWallLayout(wallIndex).slice(0, wallProjects.length);
  const lines = getWallLinks(wallIndex)
    .filter(([from, to]) => from < points.length && to < points.length)
    .map(([from, to], linkIndex) => {
      const a = points[from];
      const b = points[to];
      const d = wallPathD(a, b, linkIndex, wallIndex);
      const delay = (wallIndex * 0.23 + linkIndex * 0.17).toFixed(2);
      const pathId = `blood-path-${wallIndex}-${linkIndex}`;
      return `<path id="${pathId}" class="clue-link completed" data-from="${from}" data-to="${to}" pathLength="1" d="${d}" /><path class="clue-link clue-flow" data-from="${from}" data-to="${to}" style="--flow-delay:${delay}s" pathLength="1" d="${d}" />${wallBloodDrops(pathId, linkIndex, wallIndex)}`;
    }).join("");
  const cards = wallProjects.map((project, localIndex) => wallCardMarkup(project, startIndex + localIndex, localIndex, wallIndex)).join("");
  return `<div class="wall-network"><svg class="wall-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="blood-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="0.18" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 0.14 0 0 0  0 0 0.12 0 0  0 0 0 12 -5" result="goo" /><feComposite in="SourceGraphic" in2="goo" operator="atop" /></filter></defs>${lines}</svg>${cards}</div>`;
}

function syncWallLineCoordinates() {
  const room = els.projectList?.querySelector("[data-room]");
  if (!room || room.classList.contains("is-turning")) return;

  room.querySelectorAll(".room-wall").forEach((wall) => {
    const svg = wall.querySelector(".wall-lines");
    if (!svg || typeof svg.createSVGPoint !== "function") return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse();
    const cardPoints = new Map();

    wall.querySelectorAll(".project-card[data-wall-local]").forEach((card) => {
      const dot = card.querySelector(".card-dot");
      if (!dot) return;
      const dotRect = dot.getBoundingClientRect();
      const point = svg.createSVGPoint();
      point.x = dotRect.left + dotRect.width / 2;
      point.y = dotRect.top + dotRect.height / 2;
      cardPoints.set(Number(card.dataset.wallLocal), point.matrixTransform(inverse));
    });

    svg.querySelectorAll(".clue-link[data-from][data-to]").forEach((path) => {
      const from = cardPoints.get(Number(path.dataset.from));
      const to = cardPoints.get(Number(path.dataset.to));
      if (!from || !to) return;
      path.setAttribute("d", `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} L ${to.x.toFixed(2)} ${to.y.toFixed(2)}`);
    });
  });
}

function buildRoomMarkup(projects) {
  const walls = distributeToWalls(projects);
  const wallSize = Math.ceil(projects.length / 4);
  const wallsMarkup = walls.map((wallProjects, i) => {
    return `<div class="room-wall wall-${wallConfig[i].className}${i === 0 ? " is-active" : ""}" data-wall="${i}" aria-hidden="${i === 0 ? "false" : "true"}">
      <div class="wall-header">
        <span class="wall-label">${wallConfig[i].label}</span>
        <span class="wall-count">${wallProjects.length} 个作品</span>
      </div>
      ${wallNetworkMarkup(wallProjects, i * wallSize, i)}
    </div>`;
  }).join("");

  return `<div class="room-container" aria-label="3D 作品展厅">
    <div class="room-scene">
      <div class="room" data-room="true" data-active-wall="0">${wallsMarkup}</div>
    </div>
    <div class="room-controls">
      <button class="wall-btn wall-btn-left" type="button" data-rotate-wall="-1" aria-label="查看左侧墙壁">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="wall-indicator" aria-live="polite">
        <span class="wall-indicator-label">正面</span>
        <div class="wall-dots" aria-label="展厅墙面选择">${wallConfig.map((wall, i) => `<button class="wall-dot${i === 0 ? " active" : ""}" type="button" data-wall-dot="${i}" aria-label="查看${wall.label}墙面" aria-pressed="${i === 0 ? "true" : "false"}"></button>`).join("")}</div>
      </div>
      <button class="wall-btn wall-btn-right" type="button" data-rotate-wall="1" aria-label="查看右侧墙壁">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  </div>`;
}

function getWallIndexFromAngle(angle) {
  return (((Math.round(angle / 90) % 4) + 4) % 4);
}

function setWallVisibility(room, wallIndex) {
  room.querySelectorAll(".room-wall").forEach((wall, i) => {
    const active = i === wallIndex;
    wall.classList.toggle("is-active", active);
    wall.setAttribute("aria-hidden", String(!active));
  });
}

function hideInactiveWallsImmediately(room, wallIndex) {
  room.querySelectorAll(".room-wall").forEach((wall, i) => {
    if (i === wallIndex) return;
    wall.classList.add("room-wall-hidden-now");
    wall.classList.remove("is-active");
    wall.setAttribute("aria-hidden", "true");
  });
}

function releaseImmediateWallHiding(room) {
  requestAnimationFrame(() => {
    room.querySelectorAll(".room-wall-hidden-now").forEach((wall) => {
      wall.classList.remove("room-wall-hidden-now");
    });
  });
}

function clearRoomRotationVisualState() {
  if (!els.projectList) return;
  window.__cameraCooldownUntil = Date.now() + 1500;
  if (typeof window.clearProjectHoverEffects === "function") window.clearProjectHoverEffects({ skipDimRestore: true });
  if (typeof cancelFocusDimRelease === "function") cancelFocusDimRelease();
  if (typeof resetMatchingDraft === "function") resetMatchingDraft();

  state.expanded = null;
  [
    "--lens-x",
    "--lens-y",
    "--lens-scale",
    "--lens-scene-drift-x",
    "--lens-scene-drift-y",
    "--camera-pan-x",
    "--camera-pan-y",
    "--camera-zoom",
    "--camera-tilt-x",
    "--camera-tilt-y",
    "--camera-origin-x",
    "--camera-origin-y"
  ].forEach((name) => els.projectList.style.removeProperty(name));
  els.projectList.classList.remove("has-hover-focus", "is-focus", "focus-dim-release");
  els.projectList.querySelectorAll(".project-card").forEach((card) => {
    card.classList.remove(
      "is-focused",
      "expanded",
      "focus-motion-settling",
      "is-focus-dim-release",
      "is-hover-focus",
      "is-hover-near",
      "is-hover-far",
      "is-stack-selected",
      "is-stack-occluding"
    );
    ["--focus-tilt-x", "--focus-tilt-y", "--dof-blur", "--dof-scale", "--dof-z"].forEach((name) => {
      card.style.removeProperty(name);
    });
  });
}

function resetActiveWallRendering(room) {
  const activeWall = room.querySelector(".room-wall.is-active");
  if (!activeWall) return;
  const scene = room.closest(".room-container")?.querySelector(".room-scene");
  [scene, room, activeWall].filter(Boolean).forEach((el) => {
    el.style.willChange = "auto";
  });

  const renderTargets = activeWall.querySelectorAll(".project-card, .cover, .cover img, .wall-lines");
  renderTargets.forEach((el) => {
    el.style.willChange = "auto";
  });
  activeWall.classList.add("room-wall-render-reset");
  activeWall.getBoundingClientRect();
  requestAnimationFrame(() => {
    activeWall.classList.remove("room-wall-render-reset");
    [scene, room, activeWall, ...renderTargets].filter(Boolean).forEach((el) => {
      el.style.removeProperty("will-change");
    });
  });
}

function setActiveWall(wallIndex) {
  const room = els.projectList.querySelector("[data-room]");
  if (!room) return;
  const normalized = (((wallIndex % 4) + 4) % 4);
  roomState.wall = normalized;
  roomState.angle = normalized * 90;
  hideInactiveWallsImmediately(room, normalized);
  if (typeof gsap !== "undefined") gsap.set(room, { clearProps: "transform,willChange" });
  room.style.transform = "none";
  room.dataset.activeWall = String(normalized);
  room.classList.remove("is-turning");
  setWallVisibility(room, normalized);
  resetActiveWallRendering(room);
  releaseImmediateWallHiding(room);
  window.__cameraCooldownUntil = 0;
  requestAnimationFrame(syncWallLineCoordinates);
}

function applyRoomRotation(angle, animate) {
  const room = els.projectList.querySelector("[data-room]");
  if (!room) return;
  const targetWall = getWallIndexFromAngle(angle);
  if (animate) clearRoomRotationVisualState();
  if (!animate || prefersReduced) {
    roomState.animating = false;
    setActiveWall(targetWall);
    return;
  }
  roomState.animating = true;
  room.dataset.activeWall = String(targetWall);
  room.querySelectorAll(".room-wall").forEach((wall) => {
    wall.classList.add("is-active");
    wall.setAttribute("aria-hidden", "true");
  });
  room.classList.add("is-turning");
  room.style.transform = `rotateY(${-roomState.wall * 90}deg)`;
  const finish = () => {
    roomState.animating = false;
    setActiveWall(targetWall);
    updateWallUI();
  };
  if (typeof gsap !== "undefined") {
    gsap.killTweensOf(room);
    gsap.to(room, {
      rotateY: -targetWall * 90,
      duration: 0.62,
      ease: "power3.inOut",
      onComplete: finish
    });
  } else {
    window.setTimeout(finish, 620);
    requestAnimationFrame(() => {
      room.style.transform = `rotateY(${-targetWall * 90}deg)`;
    });
  }
}

function updateWallUI() {
  const indicator = els.projectList.querySelector(".wall-indicator-label");
  if (indicator) indicator.textContent = wallConfig[roomState.wall].label;
  els.projectList.querySelectorAll(".wall-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === roomState.wall);
    dot.setAttribute("aria-pressed", String(i === roomState.wall));
  });
}

function snapToWall(offset) {
  if (roomState.animating) return;
  const currentWall = roomState.wall;
  const wallIndex = currentWall + offset;
  const newWall = ((wallIndex % 4) + 4) % 4;
  const newAngle = newWall * 90;
  roomState.wall = currentWall;
  applyRoomRotation(newAngle, true);
  if (!roomState.animating) updateWallUI();
}

function setupDragRotation(container) {
  let dragging = false;
  let startX = 0;
  let startAngle = 0;

  container.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".project-card") || e.target.closest(".wall-btn") || e.target.closest("[data-wall-dot]")) return;
    dragging = true;
    startX = e.clientX;
    startAngle = roomState.angle;
    container.style.cursor = "grabbing";
    container.setPointerCapture?.(e.pointerId);
  });

  container.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    container.dataset.dragDirection = delta === 0 ? "0" : String(Math.sign(delta));
  });

  container.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    container.style.cursor = "grab";
    const delta = e.clientX - startX;
    if (Math.abs(delta) > 25) {
      snapToWall(delta > 0 ? 1 : -1);
    } else {
      applyRoomRotation(startAngle, true);
    }
    delete container.dataset.dragDirection;
    updateWallUI();
  });
}

function setupWallButtons() {
  const left = els.projectList.querySelector("[data-rotate-wall='-1']");
  const right = els.projectList.querySelector("[data-rotate-wall='1']");
  if (left) left.addEventListener("click", () => snapToWall(-1));
  if (right) right.addEventListener("click", () => snapToWall(1));
  els.projectList.querySelectorAll("[data-wall-dot]").forEach((dot) => {
    dot.addEventListener("click", () => {
      const target = Number(dot.dataset.wallDot);
      if (Number.isNaN(target)) return;
      const diff = target - roomState.wall;
      if (diff === 0) return;
      const offset = ((diff + 2) % 4) - 2;
      snapToWall(offset);
    });
  });
}

let roomClickBound = false;

function setupRoomCardClicks() {
  if (roomClickBound) return;
  roomClickBound = true;
  els.projectList.addEventListener("click", (e) => {
    const card = e.target.closest(".room-wall .project-card");
    if (!card || !card.dataset.project) {
      if (els.projectList.classList.contains("is-focus")) {
        clearProjectFocus();
        els.screenStatus.textContent = "已取消作品聚焦";
      }
      return;
    }
    if (e.target.closest("a")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    activateProjectCard(card, card.dataset.project, card);
  }, true);
}

let roomKeyBound = false;

function setup3DKeyboard() {
  if (roomKeyBound) return;
  roomKeyBound = true;
  document.addEventListener("keydown", (e) => {
    if (state.route !== "blog" || !els.projectList.querySelector("[data-room]")) return;
    if (e.target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); snapToWall(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); snapToWall(1); }
  });
}

function initRoom() {
  roomState = { angle: 0, wall: 0, animating: false };
  const container = els.projectList.querySelector(".room-container");
  applyRoomRotation(0, false);
  requestAnimationFrame(syncWallLineCoordinates);
  if (container) setupDragRotation(container);
  setupWallButtons();
  setupRoomCardClicks();
  setup3DKeyboard();
}
