//go:build windows

package main

import (
	"fmt"
	"runtime"
	"syscall"
	"unsafe"
)

const (
	windowsClassContextInProcessServer = 0x0001
	windowsCoInitApartmentThreaded     = 0x0002
	windowsCoInitDisableOLE1DDE        = 0x0004
	windowsFileOpenPickFolders         = 0x00000020
	windowsFileOpenForceFileSystem     = 0x00000040
	windowsFileOpenPathMustExist       = 0x00000800
	windowsFileOpenDoNotAddToRecent    = 0x02000000
	windowsShellItemFileSystemPath     = 0x80058000
	windowsErrorCancelled              = 0x800704C7
)

var (
	windowsOle32          = syscall.NewLazyDLL("ole32.dll")
	windowsCoInitializeEx = windowsOle32.NewProc("CoInitializeEx")
	windowsCoUninitialize = windowsOle32.NewProc("CoUninitialize")
	windowsCoCreate       = windowsOle32.NewProc("CoCreateInstance")
	windowsCoTaskMemFree  = windowsOle32.NewProc("CoTaskMemFree")
)

type windowsGUID struct {
	data1 uint32
	data2 uint16
	data3 uint16
	data4 [8]byte
}

var (
	windowsFileOpenDialogClass = windowsGUID{
		data1: 0xDC1C5A9C,
		data2: 0xE88A,
		data3: 0x4DDE,
		data4: [8]byte{0xA5, 0xA1, 0x60, 0xF8, 0x2A, 0x20, 0xAE, 0xF7},
	}
	windowsFileOpenDialogInterface = windowsGUID{
		data1: 0xD57C7288,
		data2: 0xD4AD,
		data3: 0x4768,
		data4: [8]byte{0xBE, 0x02, 0x9D, 0x96, 0x95, 0x32, 0xD9, 0x60},
	}
)

type windowsCOMObject struct {
	vtable *[29]uintptr
}

type workspacePickerResult struct {
	path string
	err  error
}

func windowsCOMCall(object *windowsCOMObject, method int, arguments ...uintptr) uintptr {
	callArguments := make([]uintptr, 1, len(arguments)+1)
	callArguments[0] = uintptr(unsafe.Pointer(object))
	callArguments = append(callArguments, arguments...)
	result, _, _ := syscall.SyscallN(object.vtable[method], callArguments...)
	return result
}

func windowsCOMFailed(result uintptr) bool {
	return int32(result) < 0
}

// chooseWorkspaceDirectory uses the modern Windows common-item dialog. It is
// the same Explorer-style folder picker used by current desktop applications,
// and stays entirely in-process without invoking a shell or script host.
func chooseWorkspaceDirectory(owner uintptr) (string, error) {
	result := make(chan workspacePickerResult, 1)
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()

		hResult, _, _ := windowsCoInitializeEx.Call(0, windowsCoInitApartmentThreaded|windowsCoInitDisableOLE1DDE)
		if windowsCOMFailed(hResult) {
			result <- workspacePickerResult{err: fmt.Errorf("initialize Windows folder picker: HRESULT 0x%08X", uint32(hResult))}
			return
		}
		defer windowsCoUninitialize.Call()

		var dialog *windowsCOMObject
		hResult, _, _ = windowsCoCreate.Call(
			uintptr(unsafe.Pointer(&windowsFileOpenDialogClass)),
			0,
			windowsClassContextInProcessServer,
			uintptr(unsafe.Pointer(&windowsFileOpenDialogInterface)),
			uintptr(unsafe.Pointer(&dialog)),
		)
		if windowsCOMFailed(hResult) || dialog == nil {
			result <- workspacePickerResult{err: fmt.Errorf("create Windows folder picker: HRESULT 0x%08X", uint32(hResult))}
			return
		}
		defer windowsCOMCall(dialog, 2)

		var options uint32
		hResult = windowsCOMCall(dialog, 10, uintptr(unsafe.Pointer(&options)))
		if windowsCOMFailed(hResult) {
			result <- workspacePickerResult{err: fmt.Errorf("read Windows folder picker options: HRESULT 0x%08X", uint32(hResult))}
			return
		}
		options |= windowsFileOpenPickFolders | windowsFileOpenForceFileSystem | windowsFileOpenPathMustExist | windowsFileOpenDoNotAddToRecent
		hResult = windowsCOMCall(dialog, 9, uintptr(options))
		if windowsCOMFailed(hResult) {
			result <- workspacePickerResult{err: fmt.Errorf("configure Windows folder picker: HRESULT 0x%08X", uint32(hResult))}
			return
		}

		title, _ := syscall.UTF16PtrFromString("选择 Feather 笔记工作区")
		confirmLabel, _ := syscall.UTF16PtrFromString("选择文件夹")
		windowsCOMCall(dialog, 17, uintptr(unsafe.Pointer(title)))
		windowsCOMCall(dialog, 18, uintptr(unsafe.Pointer(confirmLabel)))

		hResult = windowsCOMCall(dialog, 3, owner)
		if uint32(hResult) == windowsErrorCancelled {
			result <- workspacePickerResult{}
			return
		}
		if windowsCOMFailed(hResult) {
			result <- workspacePickerResult{err: fmt.Errorf("show Windows folder picker: HRESULT 0x%08X", uint32(hResult))}
			return
		}

		var shellItem *windowsCOMObject
		hResult = windowsCOMCall(dialog, 20, uintptr(unsafe.Pointer(&shellItem)))
		if windowsCOMFailed(hResult) || shellItem == nil {
			result <- workspacePickerResult{err: fmt.Errorf("read selected folder: HRESULT 0x%08X", uint32(hResult))}
			return
		}
		defer windowsCOMCall(shellItem, 2)

		var selectedPath *uint16
		hResult = windowsCOMCall(shellItem, 5, windowsShellItemFileSystemPath, uintptr(unsafe.Pointer(&selectedPath)))
		if windowsCOMFailed(hResult) || selectedPath == nil {
			result <- workspacePickerResult{err: fmt.Errorf("resolve selected folder path: HRESULT 0x%08X", uint32(hResult))}
			return
		}
		defer windowsCoTaskMemFree.Call(uintptr(unsafe.Pointer(selectedPath)))

		pathUnits := unsafe.Slice(selectedPath, 32768)
		result <- workspacePickerResult{path: syscall.UTF16ToString(pathUnits)}
	}()
	picked := <-result
	return picked.path, picked.err
}
