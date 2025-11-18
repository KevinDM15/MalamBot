package main

import (
	"fmt"
	"log"
	"net/http"

	"malambot-microservice/internal/handlers"
	"malambot-microservice/internal/services"

	"github.com/gorilla/mux"
)

func main() {
	router := mux.NewRouter()

	rankService := services.NewRankService()
	rankHandler := handlers.NewRankHandler(rankService)

	router.HandleFunc("/rl/rank/{playerId}", rankHandler.GetPlayerRank).Methods("GET")

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	port := "8080"
	fmt.Printf("🚀 Microservicio iniciado en http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
