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
# tag ile CI APK + release
git tag hub-v1.0.0
git push origin hub-v1.0.0
```

Menü içeriği: `www/app-config.js`
