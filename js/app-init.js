function showSiteFallback() {
  if (els.introLoader) els.introLoader.style.display = "none";
  const enterTl = buildEnterTimeline(views.home, "down");
  if (els.siteRoot) els.siteRoot.style.opacity = 1;
  if (enterTl) enterTl.play();
}

function waitForHomeHeroImages(timeoutMs) {
  const images = Array.from(document.querySelectorAll("#homeView .hero-slice img"));
  if (!images.length) return Promise.resolve();
  const decoded = Promise.allSettled(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    if (typeof img.decode === "function") return img.decode().catch(() => {});
    return new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }));
  const timeout = new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
  return Promise.race([decoded, timeout]);
}

function runIntro() {
  renderProjectCount();
  const heroImagesReady = waitForHomeHeroImages(900);

  if (!hasGsap || prefersReduced) {
    showSiteFallback();
    return;
  }

  try {
    prepareEnterAnimationState(views.home);
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    const revealSite = () => {
      heroImagesReady.finally(() => {
        const enterTl = buildEnterTimeline(views.home, "down");
        if (els.siteRoot) els.siteRoot.style.opacity = 1;
        const transitionTl = playDreamDistortionTransition({
          direction: "down",
          coverAt: 1.02,
          outgoingView: els.introLoader,
          incomingView: views.home,
          onCover: () => {
            gsap.set(els.introLoader, { display: "none" });
          },
          onComplete: () => gsap.set(els.introLoader, { clearProps: "transform,opacity,visibility,filter,willChange" })
        });
        if (enterTl) transitionTl.add(() => enterTl.play(0), 0.52);
      });
    };
    appendIntroHandwrite(tl).add(revealSite, "+=0.14");
  } catch (e) {
    console.warn("[runIntro] GSAP animation failed, falling back:", e);
    showSiteFallback();
  }
}

(function() {
  var pageOrder = ["home", "blog", "about", "contact"];
  var wheelCooldown = false;

  function canSwitchPage() {
    if (wheelCooldown) return false;
    if (currentTransition) return false;
    if (!els.videoPlayer.classList.contains("hidden")) return false;
    if (els.projectList.classList.contains("is-focus")) return false;
    return true;
  }

  var touchStartY = 0;
  document.addEventListener("touchstart", function(e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", function(e) {
    if (!canSwitchPage()) return;
    var dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 60) return;
    var ci = pageOrder.indexOf(state.route);
    if (ci < 0) return;
    if (dy > 0 && ci < pageOrder.length - 1) {
      wheelCooldown = true;
      setRoute(pageOrder[ci + 1]);
      setTimeout(function() { wheelCooldown = false; }, 900);
    } else if (dy < 0 && ci > 0) {
      wheelCooldown = true;
      setRoute(pageOrder[ci - 1]);
      setTimeout(function() { wheelCooldown = false; }, 900);
    }
  }, { passive: true });
})();

(function() {
  if (prefersReduced || window.matchMedia("(hover: none)").matches) return;
  var glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);
  var raf = 0;
  document.addEventListener("mousemove", function(e) {
    if (raf) return;
    raf = requestAnimationFrame(function() {
      glow.style.setProperty("--glow-x", e.clientX + "px");
      glow.style.setProperty("--glow-y", e.clientY + "px");
      if (!glow.classList.contains("visible")) glow.classList.add("visible");
      raf = 0;
    });
  }, { passive: true });
  document.addEventListener("mouseleave", function() {
    glow.classList.remove("visible");
  });
})();

(function() {
  if (prefersReduced || !els.projectList || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var activeCard = null;
  var latestEvent = null;
  var hoverRaf = 0;
  var hoverCards = [];
  var lensLayer = null;
  var activeGeometry = null;
  var HOVER_DIM_RESTORE_MS = 2400;
  var hoverDimRestoreTimer = 0;

  function ensureLensLayer() {
    if (lensLayer && els.projectList.contains(lensLayer)) return lensLayer;
    lensLayer = document.createElement("div");
    lensLayer.className = "hover-lens-layer";
    lensLayer.setAttribute("aria-hidden", "true");
    els.projectList.appendChild(lensLayer);
    return lensLayer;
  }

  function clearCameraMotion() {
    ["--lens-x", "--lens-y", "--lens-scale", "--lens-scene-drift-x", "--lens-scene-drift-y", "--camera-pan-x", "--camera-pan-y", "--camera-zoom", "--camera-tilt-x", "--camera-tilt-y", "--camera-origin-x", "--camera-origin-y"].forEach(function(name) {
      els.projectList.style.removeProperty(name);
    });
    activeGeometry = null;
  }

  function clearDepthClasses() {
    hoverCards.forEach(function(card) {
      card.classList.remove("is-hover-near", "is-hover-far");
      card.style.removeProperty("--dof-blur");
      card.style.removeProperty("--dof-scale");
      card.style.removeProperty("--dof-z");
    });
    hoverCards = [];
  }

  function clearHoverDimRestore() {
    if (hoverDimRestoreTimer) {
      window.clearTimeout(hoverDimRestoreTimer);
      hoverDimRestoreTimer = 0;
    }
    els.projectList.classList.remove("hover-dim-restoring");
    els.projectList.querySelectorAll(".project-card.is-hover-dim-restoring").forEach(function(card) {
      card.classList.remove("is-hover-dim-restoring");
    });
  }

  function scheduleHoverDimRestore(cards) {
    var restoringCards = cards.filter(function(card) {
      return card instanceof HTMLElement && els.projectList.contains(card);
    });
    if (!restoringCards.length) return;
    clearHoverDimRestore();
    els.projectList.classList.add("hover-dim-restoring");
    restoringCards.forEach(function(card) {
      card.classList.add("is-hover-dim-restoring");
    });
    hoverDimRestoreTimer = window.setTimeout(function() {
      hoverDimRestoreTimer = 0;
      clearHoverDimRestore();
    }, HOVER_DIM_RESTORE_MS);
  }

  function clearHoverFocus(card) {
    if (!card) return;
    card.classList.remove("is-hover-focus");
    card.style.removeProperty("--focus-tilt-x");
    card.style.removeProperty("--focus-tilt-y");
  }

  function resetHoverCameraState(options) {
    var restoringCards = hoverCards.slice();
    clearHoverFocus(activeCard);
    if (options && options.skipDimRestore) {
      clearHoverDimRestore();
    } else {
      scheduleHoverDimRestore(restoringCards);
    }
    if (typeof clearStackOverlapState === "function") clearStackOverlapState();
    clearDepthClasses();
    activeCard = null;
    latestEvent = null;
    els.projectList.classList.remove("has-hover-focus");
    clearCameraMotion();
  }

  window.clearProjectHoverEffects = resetHoverCameraState;

  function canActivateHoverCamera() { return state.route === "blog" &&
      (!views.blog || !views.blog.classList.contains("inactive")) &&
      !currentTransition &&
      els.videoPlayer.classList.contains("hidden") &&
      !els.projectList.classList.contains("is-focus") &&
      Date.now() >= (window.__cameraCooldownUntil || 0) &&
      !roomState.animating; }

  function syncLensAndCamera(card) {
    if (Date.now() < (window.__cameraCooldownUntil || 0)) return;
    if (roomState.animating) return;
    var board = els.projectList.getBoundingClientRect();
    var rect = card.getBoundingClientRect();
    var cover = card.querySelector(".cover");
    var coverRect = cover ? cover.getBoundingClientRect() : null;
    if (!board.width || !board.height || !rect.width || !rect.height) return;

    var centerX = rect.left - board.left + rect.width / 2;
    var centerY = rect.top - board.top + rect.height / 2;
    var nx = centerX / board.width - 0.5;
    var ny = centerY / board.height - 0.5;
    var isRoom = !!card.closest(".room-wall");
    var lensScale = Math.min(Math.max((rect.width / 232) * (isRoom ? 1.14 : 1.1), 0.9), isRoom ? 1.28 : 1.14);
    var cameraZoom = isRoom ? 1.045 : 1.026;
    var originX = Math.max(12, Math.min(88, (centerX / board.width) * 100));
    var originY = Math.max(12, Math.min(88, (centerY / board.height) * 100));

    ensureLensLayer();
    els.projectList.style.setProperty("--lens-x", centerX.toFixed(1) + "px");
    els.projectList.style.setProperty("--lens-y", centerY.toFixed(1) + "px");
    els.projectList.style.setProperty("--lens-scale", lensScale.toFixed(3));
    els.projectList.style.setProperty("--camera-origin-x", originX.toFixed(2) + "%");
    els.projectList.style.setProperty("--camera-origin-y", originY.toFixed(2) + "%");
    els.projectList.style.setProperty("--camera-zoom", cameraZoom.toFixed(3));
    els.projectList.style.setProperty("--camera-pan-x", (nx * -204).toFixed(1) + "px");
    els.projectList.style.setProperty("--camera-pan-y", (ny * -122).toFixed(1) + "px");
    els.projectList.style.setProperty("--camera-tilt-x", (ny * 7.4).toFixed(2) + "deg");
    els.projectList.style.setProperty("--camera-tilt-y", (nx * -10).toFixed(2) + "deg");
    activeGeometry = { rect: rect, coverRect: coverRect };
  }

  function setActiveCard(card) {
    if (activeCard === card) return;
    clearHoverDimRestore();
    clearHoverFocus(activeCard);
    clearDepthClasses();
    if (typeof clearStackOverlapState === "function") clearStackOverlapState();
    activeCard = card;
    els.projectList.classList.toggle("has-hover-focus", !!card);
    if (!card) return;
    card.classList.add("is-hover-focus");
    if (typeof applyStackOverlapState === "function") applyStackOverlapState(card, typeof collectStackOccluders === "function" ? collectStackOccluders(card) : []);
    syncLensAndCamera(card);

    var cards = Array.from(els.projectList.querySelectorAll(".project-card"));
    var activeIndex = cards.indexOf(card);
    hoverCards = cards.filter(function(item) { return item !== card; });
    hoverCards.forEach(function(item, index) {
      var itemIndex = cards.indexOf(item);
      var distance = Math.abs(itemIndex - activeIndex);
      var near = distance > 0 && distance <= 2;
      item.classList.toggle("is-hover-near", near);
      item.classList.toggle("is-hover-far", !near);
      item.style.setProperty("--dof-blur", near ? "1.1px" : "3.8px");
      item.style.setProperty("--dof-scale", near ? "0.93" : "0.78");
      item.style.setProperty("--dof-z", near ? "-58px" : "-180px");
    });
  }

  function updateHoverFocus(event) {
    hoverRaf = 0;
    var card = activeCard;
    if (!card || !event || !els.projectList.contains(card)) return;

    var rect = activeGeometry && activeGeometry.rect;
    if (!rect.width || !rect.height) return;

    var x = ((event.clientX - rect.left) / rect.width) * 100;
    var y = ((event.clientY - rect.top) / rect.height) * 100;
    var dx = Math.max(-1, Math.min(1, (x - 50) / 50));
    var dy = Math.max(-1, Math.min(1, (y - 50) / 50));
    card.style.setProperty("--focus-tilt-x", (dy * -7).toFixed(2) + "deg");
    card.style.setProperty("--focus-tilt-y", (dx * 8.5).toFixed(2) + "deg");
    els.projectList.style.setProperty("--lens-scene-drift-x", (dx * 30).toFixed(2) + "px");
    els.projectList.style.setProperty("--lens-scene-drift-y", (dy * 24).toFixed(2) + "px");
  }

  els.projectList.addEventListener("pointerover", function(e) {
    if (!canActivateHoverCamera()) {
      if (activeCard) resetHoverCameraState({ skipDimRestore: true });
      return;
    }
    var card = e.target.closest(".project-card");
    if (!card || !els.projectList.contains(card)) return;
    setActiveCard(card);
    latestEvent = e;
    if (!hoverRaf) hoverRaf = requestAnimationFrame(function() { updateHoverFocus(latestEvent); });
  }, { passive: true });

  els.projectList.addEventListener("pointermove", function(e) {
    if (!canActivateHoverCamera()) {
      if (activeCard) resetHoverCameraState({ skipDimRestore: true });
      return;
    }
    var card = e.target.closest(".project-card");
    if (!card || !els.projectList.contains(card)) return;
    if (activeCard !== card) setActiveCard(card);
    latestEvent = e;
    if (!hoverRaf) hoverRaf = requestAnimationFrame(function() { updateHoverFocus(latestEvent); });
  }, { passive: true });

  els.projectList.addEventListener("pointerout", function(e) {
    if (!activeCard) return;
    if (e.relatedTarget && activeCard.contains(e.relatedTarget)) return;
    resetHoverCameraState();
  }, { passive: true });

  els.projectList.addEventListener("mouseleave", function() {
    resetHoverCameraState();
  });
})();

(function() {
  if (prefersReduced || !hasGsap || !els.projectList) return;
  var tiltCache = new WeakMap();

  function getTiltController(card) {
    var controller = tiltCache.get(card);
    if (!controller) {
      controller = {
        rx: gsap.quickTo(card, "--rx", { duration: 0.28, ease: "power2.out" }),
        ry: gsap.quickTo(card, "--ry", { duration: 0.28, ease: "power2.out" })
      };
      tiltCache.set(card, controller);
    }
    return controller;
  }

  els.projectList.addEventListener("mousemove", function(e) {
    var card = e.target.closest(".project-card");
    if (!card || !els.projectList.contains(card)) return;
    if (card.closest(".room-wall")) return;
    var idx = Array.from(els.projectList.querySelectorAll(".project-card")).indexOf(card);
    if (idx < 0 || !clueLayout[idx]) return;
    var rect = card.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = (e.clientX - cx) / (rect.width / 2);
    var dy = (e.clientY - cy) / (rect.height / 2);
    var baseRx = parseFloat(clueLayout[idx].rx) || 0;
    var baseRy = parseFloat(clueLayout[idx].ry) || 0;
    var newRx = baseRx + dy * -5;
    var newRy = baseRy + dx * 5;
    var tilt = getTiltController(card);
    tilt.rx(newRx + "deg");
    tilt.ry(newRy + "deg");
  }, { passive: true });
  els.projectList.addEventListener("mouseleave", function() {
    els.projectList.querySelectorAll(".project-card").forEach(function(card, idx) {
      if (card.closest(".room-wall")) return;
      if (!clueLayout[idx]) return;
      var tilt = getTiltController(card);
      tilt.rx(clueLayout[idx].rx);
      tilt.ry(clueLayout[idx].ry);
    });
  });
})();

(function() {
  if (!els.projectList) return;

  window.syncProjectCoverParallax = function() {};
  window.applyProjectCoverParallaxDelta = function() {};

  if (prefersReduced || !hasGsap) return;

  var parallaxCache = new WeakMap();
  var raf = 0;
  var wheelReturnTimer = 0;
  var wheelDrift = 0;
  var MAX_SCROLL_SHIFT = 12;
  var MAX_WHEEL_SHIFT = 7;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getController(img) {
    var controller = parallaxCache.get(img);
    if (!controller) {
      controller = typeof gsap.quickSetter === "function"
        ? gsap.quickSetter(img, "--cover-parallax-y", "px")
        : function(value) { img.style.setProperty("--cover-parallax-y", value + "px"); };
      parallaxCache.set(img, controller);
    }
    return controller;
  }

  function isVisibleCard(card) {
    if (!(card instanceof HTMLElement)) return false;
    var wall = card.closest(".room-wall");
    if (wall && !wall.classList.contains("is-active")) return false;
    var style = getComputedStyle(card);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0.02) return false;
    var rect = card.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom >= -80 && rect.top <= window.innerHeight + 80;
  }

  function syncParallax(forceReset) {
    raf = 0;
    var inWorks = state.route === "blog" && !views.blog.classList.contains("inactive");
    var viewportHeight = window.innerHeight || 1;
    var cards = Array.from(els.projectList.querySelectorAll(".project-card"));

    cards.forEach(function(card) {
      var img = card.querySelector(".cover img");
      if (!img) return;
      var toY = getController(img);

      if (forceReset || !inWorks || !isVisibleCard(card)) {
        toY(0);
        return;
      }

      var rect = card.getBoundingClientRect();
      var roomDepth = card.closest(".room-wall") ? 0.58 : 1;
      var center = rect.top + rect.height / 2;
      var progress = (center - viewportHeight / 2) / (viewportHeight / 2 + rect.height / 2);
      var scrollShift = clamp(progress * -MAX_SCROLL_SHIFT * roomDepth, -MAX_SCROLL_SHIFT, MAX_SCROLL_SHIFT);
      var wheelShift = wheelDrift * roomDepth;
      toY(Number((scrollShift + wheelShift).toFixed(2)));
    });
  }

  function requestSync(forceReset) {
    if (raf) return;
    raf = requestAnimationFrame(function() { syncParallax(forceReset); });
  }

  function applyWheelDelta(deltaY, options) {
    wheelDrift = clamp(wheelDrift - deltaY * 0.018, -MAX_WHEEL_SHIFT, MAX_WHEEL_SHIFT);
    if (options && options.immediate) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      syncParallax(false);
    } else requestSync(false);
    if (wheelReturnTimer) window.clearTimeout(wheelReturnTimer);
    wheelReturnTimer = window.setTimeout(function() {
      wheelDrift = 0;
      requestSync(false);
    }, 150);
  }

  window.syncProjectCoverParallax = function() { requestSync(false); };
  window.applyProjectCoverParallaxDelta = function(deltaY) { applyWheelDelta(deltaY, { immediate: true }); };

  window.addEventListener("scroll", function() {
    requestSync(false);
  }, { passive: true });

  window.addEventListener("resize", function() {
    requestSync(false);
  });

  window.addEventListener("wheel", function(event) {
    if (state.route !== "blog") return;
    applyWheelDelta(event.deltaY);
  }, { passive: true, capture: true });

  var originalSetRoute = setRoute;
  setRoute = function(route) {
    originalSetRoute(route);
    requestAnimationFrame(function() {
      requestSync(route !== "blog");
    });
  };

  requestSync(false);
})();

function applyRippleTargets() {
  var targets = document.querySelectorAll(".detail-btn");
  targets.forEach(function(btn) { btn.classList.add("ripple-target"); });
}

applyRippleTargets();

(function() {
  if (!hasGsap) return;
  var origComplete = completeMatch;
  completeMatch = function(toIndex) {
    var wasSize = state.matches.length;
    origComplete(toIndex);
    if (state.matches.length > wasSize) {
      var lastPair = state.matches[state.matches.length - 1];
      if (lastPair) {
        [lastPair[0], lastPair[1]].forEach(function(idx) {
          var ep = els.projectList.querySelector('[data-endpoint="' + idx + '"]');
          if (!ep) return;
          gsap.fromTo(ep, { scale: 1 }, { scale: 1.35, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" });
        });
      }
    }
  };
})();

(function() {
  var hint = document.createElement("div");
  hint.className = "page-hint";
  document.body.appendChild(hint);
  var pageOrder = ["home", "blog", "about", "contact"];
  function updateHint() {
    var ci = pageOrder.indexOf(state.route);
    if (ci >= 0 && ci < 2) {
      hint.classList.add("visible");
    } else {
      hint.classList.remove("visible");
    }
  }
  updateHint();
  var origSetRoute = setRoute;
  setRoute = function(route) {
    origSetRoute(route);
    requestAnimationFrame(updateHint);
  };
})();

runIntro();

/* Engine-hood safety net: if the page is still invisible after 3 seconds,
   force-show it regardless of what happened during init. */
setTimeout(function() {
  if (els.siteRoot && parseFloat(getComputedStyle(els.siteRoot).opacity) < 0.1) {
    console.warn("[safety-net] Page still invisible after 3s, forcing show.");
    if (els.introLoader) els.introLoader.style.display = "none";
    els.siteRoot.style.opacity = 1;
    document.querySelectorAll(".reveal-block").forEach(function(block) {
      block.style.opacity = 1;
      block.style.transform = "none";
    });
  }
}, 3000);

if (typeof ResizeObserver !== "undefined" && els.projectList) {
  let clueRaf = 0;
  const clueObserver = new ResizeObserver(() => {
    if (clueRaf) cancelAnimationFrame(clueRaf);
    clueRaf = requestAnimationFrame(() => {
      clueRaf = 0;
      if (!els.projectList.classList.contains("grid-mode")) return;
      if (els.projectList.querySelector("[data-room]")) {
        if (typeof syncWallLineCoordinates === "function") syncWallLineCoordinates();
        return;
      }
      syncClueCoordinates();
    });
  });
  clueObserver.observe(els.projectList);
}
