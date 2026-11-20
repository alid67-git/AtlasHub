(function () {
  var cfg = window.ATLAS_HUB || { apps: [], tools: [], wipTools: [], games: [], version: "0.0.0" };
  var pendingItem = null;

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

  function plugins() {
    return (window.Capacitor && window.Capacitor.Plugins) || {};
  }

  async function openUrl(url) {
    if (!url) return;
    try {
      if (isCapacitor() && plugins().Browser) {
        await plugins().Browser.open({ url: url });
        return;
      }
    } catch (_) {}
    window.open(url, "_blank", "noopener");
  }

  // Capacitor AppLauncher Android: url = ham paket adı (ör. com.rideatlas.rideatlas).
  // "package:" öneki getPackageInfo’yu bozar → her zaman “kurulu değil” görünür.
  async function canLaunchPackage(packageId) {
    if (!packageId || !isCapacitor() || !plugins().AppLauncher) return false;
    try {
      var res = await plugins().AppLauncher.canOpenUrl({ url: packageId });
      return !!(res && res.value);
    } catch (_) {
      return false;
    }
  }

  async function launchPackage(packageId) {
    if (!packageId || !plugins().AppLauncher) return false;
    try {
      var res = await plugins().AppLauncher.openUrl({ url: packageId });
      return !!(res && res.completed);
    } catch (_) {
      return false;
    }
  }

  function showInstallModal(item) {
    pendingItem = item;
    var modal = document.getElementById("install-modal");
    var title = document.getElementById("install-title");
    var body = document.getElementById("install-body");
    var installBtn = document.getElementById("btn-install");
    var webBtn = document.getElementById("btn-open-web");
    if (!modal || !item) return;
    title.textContent = (item.name || "Uygulama") + " kurulu değil";
    body.textContent =
      "Bu uygulamayı Android’de çalıştırmak için önce kurmanız gerekiyor. Aşağıdan APK’yı indirip kurabilirsiniz.";
    installBtn.hidden = !item.installUrl;
    webBtn.hidden = !item.url;
    modal.hidden = false;
  }

  function hideInstallModal() {
    pendingItem = null;
    var modal = document.getElementById("install-modal");
    if (modal) modal.hidden = true;
  }

  async function launchItem(item) {
    if (!item) return;

    // Android: native APK varsa aç; yoksa kurulum kısayolu (web-only / oyunlar hariç)
    if (isCapacitor() && item.packageId && item.installUrl && item.preferNative !== false) {
      var installed = await canLaunchPackage(item.packageId);
      if (installed) {
        var ok = await launchPackage(item.packageId);
        if (ok) return;
      }
      // Oyunlar web’de de çalışır — kurulu değilse siteyi aç
      if (item.kind === "game" && item.url) {
        await openUrl(item.url);
        return;
      }
      showInstallModal(item);
      return;
    }

    if (item.url) await openUrl(item.url);
  }

  function tileEl(item, kind) {
    var a = document.createElement("a");
    a.className = "tile" + (kind === "game" ? " game" : "");
    a.href = item.url || item.installUrl || "#";
    a.rel = "noopener";

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
      launchItem(item);
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

  function withKind(list, kind) {
    return (list || []).map(function (item) {
      var copy = Object.assign({}, item);
      copy.kind = kind;
      return copy;
    });
  }

  fill("apps-grid", withKind(cfg.apps, "app"), "app");
  fill("tools-grid", withKind(cfg.tools, "tool"), "tool");
  fill("wip-tools-grid", withKind(cfg.wipTools, "tool"), "tool");
  fill("games-grid", withKind(cfg.games, "game"), "game");

  var btnInstall = document.getElementById("btn-install");
  var btnWeb = document.getElementById("btn-open-web");
  var btnClose = document.getElementById("btn-install-close");
  var modal = document.getElementById("install-modal");

  if (btnInstall) {
    btnInstall.addEventListener("click", function () {
      if (pendingItem && pendingItem.installUrl) openUrl(pendingItem.installUrl);
    });
  }
  if (btnWeb) {
    btnWeb.addEventListener("click", function () {
      if (pendingItem && pendingItem.url) openUrl(pendingItem.url);
      hideInstallModal();
    });
  }
  if (btnClose) btnClose.addEventListener("click", hideInstallModal);
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) hideInstallModal();
    });
  }
})();
