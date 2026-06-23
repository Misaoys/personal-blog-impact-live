const coverDimensionsByFile = {
  "bili-cover-01-116616968800991.jpg": [960, 540],
  "bili-cover-02-116520818646641.jpg": [1920, 1080],
  "bili-cover-03-116389839049896.jpg": [2560, 1440],
  "bili-cover-04-116318753785099.jpg": [1440, 810],
  "bili-cover-05-116310734344286.jpg": [2560, 1440],
  "bili-cover-06-116211497179290.jpg": [2558, 1439],
  "bili-cover-07-116150226654264.jpg": [1440, 810],
  "bili-cover-08-116022199719683.jpg": [1920, 1080],
  "bili-cover-09-115976515492094.jpg": [1855, 1043],
  "bili-cover-10-115903735799424.jpg": [1893, 1064],
  "bili-cover-11-115753713932264.jpg": [1400, 787],
  "bili-cover-12-115668032689047.jpg": [1920, 1080],
  "bili-cover-13-115588777122601.jpg": [972, 546],
  "bili-cover-14-115543914846823.jpg": [2168, 1219],
  "bili-cover-15-115087960446461.jpg": [1440, 810],
  "bili-cover-16-114741594822621.jpg": [1440, 1080],
  "bili-cover-17-114686968208072.jpg": [1400, 787],
  "bili-cover-18-114562967868325.jpg": [1920, 1080],
  "bili-cover-19-113771016164731.jpg": [1080, 810],
  "bili-cover-20-113588849089554.jpg": [1080, 810]
};

function getCoverDimensions(coverPath) {
  const filename = String(coverPath || "").split(/[\\/]/).pop();
  return coverDimensionsByFile[filename] || [1920, 1080];
}

function coverMarkup(project) {
  const [width, height] = getCoverDimensions(project.cover);
  return `<img src="${escapeHtml(project.cover)}" width="${width}" height="${height}" alt="${escapeHtml(project.title)} 的 Bilibili 视频封面" loading="lazy" decoding="async"><span class="play-badge" aria-hidden="true"></span><span class="cover-label">${escapeHtml(project.category)} / ${escapeHtml(project.year)}</span>`;
}

function projectTemplate(project, index) {
  const pos = clueLayout[index % clueLayout.length];
  const depth = (Number(pos.z.replace("px", "")) / 60).toFixed(2);
  const wind = getCardWindStyle(index);
  const extraStyle = index >= clueLayout.length ? ` --x:${8 + ((index - clueLayout.length) % 3) * 31}%; --y:${88 + Math.floor((index - clueLayout.length) / 3) * 22}%; --z:10px; --rx:0deg; --ry:0deg; --rz:0deg; --s:0.97; --depth:0.16;` : "";
  const style = ` style="${wind}--x:${pos.x}; --y:${pos.y}; --z:${pos.z}; --rx:${pos.rx}; --ry:${pos.ry}; --rz:${pos.rz}; --s:${pos.s}; --depth:${depth};${extraStyle}"`;
  return `<article class="project-card reveal-card"${style} data-project="${escapeHtml(project.id)}" data-clue-index="${index}" aria-labelledby="project-title-${escapeHtml(project.id)}">
    <button class="cover project-play" type="button" data-play="${escapeHtml(project.id)}" aria-label="播放 ${escapeHtml(project.title)}">
      ${coverMarkup(project)}
    </button>
    <div>
      <div class="project-top"><span class="project-index">${String(index + 1).padStart(2, "0")}</span><span class="tag">${escapeHtml(project.category)}</span></div>
      <h3 class="project-title" id="project-title-${escapeHtml(project.id)}">${escapeHtml(project.title)}</h3>
      <div class="project-meta">${escapeHtml(project.year)} / ${escapeHtml(project.duration)} / ${escapeHtml(project.plays)} views</div>
    </div>
    <span class="card-dot" data-dot="${index}" aria-hidden="true"></span>
  </article>`;
}
