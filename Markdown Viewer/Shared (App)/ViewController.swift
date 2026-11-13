//
//  ViewController.swift
//  Shared (App)
//
//  Created by Dallas Brown on 11/12/26.
//

import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
typealias PlatformViewController = NSViewController
#endif

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

#if os(macOS)
    private var extensionBundleIdentifier: String? {
        Bundle.main.bundleIdentifier.map { $0 + ".Extension" }
    }
#endif

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

#if os(iOS)
        self.webView.scrollView.isScrollEnabled = false
#endif

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        webView.evaluateJavaScript("show('ios')")
#elseif os(macOS)
        let usesSettings = if #available(macOS 13, *) { true } else { false }
        webView.evaluateJavaScript("show('mac', undefined, \(usesSettings))")

        guard let extensionBundleIdentifier else { return }

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { state, error in
            guard let state, error == nil else { return }

            DispatchQueue.main.async {
                webView.evaluateJavaScript("show('mac', \(state.isEnabled), \(usesSettings))")
            }
        }
#endif
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
#if os(macOS)
        guard message.body as? String == "open-preferences" else { return }
        guard let extensionBundleIdentifier else {
            showSafariSettingsError()
            return
        }

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            DispatchQueue.main.async {
                guard error == nil else {
                    self.showSafariSettingsError()
                    return
                }

                NSApp.terminate(self)
            }
        }
#endif
    }

#if os(macOS)
    private func showSafariSettingsError() {
        let alert = NSAlert()
        alert.messageText = "Couldn’t Open Safari Extensions"
        alert.informativeText = "In Safari, choose Safari > Settings, then click Extensions to find Markdown Viewer."
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
#endif

}
