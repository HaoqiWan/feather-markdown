//go:build !windows && !darwin && !linux

package main

import "fmt"

func runDesktop(_ string, _ bool) error {
	return fmt.Errorf("native desktop window is not supported on this platform")
}
