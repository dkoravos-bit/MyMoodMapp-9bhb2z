/**
 * withoutWebRTC.js
 *
 * Expo Config Plugin that removes react-native-webrtc from the iOS Podfile
 * AND from the resolved package list during EAS prebuild.
 * This prevents WebRTC.framework from being compiled into the binary.
 *
 * WHY THIS IS NECESSARY:
 * react-native-webrtc's native module +load method fires during iOS app
 * launch BEFORE the React JS bridge is ready. On iOS 26 this triggers an
 * ObjC exception in AVFoundation/Core Audio which React Native's
 * ExceptionsManagerQueue escalates to abort(), crashing every build.
 *
 * The Metro JS shim prevents JS imports, but Xcode still LINKS the
 * framework unless we also strip it from the Podfile before `pod install`.
 */

const PLUGIN_NAME = 'withoutWebRTC';

const withoutWebRTC = (config) => {
  const _cp = '@expo/config-' + 'plugins';
  const { withDangerousMod } = require(_cp);
  const fs = require('fs');
  const path = require('path');

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const podfilePath = path.join(projectRoot, 'ios', 'Podfile');

      // ── 1. Strip from Podfile ──────────────────────────────────────────────
      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, 'utf8');
        const before = podfile.length;

        // Remove pod lines referencing react-native-webrtc
        podfile = podfile.replace(
          /^[^\S\r\n]*pod ['"]react-native-webrtc['"][^\n]*\n/gm,
          ''
        );
        // Remove comment lines referencing it
        podfile = podfile.replace(
          /^[^\S\r\n]*#[^\n]*react-native-webrtc[^\n]*\n/gim,
          ''
        );

        if (podfile.length !== before) {
          fs.writeFileSync(podfilePath, podfile, 'utf8');
          console.log(`[${PLUGIN_NAME}] ✅ Removed react-native-webrtc from Podfile`);
        } else {
          console.log(`[${PLUGIN_NAME}] ℹ️  react-native-webrtc not in Podfile`);
        }
      } else {
        console.warn(`[${PLUGIN_NAME}] Podfile not found — skipping`);
      }

      // ── 2. Remove from node_modules/.package-lock.json if present ─────────
      // Belt-and-suspenders: CocoaPods auto-linking scans node_modules.
      // Renaming the package dir prevents it from being picked up even if
      // Podfile stripping is insufficient.
      const webrtcPkgDir = path.join(projectRoot, 'node_modules', 'react-native-webrtc');
      const webrtcPkgDirDisabled = webrtcPkgDir + '__disabled';

      if (fs.existsSync(webrtcPkgDir) && !fs.existsSync(webrtcPkgDirDisabled)) {
        try {
          fs.renameSync(webrtcPkgDir, webrtcPkgDirDisabled);
          console.log(`[${PLUGIN_NAME}] ✅ Renamed node_modules/react-native-webrtc → react-native-webrtc__disabled`);
        } catch (e) {
          console.warn(`[${PLUGIN_NAME}] Could not rename webrtc dir:`, e.message);
        }
      }

      // ── 3. Patch ios/Podfile.lock if it exists (post-pod-install check) ───
      const podfileLockPath = path.join(projectRoot, 'ios', 'Podfile.lock');
      if (fs.existsSync(podfileLockPath)) {
        let lock = fs.readFileSync(podfileLockPath, 'utf8');
        if (lock.includes('react-native-webrtc')) {
          lock = lock
            .replace(/^[^\S\r\n]*- react-native-webrtc[^\n]*\n/gm, '')
            .replace(/^[^\S\r\n]*react-native-webrtc[^\n]*\n/gm, '');
          fs.writeFileSync(podfileLockPath, lock, 'utf8');
          console.log(`[${PLUGIN_NAME}] ✅ Stripped react-native-webrtc from Podfile.lock`);
        }
      }

      return config;
    },
  ]);
};

module.exports = withoutWebRTC;
