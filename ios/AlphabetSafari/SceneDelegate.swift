import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
    }

    // Don't keep talking or playing once the app is in the background.
    func sceneWillResignActive(_ scene: UIScene) {
        (window?.rootViewController as? WebViewController)?.pause()
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        (window?.rootViewController as? WebViewController)?.resume()
    }
}
