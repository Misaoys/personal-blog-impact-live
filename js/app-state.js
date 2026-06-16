const bilibiliPayload = window.BILIBILI_PROJECTS || { count: 0, projects: [] };
const projects = Array.isArray(bilibiliPayload.projects) ? bilibiliPayload.projects : [];
const hasGsap = typeof gsap !== "undefined";
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = { route: "home", expanded: null, playing: null, matchingStart: null, draftPoint: null, matches: [], draggingEndpoint: null, dragCandidate: null };
let currentTransition = null;
let lastPlayerTrigger = null;

const views = {
  home: document.getElementById("homeView"),
  blog: document.getElementById("blogView"),
  about: document.getElementById("aboutView"),
  contact: document.getElementById("contactView")
};

const els = {
  siteRoot: document.getElementById("siteRoot"),
  introLoader: document.getElementById("introLoader"),
  projectList: document.getElementById("projectList"),
  screenStatus: document.getElementById("screenStatus"),
  videoPlayer: document.getElementById("videoPlayer"),
  playerFrameWrap: document.getElementById("playerFrameWrap"),
  playerTitle: document.getElementById("playerTitle"),
  playerDesc: document.getElementById("playerDesc"),
  playerMeta: document.getElementById("playerMeta"),
  playerActions: document.getElementById("playerActions"),
  playerClose: document.getElementById("playerClose")
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function getCardWindStyle(index, strength = 1) {
  const swayStrength = Number.isFinite(strength) ? strength : 1;
  const duration = (5.8 + (index % 6) * 0.48).toFixed(2);
  const delay = -(0.35 + (index % 9) * 0.42).toFixed(2);
  const direction = index % 2 === 0 ? 1 : -1;
  const turn = 0.9 + (index % 4) * 0.15;
  const counterTurn = 1.12 + (index % 5) * 0.14;
  const softTurn = 0.58 + (index % 3) * 0.105;
  return [
    `--wind-duration:${duration}s;`,
    `--wind-delay:${delay}s;`,
    `--wind-r-a:${(direction * turn * swayStrength).toFixed(3)}deg;`,
    `--wind-r-b:${(-direction * counterTurn * swayStrength).toFixed(3)}deg;`,
    `--wind-r-c:${(direction * softTurn * swayStrength).toFixed(3)}deg;`
  ].join("");
}

function filteredProjects() {
  return [...projects].sort((a, b) => {
    const left = a.publishedAt || 0;
    const right = b.publishedAt || 0;
    return right - left;
  });
}

function renderProjectCount() {
  const countEl = document.getElementById("videoCount");
  if (countEl) countEl.textContent = String(projects.length);
}

function syncRouteControls(route = state.route) {
  document.querySelectorAll("[data-route]").forEach(btn => {
    const active = btn.dataset.route === route;
    btn.classList.toggle("active", active);
    if (btn.classList.contains("nav-btn")) {
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    }
  });
}

function getVideoId(project) {
  if (project.aid) return String(project.aid);
  const match = (project.url || "").match(/av(\d+)/i);
  return match ? match[1] : project.id;
}

function getEmbedUrl(project) {
  if (project.bvid) return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(project.bvid)}&high_quality=1&autoplay=1&as_wide=1`;
  return `https://player.bilibili.com/player.html?aid=${getVideoId(project)}&high_quality=1&autoplay=1&as_wide=1`;
}

const clueLayout = [
  // Row 0 – top
  { x: "4%",  y: "2%",  z: "8px",  rx: "0deg",  ry: "-3deg", rz: "-1deg", s: "0.97" },
  { x: "38%", y: "1%",  z: "36px", rx: "2deg",  ry: "2deg",  rz: "1deg",  s: "1.02" },
  { x: "82%", y: "3%",  z: "12px", rx: "-2deg", ry: "3deg",  rz: "-1deg", s: "0.97" },
  // Row 1
  { x: "16%", y: "15%", z: "45px", rx: "1deg",  ry: "-2deg", rz: "2deg",  s: "1.02" },
  { x: "52%", y: "14%", z: "24px", rx: "-1deg", ry: "-3deg", rz: "-1deg", s: "0.99" },
  // Row 2
  { x: "4%",  y: "28%", z: "16px", rx: "2deg",  ry: "2deg",  rz: "-2deg", s: "0.97" },
  { x: "36%", y: "28%", z: "50px", rx: "-1deg", ry: "2deg",  rz: "1deg",  s: "1.03" },
  { x: "76%", y: "26%", z: "28px", rx: "1deg",  ry: "-2deg", rz: "1deg",  s: "0.98" },
  // Row 3
  { x: "10%", y: "41%", z: "10px", rx: "-2deg", ry: "-2deg", rz: "1deg",  s: "0.97" },
  { x: "44%", y: "42%", z: "40px", rx: "2deg",  ry: "3deg",  rz: "-1deg", s: "1.01" },
  { x: "70%", y: "40%", z: "18px", rx: "-2deg", ry: "-2deg", rz: "2deg",  s: "0.96" },
  // Row 4
  { x: "26%", y: "55%", z: "32px", rx: "2deg",  ry: "2deg",  rz: "-2deg", s: "0.97" },
  { x: "56%", y: "54%", z: "10px", rx: "0deg",  ry: "-2deg", rz: "1deg",  s: "0.97" },
  { x: "84%", y: "53%", z: "30px", rx: "1deg",  ry: "2deg",  rz: "-1deg", s: "1.01" },
  // Row 5
  { x: "14%", y: "68%", z: "14px", rx: "-1deg", ry: "-3deg", rz: "2deg",  s: "0.98" },
  { x: "42%", y: "67%", z: "22px", rx: "2deg",  ry: "1deg",  rz: "-1deg", s: "0.99" },
  { x: "74%", y: "66%", z: "38px", rx: "-2deg", ry: "2deg",  rz: "1deg",  s: "1.02" },
  // Row 6 – bottom
  { x: "6%",  y: "82%", z: "26px", rx: "-1deg", ry: "3deg",  rz: "1deg",  s: "1.00" },
  { x: "40%", y: "80%", z: "18px", rx: "2deg",  ry: "-1deg", rz: "-1deg", s: "0.98" },
  { x: "78%", y: "79%", z: "12px", rx: "1deg",  ry: "-2deg", rz: "-2deg", s: "0.97" }
];

const clueLinks = [
  // Row links (horizontal)
  [0, 1], [1, 2], [3, 4], [5, 6], [6, 7], [8, 9], [9, 10],
  [11, 12], [12, 13], [14, 15], [15, 16], [17, 18], [18, 19],
  // Column links (vertical)
  [0, 3], [5, 8], [14, 17], [1, 4], [6, 9], [15, 18], [11, 14],
  [7, 10], [2, 7], [16, 19], [10, 16], [13, 19],
  // Left-to-right cross links
  [0, 6], [5, 9], [3, 6], [8, 12], [8, 15],
  // Right-to-left cross links
  [13, 7], [16, 10], [19, 13]
];
