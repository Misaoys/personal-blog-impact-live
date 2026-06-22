function handlePlayClick(event, play) {
  event.preventDefault();
  event.stopPropagation();
  const card = play.closest(".project-card");
  if (card && els.projectList.contains(card)) activateProjectCard(card, play.dataset.play, play);
  else openVideoPlayer(play.dataset.play);
}

function settleHeroSliceStageState(stage) {
  if (!stage) return;
  stage.dataset.state = "scattered";
  const slices = Array.from(stage.querySelectorAll("[data-hero-slice]"));
  if (hasGsap && typeof gsap !== "undefined") gsap.set(slices, { clearProps: "transform,willChange,translate,rotate,scale" });
  stage.classList.remove("is-animating", "is-restoring", "is-scattering", "is-restored", "is-restored-visual");
  stage.heroSliceTransition = null;
  resetHeroSliceParallax(stage);
  resetHeroRestoredParallax(stage, { includeScroll: true, includeOverlay: true });
}

function resetHeroSliceParallax(stage, options) {
  if (!stage) return;
  if (stage.classList.contains("is-route-geometry-locked")) return;
  const slices = Array.from(stage.querySelectorAll("[data-hero-slice]"));
  const preserveTransform = options?.preserveTransform ?? (stage.dataset.state === "restored" || stage.classList.contains("is-restored"));
  if (!preserveTransform && typeof gsap !== "undefined") gsap.set(slices, { clearProps: "transform,willChange,translate,rotate,scale" });
  stage.style.removeProperty("--hero-perspective-x");
  stage.style.removeProperty("--hero-perspective-y");
  slices.forEach((slice) => {
    slice.style.setProperty("--slice-tilt-x", "0deg");
    slice.style.setProperty("--slice-tilt-y", "0deg");
    slice.style.setProperty("--slice-depth-x", "0px");
    slice.style.setProperty("--slice-depth-y", "0px");
    slice.style.removeProperty("--slice-depth-z");
    slice.style.setProperty("--slice-align-x", "0px");
    slice.style.setProperty("--slice-align-y", "0px");
    slice.style.setProperty("--slice-align-rotation", "0deg");
    slice.style.setProperty("--slice-image-x", "0px");
    slice.style.setProperty("--slice-image-y", "0px");
    slice.style.removeProperty("--slice-glare-x");
    slice.style.removeProperty("--slice-glare-y");
  });
}

function resetHeroRestoredParallax(stage, options) {
  const field = stage?.querySelector(".hero-slice-field");
  if (stage?.classList.contains("is-route-geometry-locked")) return;
  if (!field) return;
  field.style.setProperty("--hero-camera-x", "0deg");
  field.style.setProperty("--hero-camera-y", "0deg");
  field.style.setProperty("--hero-camera-z", "0px");
  field.style.setProperty("--hero-align-progress", "0");
  field.style.setProperty("--hero-view-glow", "0");
  field.style.removeProperty("--hero-vanishing-x");
  field.style.removeProperty("--hero-vanishing-y");
  stage?.style.removeProperty("--hero-perspective-x");
  stage?.style.removeProperty("--hero-perspective-y");
  field.style.setProperty("--restored-image-x", "0px");
  field.style.setProperty("--restored-image-y", "0px");
  if (options?.includeScroll) field.style.setProperty("--restored-scroll-y", "0px");
  if (options?.includeOverlay) field.style.setProperty("--restored-overlay-opacity", "0");
  stage?.classList.remove("is-view-seeking", "is-view-aligned");
}

function updateHeroViewAlignment(stage, event) {
  const field = stage?.querySelector(".hero-slice-field");
  if (!field || prefersReduced || event.pointerType === "touch" || stage.classList.contains("is-animating")) {
    resetHeroRestoredParallax(stage, { includeOverlay: true });
    return { progress: 0, nx: 0, ny: 0 };
  }
  const rect = field.getBoundingClientRect();
  if (!rect.width || !rect.height) return { progress: 0, nx: 0, ny: 0 };
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  const nx = Math.max(-1, Math.min(1, (px - 0.5) * 2));
  const ny = Math.max(-1, Math.min(1, (py - 0.5) * 2));
  const targetX = 0.62;
  const targetY = 0.34;
  const distance = Math.hypot((px - targetX) / 0.34, (py - targetY) / 0.3);
  const raw = Math.max(0, Math.min(1, 1 - distance));
  const progress = raw * raw * (3 - 2 * raw);
  const opacity = 0;
  const cameraX = -ny * 13.5;
  const cameraY = nx * 18;
  field.style.setProperty("--restored-overlay-opacity", opacity.toFixed(3));
  field.style.setProperty("--restored-image-x", `${(-nx * 8 * progress).toFixed(2)}px`);
  field.style.setProperty("--restored-image-y", `${(-ny * 5 * progress).toFixed(2)}px`);
  field.style.setProperty("--hero-camera-x", `${cameraX.toFixed(2)}deg`);
  field.style.setProperty("--hero-camera-y", `${cameraY.toFixed(2)}deg`);
  field.style.setProperty("--hero-camera-z", `${(progress * 24).toFixed(2)}px`);
  field.style.setProperty("--hero-align-progress", progress.toFixed(3));
  field.style.setProperty("--hero-view-glow", "0");
  field.style.setProperty("--hero-vanishing-x", `${(50 + nx * 18).toFixed(1)}%`);
  field.style.setProperty("--hero-vanishing-y", `${(42 + ny * 14).toFixed(1)}%`);
  stage.style.setProperty("--hero-perspective-x", `${(50 + nx * 10).toFixed(1)}%`);
  stage.style.setProperty("--hero-perspective-y", `${(44 + ny * 8).toFixed(1)}%`);
  stage.classList.toggle("is-view-seeking", progress > 0.03);
  stage.classList.toggle("is-view-aligned", progress > 0.62);
  return { progress, nx, ny };
}

function updateHeroSliceParallax(event) {
  const stage = event.currentTarget;
  if (!stage || prefersReduced || event.pointerType === "touch" || stage.classList.contains("is-animating")) {
    resetHeroSliceParallax(stage);
    resetHeroRestoredParallax(stage, { includeOverlay: true });
    return;
  }
  resetHeroRestoredParallax(stage, { includeScroll: true });
  const view = updateHeroViewAlignment(stage, event);
  const alignProgress = view.progress;
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
  const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
  const factors = [1.12, 0.88, 0.96, 1.2, 0.82];
  const baseDepths = [48, 92, -34, 128, 30];
  const focusDepths = [18, 50, -12, 78, 24];
  const glareOffsets = [
    { x: -7, y: -9 },
    { x: 8, y: -8 },
    { x: -9, y: 7 },
    { x: 2, y: 2 },
    { x: 10, y: 4 }
  ];
  Array.from(stage.querySelectorAll("[data-hero-slice]")).forEach((slice, index) => {
    const factor = factors[index] || 1;
    const glare = glareOffsets[index] || { x: 0, y: 0 };
    const scatterX = Number(slice.dataset.scatterX || 0);
    const scatterY = Number(slice.dataset.scatterY || 0);
    const scatterRotation = Number(slice.dataset.scatterRotation || 0);
    const seek = alignProgress * 0.76;
    const depthBase = baseDepths[index] ?? 0;
    const depthFocus = focusDepths[index] ?? depthBase;
    const depthZ = depthBase + (depthFocus - depthBase) * alignProgress + (nx - ny) * 6 * factor;
    slice.style.setProperty("--slice-align-x", `${(-scatterX * seek).toFixed(2)}px`);
    slice.style.setProperty("--slice-align-y", `${(-scatterY * seek).toFixed(2)}px`);
    slice.style.setProperty("--slice-align-rotation", `${(-scatterRotation * seek * 0.86).toFixed(2)}deg`);
    slice.style.setProperty("--slice-depth-z", `${depthZ.toFixed(2)}px`);
    slice.style.setProperty("--slice-tilt-x", `${(-ny * 6.8 * factor + alignProgress * (index - 2) * 0.42).toFixed(2)}deg`);
    slice.style.setProperty("--slice-tilt-y", `${(nx * 8.6 * factor - alignProgress * (index === 3 ? 1.8 : 0.6)).toFixed(2)}deg`);
    slice.style.setProperty("--slice-depth-x", `${(nx * (10 + alignProgress * 6) * factor).toFixed(2)}px`);
    slice.style.setProperty("--slice-depth-y", `${(ny * (8 + alignProgress * 4) * factor).toFixed(2)}px`);
    slice.style.setProperty("--slice-image-x", `${(-nx * (16 + alignProgress * 10) * factor).toFixed(2)}px`);
    slice.style.setProperty("--slice-image-y", `${(-ny * (12 + alignProgress * 8) * factor).toFixed(2)}px`);
    slice.style.setProperty("--slice-glare-x", `${(52 + nx * 28 + glare.x).toFixed(1)}%`);
    slice.style.setProperty("--slice-glare-y", `${(38 + ny * 24 + glare.y).toFixed(1)}%`);
  });
}

const heroSliceStage = document.querySelector(".hero-slice-stage");
if (heroSliceStage) {
  settleHeroSliceStageState(heroSliceStage);
  heroSliceStage.addEventListener("pointermove", updateHeroSliceParallax);
  heroSliceStage.addEventListener("pointerleave", () => {
    resetHeroSliceParallax(heroSliceStage);
    resetHeroRestoredParallax(heroSliceStage, { includeOverlay: true });
  });
}

document.addEventListener("click", (event) => {
  const route = event.target.closest("button[data-route], a[data-route]");
  if (route) { event.preventDefault(); setRoute(route.dataset.route); return; }

  const play = event.target.closest("[data-play]");
  if (play) { handlePlayClick(event, play); return; }

  const endpoint = event.target.closest("[data-endpoint]");
  if (endpoint) {
    event.stopPropagation();
    const index = Number(endpoint.dataset.endpoint);
    if (Number.isNaN(index)) return;
    if (state.matchingStart === null || state.matchingStart === undefined) {
      startMatch(index);
    } else {
      completeMatch(index);
    }
    return;
  }

  const project = event.target.closest(".project-card");
  if (project && project.dataset.project) {
    if (event.target.closest(".card-dot")) return;
    if (event.target.closest(".room-wall")) return;
    activateProjectCard(project, project.dataset.project, project);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.videoPlayer.classList.contains("hidden")) {
    closeVideoPlayer();
    return;
  }

  if (event.key === "Escape" && els.projectList.classList.contains("is-focus")) {
    clearProjectFocus();
    els.screenStatus.textContent = "已取消当前连线";
    return;
  }

  const endpoint = event.target.closest("[data-endpoint]");
  if (endpoint && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    const index = Number(endpoint.dataset.endpoint);
    if (Number.isNaN(index)) return;
    if (state.matchingStart === null || state.matchingStart === undefined) startMatch(index);
    else completeMatch(index);
    return;
  }

  const project = event.target.closest(".project-card");
  if (!project || !project.dataset.project) return;
  if (event.target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activateProjectCard(project, project.dataset.project, project);
  }
});

if (els.playerClose) {
  els.playerClose.addEventListener("click", () => closeVideoPlayer());
}
if (els.videoPlayer) {
  els.videoPlayer.addEventListener("click", (event) => {
    if (event.target === els.videoPlayer) closeVideoPlayer();
  });
}

els.projectList.addEventListener("pointerdown", (event) => {
  const endpoint = event.target.closest("[data-endpoint]");
  if (!endpoint || window.matchMedia("(max-width: 980px)").matches) return;
  const index = Number(endpoint.dataset.endpoint);
  if (Number.isNaN(index)) return;
  state.dragCandidate = index;
  event.preventDefault();
});

els.projectList.addEventListener("pointermove", (event) => {
  if (state.dragCandidate !== null && state.dragCandidate !== undefined && (state.draggingEndpoint === null || state.draggingEndpoint === undefined)) {
    state.draggingEndpoint = state.dragCandidate;
    startMatch(state.draggingEndpoint);
    els.projectList.setPointerCapture?.(event.pointerId);
  }
  if (state.matchingStart === null || state.matchingStart === undefined) return;
  updateDraftLine(event.clientX, event.clientY);
});

els.projectList.addEventListener("pointerup", (event) => {
  if (state.draggingEndpoint === null || state.draggingEndpoint === undefined) {
    state.dragCandidate = null;
    return;
  }
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-endpoint]");
  const targetIndex = target && els.projectList.contains(target) ? Number(target.dataset.endpoint) : NaN;
  if (!Number.isNaN(targetIndex) && targetIndex !== state.draggingEndpoint) {
    completeMatch(targetIndex);
  } else {
    resetMatchingDraft();
  }
  state.draggingEndpoint = null;
  state.dragCandidate = null;
});

(function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-links");
  if (!toggle || !menu) return;

  let scrollY = 0;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (open) {
      scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    }
  }

  toggle.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));

  menu.addEventListener("click", (e) => {
    if (e.target.closest(".nav-btn")) setOpen(false);
  });

  document.addEventListener("click", (e) => {
    if (menu.classList.contains("is-open") && !menu.contains(e.target) && !toggle.contains(e.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) setOpen(false);
  });

  const mql = window.matchMedia("(min-width: 981px)");
  function onResize() {
    if (mql.matches && menu.classList.contains("is-open")) setOpen(false);
  }
  if (mql.addEventListener) mql.addEventListener("change", onResize);
  else mql.addListener(onResize);
})();
