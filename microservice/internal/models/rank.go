package models

type RocketLeagueRank struct {
	PlayerId string `json:"playerId"`
	Rank     string `json:"rank"`
	Division int    `json:"division"`
	MMR      int    `json:"mmr"`
}
