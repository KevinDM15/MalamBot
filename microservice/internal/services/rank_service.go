package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"malambot-microservice/internal/models"
)

type RankService struct {
	httpClient *http.Client
}

func NewRankService() *RankService {
	fmt.Println("[RankService] Inicializando RankService...")
	fmt.Println("[RankService] ✓ Usando API pública de Tracker.gg (sin API key)")

	return &RankService{
		httpClient: &http.Client{},
	}
}

func (s *RankService) GetPlayerRank(playerId string) (*models.RocketLeagueRank, error) {
	parts := strings.Split(playerId, ":")
	if len(parts) != 2 {
		return nil, fmt.Errorf("formato inválido. Use: platform:username (ej: epic:username, steam:76561198xxx)")
	}

	platform := parts[0]
	username := parts[1]

	fmt.Printf("[RankService] Buscando rango para: %s en plataforma %s\n", username, platform)

	platformMap := map[string]string{
		"epic":   "epic",
		"steam":  "steam",
		"psn":    "psn",
		"xbl":    "xbl",
		"switch": "switch",
	}

	trackerPlatform, ok := platformMap[strings.ToLower(platform)]
	if !ok {
		return nil, fmt.Errorf("plataforma no válida. Use: epic, steam, psn, xbl, o switch")
	}

	url := fmt.Sprintf("https://api.tracker.gg/api/v2/rocket-league/standard/profile/%s/%s", trackerPlatform, username)
	fmt.Printf("[RankService] URL de Tracker.gg: %s\n", url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creando request: %w", err)
	}

	// Headers para simular un navegador real y evitar el bloqueo de Cloudflare
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", "https://tracker.gg/")
	req.Header.Set("Origin", "https://tracker.gg")
	req.Header.Set("Sec-Fetch-Dest", "empty")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	req.Header.Set("Sec-Fetch-Site", "same-site")
	// Note: No establecemos Accept-Encoding para que Go maneje automáticamente la compresión

	fmt.Println("[RankService] Enviando request a Tracker.gg (sin autenticación)...")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error haciendo request a Tracker.gg: %w", err)
	}
	defer resp.Body.Close()

	fmt.Printf("[RankService] Response status: %d\n", resp.StatusCode)

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("jugador no encontrado en Tracker.gg")
	}

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		body, _ := io.ReadAll(resp.Body)
		bodyStr := string(body)
		fmt.Printf("[RankService] Error de autorización: %s\n", bodyStr)
		return nil, fmt.Errorf("acceso no autorizado a la API de Tracker.gg")
	}

	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("límite de rate limit excedido. Intenta de nuevo en unos minutos")
	}

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("[RankService] Error response body: %s\n", string(body))
		return nil, fmt.Errorf("error de Tracker.gg API (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error leyendo response: %w", err)
	}

	fmt.Printf("[RankService] Response body (primeros 200 chars): %s\n", string(body[:min(200, len(body))]))

	var trackerResp models.TrackerResponse
	if err := json.Unmarshal(body, &trackerResp); err != nil {
		fmt.Printf("[RankService] Error parseando JSON: %v\n", err)
		fmt.Printf("[RankService] Body completo: %s\n", string(body))
		return nil, fmt.Errorf("error parseando JSON de Tracker.gg: %w", err)
	}

	fmt.Printf("[RankService] Segmentos encontrados: %d\n", len(trackerResp.Data.Segments))

	return s.extractRankData(&trackerResp, username, platform)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (s *RankService) extractRankData(resp *models.TrackerResponse, username, platform string) (*models.RocketLeagueRank, error) {
	rank := &models.RocketLeagueRank{
		PlayerId: username,
		Platform: platform,
	}

	foundAny := false

	// Buscar todos los modos relevantes
	for _, segment := range resp.Data.Segments {
		if segment.Type != "playlist" {
			continue
		}

		switch segment.Metadata.Name {
		case "Ranked Duel 1v1":
			fmt.Println("[RankService] ✓ Encontrado rango en Ranked Duel 1v1")
			rank.Duel1v1 = s.buildRankInfoFromSegment(&segment)
			foundAny = true
		case "Ranked Doubles 2v2":
			fmt.Println("[RankService] ✓ Encontrado rango en Ranked Doubles 2v2")
			rank.Doubles2v2 = s.buildRankInfoFromSegment(&segment)
			foundAny = true
		case "Ranked Standard 3v3":
			fmt.Println("[RankService] ✓ Encontrado rango en Ranked Standard 3v3")
			rank.Standard3v3 = s.buildRankInfoFromSegment(&segment)
			foundAny = true
		case "Tournament Matches":
			fmt.Println("[RankService] ✓ Encontrado rango en Tournament Matches")
			rank.Tournament = s.buildRankInfoFromSegment(&segment)
			foundAny = true
		}
	}

	if !foundAny {
		// Logging de debug para ver qué playlists están disponibles
		fmt.Println("[RankService] Playlists disponibles:")
		for _, segment := range resp.Data.Segments {
			if segment.Type == "playlist" {
				fmt.Printf("  - %s\n", segment.Metadata.Name)
			}
		}
		return nil, fmt.Errorf("no se encontró información de rango competitivo. El jugador puede no tener partidas clasificatorias")
	}

	return rank, nil
}

func (s *RankService) buildRankInfoFromSegment(segment *models.Segment) *models.RankInfo {
	rankInfo := &models.RankInfo{
		Rank:     "Sin rango",
		Division: 0,
		MMR:      0,
		Tier:     0,
	}

	if tierStat, ok := segment.Stats["tier"]; ok {
		rankInfo.Tier = int(tierStat.Value)
		rankInfo.Rank = tierStat.Metadata.Name
		rankInfo.IconUrl = tierStat.Metadata.IconUrl
	}

	if divStat, ok := segment.Stats["division"]; ok {
		rankInfo.Division = int(divStat.Value)
	}

	if ratingStat, ok := segment.Stats["rating"]; ok {
		rankInfo.MMR = int(ratingStat.Value)
	}

	return rankInfo
}

func getRankName(tier int) string {
	ranks := map[int]string{
		0:  "Sin clasificar",
		1:  "Bronze I",
		2:  "Bronze II",
		3:  "Bronze III",
		4:  "Silver I",
		5:  "Silver II",
		6:  "Silver III",
		7:  "Gold I",
		8:  "Gold II",
		9:  "Gold III",
		10: "Platinum I",
		11: "Platinum II",
		12: "Platinum III",
		13: "Diamond I",
		14: "Diamond II",
		15: "Diamond III",
		16: "Champion I",
		17: "Champion II",
		18: "Champion III",
		19: "Grand Champion I",
		20: "Grand Champion II",
		21: "Grand Champion III",
		22: "Supersonic Legend",
	}

	if name, ok := ranks[tier]; ok {
		return name
	}
	return "Desconocido"
}

func getDivisionFromMMR(mmr, tierMMR int) int {
	divisionSize := 15
	diff := mmr - tierMMR
	if diff < 0 {
		return 1
	}
	div := (diff / divisionSize) + 1
	if div > 4 {
		return 4
	}
	return div
}

func parseTier(tierStr string) (int, error) {
	parts := strings.Fields(tierStr)
	if len(parts) == 0 {
		return 0, fmt.Errorf("tier string vacío")
	}

	tierNum := parts[len(parts)-1]
	return strconv.Atoi(tierNum)
}
