function getCardConnectionPoints() {
  const board = els.projectList.getBoundingClientRect();
  const cards = Array.from(els.projectList.querySelectorAll(".project-card"));
  return cards.slice(0, clueLayout.length).map((card) => {
    const rect = card.getBoundingClientRect();
    return {
      card,
      cx: ((rect.left - board.left + rect.width / 2) / board.width) * 100,
      cy: ((rect.top - board.top) / board.height) * 100
    };
  });
}

function syncClueCoordinates() {
  if (!els.projectList.classList.contains("grid-mode") || els.projectList.querySelector("[data-room]")) return;
  const board = els.projectList.getBoundingClientRect();
  if (!board.width || !board.height) return;
  const points = getCardConnectionPoints();
  const svg = els.projectList.querySelector(".clue-lines");
  if (!svg) return;
  svg.querySelectorAll("path.completed[data-from][data-to]").forEach(path => {
    const fromIdx = Number(path.dataset.from);
    const toIdx = Number(path.dataset.to);
    if (Number.isNaN(fromIdx) || Number.isNaN(toIdx)) return;
    const from = points[fromIdx];
    const to = points[toIdx];
    if (!from || !to) return;
    path.setAttribute("d", `M ${from.cx.toFixed(2)} ${from.cy.toFixed(2)} L ${to.cx.toFixed(2)} ${to.cy.toFixed(2)}`);
  });
  points.forEach((point, index) => {
    const endpoint = els.projectList.querySelector(`[data-endpoint="${index}"]`);
    if (endpoint) {
      endpoint.style.left = point.cx + "%";
      endpoint.style.top = point.cy + "%";
    }
  });
}

function renderProjects(skipAnimation) {
  const list = filteredProjects();
  state.expanded = null;
  cancelFocusDimRelease();
  if (window.matchMedia("(max-width: 980px)").matches) {
    els.projectList.className = "projects grid-mode";
    els.projectList.innerHTML = list.map(projectTemplate).join("");
  } else {
    els.projectList.className = "projects grid-mode room-mode";
    els.projectList.innerHTML = buildRoomMarkup(list);
    window.__cameraCooldownUntil = Date.now() + 800;
    requestAnimationFrame(() => initRoom());
  }
  if (!skipAnimation) animateCards(els.projectList);
}

function clearStackOverlapState() {
  els.projectList?.querySelectorAll(".project-card.is-stack-selected, .project-card.is-stack-occluding").forEach(card => {
    card.classList.remove("is-stack-selected", "is-stack-occluding");
  });
}

const FOCUS_DIM_RELEASE_MS = 2000;
const FOCUS_DIM_RESTORE_MS = 2400;
let focusDimReleaseTimer = 0;
let focusDimRestoreTimer = 0;

function clearFocusDimReleaseClasses() {
  els.projectList?.classList.remove("focus-dim-release");
  els.projectList?.querySelectorAll(".project-card.is-focus-dim-release").forEach(card => {
    card.classList.remove("is-focus-dim-release");
  });
}

function clearFocusDimRestoreClasses() {
  els.projectList?.classList.remove("focus-dim-restoring");
  els.projectList?.querySelectorAll(".project-card.is-focus-dim-restoring").forEach(card => {
    card.classList.remove("is-focus-dim-restoring");
  });
}

function cancelFocusDimRelease() {
  if (focusDimReleaseTimer) {
    window.clearTimeout(focusDimReleaseTimer);
    focusDimReleaseTimer = 0;
  }
  if (focusDimRestoreTimer) {
    window.clearTimeout(focusDimRestoreTimer);
    focusDimRestoreTimer = 0;
  }
  clearFocusDimReleaseClasses();
  clearFocusDimRestoreClasses();
}

function scheduleFocusDimRelease(cards) {
  const hasPresetCards = Array.isArray(cards) && cards.length > 0;
  if (!hasPresetCards && !els.projectList?.classList.contains("is-focus")) {
    cancelFocusDimRelease();
    return;
  }
  if (focusDimReleaseTimer) {
    window.clearTimeout(focusDimReleaseTimer);
    focusDimReleaseTimer = 0;
  }
  if (focusDimRestoreTimer) {
    window.clearTimeout(focusDimRestoreTimer);
    focusDimRestoreTimer = 0;
  }
  clearFocusDimReleaseClasses();
  clearFocusDimRestoreClasses();
  const dimmedCards = hasPresetCards
    ? cards.filter(card => card instanceof HTMLElement && els.projectList?.contains(card))
    : Array.from(els.projectList.querySelectorAll(".project-card:not(.is-focused):not(.is-matched)"));
  if (!dimmedCards.length) return;
  els.projectList.classList.add("focus-dim-release");
  dimmedCards.forEach(card => card.classList.add("is-focus-dim-release"));
  focusDimReleaseTimer = window.setTimeout(() => {
    const restoringCards = Array.from(els.projectList?.querySelectorAll(".project-card.is-focus-dim-release") || []);
    focusDimReleaseTimer = 0;
    if (restoringCards.length) {
      els.projectList.classList.add("focus-dim-restoring");
      restoringCards.forEach(card => card.classList.add("is-focus-dim-restoring"));
    }
    clearFocusDimReleaseClasses();
    if (!restoringCards.length) return;
    focusDimRestoreTimer = window.setTimeout(() => {
      focusDimRestoreTimer = 0;
      clearFocusDimRestoreClasses();
    }, FOCUS_DIM_RESTORE_MS);
  }, FOCUS_DIM_RELEASE_MS);
}

function getCardLayerDepth(card) {
  if (!card) return 0;
  const style = getComputedStyle(card);
  const depth = parseFloat(style.getPropertyValue(card.closest(".room-wall") ? "--wall-z" : "--z"));
  return Number.isFinite(depth) ? depth : 0;
}

function cardsIntersect(a, b) {
  const pad = 10;
  return a.left < b.right - pad && a.right > b.left + pad && a.top < b.bottom - pad && a.bottom > b.top + pad;
}

function collectStackOccluders(card) {
  if (!card || !els.projectList?.classList.contains("grid-mode")) return [];
  const scope = card.closest(".room-wall") || els.projectList;
  const selectedRect = card.getBoundingClientRect();
  const selectedDepth = getCardLayerDepth(card);
  return Array.from(scope.querySelectorAll(".project-card")).filter(other => {
    if (other === card || other.offsetParent === null) return false;
    if (getCardLayerDepth(other) <= selectedDepth) return false;
    return cardsIntersect(selectedRect, other.getBoundingClientRect());
  });
}

function applyStackOverlapState(card, occluders) {
  clearStackOverlapState();
  if (!card || !occluders.length) return;
  card.classList.add("is-stack-selected");
  occluders.forEach(other => other.classList.add("is-stack-occluding"));
}

function resetMatchingDraft(options = {}) {
  if (!options.keepFocusDimRelease) cancelFocusDimRelease();
  clearStackOverlapState();
  state.matchingStart = null;
  state.draftPoint = null;
  state.draggingEndpoint = null;
  state.dragCandidate = null;
  els.projectList.classList.remove("is-focus");
  els.projectList.querySelectorAll(".clue-endpoint").forEach(point => point.classList.remove("is-active"));
  const draft = els.projectList.querySelector("[data-draft-line]");
  if (draft) {
    draft.setAttribute("d", "");
    draft.hidden = true;
  }
}

function clearProjectFocus() {
  if (typeof window.clearProjectHoverEffects === "function") window.clearProjectHoverEffects();
  scheduleFocusDimRelease();
  resetMatchingDraft({ keepFocusDimRelease: true });
  state.expanded = null;
  state.matches = [];
  if (els.projectList) {
    els.projectList.querySelectorAll(".project-card").forEach(card => card.classList.remove("is-focused", "expanded", "focus-motion-settling"));
  }
}

function focusProjectCard(card) {
  if (!card || !els.projectList.classList.contains("grid-mode")) return;
  if (typeof window.clearProjectHoverEffects === "function") window.clearProjectHoverEffects();
  const alreadyFocused = card.classList.contains("is-focused");
  if (alreadyFocused) {
    scheduleFocusDimRelease();
    resetMatchingDraft({ keepFocusDimRelease: true });
    els.projectList.querySelectorAll(".project-card").forEach(item => item.classList.remove("is-focused", "expanded", "focus-motion-settling"));
    state.expanded = null;
    els.screenStatus.textContent = "已取消作品聚焦";
    return;
  }
  const title = card.querySelector(".project-title")?.textContent?.trim() || "当前作品";
  cancelFocusDimRelease();
  resetMatchingDraft();
  els.projectList.querySelectorAll(".project-card").forEach(item => item.classList.remove("is-focused", "expanded", "focus-motion-settling"));
  const occluders = collectStackOccluders(card);
  els.projectList.classList.add("is-focus");
  card.classList.add("is-focused", "expanded", "focus-motion-settling");
  window.setTimeout(() => {
    if (card.classList.contains("is-focused")) card.classList.remove("focus-motion-settling");
  }, 1300);
  applyStackOverlapState(card, occluders);
  state.expanded = card.dataset.project || null;
  els.screenStatus.textContent = `已聚焦 ${title}，再次点击播放`;
  const focusTarget = card.querySelector("[data-play], button, a");
  if (focusTarget instanceof HTMLElement) focusTarget.focus({ preventScroll: true });
  if (!card.closest(".room-wall")) setTimeout(syncClueCoordinates, 750);
}

function markMatchedCards() {
  els.projectList.querySelectorAll(".project-card").forEach(card => card.classList.remove("is-matched"));
  state.matches.forEach(([from, to]) => {
    const fromCard = els.projectList.querySelector(`[data-clue-index="${from}"]`);
    const toCard = els.projectList.querySelector(`[data-clue-index="${to}"]`);
    if (fromCard) fromCard.classList.add("is-matched");
    if (toCard) toCard.classList.add("is-matched");
  });
}

function refreshMatchLines() {
  const svg = els.projectList.querySelector(".clue-lines");
  if (!svg) return;
  svg.querySelectorAll("path.completed[data-user-match='true']").forEach(path => path.remove());
  const points = getCardConnectionPoints();
  state.matches.forEach(([from, to], index) => {
    if (!points[from] || !points[to]) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "clue-link completed");
    path.setAttribute("data-user-match", "true");
    path.setAttribute("pathLength", "1");
    path.setAttribute("data-from", String(from));
    path.setAttribute("data-to", String(to));
    path.setAttribute("data-match-index", String(index));
    path.setAttribute("d", `M ${points[from].cx.toFixed(2)} ${points[from].cy.toFixed(2)} L ${points[to].cx.toFixed(2)} ${points[to].cy.toFixed(2)}`);
    svg.insertBefore(path, svg.firstChild);
  });
  markMatchedCards();
}

function startMatch(index) {
  cancelFocusDimRelease();
  state.matchingStart = index;
  state.draftPoint = null;
  const focusedCard = els.projectList.querySelector(`[data-clue-index="${index}"]`);
  const occluders = collectStackOccluders(focusedCard);
  els.projectList.classList.add("is-focus");
  els.projectList.querySelectorAll(".clue-endpoint").forEach(point => point.classList.toggle("is-active", Number(point.dataset.endpoint) === index));
  const draft = els.projectList.querySelector("[data-draft-line]");
  if (draft) draft.hidden = false;
  els.projectList.querySelectorAll(".project-card").forEach(card => card.classList.toggle("is-focused", card === focusedCard));
  if (focusedCard) {
    focusedCard.classList.add("expanded");
    applyStackOverlapState(focusedCard, occluders);
  }
  els.screenStatus.textContent = "已开始连线，请拖拽或点击另一个视频卡片端点完成配对";
}

function completeMatch(toIndex) {
  const fromIndex = state.matchingStart;
  if (fromIndex === null || fromIndex === undefined || fromIndex === toIndex) {
    resetMatchingDraft();
    return;
  }
  const pair = [Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex)];
  const exists = state.matches.some(([a, b]) => a === pair[0] && b === pair[1]);
  if (!exists) state.matches.push(pair);
  resetMatchingDraft();
  refreshMatchLines();
  els.screenStatus.textContent = "已完成第 " + (pair[0] + 1) + " 与第 " + (pair[1] + 1) + " 个视频卡片配对";
}

function updateDraftLine(clientX, clientY) {
  if (state.matchingStart === null || state.matchingStart === undefined) return;
  const draft = els.projectList.querySelector("[data-draft-line]");
  if (!draft) return;
  const board = els.projectList.getBoundingClientRect();
  const points = getCardConnectionPoints();
  const from = points[state.matchingStart];
  if (!from) return;
  const to = {
    cx: ((clientX - board.left) / board.width) * 100,
    cy: ((clientY - board.top) / board.height) * 100,
    left: undefined,
    right: undefined,
    top: undefined,
    bottom: undefined
  };
  draft.hidden = false;
  draft.setAttribute("d", `M ${from.cx.toFixed(2)} ${from.cy.toFixed(2)} L ${to.cx.toFixed(2)} ${to.cy.toFixed(2)}`);
}
