/**
 * Atlas Hub APK güncelleme — MedyaAtlas / DNCR hub tarzı.
 * Yalnızca Android Capacitor APK’da: GitHub Releases kontrol + indir + kur.
 * iPhone / Safari / web’de APK UI gizlenir (sayfa yenilemek yeter).
 */
(function () {
  "use strict";

  var CFG = window.ATLAS_HUB || {
    version: "0",
    githubOwner: "alid67-git",
    githubRepo: "AtlasHub",
  };
  var LAST_CHECK_KEY = "atlas_hub_update_last_check";
  var MIN_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  var TAG_PREFIX = (CFG.releaseTagPrefix || "hub-v").toLowerCase();
  var APK_RE = CFG.apkNamePattern || /AtlasHub-.*\.apk$/i;

  var COPY = {
    dlProgress: "İndiriliyor… {pct}%",
    dlDone: "İndirme tamam — kurulum açılıyor…",
    installOpening: "Kurulum ekranı açılıyor…",
    installOpened: "Kurulum ekranı açıldı",
    installFail: "Kurulum açılamadı — tarayıcıdan dene",
    apkAndroidOnly: "APK güncelleme yalnızca Android hub’da",
    offline: "Çevrimdışı — güncelleme kontrol edilemedi",
    checking: "Güncelleme kontrol ediliyor…",
    noVersion: "Sürüm bilgisi alınamadı",
    upToDate: "Güncelsin (v{ver})",
    checkFail: "Güncelleme kontrolü başarısız",
    readyBody: "Sizin: v{current}\nGüncel: v{ver}\n\nİndirip kurunca hub güncellenir.",
    iosNoApk: "iPhone’da APK yok — Safari’den sayfayı yenilemen yeterli",
    noApkLink: "APK linki yok",
    downloadFail: "İndirme başarısız — tarayıcı açılıyor",
    apkOpenFail: "APK açılamadı",
  };

  var pending = null;
  var installing = false;
  var progressHideTimer = null;

  function $(id) {
    return document.getElementById(id);
  }

  function t(key, vars) {
    var s = COPY[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
      });
    }
    return s;
  }

  function showDownloadProgress(percent, label) {
    var wrap = $("hub-dl-progress");
    var fill = $("hub-dl-fill");
    var text = $("hub-dl-label");
    if (!wrap) return;
    clearTimeout(progressHideTimer);
    var pct = Math.max(0, Math.min(100, Number(percent) || 0));
    wrap.hidden = false;
    if (fill) fill.style.width = pct + "%";
    if (text) {
      text.textContent =
        label || (pct >= 100 ? t("dlDone") : t("dlProgress", { pct: pct }));
    }
  }

  function hideDownloadProgress(delayMs) {
    clearTimeout(progressHideTimer);
    var run = function () {
      var wrap = $("hub-dl-progress");
      var fill = $("hub-dl-fill");
      if (wrap) wrap.hidden = true;
      if (fill) fill.style.width = "0%";
    };
    if (delayMs && delayMs > 0) progressHideTimer = setTimeout(run, delayMs);
    else run();
  }

  function isAndroidHubApk() {
    try {
      var C = window.Capacitor;
      if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) {
        return false;
      }
      if (typeof C.getPlatform === "function") {
        return C.getPlatform() === "android";
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function hideApkUpdateUi() {
    var btnCheck = $("btn-hub-check-update");
    if (btnCheck) {
      btnCheck.hidden = true;
      btnCheck.style.display = "none";
    }
    var actions = document.querySelector(".hub-actions");
    if (actions) {
      actions.hidden = true;
      actions.style.display = "none";
    }
    hideModal();
  }

  function parseVersion(raw) {
    return String(raw || "")
      .trim()
      .replace(/^hub-v/i, "")
      .replace(/^v/i, "");
  }

  function compareVersions(a, b) {
    var pa = parseVersion(a)
      .split(".")
      .map(function (n) {
        return parseInt(n, 10) || 0;
      });
    var pb = parseVersion(b)
      .split(".")
      .map(function (n) {
        return parseInt(n, 10) || 0;
      });
    var len = Math.max(pa.length, pb.length);
    for (var i = 0; i < len; i++) {
      var diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff > 0 ? 1 : -1;
    }
    return 0;
  }

  function toast(msg) {
    var el = $("hub-toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.hidden = true;
    }, 3200);
  }

  function getHubApkPlugin() {
    try {
      var C = window.Capacitor;
      if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) {
        return null;
      }
      if (C.Plugins && C.Plugins.HubApk) return C.Plugins.HubApk;
      if (typeof C.registerPlugin === "function") return C.registerPlugin("HubApk");
    } catch (_) {}
    return null;
  }

  async function openExternal(url) {
    if (!url) return;
    var plugin = getHubApkPlugin();
    if (plugin && typeof plugin.openExternal === "function") {
      await plugin.openExternal({ url: url });
      return;
    }
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser) {
        Capacitor.Plugins.Browser.open({ url: url });
        return;
      }
    } catch (_) {}
    window.open(url, "_blank", "noopener");
  }

  async function downloadAndInstall(url) {
    var plugin = getHubApkPlugin();
    if (!plugin || typeof plugin.downloadAndInstall !== "function") {
      await openExternal(url);
      return { mode: "browser" };
    }
    try {
      if (typeof plugin.addListener === "function" && !downloadAndInstall._bound) {
        downloadAndInstall._bound = true;
        plugin.addListener("downloadProgress", function (ev) {
          var pct =
            ev && typeof ev.percent === "number"
              ? ev.percent
              : ev && ev.total > 0
                ? Math.round((100 * (ev.bytes || 0)) / ev.total)
                : 0;
          showDownloadProgress(pct);
        });
        plugin.addListener("installReady", function () {
          showDownloadProgress(100, t("installOpening"));
          toast(t("installOpened"));
          installing = false;
          hideDownloadProgress(2200);
        });
        plugin.addListener("installError", function () {
          hideDownloadProgress(0);
          toast(t("installFail"));
          installing = false;
          if (pending && pending.apkUrl) openExternal(pending.apkUrl);
        });
      }
    } catch (_) {}
    showDownloadProgress(0, t("dlProgress", { pct: 0 }));
    var result = await plugin.downloadAndInstall({ url: url });
    return { mode: "native", result: result };
  }

  function shouldSkip(force) {
    if (force) return false;
    try {
      var last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
      return Date.now() - last < MIN_CHECK_INTERVAL_MS;
    } catch (_) {
      return false;
    }
  }

  function markChecked() {
    try {
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    } catch (_) {}
  }

  function findHubRelease(releases) {
    var list = Array.isArray(releases) ? releases : [];
    for (var i = 0; i < list.length; i++) {
      var rel = list[i];
      if (rel.draft || rel.prerelease) continue;
      var tag = String(rel.tag_name || "").toLowerCase();
      var assets = Array.isArray(rel.assets) ? rel.assets : [];
      var apk = null;
      for (var j = 0; j < assets.length; j++) {
        if (APK_RE.test(assets[j].name || "")) {
          apk = assets[j];
          break;
        }
      }
      if (!apk) continue;
      if (!tag.startsWith(TAG_PREFIX) && !/^v?\d/.test(tag)) continue;
      return {
        version: parseVersion(rel.tag_name || rel.name),
        tag: rel.tag_name,
        name: rel.name || rel.tag_name,
        notes: rel.body || "",
        htmlUrl: rel.html_url,
        apkUrl: apk.browser_download_url || null,
      };
    }
    return null;
  }

  async function fetchHubLatest() {
    var owner = CFG.githubOwner || "alid67-git";
    var repo = CFG.githubRepo || "AtlasHub";
    var url = "https://api.github.com/repos/" + owner + "/" + repo + "/releases?per_page=30";
    var res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error("release-fetch " + res.status);
    return findHubRelease(await res.json());
  }

  function showModal(info) {
    pending = info;
    var modal = $("hub-update-modal");
    var body = $("hub-update-body");
    if (!modal || !body) return;
    body.textContent = t("readyBody", {
      current: CFG.version || "?",
      ver: info.version || "?",
    });
    modal.hidden = false;
  }

  function hideModal() {
    var modal = $("hub-update-modal");
    if (modal) modal.hidden = true;
  }

  async function check(opts) {
    opts = opts || {};
    var force = !!opts.force;
    var silent = opts.silent !== false;
    if (!isAndroidHubApk()) {
      if (!silent) toast(t("apkAndroidOnly"));
      return { status: "skipped-platform" };
    }
    if (shouldSkip(force)) return { status: "skipped" };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      if (!silent) toast(t("offline"));
      return { status: "error" };
    }
    if (!silent) toast(t("checking"));
    markChecked();
    try {
      var info = await fetchHubLatest();
      if (!info || !info.version) {
        if (!silent) toast(t("noVersion"));
        return { status: "error" };
      }
      if (compareVersions(info.version, CFG.version) <= 0) {
        if (!silent) toast(t("upToDate", { ver: CFG.version }));
        return { status: "up-to-date", version: info.version };
      }
      showModal(info);
      return Object.assign({ status: "available" }, info);
    } catch (err) {
      console.warn("Atlas Hub update check failed", err);
      if (!silent) toast(t("checkFail"));
      return { status: "error" };
    }
  }

  async function applyUpdate() {
    if (!isAndroidHubApk()) {
      hideModal();
      toast(t("iosNoApk"));
      return;
    }
    if (!pending || installing) return;
    var url = pending.apkUrl || pending.htmlUrl;
    if (!url) {
      toast(t("noApkLink"));
      return;
    }
    installing = true;
    var btn = $("btn-hub-update-now");
    if (btn) btn.disabled = true;
    hideModal();
    showDownloadProgress(0, t("dlProgress", { pct: 0 }));
    try {
      await downloadAndInstall(url);
    } catch (err) {
      console.warn("Atlas Hub update apply failed", err);
      hideDownloadProgress(0);
      toast(t("downloadFail"));
      try {
        await openExternal(url);
      } catch (_) {
        toast(t("apkOpenFail"));
      }
      installing = false;
    } finally {
      if (btn) btn.disabled = false;
      setTimeout(function () {
        installing = false;
      }, 2000);
    }
  }

  function init() {
    if (!isAndroidHubApk()) {
      hideApkUpdateUi();
      return;
    }

    var btnCheck = $("btn-hub-check-update");
    if (btnCheck) {
      btnCheck.addEventListener("click", function () {
        check({ force: true, silent: false });
      });
    }
    var btnNow = $("btn-hub-update-now");
    if (btnNow) btnNow.addEventListener("click", function () {
      applyUpdate();
    });
    var btnLater = $("btn-hub-update-later");
    if (btnLater) btnLater.addEventListener("click", hideModal);
    var modal = $("hub-update-modal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) hideModal();
      });
    }

    setTimeout(function () {
      check({ force: false, silent: true });
    }, 1100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.HubUpdate = { check: check, compareVersions: compareVersions, parseVersion: parseVersion };
})();
