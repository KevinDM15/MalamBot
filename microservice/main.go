package main

import (
	"fmt"
	"log"
	"net/http"
	"path/filepath"

	"malambot-microservice/internal/handlers"
	"malambot-microservice/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// Cargar variables de entorno desde el archivo .env en el directorio raíz
	envPath := filepath.Join("..", ".env")
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("⚠️  Advertencia: No se pudo cargar .env desde %s: %v", envPath, err)
		log.Println("Intentando cargar desde el directorio actual...")
		if err := godotenv.Load(); err != nil {
			log.Println("⚠️  No se encontró archivo .env. Usando variables de entorno del sistema")
		}
	} else {
		log.Printf("✓ Variables de entorno cargadas desde: %s", envPath)
	}

	router := chi.NewRouter()

	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)

	rankService := services.NewRankService()
	rankHandler := handlers.NewRankHandler(rankService)

	router.Get("/rl/rank/{playerId}", rankHandler.GetPlayerRank)
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := "8080"
	fmt.Printf("🚀 Microservicio iniciado en http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
