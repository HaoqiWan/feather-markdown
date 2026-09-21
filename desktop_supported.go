//go:build windows || darwin || linux

package main

import (
	"fmt"

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
	window.Navigate(url)
	window.Run()
	return nil
}
