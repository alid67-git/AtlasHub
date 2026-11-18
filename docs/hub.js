(function () {
  var cfg = window.ATLAS_HUB || { apps: [], tools: [], games: [], version: "0.0.0" };

  function setAppHeight() {
    var h =
      (window.visualViewport && window.visualViewport.height) ||
      window.innerHeight ||
      document.documentElement.clientHeight;
    if (!h) return;
    document.documentElement.style.setProperty("--app-height", Math.round(h) + "px");
  }
  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", function () {
    setTimeout(setAppHeight, 120);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setAppHeight);
  }

  var ver = document.getElementById("hub-ver");
  if (ver) ver.textContent = "v" + cfg.version;
  var apk = document.getElementById("apk-link");
  if (apk && cfg.apkReleaseUrl) apk.href = cfg.apkReleaseUrl;

  function isCapacitor() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  async function openUrl(url) {
    if (!url) return;
    try {
      if (isCapacitor() && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
        await window.Capacitor.Plugins.Browser.open({ url: url });
        return;
      }
    } catch (_) {}
    window.location.assign(url);
  }

  function tileEl(item, kind) {
    var a = document.createElement("a");
    a.className = "tile" + (kind === "game" ? " game" : "");
    a.href = item.url;
    a.rel = "noopener";
    a.setAttribute("data-url", item.url);

    var art = document.createElement("div");
    art.className = "tile-art" + (item.tone ? " " + item.tone : "");
    if (item.icon) {
      var img = document.createElement("img");
      img.src = item.icon;
      img.alt = "";
      img.width = 48;
      img.height = 48;
      art.appendChild(img);
    } else {
      art.textContent = item.mark || (item.name || "?").slice(0, 2).toUpperCase();
    }

    var copy = document.createElement("div");
    copy.className = "tile-copy";
    var strong = document.createElement("strong");
    strong.textContent = item.name;
    var span = document.createElement("span");
    span.textContent = item.blurb || "";
    copy.appendChild(strong);
    copy.appendChild(span);

    a.appendChild(art);
    a.appendChild(copy);

    a.addEventListener("click", function (e) {
      e.preventDefault();
      openUrl(item.url);
    });
    return a;
  }

  function fill(id, list, kind) {
    var root = document.getElementById(id);
    if (!root) return;
    root.innerHTML = "";
    (list || []).forEach(function (item) {
      root.appendChild(tileEl(item, kind));
    });
  }

  fill("apps-grid", cfg.apps, "app");
  fill("tools-grid", cfg.tools, "tool");
  fill("games-grid", cfg.games, "game");
})();
