package main

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// loadEnvFiles loads environment variables from .env files in priority order
func loadEnvFiles() {
	cwd, _ := os.Getwd()
	exePath, _ := os.Executable()
	exeDir := filepath.Dir(exePath)

	paths := []string{
		filepath.Join(cwd, ".env"),
		filepath.Join(cwd, "optimizer-engine-server", ".env"),
		filepath.Join(cwd, "..", ".env"),
		filepath.Join(exeDir, ".env"),
		filepath.Join(exeDir, "..", ".env"),
	}

	for _, path := range paths {
		file, err := os.Open(path)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				// Strip surrounding quotes if any
				val = strings.Trim(val, `"'`)
				if key != "" && os.Getenv(key) == "" {
					os.Setenv(key, val)
				}
			}
		}
		file.Close()
	}
}

