//go:build darwin || linux

package main

import (
	"os/exec"
	"runtime"
	"strings"
)

func chooseWorkspaceDirectory(_ uintptr) (string, error) {
	var command *exec.Cmd
	if runtime.GOOS == "darwin" {
		command = exec.Command("osascript", "-e", `POSIX path of (choose folder with prompt "选择 Feather 笔记工作区")`)
	} else {
		command = exec.Command("zenity", "--file-selection", "--directory", "--title=选择 Feather 笔记工作区")
	}
	output, err := command.Output()
	if err != nil {
		if _, ok := err.(*exec.ExitError); ok {
			return "", nil
		}
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}
