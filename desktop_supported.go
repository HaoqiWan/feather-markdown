//go:build windows || darwin || linux

package main

import (
	"fmt"
	"net/url"
	"os/exec"
	"runtime"
	"strings"

	"github.com/moxcomic/go-webview"
	_ "github.com/moxcomic/go-webview/embedded"
)

func runDesktop(url string, debug bool) error {
	window, err := webview.New(debug)
	if err != nil {
		return fmt.Errorf("create native window: %w", err)
	}
	defer window.Destroy()

	window.SetTitle("Feather Markdown")
	setWindowIcon(window.Window())
	window.SetSize(1180, 780, webview.HintNone)
	window.SetSize(860, 560, webview.HintMin)
	window.Init(fmt.Sprintf(`window.featherDesktopPlatform = %q;`, runtime.GOOS))
	if err := window.Bind("featherCloseWindow", func() { window.Terminate() }); err != nil {
		return fmt.Errorf("bind window close action: %w", err)
	}
	if err := window.Bind("featherWindowAction", func(action string) {
		window.Dispatch(func() { performDesktopWindowAction(window.Window(), action) })
	}); err != nil {
		return fmt.Errorf("bind window action: %w", err)
	}
	if err := window.Bind("featherWindowIsMaximized", func() bool {
		return isDesktopWindowMaximized(window.Window())
	}); err != nil {
		return fmt.Errorf("bind window state: %w", err)
	}
	if err := window.Bind("featherChooseWorkspace", func() map[string]string {
		path, err := chooseWorkspaceDirectory(uintptr(window.Window()))
		if err != nil {
			return map[string]string{"error": err.Error()}
		}
		return map[string]string{"path": path}
	}); err != nil {
		return fmt.Errorf("bind workspace picker: %w", err)
	}
	if err := window.Bind("featherOpenExternal", openExternalURL); err != nil {
		return fmt.Errorf("bind external link action: %w", err)
	}
	if err := installDesktopCloseGuard(window); err != nil {
		return fmt.Errorf("install window close guard: %w", err)
	}
	if err := installDesktopWindowChrome(window.Window()); err != nil {
		return fmt.Errorf("install desktop window chrome: %w", err)
	}
	window.Navigate(url)
	window.Run()
	return nil
}

func validateExternalURL(rawURL string) (string, error) {
	trimmed := strings.TrimSpace(rawURL)
	parsed, err := url.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("parse external URL: %w", err)
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		if parsed.Hostname() == "" {
			return "", fmt.Errorf("external URL has no host")
		}
	case "mailto":
		if parsed.Opaque == "" && parsed.Path == "" {
			return "", fmt.Errorf("email link has no address")
		}
	default:
		return "", fmt.Errorf("unsupported external URL scheme %q", parsed.Scheme)
	}
	return trimmed, nil
}

func openExternalURL(rawURL string) error {
	externalURL, err := validateExternalURL(rawURL)
	if err != nil {
		return err
	}

	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", externalURL)
	case "darwin":
		command = exec.Command("open", externalURL)
	default:
		command = exec.Command("xdg-open", externalURL)
	}
	if err := command.Start(); err != nil {
		return fmt.Errorf("open external URL: %w", err)
	}
	return nil
}
