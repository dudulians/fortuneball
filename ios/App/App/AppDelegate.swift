import UIKit
import Capacitor
import CoreHaptics
import AVFoundation
import StoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Shaking is how the ball is asked. Without this, iOS shows its own
        // "Undo Typing / Redo Typing" alert every time the phone is shaken
        // after a question has been typed.
        application.applicationSupportsShakeToEdit = false
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// MARK: - CoreHaptics plugin
//
// Drives the Taptic Engine through Core Haptics directly. The same approach
// ships in MeMap: on the user's iPhone @capacitor/haptics' UIImpactFeedback-
// Generator path produced nothing she could feel, Core Haptics did.
//
// Lives in AppDelegate.swift so no new source file has to be registered in
// App.xcodeproj by hand (there is no Mac to drive Xcode). The class is made
// discoverable by adding "CoreHapticsPlugin" to packageClassList in
// capacitor.config.json — codemagic.yaml re-injects it after `cap sync`.

@objc(CoreHapticsPlugin)
public class CoreHapticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CoreHapticsPlugin"
    public let jsName = "CoreHaptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "knock", returnType: CAPPluginReturnNone),
        CAPPluginMethod(name: "reveal", returnType: CAPPluginReturnNone),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    ]

    private var engine: CHHapticEngine?

    private var supports: Bool {
        return CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    public override func load() {
        guard supports else { return }
        do {
            engine = try CHHapticEngine()
            engine?.stoppedHandler = { [weak self] _ in self?.startEngine() }
            engine?.resetHandler = { [weak self] in self?.startEngine() }
            try engine?.start()
        } catch {
            print("[CoreHaptics] init failed: \(error)")
        }
    }

    private func startEngine() {
        guard let engine = engine else { return }
        do {
            try engine.start()
        } catch {
            print("[CoreHaptics] start failed: \(error)")
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": supports])
    }

    /// One knock of the die against the wall. intensity / sharpness are 0...1.
    @objc func knock(_ call: CAPPluginCall) {
        let intensity = Float(call.getDouble("intensity") ?? 0.5)
        let sharpness = Float(call.getDouble("sharpness") ?? 0.5)
        playPattern([transientEvent(at: 0, intensity: intensity, sharpness: sharpness)])
        call.resolve()
    }

    /// The die lands on the glass: a heavy thump, then two soft confirming pulses.
    @objc func reveal(_ call: CAPPluginCall) {
        let events = [
            transientEvent(at: 0.0, intensity: 1.0, sharpness: 0.6),
            transientEvent(at: 0.14, intensity: 0.5, sharpness: 0.5),
            transientEvent(at: 0.24, intensity: 0.7, sharpness: 0.7),
        ]
        playPattern(events)
        call.resolve()
    }

    private func transientEvent(at relativeTime: TimeInterval, intensity: Float, sharpness: Float) -> CHHapticEvent {
        return CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: min(max(intensity, 0), 1)),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: min(max(sharpness, 0), 1)),
            ],
            relativeTime: relativeTime
        )
    }

    private func playPattern(_ events: [CHHapticEvent]) {
        guard supports, let engine = engine else { return }
        do {
            try engine.start()
            let pattern = try CHHapticPattern(events: events, parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: 0)
        } catch {
            print("[CoreHaptics] play failed: \(error)")
        }
    }
}

// MARK: - AudioSession plugin
//
// Speech recognition switches the shared audio session to playAndRecord and
// leaves it there, after which the web audio in the WebView goes quiet (the
// user heard the knocks disappear after dictating a question). `restore`
// puts the session back to the ordinary ambient playback the app started
// with: respects the silent switch, mixes with music. Called from sound.ts
// after every dictation and before every shake.

@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    @objc func restore(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
            call.resolve(["restored": true])
        } catch {
            print("[AudioSession] restore failed: \(error)")
            call.resolve(["restored": false])
        }
    }
}

// MARK: - StoreKit plugin
//
// One product: "Remove ads", non-consumable. StoreKit 2 straight from the
// system — a single purchase does not need RevenueCat, and every extra SDK is
// one more thing to declare in App Privacy.
//
// Lives here for the same reason the other two do: no Mac, so no new file can
// be added to App.xcodeproj by hand. "StoreKitPlugin" is re-injected into
// packageClassList by codemagic.yaml after every `cap sync`.

@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPurchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "price", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    /// Must match the product id created in App Store Connect.
    private static let productId = "com.uliana.fortuneball.removeads"

    private var updates: Task<Void, Never>?

    public override func load() {
        // A purchase can finish while the app was closed (interrupted payment,
        // Ask to Buy, a refund). Without this listener those transactions are
        // never finished and StoreKit keeps replaying them.
        updates = Task.detached {
            for await update in Transaction.updates {
                if case .verified(let transaction) = update {
                    await transaction.finish()
                }
            }
        }
    }

    deinit {
        updates?.cancel()
    }

    private static func isOwned() async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == productId,
               transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }

    @objc func status(_ call: CAPPluginCall) {
        Task {
            let owned = await Self.isOwned()
            call.resolve(["owned": owned])
        }
    }

    /// The price as the App Store formats it for this person's storefront.
    @objc func price(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: [Self.productId])
                guard let product = products.first else {
                    call.resolve(["available": false, "price": ""])
                    return
                }
                call.resolve(["available": true, "price": product.displayPrice])
            } catch {
                print("[StoreKit] price failed: \(error)")
                call.resolve(["available": false, "price": ""])
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: [Self.productId])
                guard let product = products.first else {
                    call.reject("The product is not available in this store yet.")
                    return
                }
                switch try await product.purchase() {
                case .success(let verification):
                    if case .verified(let transaction) = verification {
                        await transaction.finish()
                        call.resolve(["owned": true, "cancelled": false])
                    } else {
                        call.reject("The purchase could not be verified.")
                    }
                case .userCancelled:
                    let owned = await Self.isOwned()
                    call.resolve(["owned": owned, "cancelled": true])
                case .pending:
                    // Ask to Buy, or a payment method that needs a step elsewhere.
                    call.resolve(["owned": false, "cancelled": false, "pending": true])
                @unknown default:
                    let owned = await Self.isOwned()
                    call.resolve(["owned": owned, "cancelled": false])
                }
            } catch {
                print("[StoreKit] purchase failed: \(error)")
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    /// Same Apple ID, new phone.
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            try? await AppStore.sync()
            let owned = await Self.isOwned()
            call.resolve(["owned": owned])
        }
    }
}
