package models

type RocketLeagueRank struct {
	PlayerId   string     `json:"playerId"`
	Platform   string     `json:"platform"`
	Duel1v1    *RankInfo  `json:"duel1v1,omitempty"`
	Doubles2v2 *RankInfo  `json:"doubles2v2,omitempty"`
	Standard3v3 *RankInfo `json:"standard3v3,omitempty"`
	Tournament *RankInfo  `json:"tournament,omitempty"`
}

type RankInfo struct {
	Rank     string `json:"rank"`
	Division int    `json:"division"`
	MMR      int    `json:"mmr"`
	Tier     int    `json:"tier"`
	IconUrl  string `json:"iconUrl,omitempty"`
}

type TrackerResponse struct {
	Data TrackerData `json:"data"`
}

type TrackerData struct {
	PlatformInfo PlatformInfo    `json:"platformInfo"`
	Segments     []Segment       `json:"segments"`
	Metadata     TrackerMetadata `json:"metadata"`
}

type TrackerMetadata struct {
	LastUpdated   LastUpdatedInfo `json:"lastUpdated"`
	PlayerId      int             `json:"playerId"`
	CurrentSeason int             `json:"currentSeason"`
}

type LastUpdatedInfo struct {
	Value        string `json:"value"`
	DisplayValue string `json:"displayValue"`
}

type PlatformInfo struct {
	PlatformSlug     string `json:"platformSlug"`
	PlatformUserId   string `json:"platformUserId"`
	PlatformUserHandle string `json:"platformUserHandle"`
}

type Segment struct {
	Type     string                 `json:"type"`
	Metadata SegmentMetadata        `json:"metadata"`
	Stats    map[string]StatValue   `json:"stats"`
}

type SegmentMetadata struct {
	Name string `json:"name"`
}

type StatValue struct {
	Rank         int     `json:"rank,omitempty"`
	Percentile   float64 `json:"percentile,omitempty"`
	DisplayName  string  `json:"displayName"`
	DisplayValue string  `json:"displayValue"`
	Value        float64 `json:"value"`
	Metadata     StatMetadata `json:"metadata,omitempty"`
}

type StatMetadata struct {
	IconUrl     string `json:"iconUrl,omitempty"`
	Name        string `json:"name,omitempty"`
	CategoryName string `json:"categoryName,omitempty"`
}
