package repository

import (
	"time"

	"github.com/prism/server/internal/model"
)

type Repository interface {
	GetKnowledgePointsBySubject(subject string) []model.KnowledgePoint
	GetKnowledgePoint(id int) (model.KnowledgePoint, bool)
	GetDependenciesBySubject(subject string) []model.KnowledgeDependency
	GetQuestionsByKnowledgeIDs(knowledgeIDs []int) []model.Question
	GetQuestion(id int) (model.Question, bool)

	CreateAssessmentSession(session model.AssessmentSession) model.AssessmentSession
	GetAssessmentSession(sessionID int) (model.AssessmentSession, bool)
	UpdateAssessmentSession(session model.AssessmentSession)

	UpsertMastery(userID string, knowledgeID int, mastery float64, practicedAt time.Time)
	GetMastery(userID string, knowledgeID int) (model.KnowledgeMastery, bool)
	ListMasteryByUserSubject(userID string, subject string) []model.KnowledgeMastery

	SaveQuestionAttempt(attempt model.QuestionAttempt) model.QuestionAttempt
	ListQuestionAttempts(userID string, knowledgeID int, since time.Time) []model.QuestionAttempt
	GetLatestQuestionAttempt(userID string, knowledgeID int) (model.QuestionAttempt, bool)

	CreateOrUpdateLearningPath(path model.LearningPath) model.LearningPath
	GetCurrentLearningPath(userID string, subject string) (model.LearningPath, bool)
	GetLearningPathByID(userID string, pathID int) (model.LearningPath, bool)
	UpdateLearningPath(path model.LearningPath)

	SavePathState(state model.LearningPathState)
	GetPathState(userID string, pathID int) model.LearningPathState

	SavePathAdjustmentEvent(event model.PathAdjustmentEvent) model.PathAdjustmentEvent
	ListPathAdjustmentEvents(pathID int) []model.PathAdjustmentEvent

	SaveHomeworkUpload(upload model.HomeworkUpload) model.HomeworkUpload
	SaveAssignment(assignment model.Assignment) model.Assignment

	// 场景适配
	GetUserScene(userID string) string
	SetUserScene(userID string, scene string)

	// 健康管理
	CreateHealthAlert(alert model.HealthAlert) model.HealthAlert
	ListHealthAlerts(userID string, acknowledged *bool) []model.HealthAlert
	GetHealthAlert(userID string, alertID int) (model.HealthAlert, bool)
	AcknowledgeHealthAlert(userID string, alertID int) (model.HealthAlert, bool)
	CreateStudyLog(log model.StudyLog) model.StudyLog
	ListStudyLogs(userID string, since time.Time) []model.StudyLog

	// 虚拟助教
	CreateChatSession(session model.ChatSession) model.ChatSession
	ListChatSessions(userID string) []model.ChatSession
	GetChatSession(userID string, sessionID int) (model.ChatSession, bool)
	CreateChatMessage(message model.ChatMessage) model.ChatMessage
	ListChatMessages(sessionID int) []model.ChatMessage

	// 智能笔记
	CreateNote(note model.Note) model.Note
	ListNotes(userID string) []model.Note
	GetNote(userID string, noteID int) (model.Note, bool)
	SaveNoteKnowledgeLinks(noteID int, links []model.NoteKnowledgeLink)
}
