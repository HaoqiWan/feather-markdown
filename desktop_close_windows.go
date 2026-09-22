//go:build windows

package main

import (
	"fmt"
	"syscall"
	"unsafe"

	"github.com/moxcomic/go-webview"
)

const (
	windowsCloseMessage      = 0x0010
	windowsGetMinMaxInfo     = 0x0024
	windowsNonClientSize     = 0x0083
	windowsNonClientHitTest  = 0x0084
	windowsNonClientLeftDown = 0x00A1
	windowsHitClient         = 1
	windowsHitCaption        = 2
	windowsHitLeft           = 10
	windowsHitRight          = 11
	windowsHitTop            = 12
	windowsHitTopLeft        = 13
	windowsHitTopRight       = 14
	windowsHitBottom         = 15
	windowsHitBottomLeft     = 16
	windowsHitBottomRight    = 17
	windowsShowMinimized     = 6
	windowsShowMaximized     = 3
	windowsShowRestored      = 9
	windowsStyleCaption      = 0x00C00000
	windowsStyleOverlapped   = 0x00CF0000
	windowsStylePopup        = 0x80000000
	windowsFrameChanged      = 0x0020
	windowsNoMove            = 0x0002
	windowsNoSize            = 0x0001
	windowsNoZOrder          = 0x0004
	windowsNoActivate        = 0x0010
	windowsNoOwnerZOrder     = 0x0200
	windowsCornerPreference  = 33
	windowsCornerRounded     = 2
	windowsMonitorNearest    = 2
)

var (
	user32                  = syscall.NewLazyDLL("user32.dll")
	dwmapi                  = syscall.NewLazyDLL("dwmapi.dll")
	setWindowAttribute      = dwmapi.NewProc("DwmSetWindowAttribute")
	getWindowLongPtr        = user32.NewProc("GetWindowLongPtrW")
	setWindowLongPtr        = user32.NewProc("SetWindowLongPtrW")
	callWindowProc          = user32.NewProc("CallWindowProcW")
	getWindowRectangle      = user32.NewProc("GetWindowRect")
	setWindowPosition       = user32.NewProc("SetWindowPos")
	getWindowPlacement      = user32.NewProc("GetWindowPlacement")
	setWindowPlacement      = user32.NewProc("SetWindowPlacement")
	monitorFromWindow       = user32.NewProc("MonitorFromWindow")
	getMonitorInformation   = user32.NewProc("GetMonitorInfoW")
	showWindow              = user32.NewProc("ShowWindow")
	isWindowZoomed          = user32.NewProc("IsZoomed")
	releaseMouseCapture     = user32.NewProc("ReleaseCapture")
	sendWindowMessage       = user32.NewProc("SendMessageW")
	desktopOriginalWndProc  uintptr
	desktopCloseCallbackPtr uintptr
	desktopFullscreen       bool
	desktopWindowedStyle    uintptr
	desktopWindowedPosition windowsWindowPlacement
)

type windowsPoint struct {
	x int32
	y int32
}

type windowsRectangle struct {
	left   int32
	top    int32
	right  int32
	bottom int32
}

type windowsMinMaxInfo struct {
	reserved     windowsPoint
	maxSize      windowsPoint
	maxPosition  windowsPoint
	minTrackSize windowsPoint
	maxTrackSize windowsPoint
}

type windowsMonitorInfo struct {
	size    uint32
	monitor windowsRectangle
	work    windowsRectangle
	flags   uint32
}

type windowsWindowPlacement struct {
	length         uint32
	flags          uint32
	showCommand    uint32
	minPosition    windowsPoint
	maxPosition    windowsPoint
	normalPosition windowsRectangle
}

func installDesktopWindowChrome(window unsafe.Pointer) error {
	hwnd := uintptr(window)
	if hwnd == 0 {
		return fmt.Errorf("native window handle is unavailable")
	}
	styleIndex := int64(-16)
	style, _, getErr := getWindowLongPtr.Call(hwnd, uintptr(styleIndex))
	if style == 0 {
		return fmt.Errorf("read native window style: %w", getErr)
	}
	if updated, _, setErr := setWindowLongPtr.Call(hwnd, uintptr(styleIndex), style&^windowsStyleCaption); updated == 0 {
		return fmt.Errorf("update native window style: %w", setErr)
	}
	flags := uintptr(windowsFrameChanged | windowsNoMove | windowsNoSize | windowsNoZOrder | windowsNoActivate)
	if result, _, positionErr := setWindowPosition.Call(hwnd, 0, 0, 0, 0, 0, flags); result == 0 {
		return fmt.Errorf("refresh native window frame: %w", positionErr)
	}
	cornerPreference := uint32(windowsCornerRounded)
	_, _, _ = setWindowAttribute.Call(
		hwnd,
		windowsCornerPreference,
		uintptr(unsafe.Pointer(&cornerPreference)),
		unsafe.Sizeof(cornerPreference),
	)
	return nil
}

func performDesktopWindowAction(window unsafe.Pointer, action string) {
	hwnd := uintptr(window)
	if hwnd == 0 {
		return
	}
	switch action {
	case "drag":
		_, _, _ = releaseMouseCapture.Call()
		_, _, _ = sendWindowMessage.Call(hwnd, windowsNonClientLeftDown, windowsHitCaption, 0)
	case "minimize":
		_, _, _ = showWindow.Call(hwnd, windowsShowMinimized)
	case "maximize":
		zoomed, _, _ := isWindowZoomed.Call(hwnd)
		command := uintptr(windowsShowMaximized)
		if zoomed != 0 {
			command = windowsShowRestored
		}
		_, _, _ = showWindow.Call(hwnd, command)
	case "enter-fullscreen":
		enterDesktopFullscreen(hwnd)
	case "exit-fullscreen":
		exitDesktopFullscreen(hwnd)
	case "close":
		_, _, _ = sendWindowMessage.Call(hwnd, windowsCloseMessage, 0, 0)
	}
}

func isDesktopWindowMaximized(window unsafe.Pointer) bool {
	hwnd := uintptr(window)
	if hwnd == 0 || desktopFullscreen {
		return false
	}
	zoomed, _, _ := isWindowZoomed.Call(hwnd)
	return zoomed != 0
}

func installDesktopCloseGuard(window webview.WebView) error {
	hwnd := uintptr(window.Window())
	if hwnd == 0 {
		return fmt.Errorf("native window handle is unavailable")
	}
	desktopCloseCallbackPtr = syscall.NewCallback(func(callbackWindow uintptr, message uint32, wParam, lParam uintptr) uintptr {
		switch message {
		case windowsCloseMessage:
			window.Eval(`if (typeof window.featherRequestClose === "function") { window.featherRequestClose(); } else if (typeof window.featherCloseWindow === "function") { window.featherCloseWindow(); }`)
			return 0
		case windowsGetMinMaxInfo:
			result, _, _ := callWindowProc.Call(desktopOriginalWndProc, callbackWindow, uintptr(message), wParam, lParam)
			if !desktopFullscreen {
				fitMaximizedWindowToWorkArea(callbackWindow, lParam)
			}
			return result
		case windowsNonClientSize:
			if wParam != 0 {
				return 0
			}
		case windowsNonClientHitTest:
			if hit := resizeHitTest(callbackWindow, lParam); hit != windowsHitClient {
				return hit
			}
		}
		result, _, _ := callWindowProc.Call(desktopOriginalWndProc, callbackWindow, uintptr(message), wParam, lParam)
		return result
	})
	windowProcIndex := int64(-4)
	original, _, callErr := setWindowLongPtr.Call(hwnd, uintptr(windowProcIndex), desktopCloseCallbackPtr)
	if original == 0 {
		return fmt.Errorf("replace native window procedure: %w", callErr)
	}
	desktopOriginalWndProc = original
	return nil
}

func monitorBounds(window uintptr) (windowsMonitorInfo, bool) {
	monitor, _, _ := monitorFromWindow.Call(window, windowsMonitorNearest)
	if monitor == 0 {
		return windowsMonitorInfo{}, false
	}
	info := windowsMonitorInfo{size: uint32(unsafe.Sizeof(windowsMonitorInfo{}))}
	if result, _, _ := getMonitorInformation.Call(monitor, uintptr(unsafe.Pointer(&info))); result == 0 {
		return windowsMonitorInfo{}, false
	}
	return info, true
}

func fitMaximizedWindowToWorkArea(window, minMaxPointer uintptr) {
	if minMaxPointer == 0 {
		return
	}
	info, ok := monitorBounds(window)
	if !ok {
		return
	}
	limits := (*windowsMinMaxInfo)(unsafe.Pointer(minMaxPointer))
	limits.maxPosition.x = info.work.left - info.monitor.left
	limits.maxPosition.y = info.work.top - info.monitor.top
	limits.maxSize.x = info.work.right - info.work.left
	limits.maxSize.y = info.work.bottom - info.work.top
}

func enterDesktopFullscreen(window uintptr) {
	if desktopFullscreen {
		return
	}
	info, ok := monitorBounds(window)
	if !ok {
		return
	}
	desktopWindowedPosition = windowsWindowPlacement{length: uint32(unsafe.Sizeof(windowsWindowPlacement{}))}
	if result, _, _ := getWindowPlacement.Call(window, uintptr(unsafe.Pointer(&desktopWindowedPosition))); result == 0 {
		return
	}
	styleIndex := int64(-16)
	style, _, _ := getWindowLongPtr.Call(window, uintptr(styleIndex))
	if style == 0 {
		return
	}
	desktopWindowedStyle = style
	fullscreenStyle := (style &^ uintptr(windowsStyleOverlapped)) | uintptr(windowsStylePopup)
	_, _, _ = setWindowLongPtr.Call(window, uintptr(styleIndex), fullscreenStyle)
	width := info.monitor.right - info.monitor.left
	height := info.monitor.bottom - info.monitor.top
	flags := uintptr(windowsFrameChanged | windowsNoOwnerZOrder)
	desktopFullscreen = true
	result, _, _ := setWindowPosition.Call(
		window,
		0,
		uintptr(int64(info.monitor.left)),
		uintptr(int64(info.monitor.top)),
		uintptr(int64(width)),
		uintptr(int64(height)),
		flags,
	)
	if result == 0 {
		desktopFullscreen = false
		_, _, _ = setWindowLongPtr.Call(window, uintptr(styleIndex), desktopWindowedStyle)
		_, _, _ = setWindowPlacement.Call(window, uintptr(unsafe.Pointer(&desktopWindowedPosition)))
	}
}

func exitDesktopFullscreen(window uintptr) {
	if !desktopFullscreen {
		return
	}
	styleIndex := int64(-16)
	_, _, _ = setWindowLongPtr.Call(window, uintptr(styleIndex), desktopWindowedStyle)
	_, _, _ = setWindowPlacement.Call(window, uintptr(unsafe.Pointer(&desktopWindowedPosition)))
	flags := uintptr(windowsFrameChanged | windowsNoMove | windowsNoSize | windowsNoZOrder | windowsNoOwnerZOrder | windowsNoActivate)
	_, _, _ = setWindowPosition.Call(window, 0, 0, 0, 0, 0, flags)
	desktopFullscreen = false
}

func resizeHitTest(window, packedPoint uintptr) uintptr {
	if desktopFullscreen {
		return windowsHitClient
	}
	zoomed, _, _ := isWindowZoomed.Call(window)
	if zoomed != 0 {
		return windowsHitClient
	}
	var bounds windowsRectangle
	if result, _, _ := getWindowRectangle.Call(window, uintptr(unsafe.Pointer(&bounds))); result == 0 {
		return windowsHitClient
	}
	x := int32(int16(uint16(packedPoint)))
	y := int32(int16(uint16(packedPoint >> 16)))
	const edge = int32(7)
	left := x >= bounds.left && x < bounds.left+edge
	right := x < bounds.right && x >= bounds.right-edge
	top := y >= bounds.top && y < bounds.top+edge
	bottom := y < bounds.bottom && y >= bounds.bottom-edge
	switch {
	case top && left:
		return windowsHitTopLeft
	case top && right:
		return windowsHitTopRight
	case bottom && left:
		return windowsHitBottomLeft
	case bottom && right:
		return windowsHitBottomRight
	case left:
		return windowsHitLeft
	case right:
		return windowsHitRight
	case top:
		return windowsHitTop
	case bottom:
		return windowsHitBottom
	default:
		return windowsHitClient
	}
}
