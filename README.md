# Atlas Hub

Tüm projeler + DNCR Games için tek ana menü.

| | |
|--|--|
| **Web / Safari** | https://alid67-git.github.io/AtlasHub/ |
| **Android APK** | [Releases](https://github.com/alid67-git/AtlasHub/releases/latest) |

## Kullanım

- **iPhone / iPad:** Safari’de hub’ı aç → **Paylaş → Ana Ekrana Ekle**
- **Android:** APK kur veya Chrome’da hub → Ana ekrana ekle
- Üstte uygulamalar, ortada araçlar, **altta DNCR Games oyunları**

## Yerel

```bash
npm install
npx cap add android   # bir kez
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Sürüm / APK

```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Android hub APK açılışta GitHub Releases’i kontrol eder (`hub-v*` + `AtlasHub-*.apk`).
Yeni sürüm varsa MedyaAtlas tarzı diyalog → indir → kur. Elle:
**Güncellemeyi kontrol et**.

> **Önemli:** Web (`docs/` / GitHub Pages) anında güncellenir; Android APK ise
> yalnızca yeni bir **Release** (`hub-vX.Y.Z` + `AtlasHub-X.Y.Z.apk`) yayınlanınca
> güncelleme görür. `www/version.json` yükseltip APK release etmezseniz telefon
> eski menüyü gösterir ama “Güncelsin” der — çünkü son yayınlanan APK hâlâ o sürüm.

Menü: `www/app-config.js` · Pages: `docs/` · sürüm: `www/version.json`  
Android `versionName` / `versionCode`: `android/app/build.gradle` (version.json ile aynı tut).
