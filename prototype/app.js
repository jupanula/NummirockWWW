const menuToggle = document.querySelector("[data-menu-toggle]");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const stageLogos = {
  "Main Stage": "https://nummirock.fi/2017/images/Stage-Main.png",
  "Inferno Stage": "https://nummirock.fi/2017/images/Stage-Inferno.png",
  "Kaaos Klubi": "https://nummirock.fi/2017/images/Stage-Kaaos.png",
};

const dayKeys = ["ke", "to", "pe", "la"];
const dayShortNames = {
  Keskiviikko: "Ke",
  Torstai: "To",
  Perjantai: "Pe",
  Lauantai: "La",
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));

const renderStageHeader = (stageName) => {
  const logo = stageLogos[stageName];
  if (!logo) return `<span>${escapeHtml(stageName)}</span>`;
  return `<img src="${logo}" alt="${escapeHtml(stageName)}">`;
};

const renderRunSlot = (item, minMinutes) => {
  const duration = Math.max(30, item.endSortMinutes - item.sortMinutes);
  const isFeatured = ["Main Stage", "Inferno Stage"].includes(item.stageName) && item.type === "band";
  return `
    <div class="run-slot${isFeatured ? " featured" : ""}" id="${item.id}" style="--start: ${item.sortMinutes - minMinutes}; --duration: ${duration};">
      <time>${escapeHtml(item.startTime)}</time>
      <span>${escapeHtml(item.name)}</span>
    </div>
  `;
};

const renderRunningPanel = (day) => {
  const items = day.items.slice().sort((a, b) => a.sortMinutes - b.sortMinutes || a.stageOrder - b.stageOrder);
  const stages = [...new Map(items
    .slice()
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((item) => [item.stageName, item])).values()];
  const minMinutes = Math.floor(Math.min(...items.map((item) => item.sortMinutes)) / 60) * 60;
  const maxMinutes = Math.ceil(Math.max(...items.map((item) => item.endSortMinutes)) / 60) * 60;
  const trackStyle = `--stage-count: ${stages.length}; --stage-track-width: ${stages.length * 84}vw;`;

  return `
    <section class="running-panel" id="running-${day.key}">
      <div class="running-panel-heading">
        <h2>${escapeHtml(day.title)}</h2>
      </div>
      <div class="running-calendar" style="--board-minutes: ${maxMinutes - minMinutes};">
        <div class="stage-head-scroll" aria-label="${escapeHtml(day.title)} lavat">
          <div class="stage-track stage-track-head" style="${trackStyle}">
            ${stages.map((stage) => `
              <div class="stage-head">
                <h3>${renderStageHeader(stage.stageName)}</h3>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="stage-scroll stage-body-scroll" aria-label="${escapeHtml(day.title)} aikataulu">
          <div class="stage-track stage-track-body" style="${trackStyle}">
            ${stages.map((stage) => `
              <div class="stage-lane">
                <div class="stage-lane-body">
                  ${items.filter((item) => item.stageName === stage.stageName).map((item) => renderRunSlot(item, minMinutes)).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
};

const renderDayNav = (days) => `
  <nav class="running-order-days" aria-label="Valitse ohjelmapäivä">
    ${days.map((day) => `
      <a class="running-day" href="#running-${day.key}">
        <span>${escapeHtml(day.label)}</span>
      </a>
    `).join("")}
  </nav>
`;

const initStageScrollSync = () => {
  document.querySelectorAll(".running-calendar").forEach((calendar) => {
    const header = calendar.querySelector(".stage-head-scroll");
    const body = calendar.querySelector(".stage-body-scroll");
    if (!header || !body) return;

    let syncing = false;
    const sync = (source, target) => {
      if (syncing) return;
      syncing = true;
      target.scrollLeft = source.scrollLeft;
      window.requestAnimationFrame(() => {
        syncing = false;
      });
    };

    header.addEventListener("scroll", () => sync(header, body), { passive: true });
    body.addEventListener("scroll", () => sync(body, header), { passive: true });
  });
};

const renderScheduleFromData = () => {
  if (!window.NR_SCHEDULE) return;

  const schedule = window.NR_SCHEDULE
    .slice()
    .sort((a, b) => a.dayOrder - b.dayOrder || a.sortMinutes - b.sortMinutes || a.stageOrder - b.stageOrder);
  const days = [...new Map(schedule.map((item) => [item.dayOrder, {
    key: dayKeys[item.dayOrder],
    order: item.dayOrder,
    label: `${dayShortNames[item.dayFi] || item.dayFi} ${item.displayDate}`,
    title: `${item.dayFi} ${item.displayDate}`,
    items: schedule.filter((entry) => entry.dayOrder === item.dayOrder),
  }])).values()];

  const runningOrder = document.querySelector("[data-running-order]");
  if (runningOrder) {
    runningOrder.innerHTML = `
      ${renderDayNav(days)}
      <div class="running-panels">
        ${days.map((day) => renderRunningPanel(day)).join("")}
      </div>
    `;
  }

};

const initCountdown = () => {
  const countdown = document.querySelector("[data-countdown]");
  if (!countdown) return;

  const openAt = new Date(countdown.getAttribute("data-open"));
  const hideAfter = new Date(countdown.getAttribute("data-hide-after"));
  const showDays = Number(countdown.getAttribute("data-show-days") || 100);
  const dayEl = countdown.querySelector("[data-countdown-days]");
  const hourEl = countdown.querySelector("[data-countdown-hours]");
  const minuteEl = countdown.querySelector("[data-countdown-minutes]");
  const secondEl = countdown.querySelector("[data-countdown-seconds]");
  const labelEl = countdown.querySelector("[data-countdown-label]");

  const update = () => {
    const now = new Date();
    const untilOpen = openAt.getTime() - now.getTime();
    const daysUntilOpen = Math.ceil(untilOpen / 86400000);

    if (now >= hideAfter || daysUntilOpen > showDays) {
      countdown.hidden = true;
      return;
    }

    countdown.hidden = false;

    if (untilOpen <= 0) {
      if (labelEl) labelEl.textContent = "Portit ovat auki";
      [dayEl, hourEl, minuteEl, secondEl].forEach((el) => {
        if (el) el.textContent = "00";
      });
      return;
    }

    const totalSeconds = Math.max(0, Math.floor(untilOpen / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (dayEl) dayEl.textContent = String(days).padStart(2, "0");
    if (hourEl) hourEl.textContent = String(hours).padStart(2, "0");
    if (minuteEl) minuteEl.textContent = String(minutes).padStart(2, "0");
    if (secondEl) secondEl.textContent = String(seconds).padStart(2, "0");
  };

  update();
  window.setInterval(update, 1000);
};

renderScheduleFromData();
initCountdown();
initStageScrollSync();

const centerStageInCalendar = (target) => {
  const stageScroll = target.closest(".stage-scroll");
  const stageLane = target.closest(".stage-lane");
  if (!stageScroll || !stageLane) return;

  stageScroll.scrollTo({
    left: Math.max(0, stageLane.offsetLeft - 72),
    behavior: "smooth",
  });
};

const updateActiveDayLink = () => {
  const panels = [...document.querySelectorAll(".running-panel")];
  if (!panels.length) return;

  const activePanel = panels.reduce((closest, panel) => {
    const distance = Math.abs(panel.getBoundingClientRect().top - 130);
    return !closest || distance < closest.distance ? { panel, distance } : closest;
  }, null);

  document.querySelectorAll(".running-day").forEach((link) => {
    link.setAttribute("aria-current", String(link.hash.slice(1) === activePanel?.panel.id));
  });
};

const highlightScheduleTarget = () => {
  const targetId = decodeURIComponent(window.location.hash.slice(1));
  if (!targetId || !targetId.startsWith("schedule-")) return;

  const target = document.getElementById(targetId);
  if (!target) return;

  window.requestAnimationFrame(() => {
    document.querySelectorAll(".schedule-row.is-highlighted, .run-slot.is-highlighted").forEach((row) => {
      row.classList.remove("is-highlighted");
    });

    centerStageInCalendar(target);
    target.classList.remove("is-highlighted");
    void target.offsetWidth;
    target.classList.add("is-highlighted");
    const scrollTarget = target.firstElementChild || target;
    scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });
    updateActiveDayLink();
  });
};

window.addEventListener("hashchange", highlightScheduleTarget);
window.addEventListener("load", highlightScheduleTarget);
window.addEventListener("load", updateActiveDayLink);
window.addEventListener("scroll", updateActiveDayLink, { passive: true });

document.querySelectorAll('a[href^="#schedule-"]').forEach((link) => {
  link.addEventListener("click", () => {
    if (link.hash === window.location.hash) {
      window.setTimeout(highlightScheduleTarget, 0);
    }
  });
});

document.querySelectorAll("[data-accordion]").forEach((accordion) => {
  accordion.querySelectorAll(".accordion-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const content = document.getElementById(trigger.getAttribute("aria-controls"));
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!expanded));
      if (content) content.hidden = expanded;
    });
  });
});
