package config

import "os"

type Config struct {
	Port        string
	JWTSecret   string
	ArchivePath string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		JWTSecret:   getEnv("JWT_SECRET", "pharmacy-secret-key"),
		ArchivePath: getEnv("ARCHIVE_PATH", "./disk/archive"),
	}
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
