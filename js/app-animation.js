let pageSettleTimer = 0;
let routeTransitionLayer = null;
let routeTransitionRunId = 0;

function getPageStageMinHeight() {
  const topbar = document.querySelector(".topbar");
  const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : 0;
  return Math.max(0, window.innerHeight - topbarBottom);
}

function setPageTransitionStageHeight(transitionViews) {
  const main = document.getElementById("mainContent");
  if (!main) return;
  const heights = (transitionViews || [])
    .filter(Boolean)
    .map(view => Math.ceil(view.getBoundingClientRect().height));
  const height = Math.max(getPageStageMinHeight(), ...heights, 0);
  main.style.setProperty("--page-transition-height", height + "px");
}

function beginPageTransitionStage(transitionViews) {
  const main = document.getElementById("mainContent");
  if (!main) return;
  setPageTransitionStageHeight(transitionViews);
  main.classList.add("is-transitioning");
}

function endPageTransitionStage() {
  const main = document.getElementById("mainContent");
  if (!main) return;
  main.classList.remove("is-transitioning");
  main.style.removeProperty("--page-transition-height");
}

function settleRevealState(view) {
  if (!view) return;
  view.style.opacity = "1";
  view.style.transform = "none";
  view.style.visibility = "visible";
  view.querySelectorAll(".reveal-block").forEach(block => {
    block.classList.remove("gsap-motion-lock");
    block.style.opacity = "1";
    block.style.transform = "none";
    block.style.visibility = "visible";
  });
}

function clearPageSettleTimer() {
  if (pageSettleTimer) {
    clearTimeout(pageSettleTimer);
    pageSettleTimer = 0;
  }
}

function getRouteTransitionLayer() {
  if (routeTransitionLayer) return routeTransitionLayer;
  routeTransitionLayer = document.createElement("div");
  routeTransitionLayer.className = "route-transition-layer";
  routeTransitionLayer.dataset.transition = "idle";
  routeTransitionLayer.setAttribute("aria-hidden", "true");
  routeTransitionLayer.innerHTML = '<span class="route-transition-veil"></span><span class="route-transition-dream-field"></span><span class="route-transition-rgb" data-channel="red"></span><span class="route-transition-rgb" data-channel="green"></span><span class="route-transition-rgb" data-channel="blue"></span>';
  document.body.appendChild(routeTransitionLayer);
  return routeTransitionLayer;
}

function settleRouteTransitionLayer(layer) {
  if (!layer) return;
  layer.dataset.transition = "idle";
  document.querySelectorAll(".is-rgb-dispersing").forEach(item => item.classList.remove("is-rgb-dispersing"));
  if (!hasGsap || prefersReduced) return;
  gsap.set(layer, { autoAlpha: 0, clearProps: "transform,filter,clipPath,willChange" });
  gsap.set(layer.querySelectorAll(".route-transition-veil,.route-transition-rgb,.route-transition-dream-field"), { clearProps: "transform,opacity,visibility,filter,clipPath,willChange" });
}

function playDreamDistortionTransition(options) {
  const layer = getRouteTransitionLayer();
  const veil = layer.querySelector(".route-transition-veil");
  const dreamField = layer.querySelector(".route-transition-dream-field");
  const direction = options?.direction === "up" ? "up" : "down";
  const drift = direction === "down" ? 1 : -1;
  const outgoingView = options?.outgoingView || null;
  const incomingView = options?.incomingView || null;
  const coverAt = options?.coverAt ?? 0.66;
  const lockOutgoingGeometry = Boolean(options?.lockOutgoingGeometry);

  layer.dataset.transition = "active";
  [outgoingView, incomingView].filter(Boolean).forEach(view => view.classList.add("is-rgb-dispersing"));
  gsap.killTweensOf([layer, veil, dreamField, outgoingView, incomingView].filter(Boolean));
  gsap.set(layer, { autoAlpha: 1, willChange: "opacity" });
  gsap.set(veil, { autoAlpha: 0, willChange: "opacity" });
  gsap.set(dreamField, {
    autoAlpha: 0,
    scale: 0.76,
    x: 8 * drift,
    y: -6 * drift,
    rotation: -2.2 * drift,
    willChange: "transform,opacity"
  });
  if (outgoingView) gsap.set(outgoingView, { transformOrigin: "50% 52%", willChange: "transform,opacity" });
  if (incomingView) gsap.set(incomingView, { transformOrigin: "50% 52%", willChange: "transform,opacity" });

  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  tl.addLabel("gather", 0).addLabel("cover", coverAt).addLabel("release", coverAt + 0.2);
  tl.to(veil, { autoAlpha: 0.92, duration: coverAt + 0.12, ease: "sine.inOut" }, "gather");
  tl.to(dreamField, { autoAlpha: 1, scale: 1.04, x: 0, y: 0, rotation: 0, duration: coverAt + 0.22, ease: "sine.inOut" }, "gather");
  if (outgoingView) {
    tl.to(outgoingView, {
      autoAlpha: 0,
      scale: lockOutgoingGeometry ? 1 : 0.992,
      rotation: lockOutgoingGeometry ? 0 : 0.12 * drift,
      skewX: lockOutgoingGeometry ? 0 : -0.68 * drift,
      duration: coverAt + 0.04,
      ease: "sine.inOut"
    }, "gather+=0.04");
  }
  tl.add(() => {
    if (typeof options?.onCover === "function") options.onCover();
  }, "cover");
  tl.to(dreamField, { autoAlpha: 0, scale: 1.14, x: -7 * drift, y: 5 * drift, rotation: 1.1 * drift, duration: 0.86, ease: "sine.inOut" }, "release");
  tl.to(veil, { autoAlpha: 0.12, duration: 0.86, ease: "sine.inOut" }, "release-=0.04");
  tl.to(layer, { autoAlpha: 0, duration: 0.36, ease: "sine.inOut" }, "release+=0.5");
  tl.eventCallback("onComplete", () => {
    settleRouteTransitionLayer(layer);
    if (typeof options?.onComplete === "function") options.onComplete();
  });
  return tl;
}

function isolateRouteTransitionViews(incomingView, outgoingView) {
  Object.values(views).forEach(view => {
    if (!view || view === incomingView || view === outgoingView) return;
    view.classList.add("inactive");
    view.classList.remove("gsap-motion-lock");
    if (hasGsap && !prefersReduced) {
      gsap.set(view, { clearProps: "transform,opacity,visibility,willChange" });
    }
  });
}

function settleHeroForRouteTransition(heroStage, preserveCurrentGeometry) {
  if (!heroStage) return;
  if (preserveCurrentGeometry) {
    heroStage.classList.add("is-route-geometry-locked");
    heroStage.style.perspectiveOrigin = getComputedStyle(heroStage).perspectiveOrigin;
    [heroStage.querySelector(".hero-slice-field"), ...heroStage.querySelectorAll("[data-hero-slice]")].filter(Boolean).forEach(target => {
      const transform = getComputedStyle(target).transform;
      target.style.transform = transform && transform !== "none" ? transform : "none";
      target.style.transition = "none";
    });
    heroStage.classList.remove("is-animating", "is-restoring", "is-scattering", "is-restored-visual", "is-view-seeking", "is-view-aligned");
    heroStage.heroSliceTransition = null; return;
  }
  heroStage.classList.remove("is-route-geometry-locked");
  if (typeof settleHeroSliceStageState === "function") return settleHeroSliceStageState(heroStage);
  heroStage.classList.remove("is-animating", "is-restoring", "is-scattering", "is-restored-visual", "is-view-seeking", "is-view-aligned");
  document.querySelector("#homeView .hero-slice-field")?.style.setProperty("--restored-overlay-opacity", "0");
}
function resetCardReveal(cards, isGridNetwork) {
  cards.forEach(card => {
    card.style.opacity = 1;
    card.style.filter = "none";
    card.style.clipPath = "none";
    card.style.willChange = "";
    card.classList.remove("gsap-motion-lock");
    if (!isGridNetwork) card.style.transform = "none";
  });
}
function prepareMotionTargets(targets) {
  if (!hasGsap || prefersReduced) return;
  const list = Array.from(targets || []).filter(Boolean);
  if (!list.length) return;
  list.forEach(target => {
    target.classList?.add("gsap-motion-lock");
  });
  gsap.set(list, { willChange: "transform,opacity" });
}
function clearMotionTargets(targets) {
  if (!hasGsap || prefersReduced) return;
  const list = Array.from(targets || []).filter(Boolean);
  if (!list.length) return;
  list.forEach(target => target.classList?.remove("gsap-motion-lock"));
  gsap.set(list, { clearProps: "transform,opacity,visibility,willChange,transition" });
}

function prepareCardReveal(cards) {
  if (!hasGsap || prefersReduced) return;
  cards.forEach(card => card.classList.add("gsap-motion-lock"));
  gsap.killTweensOf(cards);
  gsap.set(cards, {
    opacity: 0,
    willChange: "opacity"
  });
}

function appendCardAnimations(tl, scope, position) {
  const cards = Array.from(scope.querySelectorAll(".reveal-card"));
  if (!cards.length) return null;
  const isGridNetwork = scope.classList.contains("grid-mode");

  if (!hasGsap || prefersReduced) {
    resetCardReveal(cards, isGridNetwork);
    return null;
  }

  prepareCardReveal(cards);
  tl.to(cards, {
    opacity: 1,
    duration: isGridNetwork ? 0.38 : 0.34,
    stagger: { amount: isGridNetwork ? 0.28 : 0.18, from: isGridNetwork ? "center" : "start" },
    ease: "power2.out",
    overwrite: "auto",
    clearProps: "opacity,willChange",
    onComplete: () => {
      if (isGridNetwork) gsap.set(cards, { clearProps: "transform" });
      cards.forEach(card => card.classList.remove("gsap-motion-lock"));
      if (isGridNetwork && els.projectList.classList.contains("grid-mode")) syncClueCoordinates();
    }
  }, position);
  return tl;
}

function animateCards(scope) {
  if (!hasGsap || prefersReduced) return appendCardAnimations(null, scope, 0);
  const cardTl = gsap.timeline({ defaults: { overwrite: "auto" } });
  appendCardAnimations(cardTl, scope, 0);
  return cardTl;
}

function splitHomeTitle() {
  const title = document.getElementById("homeTitle");
  if (!title || title.dataset.split) return;
  if (title.hasAttribute("data-layered-title")) {
    title.dataset.split = "true";
    return;
  }
  title.dataset.split = "true";
  const text = title.textContent.trim();
  title.innerHTML = text.split("").map(ch => {
    if (ch === " ") return '<span class="hero-char" style="display:inline-block;width:0.3em">&nbsp;</span>';
    return '<span class="hero-char" style="display:inline-block">' + ch + '</span>';
  }).join("");
}

function getEnterBlocks(view) {
  return Array.from(view.querySelectorAll(view.id === "homeView" ? ".reveal-block:not(.hero)" : ".reveal-block"));
}

function getHomeEnterParts() {
  const sliceStage = document.querySelector("#homeView .hero-slice-stage");
  return {
    hero: document.querySelector("#homeView .hero"),
    heroMain: document.querySelector("#homeView .hero-main"),
    kicker: null,
    chars: document.querySelectorAll("#homeView .hero-char"),
    heroSide: sliceStage,
    portrait: document.querySelector("#homeView .hero-slice-field"),
    slices: document.querySelectorAll("#homeView [data-hero-slice]"),
    infoItems: document.querySelectorAll("#homeView .hero-copy, #homeView .hero-slice-index, #homeView .hero-actions")
  };
}

function getHeroSliceTargetMotion(slice, restored) {
  return {
    x: restored ? 0 : Number(slice?.dataset.scatterX || 0),
    y: restored ? 0 : Number(slice?.dataset.scatterY || 0),
    rotation: restored ? 0 : Number(slice?.dataset.scatterRotation || 0)
  };
}

function getHeroSliceIntroMotion(slice, index, restored) {
  const target = getHeroSliceTargetMotion(slice, restored);
  const offsets = [
    { x: -54, y: -28, rotation: -5 },
    { x: 48, y: -34, rotation: 4 },
    { x: -46, y: 42, rotation: 5 },
    { x: 18, y: 34, rotation: -3 },
    { x: 58, y: 30, rotation: 6 }
  ];
  const offset = offsets[index % offsets.length];
  return {
    x: target.x + offset.x,
    y: target.y + offset.y,
    rotation: target.rotation + offset.rotation
  };
}

function prepareEnterAnimationState(view) {
  if (!hasGsap || prefersReduced || !view) return;

  const blocks = getEnterBlocks(view);
  if (blocks.length) {
    prepareMotionTargets(blocks);
    gsap.killTweensOf(blocks);
    gsap.set(blocks, { autoAlpha: 0, y: 16 });
  }

  if (view.id !== "homeView") return;
  splitHomeTitle();
  const parts = getHomeEnterParts();
  const sliceList = Array.from(parts.slices || []);
  const slicesRestored = parts.heroSide?.dataset.state === "restored" || parts.heroSide?.classList.contains("is-restored");
  if (parts.hero) gsap.set(parts.hero, { autoAlpha: 1, y: 0, clearProps: "transform,opacity,visibility" });
  prepareMotionTargets([parts.heroMain, parts.kicker, ...parts.chars, parts.heroSide, parts.portrait, ...sliceList, ...parts.infoItems]);
  gsap.killTweensOf([parts.heroMain, parts.kicker, ...parts.chars, parts.heroSide, parts.portrait, ...sliceList, ...parts.infoItems]);
  if (parts.heroMain) gsap.set(parts.heroMain, { autoAlpha: 0, x: -28 });
  if (parts.kicker) gsap.set(parts.kicker, { autoAlpha: 0, x: -16 });
  if (parts.chars.length) gsap.set(parts.chars, { autoAlpha: 0, xPercent: -45 });
  if (parts.heroSide) gsap.set(parts.heroSide, { autoAlpha: 0, x: 28 });
  if (parts.portrait) gsap.set(parts.portrait, { autoAlpha: 0 });
  if (sliceList.length) {
    parts.heroSide?.classList.add("is-animating");
    sliceList.forEach((slice, index) => {
      gsap.set(slice, {
        ...getHeroSliceIntroMotion(slice, index, slicesRestored),
        autoAlpha: 0,
        willChange: "transform,opacity,clip-path"
      });
    });
  }
  if (parts.infoItems.length) gsap.set(parts.infoItems, { autoAlpha: 0, x: 18 });
}

function appendEnterAnimations(tl, view, direction, position) {
  if (!hasGsap || prefersReduced) {
    view.querySelectorAll(".reveal-block").forEach(item => {
      item.style.opacity = 1;
      item.style.transform = "none";
    });
    if (view.id === "homeView") {
      document.querySelector("#homeView .hero")?.style.setProperty("opacity", "1");
      document.querySelector("#homeView .hero")?.style.setProperty("transform", "none");
      document.querySelector("#homeView .hero-main")?.style.setProperty("opacity", "1");
      document.querySelectorAll("#homeView .hero-char").forEach(ch => { ch.style.opacity = 1; ch.style.transform = "none"; });
      document.querySelector("#homeView .hero-slice-stage")?.style.setProperty("opacity", "1");
      document.querySelectorAll("#homeView .hero-slice-field, #homeView .hero-copy, #homeView .hero-slice-index, #homeView .hero-actions").forEach(el => { el.style.opacity = 1; });
      document.querySelectorAll("#homeView .hero-copy, #homeView .hero-slice-index, #homeView .hero-actions").forEach(el => { el.style.transform = "none"; });
    }
    return null;
  }

  prepareEnterAnimationState(view);

  const blocks = getEnterBlocks(view);
  if (blocks.length) {
    tl.to(blocks, {
      autoAlpha: 1,
      y: 0,
      duration: 0.42,
      stagger: 0.045,
      ease: "power3.out",
      overwrite: "auto",
      clearProps: "transform,opacity,visibility,willChange",
      onComplete: () => blocks.forEach(block => block.classList.remove("gsap-motion-lock"))
    }, position);
  }

  if (view.id === "homeView") {
    const { hero, heroMain, kicker, chars, heroSide, portrait, slices, infoItems } = getHomeEnterParts();
    const sliceList = Array.from(slices || []);
    const slicesRestored = heroSide?.dataset.state === "restored" || heroSide?.classList.contains("is-restored");

    if (hero) {
      tl.set(hero, { autoAlpha: 1, y: 0, clearProps: "transform,opacity,visibility" }, position);
    }
    if (heroMain) {
      tl.to(heroMain, { autoAlpha: 1, x: 0, duration: 0.48, ease: "power3.out", clearProps: "transform,opacity,visibility,willChange" }, position);
    }
    if (kicker) {
      tl.to(kicker, { autoAlpha: 1, x: 0, duration: 0.34, ease: "power2.out", clearProps: "transform,opacity,visibility,willChange" }, position + 0.06);
    }
    if (chars.length) {
      tl.to(chars, { autoAlpha: 1, xPercent: 0, duration: 0.34, stagger: 0.018, ease: "power2.out", clearProps: "transform,opacity,visibility,willChange" }, position + 0.1);
    }
    if (heroSide) {
      tl.to(heroSide, { autoAlpha: 1, x: 0, duration: 0.48, ease: "power3.out", clearProps: "transform,opacity,visibility,willChange" }, position + 0.08);
    }
    if (portrait) {
      tl.to(portrait, { autoAlpha: 1, duration: 0.46, ease: "power3.out", clearProps: "transform,opacity,visibility,willChange" }, position + 0.14);
    }
    if (sliceList.length) {
      tl.to(sliceList, {
        autoAlpha: 1,
        x: (_index, item) => getHeroSliceTargetMotion(item, slicesRestored).x,
        y: (_index, item) => getHeroSliceTargetMotion(item, slicesRestored).y,
        rotation: (_index, item) => getHeroSliceTargetMotion(item, slicesRestored).rotation,
        duration: 0.62,
        stagger: { amount: 0.16, from: "center" },
        ease: "power3.out",
        clearProps: "transform,opacity,visibility,willChange",
        onComplete: () => {
          heroSide?.classList.remove("is-animating");
          sliceList.forEach(slice => slice.classList.remove("gsap-motion-lock"));
        }
      }, position + 0.16);
    }
    if (infoItems.length) {
      tl.to(infoItems, {
        autoAlpha: 1,
        x: 0,
        duration: 0.36,
        stagger: 0.045,
        ease: "power2.out",
        clearProps: "transform,opacity,visibility,willChange",
        onComplete: () => [heroMain, kicker, ...chars, heroSide, portrait, ...infoItems].filter(Boolean).forEach(item => item.classList.remove("gsap-motion-lock"))
      }, position + 0.18);
    }
  }

  if (view.id === "blogView") {
    appendCardAnimations(tl, view, position + 0.12);
  }

  return tl;
}

function buildEnterTimeline(view, direction) {
  if (!hasGsap || prefersReduced) return appendEnterAnimations(null, view, direction, 0);
  const enterTl = gsap.timeline({ paused: true, defaults: { overwrite: "auto" } });
  appendEnterAnimations(enterTl, view, direction, 0);
  return enterTl;
}

function getIntroStrokeLength(path) {
  if (!path || typeof path.getTotalLength !== "function") return 0;
  try { return Math.max(0, path.getTotalLength()); } catch (error) { return 0; }
}
function appendIntroHandwrite(tl) {
  const intro = document.querySelector(".intro-handwrite");
  const strokes = Array.from(intro?.querySelectorAll("[data-signature-stroke]") || []);
  if (!tl || !intro) return tl;
  gsap.set(intro, { autoAlpha: 0 });
  strokes.forEach(path => {
    const length = getIntroStrokeLength(path);
    path.dataset.strokeLength = String(length);
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length
    });
  });

  tl.to(intro, { autoAlpha: 1, duration: 0.16 }, 0);
  if (!strokes.length) return tl;

  let position = 0.12;
  strokes.forEach((path, index) => {
    const length = Number(path.dataset.strokeLength || "0");
    const duration = Number(path.dataset.duration || "0.14");
    const isDot = duration <= 0.08;
    const tween = gsap.to(path, {
      strokeDashoffset: 0,
      duration,
      ease: isDot ? "power2.out" : "sine.inOut",
      onComplete: () => path.style.strokeDashoffset = "0"
    });
    tl.add(tween, position);
    position += duration + (isDot ? 0.025 : 0.015);
  });
  return tl;
}

function transitionPage(route) {
  const incomingView = views[route];
  if (!incomingView) return;

  const pageOrder = ["home", "blog", "about", "contact"];
  const prevRoute = state.route;
  const prevIndex = pageOrder.indexOf(prevRoute);
  const nextIndex = pageOrder.indexOf(route);
  const direction = nextIndex >= prevIndex ? "down" : "up";
  const dirY = direction === "down" ? 1 : -1;

  const outgoingView = views[prevRoute];
  const isSame = outgoingView === incomingView;
  const transitionRunId = ++routeTransitionRunId;

  state.route = route;

  function settleViews() {
    if (state.route !== route || routeTransitionRunId !== transitionRunId) return;
    clearPageSettleTimer();
    Object.entries(views).forEach(([key, view]) => {
      if (!view) return;
      view.classList.remove("gsap-motion-lock");
      view.classList.toggle("inactive", key !== route);
      if (hasGsap && !prefersReduced) {
        gsap.set(view, { clearProps: "transform,opacity,visibility,filter,clipPath,willChange" });
      }
      if (key === route) settleRevealState(view);
      if (key === route && key === "home") {
        const heroStage = view.querySelector(".hero-slice-stage");
        if (typeof settleHeroSliceStageState === "function") settleHeroSliceStageState(heroStage, { announceRestored: true });
        else {
          heroStage?.classList.remove("is-animating", "is-restoring", "is-scattering", "is-restored-visual", "is-view-seeking", "is-view-aligned");
          view.querySelector(".hero-slice-field")?.style.setProperty("--restored-overlay-opacity", "0");
          if (heroStage) heroStage.heroSliceTransition = null;
        }
      }
    });
    endPageTransitionStage();
    settleRouteTransitionLayer(routeTransitionLayer);
  }

  function scheduleSettle() {
    clearPageSettleTimer();
    pageSettleTimer = setTimeout(settleViews, 2600);
  }

  if (currentTransition) {
    currentTransition.kill();
    currentTransition = null;
  }
  clearPageSettleTimer();

  const animated = document.querySelectorAll(".page-view,.reveal-block,.reveal-card,.hero-char,.hero-main,.hero-slice-stage,.hero-slice-field,[data-hero-slice],.hero-copy,.hero-slice-index,.hero-actions");
  if (hasGsap && !prefersReduced) {
    const heroStage = document.querySelector("#homeView .hero-slice-stage");
    const preserveHomeGeometry = outgoingView?.id === "homeView" && !isSame;
    if (heroStage?.heroSliceTransition) {
      heroStage.heroSliceTransition.kill();
      heroStage.heroSliceTransition = null;
    }
    gsap.killTweensOf(animated);
    clearMotionTargets(animated);
    settleHeroForRouteTransition(heroStage, preserveHomeGeometry);
  }
  isolateRouteTransitionViews(incomingView, isSame ? null : outgoingView);

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  if (route === "blog") {
    renderProjectCount();
    renderProjects(true);
  }

  if (!hasGsap || prefersReduced) {
    if (!isSame) outgoingView.classList.add("inactive");
    incomingView.classList.remove("inactive");
    settleRevealState(incomingView);
    const enterTl = buildEnterTimeline(incomingView, direction);
    if (enterTl) enterTl.play();
    return;
  }

  beginPageTransitionStage([outgoingView || incomingView]);
  if (!isSame) {
    outgoingView.classList.remove("inactive");
  }
  incomingView.classList.remove("inactive");
  setPageTransitionStageHeight([outgoingView, incomingView]);

  prepareMotionTargets([incomingView, outgoingView]);
  gsap.set(incomingView, {
    autoAlpha: 0,
    y: 0,
    scale: 1.014,
    rotation: -0.08 * dirY
  });
  if (outgoingView && !isSame) gsap.set(outgoingView, { autoAlpha: 1 });
  prepareEnterAnimationState(incomingView);

  const routeCoverAt = isSame ? 0.54 : 0.66;
  const revealAt = Math.max(0.24, routeCoverAt - 0.12);
  const enterAt = routeCoverAt + 0.22;
  const tl = playDreamDistortionTransition({
    direction,
    coverAt: routeCoverAt,
    outgoingView: outgoingView && !isSame ? outgoingView : null,
    incomingView,
    lockOutgoingGeometry: outgoingView?.id === "homeView",
    onCover: () => { if (outgoingView && !isSame) gsap.set(outgoingView, { autoAlpha: 0 }); },
    onComplete: () => {
      if (routeTransitionRunId !== transitionRunId || currentTransition !== tl) return;
      settleViews();
      [outgoingView, incomingView].forEach(function(v) {
        if (!v) return;
        v.querySelectorAll(".reveal-block,.reveal-card,.hero-char,.hero-main,.hero-slice-stage,.hero-slice-field,[data-hero-slice],.hero-copy,.hero-slice-index,.hero-actions").forEach(function(b) {
          b.classList?.remove("is-route-geometry-locked"); gsap.set(b, { clearProps: "transform,opacity,visibility,filter,clipPath,willChange,transition,transitionProperty,perspectiveOrigin" });
        });
      });
      currentTransition = null;
    }
  });

  tl.to(incomingView, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    rotation: 0,
    skewX: 0,
    duration: 0.82,
    ease: "sine.inOut",
    clearProps: "transform,opacity,visibility,filter,clipPath,willChange"
  }, isSame ? 0.28 : revealAt);

  appendEnterAnimations(tl, incomingView, direction, isSame ? 0.5 : enterAt);

  currentTransition = tl;
  scheduleSettle();
}
