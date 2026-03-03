package repository

import (
	"time"

	"github.com/prism/server/internal/db"
	"github.com/prism/server/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PostgresRepository struct {
	db *gorm.DB
}

type profileSceneModel struct {
	ID           string `gorm:"column:id;primaryKey"`
	CurrentScene string `gorm:"column:current_scene"`
}

func (profileSceneModel) TableName() string { return "profiles" }

var _ Repository = (*PostgresRepository)(nil)

func NewPostgresRepository(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetKnowledgePointsBySubject(subject string) []model.KnowledgePoint {
	rows := make([]db.KnowledgePointModel, 0)
	if err := r.db.Where("subject = ?", subject).Order("id ASC").Find(&rows).Error; err != nil {
		return []model.KnowledgePoint{}
	}
	result := make([]model.KnowledgePoint, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelKnowledgePoint(row))
	}
	return result
}

func (r *PostgresRepository) GetKnowledgePoint(id int) (model.KnowledgePoint, bool) {
	var row db.KnowledgePointModel
	if err := r.db.Where("id = ?", id).First(&row).Error; err != nil {
		return model.KnowledgePoint{}, false
	}
	return toModelKnowledgePoint(row), true
}

func (r *PostgresRepository) GetDependenciesBySubject(subject string) []model.KnowledgeDependency {
	rows := make([]db.KnowledgeDependencyModel, 0)
	err := r.db.
		Model(&db.KnowledgeDependencyModel{}).
		Joins("JOIN knowledge_points ON knowledge_points.id = knowledge_dependencies.knowledge_id").
		Where("knowledge_points.subject = ?", subject).
		Order("knowledge_dependencies.id ASC").
		Find(&rows).Error
	if err != nil {
		return []model.KnowledgeDependency{}
	}
	result := make([]model.KnowledgeDependency, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelKnowledgeDependency(row))
	}
	return result
}

func (r *PostgresRepository) GetQuestionsByKnowledgeIDs(knowledgeIDs []int) []model.Question {
	if len(knowledgeIDs) == 0 {
		return []model.Question{}
	}
	rows := make([]db.QuestionModel, 0)
	if err := r.db.Where("knowledge_point_id IN ?", knowledgeIDs).Order("id ASC").Find(&rows).Error; err != nil {
		return []model.Question{}
	}
	result := make([]model.Question, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelQuestion(row))
	}
	return result
}

func (r *PostgresRepository) GetQuestion(id int) (model.Question, bool) {
	var row db.QuestionModel
	if err := r.db.Where("id = ?", id).First(&row).Error; err != nil {
		return model.Question{}, false
	}
	return toModelQuestion(row), true
}

func (r *PostgresRepository) CreateAssessmentSession(session model.AssessmentSession) model.AssessmentSession {
	row := fromModelAssessmentSession(session)
	if err := r.db.Create(&row).Error; err != nil {
		return session
	}
	return toModelAssessmentSession(row)
}

func (r *PostgresRepository) GetAssessmentSession(sessionID int) (model.AssessmentSession, bool) {
	var row db.AssessmentSessionModel
	if err := r.db.Where("id = ?", sessionID).First(&row).Error; err != nil {
		return model.AssessmentSession{}, false
	}
	return toModelAssessmentSession(row), true
}

func (r *PostgresRepository) UpdateAssessmentSession(session model.AssessmentSession) {
	row := fromModelAssessmentSession(session)
	_ = r.db.Save(&row).Error
}

func (r *PostgresRepository) UpsertMastery(userID string, knowledgeID int, mastery float64, practicedAt time.Time) {
	row := db.KnowledgeMasteryModel{
		UserID:          userID,
		KnowledgeID:     knowledgeID,
		MasteryLevel:    mastery,
		LastPracticedAt: practicedAt,
	}
	_ = r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "knowledge_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"mastery_level", "last_practiced_at"}),
	}).Create(&row).Error
}

func (r *PostgresRepository) GetMastery(userID string, knowledgeID int) (model.KnowledgeMastery, bool) {
	var row db.KnowledgeMasteryModel
	if err := r.db.Where("user_id = ? AND knowledge_id = ?", userID, knowledgeID).First(&row).Error; err != nil {
		return model.KnowledgeMastery{}, false
	}
	return toModelKnowledgeMastery(row), true
}

func (r *PostgresRepository) ListMasteryByUserSubject(userID string, subject string) []model.KnowledgeMastery {
	rows := make([]db.KnowledgeMasteryModel, 0)
	err := r.db.
		Model(&db.KnowledgeMasteryModel{}).
		Select("knowledge_mastery.*").
		Joins("JOIN knowledge_points ON knowledge_points.id = knowledge_mastery.knowledge_id").
		Where("knowledge_mastery.user_id = ? AND knowledge_points.subject = ?", userID, subject).
		Order("knowledge_mastery.knowledge_id ASC").
		Find(&rows).Error
	if err != nil {
		return []model.KnowledgeMastery{}
	}
	result := make([]model.KnowledgeMastery, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelKnowledgeMastery(row))
	}
	return result
}

func (r *PostgresRepository) SaveQuestionAttempt(attempt model.QuestionAttempt) model.QuestionAttempt {
	row := fromModelQuestionAttempt(attempt)
	if err := r.db.Create(&row).Error; err != nil {
		return attempt
	}
	return toModelQuestionAttempt(row)
}

func (r *PostgresRepository) ListQuestionAttempts(userID string, knowledgeID int, since time.Time) []model.QuestionAttempt {
	rows := make([]db.QuestionAttemptModel, 0)
	err := r.db.
		Where("user_id = ? AND knowledge_id = ? AND answered_at >= ?", userID, knowledgeID, since).
		Order("answered_at ASC").
		Find(&rows).Error
	if err != nil {
		return []model.QuestionAttempt{}
	}
	result := make([]model.QuestionAttempt, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelQuestionAttempt(row))
	}
	return result
}

func (r *PostgresRepository) GetLatestQuestionAttempt(userID string, knowledgeID int) (model.QuestionAttempt, bool) {
	var row db.QuestionAttemptModel
	err := r.db.
		Where("user_id = ? AND knowledge_id = ?", userID, knowledgeID).
		Order("answered_at DESC").
		First(&row).Error
	if err != nil {
		return model.QuestionAttempt{}, false
	}
	return toModelQuestionAttempt(row), true
}

func (r *PostgresRepository) CreateOrUpdateLearningPath(path model.LearningPath) model.LearningPath {
	if path.SkippedNodeIDs == nil {
		path.SkippedNodeIDs = make(map[int]bool)
	}
	path.UpdatedAt = time.Now().UTC()
	row := fromModelLearningPath(path)

	if path.ID == 0 {
		if err := r.db.Create(&row).Error; err != nil {
			return path
		}
		return toModelLearningPath(row)
	}

	if err := r.db.Model(&db.LearningPathModel{}).Where("id = ?", path.ID).Updates(row).Error; err != nil {
		return path
	}
	return toModelLearningPath(row)
}

func (r *PostgresRepository) GetCurrentLearningPath(userID string, subject string) (model.LearningPath, bool) {
	var row db.LearningPathModel
	err := r.db.
		Where("user_id = ? AND subject = ?", userID, subject).
		Order("updated_at DESC").
		Limit(1).
		First(&row).Error
	if err != nil {
		return model.LearningPath{}, false
	}
	return toModelLearningPath(row), true
}

func (r *PostgresRepository) GetLearningPathByID(userID string, pathID int) (model.LearningPath, bool) {
	var row db.LearningPathModel
	err := r.db.Where("id = ? AND user_id = ?", pathID, userID).First(&row).Error
	if err != nil {
		return model.LearningPath{}, false
	}
	return toModelLearningPath(row), true
}

func (r *PostgresRepository) UpdateLearningPath(path model.LearningPath) {
	if path.SkippedNodeIDs == nil {
		path.SkippedNodeIDs = make(map[int]bool)
	}
	path.UpdatedAt = time.Now().UTC()
	row := fromModelLearningPath(path)
	_ = r.db.Model(&db.LearningPathModel{}).Where("id = ?", path.ID).Updates(row).Error
}

func (r *PostgresRepository) SavePathState(state model.LearningPathState) {
	state.UpdatedAt = time.Now().UTC()
	row := fromModelLearningPathState(state)
	_ = r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "path_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"correct_streak", "wrong_streak", "updated_at"}),
	}).Create(&row).Error
}

func (r *PostgresRepository) GetPathState(userID string, pathID int) model.LearningPathState {
	var row db.LearningPathStateModel
	err := r.db.Where("user_id = ? AND path_id = ?", userID, pathID).First(&row).Error
	if err != nil {
		return model.LearningPathState{UserID: userID, PathID: pathID, CorrectStreak: 0, WrongStreak: 0}
	}
	return toModelLearningPathState(row)
}

func (r *PostgresRepository) SavePathAdjustmentEvent(event model.PathAdjustmentEvent) model.PathAdjustmentEvent {
	row := fromModelPathAdjustmentEvent(event)
	if err := r.db.Create(&row).Error; err != nil {
		return event
	}
	return toModelPathAdjustmentEvent(row)
}

func (r *PostgresRepository) ListPathAdjustmentEvents(pathID int) []model.PathAdjustmentEvent {
	rows := make([]db.PathAdjustmentEventModel, 0)
	err := r.db.Where("path_id = ?", pathID).Order("created_at ASC").Find(&rows).Error
	if err != nil {
		return []model.PathAdjustmentEvent{}
	}
	result := make([]model.PathAdjustmentEvent, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelPathAdjustmentEvent(row))
	}
	return result
}

func (r *PostgresRepository) SaveHomeworkUpload(upload model.HomeworkUpload) model.HomeworkUpload {
	row := fromModelHomeworkUpload(upload)
	if err := r.db.Create(&row).Error; err != nil {
		return upload
	}
	return toModelHomeworkUpload(row)
}

func (r *PostgresRepository) SaveAssignment(assignment model.Assignment) model.Assignment {
	row := fromModelAssignment(assignment)
	if err := r.db.Create(&row).Error; err != nil {
		return assignment
	}
	return toModelAssignment(row)
}

func (r *PostgresRepository) GetUserScene(userID string) string {
	var row profileSceneModel
	err := r.db.Where("id = ?", userID).First(&row).Error
	if err != nil || row.CurrentScene == "" {
		return string(model.SceneSelfStudy)
	}
	return row.CurrentScene
}

func (r *PostgresRepository) SetUserScene(userID string, scene string) {
	row := profileSceneModel{ID: userID, CurrentScene: scene}
	_ = r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"current_scene"}),
	}).Create(&row).Error
}

func (r *PostgresRepository) CreateHealthAlert(alert model.HealthAlert) model.HealthAlert {
	row := fromModelHealthAlert(alert)
	if err := r.db.Create(&row).Error; err != nil {
		return alert
	}
	return toModelHealthAlert(row)
}

func (r *PostgresRepository) ListHealthAlerts(userID string, acknowledged *bool) []model.HealthAlert {
	rows := make([]db.HealthAlertModel, 0)
	query := r.db.Where("user_id = ?", userID)
	if acknowledged != nil {
		query = query.Where("acknowledged = ?", *acknowledged)
	}
	if err := query.Order("created_at DESC").Find(&rows).Error; err != nil {
		return []model.HealthAlert{}
	}
	result := make([]model.HealthAlert, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelHealthAlert(row))
	}
	return result
}

func (r *PostgresRepository) GetHealthAlert(userID string, alertID int) (model.HealthAlert, bool) {
	var row db.HealthAlertModel
	err := r.db.Where("id = ? AND user_id = ?", alertID, userID).First(&row).Error
	if err != nil {
		return model.HealthAlert{}, false
	}
	return toModelHealthAlert(row), true
}

func (r *PostgresRepository) AcknowledgeHealthAlert(userID string, alertID int) (model.HealthAlert, bool) {
	var row db.HealthAlertModel
	err := r.db.Where("id = ? AND user_id = ?", alertID, userID).First(&row).Error
	if err != nil {
		return model.HealthAlert{}, false
	}
	row.Acknowledged = true
	row.UpdatedAt = time.Now().UTC()
	if err := r.db.Save(&row).Error; err != nil {
		return model.HealthAlert{}, false
	}
	return toModelHealthAlert(row), true
}

func (r *PostgresRepository) CreateStudyLog(log model.StudyLog) model.StudyLog {
	row := fromModelStudyLog(log)
	if err := r.db.Create(&row).Error; err != nil {
		return log
	}
	return toModelStudyLog(row)
}

func (r *PostgresRepository) ListStudyLogs(userID string, since time.Time) []model.StudyLog {
	rows := make([]db.StudyLogModel, 0)
	err := r.db.
		Where("user_id = ? AND created_at >= ?", userID, since).
		Order("created_at ASC").
		Find(&rows).Error
	if err != nil {
		return []model.StudyLog{}
	}
	result := make([]model.StudyLog, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelStudyLog(row))
	}
	return result
}

func (r *PostgresRepository) CreateChatSession(session model.ChatSession) model.ChatSession {
	row := fromModelChatSession(session)
	if err := r.db.Create(&row).Error; err != nil {
		return session
	}
	return toModelChatSession(row)
}

func (r *PostgresRepository) ListChatSessions(userID string) []model.ChatSession {
	rows := make([]db.ChatSessionModel, 0)
	err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&rows).Error
	if err != nil {
		return []model.ChatSession{}
	}
	result := make([]model.ChatSession, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelChatSession(row))
	}
	return result
}

func (r *PostgresRepository) GetChatSession(userID string, sessionID int) (model.ChatSession, bool) {
	var row db.ChatSessionModel
	err := r.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&row).Error
	if err != nil {
		return model.ChatSession{}, false
	}
	return toModelChatSession(row), true
}

func (r *PostgresRepository) CreateChatMessage(message model.ChatMessage) model.ChatMessage {
	row := fromModelChatMessage(message)
	if err := r.db.Create(&row).Error; err != nil {
		return message
	}
	_ = r.db.Model(&db.ChatSessionModel{}).Where("id = ?", row.SessionID).Update("updated_at", row.CreatedAt).Error
	return toModelChatMessage(row)
}

func (r *PostgresRepository) ListChatMessages(sessionID int) []model.ChatMessage {
	rows := make([]db.ChatMessageModel, 0)
	err := r.db.Where("session_id = ?", sessionID).Order("created_at ASC").Find(&rows).Error
	if err != nil {
		return []model.ChatMessage{}
	}
	result := make([]model.ChatMessage, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelChatMessage(row))
	}
	return result
}

func (r *PostgresRepository) CreateNote(note model.Note) model.Note {
	row := fromModelNote(note)
	if err := r.db.Create(&row).Error; err != nil {
		return note
	}
	return toModelNote(row)
}

func (r *PostgresRepository) ListNotes(userID string) []model.Note {
	rows := make([]db.NoteModel, 0)
	err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&rows).Error
	if err != nil {
		return []model.Note{}
	}
	result := make([]model.Note, 0, len(rows))
	for _, row := range rows {
		result = append(result, toModelNote(row))
	}
	return result
}

func (r *PostgresRepository) GetNote(userID string, noteID int) (model.Note, bool) {
	var row db.NoteModel
	err := r.db.Where("id = ? AND user_id = ?", noteID, userID).First(&row).Error
	if err != nil {
		return model.Note{}, false
	}
	return toModelNote(row), true
}

func (r *PostgresRepository) SaveNoteKnowledgeLinks(noteID int, links []model.NoteKnowledgeLink) {
	if noteID <= 0 {
		return
	}
	_ = r.db.Where("note_id = ?", noteID).Delete(&db.NoteKnowledgeLinkModel{}).Error
	if len(links) == 0 {
		return
	}

	rows := make([]db.NoteKnowledgeLinkModel, 0, len(links))
	for _, link := range links {
		rows = append(rows, db.NoteKnowledgeLinkModel{
			NoteID:         noteID,
			KnowledgeID:    link.KnowledgeID,
			RelevanceScore: link.RelevanceScore,
		})
	}
	_ = r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "note_id"}, {Name: "knowledge_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"relevance_score"}),
	}).Create(&rows).Error
}

func toModelKnowledgePoint(row db.KnowledgePointModel) model.KnowledgePoint {
	return model.KnowledgePoint{
		ID:      row.ID,
		Subject: row.Subject,
		Title:   row.Title,
		Content: row.Content,
	}
}

func fromModelKnowledgePoint(entity model.KnowledgePoint) db.KnowledgePointModel {
	return db.KnowledgePointModel{
		ID:      entity.ID,
		Subject: entity.Subject,
		Title:   entity.Title,
		Content: entity.Content,
	}
}

func toModelKnowledgeDependency(row db.KnowledgeDependencyModel) model.KnowledgeDependency {
	return model.KnowledgeDependency{
		KnowledgeID:    row.KnowledgeID,
		PrerequisiteID: row.PrerequisiteID,
	}
}

func fromModelKnowledgeDependency(entity model.KnowledgeDependency) db.KnowledgeDependencyModel {
	return db.KnowledgeDependencyModel{
		KnowledgeID:    entity.KnowledgeID,
		PrerequisiteID: entity.PrerequisiteID,
	}
}

func toModelQuestion(row db.QuestionModel) model.Question {
	return model.Question{
		ID:               row.ID,
		KnowledgePointID: row.KnowledgePointID,
		Difficulty:       row.Difficulty,
		Content:          toModelQuestionContent(row.Content),
	}
}

func fromModelQuestion(entity model.Question) db.QuestionModel {
	return db.QuestionModel{
		ID:               entity.ID,
		KnowledgePointID: entity.KnowledgePointID,
		Difficulty:       entity.Difficulty,
		Content:          fromModelQuestionContent(entity.Content),
	}
}

func toModelQuestionContent(row db.QuestionContentJSON) model.QuestionContent {
	return model.QuestionContent{
		Question:    row.Question,
		Options:     cloneStringSlice(row.Options),
		Answer:      row.Answer,
		Explanation: row.Explanation,
	}
}

func fromModelQuestionContent(entity model.QuestionContent) db.QuestionContentJSON {
	return db.QuestionContentJSON{
		Question:    entity.Question,
		Options:     cloneStringSlice(entity.Options),
		Answer:      entity.Answer,
		Explanation: entity.Explanation,
	}
}

func toModelAssessmentSession(row db.AssessmentSessionModel) model.AssessmentSession {
	return model.AssessmentSession{
		ID:               row.ID,
		UserID:           row.UserID,
		Subject:          row.Subject,
		GoalKnowledgeIDs: cloneIntSlice(row.GoalKnowledgeIDs),
		TargetDate:       row.TargetDate,
		QuestionIDs:      cloneIntSlice(row.QuestionIDs),
		Status:           row.Status,
		CreatedAt:        row.CreatedAt,
		CompletedAt:      row.CompletedAt,
	}
}

func fromModelAssessmentSession(entity model.AssessmentSession) db.AssessmentSessionModel {
	return db.AssessmentSessionModel{
		ID:               entity.ID,
		UserID:           entity.UserID,
		Subject:          entity.Subject,
		GoalKnowledgeIDs: db.IntSlice(cloneIntSlice(entity.GoalKnowledgeIDs)),
		TargetDate:       entity.TargetDate,
		QuestionIDs:      db.IntSlice(cloneIntSlice(entity.QuestionIDs)),
		Status:           entity.Status,
		CreatedAt:        entity.CreatedAt,
		CompletedAt:      entity.CompletedAt,
	}
}

func toModelKnowledgeMastery(row db.KnowledgeMasteryModel) model.KnowledgeMastery {
	return model.KnowledgeMastery{
		UserID:          row.UserID,
		KnowledgeID:     row.KnowledgeID,
		MasteryLevel:    row.MasteryLevel,
		LastPracticedAt: row.LastPracticedAt,
	}
}

func fromModelKnowledgeMastery(entity model.KnowledgeMastery) db.KnowledgeMasteryModel {
	return db.KnowledgeMasteryModel{
		UserID:          entity.UserID,
		KnowledgeID:     entity.KnowledgeID,
		MasteryLevel:    entity.MasteryLevel,
		LastPracticedAt: entity.LastPracticedAt,
	}
}

func toModelQuestionAttempt(row db.QuestionAttemptModel) model.QuestionAttempt {
	return model.QuestionAttempt{
		ID:          row.ID,
		UserID:      row.UserID,
		QuestionID:  row.QuestionID,
		KnowledgeID: row.KnowledgeID,
		Source:      row.Source,
		Answer:      row.Answer,
		IsCorrect:   row.IsCorrect,
		DurationSec: row.DurationSec,
		AnsweredAt:  row.AnsweredAt,
	}
}

func fromModelQuestionAttempt(entity model.QuestionAttempt) db.QuestionAttemptModel {
	return db.QuestionAttemptModel{
		ID:          entity.ID,
		UserID:      entity.UserID,
		QuestionID:  entity.QuestionID,
		KnowledgeID: entity.KnowledgeID,
		Source:      entity.Source,
		Answer:      entity.Answer,
		IsCorrect:   entity.IsCorrect,
		DurationSec: entity.DurationSec,
		AnsweredAt:  entity.AnsweredAt,
	}
}

func toModelLearningPath(row db.LearningPathModel) model.LearningPath {
	return model.LearningPath{
		ID:                row.ID,
		UserID:            row.UserID,
		Subject:           row.Subject,
		GoalKnowledgeIDs:  cloneIntSlice(row.GoalKnowledgeIDs),
		KnowledgeSequence: cloneIntSlice(row.KnowledgeSequence),
		CurrentIndex:      row.CurrentIndex,
		SkippedNodeIDs:    cloneBoolMap(row.SkippedNodeIDs),
		TargetDate:        row.TargetDate,
		UpdatedAt:         row.UpdatedAt,
	}
}

func fromModelLearningPath(entity model.LearningPath) db.LearningPathModel {
	return db.LearningPathModel{
		ID:                entity.ID,
		UserID:            entity.UserID,
		Subject:           entity.Subject,
		GoalKnowledgeIDs:  db.IntSlice(cloneIntSlice(entity.GoalKnowledgeIDs)),
		KnowledgeSequence: db.IntSlice(cloneIntSlice(entity.KnowledgeSequence)),
		CurrentIndex:      entity.CurrentIndex,
		SkippedNodeIDs:    db.BoolMap(cloneBoolMap(entity.SkippedNodeIDs)),
		TargetDate:        entity.TargetDate,
		UpdatedAt:         entity.UpdatedAt,
	}
}

func toModelLearningPathState(row db.LearningPathStateModel) model.LearningPathState {
	return model.LearningPathState{
		UserID:        row.UserID,
		PathID:        row.PathID,
		CorrectStreak: row.CorrectStreak,
		WrongStreak:   row.WrongStreak,
		UpdatedAt:     row.UpdatedAt,
	}
}

func fromModelLearningPathState(entity model.LearningPathState) db.LearningPathStateModel {
	return db.LearningPathStateModel{
		UserID:        entity.UserID,
		PathID:        entity.PathID,
		CorrectStreak: entity.CorrectStreak,
		WrongStreak:   entity.WrongStreak,
		UpdatedAt:     entity.UpdatedAt,
	}
}

func toModelPathAdjustmentEvent(row db.PathAdjustmentEventModel) model.PathAdjustmentEvent {
	return model.PathAdjustmentEvent{
		ID:        row.ID,
		UserID:    row.UserID,
		PathID:    row.PathID,
		EventType: row.EventType,
		Payload:   cloneJSONMap(row.Payload),
		CreatedAt: row.CreatedAt,
	}
}

func fromModelPathAdjustmentEvent(entity model.PathAdjustmentEvent) db.PathAdjustmentEventModel {
	return db.PathAdjustmentEventModel{
		ID:        entity.ID,
		UserID:    entity.UserID,
		PathID:    entity.PathID,
		EventType: entity.EventType,
		Payload:   db.JSONMap(cloneJSONMap(entity.Payload)),
		CreatedAt: entity.CreatedAt,
	}
}

func toModelHomeworkUpload(row db.HomeworkUploadModel) model.HomeworkUpload {
	return model.HomeworkUpload{
		ID:               row.ID,
		UserID:           row.UserID,
		Subject:          row.Subject,
		StoragePath:      row.StoragePath,
		StoragePublicURL: row.StoragePublicURL,
		OCRText:          row.OCRText,
		OCRStructured:    cloneJSONMap(row.OCRStructured),
		CreatedAt:        row.CreatedAt,
	}
}

func fromModelHomeworkUpload(entity model.HomeworkUpload) db.HomeworkUploadModel {
	return db.HomeworkUploadModel{
		ID:               entity.ID,
		UserID:           entity.UserID,
		Subject:          entity.Subject,
		StoragePath:      entity.StoragePath,
		StoragePublicURL: entity.StoragePublicURL,
		OCRText:          entity.OCRText,
		OCRStructured:    db.OCRStructuredJSON(cloneJSONMap(entity.OCRStructured)),
		CreatedAt:        entity.CreatedAt,
	}
}

func toModelAssignment(row db.AssignmentModel) model.Assignment {
	return model.Assignment{
		ID:            row.ID,
		UserID:        row.UserID,
		QuestionID:    row.QuestionID,
		UploadID:      row.UploadID,
		AnswerContent: row.AnswerContent,
		IsCorrect:     row.IsCorrect,
		AIFeedback:    row.AIFeedback,
		KnowledgeIDs:  cloneIntSlice(row.KnowledgeIDs),
		Confidence:    row.Confidence,
		GradingSource: row.GradingSource,
		SubmittedAt:   row.SubmittedAt,
	}
}

func fromModelAssignment(entity model.Assignment) db.AssignmentModel {
	return db.AssignmentModel{
		ID:            entity.ID,
		UserID:        entity.UserID,
		QuestionID:    entity.QuestionID,
		UploadID:      entity.UploadID,
		AnswerContent: entity.AnswerContent,
		IsCorrect:     entity.IsCorrect,
		AIFeedback:    entity.AIFeedback,
		KnowledgeIDs:  db.IntSlice(cloneIntSlice(entity.KnowledgeIDs)),
		Confidence:    entity.Confidence,
		GradingSource: entity.GradingSource,
		SubmittedAt:   entity.SubmittedAt,
	}
}

func toModelHealthAlert(row db.HealthAlertModel) model.HealthAlert {
	return model.HealthAlert{
		ID:           row.ID,
		UserID:       row.UserID,
		AlertType:    model.HealthAlertType(row.AlertType),
		Message:      row.Message,
		Acknowledged: row.Acknowledged,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	}
}

func fromModelHealthAlert(entity model.HealthAlert) db.HealthAlertModel {
	return db.HealthAlertModel{
		ID:           entity.ID,
		UserID:       entity.UserID,
		AlertType:    string(entity.AlertType),
		Message:      entity.Message,
		Acknowledged: entity.Acknowledged,
		CreatedAt:    entity.CreatedAt,
		UpdatedAt:    entity.UpdatedAt,
	}
}

func toModelStudyLog(row db.StudyLogModel) model.StudyLog {
	return model.StudyLog{
		ID:            row.ID,
		UserID:        row.UserID,
		Scene:         row.Scene,
		Emotion:       row.Emotion,
		FocusScore:    row.FocusScore,
		FatigueLevel:  row.FatigueLevel,
		PostureStatus: row.PostureStatus,
		CreatedAt:     row.CreatedAt,
	}
}

func fromModelStudyLog(entity model.StudyLog) db.StudyLogModel {
	return db.StudyLogModel{
		ID:            entity.ID,
		UserID:        entity.UserID,
		Scene:         entity.Scene,
		Emotion:       entity.Emotion,
		FocusScore:    entity.FocusScore,
		FatigueLevel:  entity.FatigueLevel,
		PostureStatus: entity.PostureStatus,
		CreatedAt:     entity.CreatedAt,
	}
}

func toModelChatSession(row db.ChatSessionModel) model.ChatSession {
	return model.ChatSession{
		ID:        row.ID,
		UserID:    row.UserID,
		Title:     row.Title,
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}
}

func fromModelChatSession(entity model.ChatSession) db.ChatSessionModel {
	return db.ChatSessionModel{
		ID:        entity.ID,
		UserID:    entity.UserID,
		Title:     entity.Title,
		CreatedAt: entity.CreatedAt,
		UpdatedAt: entity.UpdatedAt,
	}
}

func toModelChatMessage(row db.ChatMessageModel) model.ChatMessage {
	return model.ChatMessage{
		ID:                  row.ID,
		SessionID:           row.SessionID,
		Role:                row.Role,
		Content:             row.Content,
		RelatedKnowledgeIDs: cloneIntSlice(row.RelatedKnowledgeIDs),
		CreatedAt:           row.CreatedAt,
	}
}

func fromModelChatMessage(entity model.ChatMessage) db.ChatMessageModel {
	return db.ChatMessageModel{
		ID:                  entity.ID,
		SessionID:           entity.SessionID,
		Role:                entity.Role,
		Content:             entity.Content,
		RelatedKnowledgeIDs: db.IntSlice(cloneIntSlice(entity.RelatedKnowledgeIDs)),
		CreatedAt:           entity.CreatedAt,
	}
}

func toModelNote(row db.NoteModel) model.Note {
	return model.Note{
		ID:         row.ID,
		UserID:     row.UserID,
		Title:      row.Title,
		Content:    row.Content,
		SourceType: model.NoteSourceType(row.SourceType),
		CreatedAt:  row.CreatedAt,
		UpdatedAt:  row.UpdatedAt,
	}
}

func fromModelNote(entity model.Note) db.NoteModel {
	return db.NoteModel{
		ID:         entity.ID,
		UserID:     entity.UserID,
		Title:      entity.Title,
		Content:    entity.Content,
		SourceType: string(entity.SourceType),
		CreatedAt:  entity.CreatedAt,
		UpdatedAt:  entity.UpdatedAt,
	}
}

func cloneIntSlice(src []int) []int {
	if len(src) == 0 {
		return []int{}
	}
	dst := make([]int, len(src))
	copy(dst, src)
	return dst
}

func cloneStringSlice(src []string) []string {
	if len(src) == 0 {
		return []string{}
	}
	dst := make([]string, len(src))
	copy(dst, src)
	return dst
}

func cloneBoolMap(src map[int]bool) map[int]bool {
	if len(src) == 0 {
		return map[int]bool{}
	}
	dst := make(map[int]bool, len(src))
	for key, value := range src {
		dst[key] = value
	}
	return dst
}

func cloneJSONMap(src map[string]any) map[string]any {
	if len(src) == 0 {
		return map[string]any{}
	}
	dst := make(map[string]any, len(src))
	for key, value := range src {
		dst[key] = value
	}
	return dst
}
