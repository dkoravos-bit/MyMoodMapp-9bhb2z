/**
 * Raise every CocoaPods target (including resource-bundle targets) to the app's
 * iOS deployment target. Newer Xcode versions refuse to build pods that still
 * declare iOS 9–13 (e.g. Stripe, SDWebImage, Lottie, RNSVG resource bundles),
 * which fails the whole build with "IPHONEOS_DEPLOYMENT_TARGET is set to X, but
 * the range of supported deployment target versions is …".
 * iOS only — Android is unaffected.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARK = '# [withPodDeploymentTarget]';

module.exports = function withPodDeploymentTarget(config, { target = '15.1' } = {}) {
  return withDangerousMod(config, ['ios', (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    let src = fs.readFileSync(file, 'utf8');
    if (src.includes(MARK)) return cfg;
    const snippet = `
    ${MARK}
    min_ios = '${target}'
    bump = lambda do |bc|
      cur = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios if cur.nil? || Gem::Version.new(cur) < Gem::Version.new(min_ios)
    end
    installer.pods_project.targets.each { |t| t.build_configurations.each(&bump) }
    # fmt 11 (RN 0.79) hits "call to consteval function is not a constant expression" on newer Xcode clang; build it as C++17.
    installer.pods_project.targets.each do |t|
      next unless t.name == 'fmt'
      t.build_configurations.each { |bc| bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17' }
    end
    installer.target_installation_results.pod_target_installation_results.each do |_, r|
      r.resource_bundle_targets.each { |t| t.build_configurations.each(&bump) }
    end
`;
    // Run after react_native_post_install so nothing resets it.
    const after = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;
    const start = /(post_install do \|installer\|\n)/;
    if (after.test(src)) src = src.replace(after, (m) => m + snippet);
    else if (start.test(src)) src = src.replace(start, (m) => m + snippet);
    else throw new Error('withPodDeploymentTarget: post_install block not found in Podfile');
    fs.writeFileSync(file, src);
    return cfg;
  }]);
};
