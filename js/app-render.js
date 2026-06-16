function coverMarkup(project) {
  return `<img src="${escapeHtml(project.cover)}" alt="${escapeHtml(project.title)} 的 Bilibili 视频封面" loading="lazy" decoding="async"><span class="play-badge" aria-hidden="true"></span><span class="cover-label">${escapeHtml(project.category)} / ${escapeHtml(project.year)}</span>`;
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
