//go:build darwin || linux

package main

import (
	"unsafe"

	"github.com/moxcomic/go-webview"
)

func installDesktopWindowChrome(_ unsafe.Pointer) error {
	return nil
}

func performDesktopWindowAction(_ unsafe.Pointer, _ string) {}

func isDesktopWindowMaximized(_ unsafe.Pointer) bool { return false }

func installDesktopCloseGuard(_ webview.WebView) error {
	return nil
}
