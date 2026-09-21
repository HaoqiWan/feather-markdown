//go:build darwin || linux

package main

import "unsafe"

func setWindowIcon(_ unsafe.Pointer) {}
