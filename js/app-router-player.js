let playerKeydownHandler = null;

function setRoute(route) {
  const next = views[route];
  if (!next || route === state.route) return;
  clearProjectFocus();
  const label = ({ home: "首页", blog: "作品", about: "expr-flow 购买页", contact: "联系" }[route] || route);
  els.screenStatus.textContent = "当前位于" + label;
  syncRouteControls(route);
  transitionPage(route);
}

function activateProjectCard(card, id, trigger) {
  const projectId = id || card?.dataset.project;
  if (!projectId) return;
  const project = projects.find(item => item.id === projectId);
  if (!project) return;
  openVideoPlayer(projectId, trigger || card);
}

function openVideoPlayer(id, trigger) {
  const project = projects.find(item => item.id === id);
  if (!project) return;
  if (typeof window.clearProjectHoverEffects === "function") window.clearProjectHoverEffects();
  resetMatchingDraft({ keepFocusDimRelease: true });
  if (els.projectList) {
    els.projectList.querySelectorAll(".project-card").forEach(card => {
      card.classList.remove("is-focused", "expanded", "focus-motion-settling");
    });
  }
  state.expanded = null;
  lastPlayerTrigger = trigger instanceof HTMLElement ? trigger : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  state.playing = id;
  const iframeTitle = `${project.title} - Bilibili 播放器`;
  els.playerFrameWrap.innerHTML = `<iframe src="${escapeHtml(getEmbedUrl(project))}" title="${escapeHtml(iframeTitle)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  els.playerTitle.textContent = project.title;
  els.playerDesc.textContent = project.description || "";
  els.playerMeta.innerHTML = `<span>Video ID: ${escapeHtml(project.bvid || "av" + getVideoId(project))}</span><span>${escapeHtml(project.category)} / ${escapeHtml(project.year)}</span><span>${escapeHtml(project.duration)} / ${escapeHtml(project.plays)} views</span>`;
  els.playerActions.innerHTML = `<a class="detail-btn" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">打开 Bilibili</a>`;
  els.videoPlayer.classList.remove("hidden");
  document.body.classList.add("player-open");
  els.screenStatus.textContent = `正在播放 ${project.title}`;
  els.playerClose.focus({ preventScroll: true });

  if (playerKeydownHandler) els.videoPlayer.removeEventListener("keydown", playerKeydownHandler);
  playerKeydownHandler = function(e) {
    if (e.key !== "Tab") return;
    const focusable = els.videoPlayer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), iframe');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  els.videoPlayer.addEventListener("keydown", playerKeydownHandler);

  if (hasGsap && !prefersReduced) {
    gsap.fromTo(els.videoPlayer, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "power2.out" });
    gsap.fromTo(".player-shell", { y: 24, scale: 0.985 }, { y: 0, scale: 1, duration: 0.38, ease: "power3.out" });
  }
}

function closeVideoPlayer() {
  if (els.videoPlayer.classList.contains("hidden")) return;
  els.videoPlayer.classList.add("is-closing");
  if (hasGsap && !prefersReduced) {
    gsap.killTweensOf([els.videoPlayer, ".player-shell"]);
    setTimeout(function() {
      if (els.videoPlayer.classList.contains("is-closing")) finishCloseVideoPlayer();
    }, 420);
    gsap.to(".player-shell", { y: 24, scale: 0.985, duration: 0.25, ease: "power3.in" });
    gsap.to(els.videoPlayer, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: finishCloseVideoPlayer
    });
    els.screenStatus.textContent = "播放器已关闭";
    return;
  }
  finishCloseVideoPlayer();
}

function finishCloseVideoPlayer() {
  if (playerKeydownHandler) {
    els.videoPlayer.removeEventListener("keydown", playerKeydownHandler);
    playerKeydownHandler = null;
  }
  if (els.projectList?.classList.contains("is-focus")) {
    scheduleFocusDimRelease();
    resetMatchingDraft({ keepFocusDimRelease: true });
    els.projectList.querySelectorAll(".project-card").forEach(card => card.classList.remove("is-focused", "expanded", "focus-motion-settling"));
  }
  state.playing = null;
  state.expanded = null;
  els.playerFrameWrap.innerHTML = "";
  els.videoPlayer.classList.add("hidden");
  els.videoPlayer.classList.remove("is-closing");
  document.body.classList.remove("player-open");
  if (hasGsap && !prefersReduced) gsap.set(els.videoPlayer, { clearProps: "all" });
  els.screenStatus.textContent = "播放器已关闭";
  if (lastPlayerTrigger && document.contains(lastPlayerTrigger)) {
    lastPlayerTrigger.focus({ preventScroll: true });
  }
  lastPlayerTrigger = null;
}
