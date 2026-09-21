//go:build windows

package main

import (
	"syscall"
	"unsafe"
)

const (
	imageIcon       = 1
	iconSmall       = 0
	iconBig         = 1
	windowSetIcon   = 0x0080
	logoResourceID  = 1
	loadTransparent = 0
)

func setWindowIcon(window unsafe.Pointer) {
	if window == nil {
		return
	}
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	user32 := syscall.NewLazyDLL("user32.dll")
	getModuleHandle := kernel32.NewProc("GetModuleHandleW")
	loadImage := user32.NewProc("LoadImageW")
	sendMessage := user32.NewProc("SendMessageW")

	module, _, _ := getModuleHandle.Call(0)
	large, _, _ := loadImage.Call(module, logoResourceID, imageIcon, 32, 32, loadTransparent)
	small, _, _ := loadImage.Call(module, logoResourceID, imageIcon, 16, 16, loadTransparent)
	if large != 0 {
		_, _, _ = sendMessage.Call(uintptr(window), windowSetIcon, iconBig, large)
	}
	if small != 0 {
		_, _, _ = sendMessage.Call(uintptr(window), windowSetIcon, iconSmall, small)
	}
}
