package handlers

import (
	"encoding/json"
	"net/http"

	"malambot-microservice/internal/services"

	"github.com/gorilla/mux"
)

type RankHandler struct {
	rankService *services.RankService
}

func NewRankHandler(rankService *services.RankService) *RankHandler {
	return &RankHandler{
		rankService: rankService,
	}
}

func (h *RankHandler) GetPlayerRank(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	playerId := vars["playerId"]

	if playerId == "" {
		http.Error(w, "Player ID is required", http.StatusBadRequest)
		return
	}

	rank, err := h.rankService.GetPlayerRank(playerId)
	if err != nil {
		http.Error(w, "Failed to get player rank", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rank)
}
