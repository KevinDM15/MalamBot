package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"malambot-microservice/internal/services"

	"github.com/go-chi/chi/v5"
)

type RankHandler struct {
	rankService *services.RankService
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func NewRankHandler(rankService *services.RankService) *RankHandler {
	return &RankHandler{
		rankService: rankService,
	}
}

func (h *RankHandler) GetPlayerRank(w http.ResponseWriter, r *http.Request) {
	playerId := chi.URLParam(r, "playerId")

	log.Printf("[RankHandler] Solicitud de rango para: %s", playerId)

	if playerId == "" {
		log.Println("[RankHandler] Error: Player ID vacío")
		respondWithError(w, http.StatusBadRequest, "Player ID is required", "Debes proporcionar un ID de jugador")
		return
	}

	rank, err := h.rankService.GetPlayerRank(playerId)
	if err != nil {
		log.Printf("[RankHandler] Error obteniendo rango: %v", err)
		respondWithError(w, http.StatusInternalServerError, err.Error(), "No se pudo obtener el rango del jugador")
		return
	}

	log.Printf("[RankHandler] ✓ Rangos obtenidos exitosamente para: %s", rank.PlayerId)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rank)
}

func respondWithError(w http.ResponseWriter, code int, errorMsg, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error:   errorMsg,
		Message: message,
	})
}
