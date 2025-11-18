package services

import (
	"malambot-microservice/internal/models"
)

type RankService struct{}

func NewRankService() *RankService {
	return &RankService{}
}

func (s *RankService) GetPlayerRank(playerId string) (*models.RocketLeagueRank, error) {
	// TODO: Implementar lógica real para obtener el rango desde la API de Rocket League
	// Por ahora retorna datos de ejemplo
	return &models.RocketLeagueRank{
		PlayerId: playerId,
		Rank:     "Diamond III",
		Division: 2,
		MMR:      1150,
	}, nil
}
