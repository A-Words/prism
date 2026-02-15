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
}
