package storage

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"prism/apps/bff/internal/domain"
)

type SQLiteStore struct {
	db *sql.DB
}

func NewSQLiteStore(db *sql.DB) *SQLiteStore {
	return &SQLiteStore{db: db}
}

func Migrate(db *sql.DB) error {
	_, sourceFile, _, _ := runtime.Caller(0)
	paths := []string{
		filepath.Join(filepath.Dir(sourceFile), "..", "..", "migrations", "001_init.sql"),
		filepath.Join("apps", "bff", "migrations", "001_init.sql"),
		filepath.Join("migrations", "001_init.sql"),
		filepath.Join("..", "..", "migrations", "001_init.sql"),
	}
	for _, p := range paths {
		content, err := os.ReadFile(p)
		if err == nil {
			_, execErr := db.Exec(string(content))
			return execErr
		}
	}
	return errors.New("migration file not found")
}

func (s *SQLiteStore) UpsertNote(userID, nodeID, markdown, generatedBy, idempotencyKey string) (domain.NoteSection, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	payload, _ := json.Marshal(map[string]any{"node_id": nodeID, "markdown": markdown, "generated_by": generatedBy, "updated_at": now})

	tx, err := s.db.Begin()
	if err != nil {
		return domain.NoteSection{}, err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
insert into notes(user_id, node_id, markdown, generated_by, version, updated_at)
values(?, ?, ?, ?, 1, ?)
on conflict(user_id, node_id)
do update set markdown=excluded.markdown, generated_by=excluded.generated_by, version=notes.version+1, updated_at=excluded.updated_at;
`, userID, nodeID, markdown, generatedBy, now)
	if err != nil {
		return domain.NoteSection{}, err
	}

	_, err = tx.Exec(`
insert into offline_queue(event_id, entity_type, entity_id, op_type, payload_json, version, idempotency_key, status, retry_count, created_at, updated_at)
values(?, 'note_section', ?, 'update', ?, 1, ?, 'pending', 0, ?, ?)
on conflict(idempotency_key) do nothing;
`, fmt.Sprintf("evt_%d", time.Now().UnixNano()), nodeID, string(payload), idempotencyKey, now, now)
	if err != nil {
		return domain.NoteSection{}, err
	}

	if err := tx.Commit(); err != nil {
		return domain.NoteSection{}, err
	}

	return domain.NoteSection{NodeID: nodeID, Markdown: markdown, GeneratedBy: generatedBy, UpdatedAt: now}, nil
}

func (s *SQLiteStore) GetNote(userID, nodeID string) (domain.NoteSection, error) {
	var note domain.NoteSection
	err := s.db.QueryRow(`select node_id, markdown, generated_by, updated_at from notes where user_id=? and node_id=?`, userID, nodeID).
		Scan(&note.NodeID, &note.Markdown, &note.GeneratedBy, &note.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.NoteSection{}, sql.ErrNoRows
		}
		return domain.NoteSection{}, err
	}
	return note, nil
}

func (s *SQLiteStore) SaveVision(userID string, vision domain.VisionState) error {
	_, err := s.db.Exec(
		`insert into vision_states(user_id, focus_level, emotion, posture, confidence, sampled_at, created_at) values(?, ?, ?, ?, ?, ?, ?)`,
		userID,
		vision.FocusLevel,
		vision.Emotion,
		vision.Posture,
		vision.Confidence,
		vision.SampledAt,
		time.Now().UTC().Format(time.RFC3339),
	)
	return err
}

func (s *SQLiteStore) SaveIntervention(userID string, event domain.InterventionEvent) error {
	_, err := s.db.Exec(
		`insert into intervention_events(event_id, user_id, trigger_reason, trigger_count, message, action_type, accepted, created_at) values(?, ?, ?, ?, ?, ?, ?, ?)`,
		event.EventID,
		userID,
		event.TriggerReason,
		event.TriggerCount,
		event.Message,
		event.ActionType,
		nil,
		event.CreatedAt,
	)
	return err
}

func (s *SQLiteStore) PendingQueueCount() (int, error) {
	var count int
	err := s.db.QueryRow(`select count(1) from offline_queue where status='pending'`).Scan(&count)
	return count, err
}

func (s *SQLiteStore) PushQueueBatch(limit int) (int, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`select event_id from offline_queue where status='pending' order by created_at asc limit ?`, limit)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	ids := make([]string, 0, limit)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		if err := tx.Commit(); err != nil {
			return 0, err
		}
		return 0, nil
	}

	for _, id := range ids {
		if _, err := tx.Exec(`update offline_queue set status='synced', updated_at=? where event_id=?`, time.Now().UTC().Format(time.RFC3339), id); err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(ids), nil
}
