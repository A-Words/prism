package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/prism/server/internal/ai"
	"github.com/prism/server/internal/model"
	"github.com/prism/server/internal/repository"
)

const coldStartQuestionCount = 10

type LearningService struct {
	repo repository.Repository
	ai   ai.Client

	supabaseURL            string
	supabaseServiceRoleKey string
	supabaseStorageBucket  string
	supabaseStorageBaseURL string
	httpClient             *http.Client
}

func NewLearningService(
	repo repository.Repository,
	aiClient ai.Client,
	supabaseURL string,
	supabaseServiceRoleKey string,
	supabaseStorageBucket string,
	supabaseStorageBaseURL string,
) *LearningService {
	return &LearningService{
		repo:                   repo,
		ai:                     aiClient,
		supabaseURL:            strings.TrimRight(supabaseURL, "/"),
		supabaseServiceRoleKey: supabaseServiceRoleKey,
		supabaseStorageBucket:  supabaseStorageBucket,
		supabaseStorageBaseURL: strings.TrimRight(supabaseStorageBaseURL, "/"),
		httpClient:             &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *LearningService) CreateColdStartSession(_ context.Context, userID string, req model.CreateSessionRequest) (model.CreateSessionResponse, error) {
	subject := strings.TrimSpace(strings.ToLower(req.Subject))
	if subject == "" {
		return model.CreateSessionResponse{}, errors.New("subject is required")
	}
	if len(req.GoalKnowledgeIDs) == 0 {
		return model.CreateSessionResponse{}, errors.New("goalKnowledgeIds is required")
	}
	targetDate, err := time.Parse("2006-01-02", req.TargetDate)
	if err != nil {
		return model.CreateSessionResponse{}, fmt.Errorf("invalid targetDate format: %w", err)
	}

	validGoals := make([]int, 0, len(req.GoalKnowledgeIDs))
	for _, goalID := range req.GoalKnowledgeIDs {
		point, ok := s.repo.GetKnowledgePoint(goalID)
		if !ok || point.Subject != subject {
			return model.CreateSessionResponse{}, fmt.Errorf("invalid goal knowledge id: %d", goalID)
		}
		validGoals = append(validGoals, goalID)
	}

	closure, err := s.collectKnowledgeClosure(subject, validGoals)
	if err != nil {
		return model.CreateSessionResponse{}, err
	}
	questions := s.repo.GetQuestionsByKnowledgeIDs(closure)
	selectedQuestions, err := s.selectColdStartQuestions(questions)
	if err != nil {
		return model.CreateSessionResponse{}, err
	}

	session := s.repo.CreateAssessmentSession(model.AssessmentSession{
		UserID:           userID,
		Subject:          subject,
		GoalKnowledgeIDs: validGoals,
		TargetDate:       targetDate.UTC(),
		QuestionIDs:      questionIDs(selectedQuestions),
		Status:           "ongoing",
		CreatedAt:        time.Now().UTC(),
	})

	responseQuestions := make([]model.AssessmentQuestionDTO, 0, len(selectedQuestions))
	for _, question := range selectedQuestions {
		responseQuestions = append(responseQuestions, model.AssessmentQuestionDTO{
			ID:          question.ID,
			KnowledgeID: question.KnowledgePointID,
			Difficulty:  question.Difficulty,
			Question:    question.Content.Question,
			Options:     append([]string(nil), question.Content.Options...),
		})
	}

	return model.CreateSessionResponse{
		SessionID:  session.ID,
		Subject:    subject,
		TargetDate: targetDate.Format("2006-01-02"),
		Questions:  responseQuestions,
	}, nil
}

func (s *LearningService) SubmitColdStartSession(_ context.Context, userID string, sessionID int, req model.SubmitColdStartRequest) (model.ColdStartSubmitResponse, error) {
	session, ok := s.repo.GetAssessmentSession(sessionID)
	if !ok {
		return model.ColdStartSubmitResponse{}, errors.New("assessment session not found")
	}
	if session.UserID != userID {
		return model.ColdStartSubmitResponse{}, errors.New("forbidden assessment session")
	}
	if session.Status != "ongoing" {
		return model.ColdStartSubmitResponse{}, errors.New("assessment session already completed")
	}
	if len(req.Answers) == 0 {
		return model.ColdStartSubmitResponse{}, errors.New("answers are required")
	}

	questionSet := make(map[int]bool, len(session.QuestionIDs))
	for _, questionID := range session.QuestionIDs {
		questionSet[questionID] = true
	}

	now := time.Now().UTC()
	for _, answer := range req.Answers {
		if !questionSet[answer.QuestionID] {
			return model.ColdStartSubmitResponse{}, fmt.Errorf("question %d not in session", answer.QuestionID)
		}
		question, exists := s.repo.GetQuestion(answer.QuestionID)
		if !exists {
			return model.ColdStartSubmitResponse{}, fmt.Errorf("question %d not found", answer.QuestionID)
		}
		correct := normalizeAnswer(answer.Answer) == normalizeAnswer(question.Content.Answer)

		oldMastery := 0.5
		if current, ok := s.repo.GetMastery(userID, question.KnowledgePointID); ok {
			oldMastery = current.MasteryLevel
		}
		newMastery := updateMastery(oldMastery, question.Difficulty, answer.DurationSec, correct)
		s.repo.UpsertMastery(userID, question.KnowledgePointID, newMastery, now)

		s.repo.SaveQuestionAttempt(model.QuestionAttempt{
			UserID:      userID,
			QuestionID:  question.ID,
			KnowledgeID: question.KnowledgePointID,
			Source:      "cold_start",
			Answer:      answer.Answer,
			IsCorrect:   correct,
			DurationSec: answer.DurationSec,
			AnsweredAt:  now,
		})
	}

	session.Status = "completed"
	session.CompletedAt = &now
	s.repo.UpdateAssessmentSession(session)

	path, err := s.ensureLearningPath(userID, session.Subject, session.GoalKnowledgeIDs, session.TargetDate)
	if err != nil {
		return model.ColdStartSubmitResponse{}, err
	}
	weaknesses, err := s.GetWeaknesses(context.Background(), userID, session.Subject)
	if err != nil {
		return model.ColdStartSubmitResponse{}, err
	}
	pathDTO, err := s.buildLearningPathDTO(userID, path, nil, 0)
	if err != nil {
		return model.ColdStartSubmitResponse{}, err
	}
	return model.ColdStartSubmitResponse{WeakPoints: weaknesses, LearningPath: pathDTO}, nil
}

func (s *LearningService) GradeHomework(ctx context.Context, userID string, subject string, filename string, image []byte) (model.HomeworkGradeResponse, error) {
	subject = strings.TrimSpace(strings.ToLower(subject))
	if subject == "" {
		return model.HomeworkGradeResponse{}, errors.New("subject is required")
	}
	if len(image) == 0 {
		return model.HomeworkGradeResponse{}, errors.New("image is required")
	}

	storagePath, publicURL, err := s.uploadImageToSupabase(ctx, userID, subject, filename, image)
	if err != nil {
		return model.HomeworkGradeResponse{}, err
	}

	ocrResp, err := s.ai.VisionOCR(ctx, model.AIVisionOCRRequest{
		Image: base64.StdEncoding.EncodeToString(image),
		Task:  "handwriting",
	})
	if err != nil {
		return model.HomeworkGradeResponse{}, err
	}

	gradeResp, err := s.ai.GradeHomework(ctx, model.AIGradeHomeworkRequest{
		Subject: subject,
		OCRText: ocrResp.Text,
	})
	if err != nil {
		return model.HomeworkGradeResponse{}, err
	}

	now := time.Now().UTC()
	upload := s.repo.SaveHomeworkUpload(model.HomeworkUpload{
		UserID:           userID,
		Subject:          subject,
		StoragePath:      storagePath,
		StoragePublicURL: publicURL,
		OCRText:          ocrResp.Text,
		OCRStructured:    ocrResp.Structured,
		CreatedAt:        now,
	})

	gradedItems := make([]model.HomeworkGradedItemDTO, 0, len(gradeResp.Items))
	for _, item := range gradeResp.Items {
		gradedItems = append(gradedItems, model.HomeworkGradedItemDTO{
			Question:      item.Question,
			StudentAnswer: item.StudentAnswer,
			CorrectAnswer: item.CorrectAnswer,
			IsCorrect:     item.IsCorrect,
			KnowledgeIDs:  append([]int(nil), item.KnowledgeIDs...),
			Feedback:      item.Feedback,
			Confidence:    item.Confidence,
		})

		s.repo.SaveAssignment(model.Assignment{
			UserID:        userID,
			QuestionID:    0,
			UploadID:      upload.ID,
			AnswerContent: item.StudentAnswer,
			IsCorrect:     item.IsCorrect,
			AIFeedback:    item.Feedback,
			KnowledgeIDs:  append([]int(nil), item.KnowledgeIDs...),
			Confidence:    item.Confidence,
			GradingSource: "ai",
			SubmittedAt:   now,
		})

		for _, knowledgeID := range item.KnowledgeIDs {
			oldMastery := 0.5
			if mastery, ok := s.repo.GetMastery(userID, knowledgeID); ok {
				oldMastery = mastery.MasteryLevel
			}
			newMastery := updateMastery(oldMastery, 0.5, 60, item.IsCorrect)
			s.repo.UpsertMastery(userID, knowledgeID, newMastery, now)
			s.repo.SaveQuestionAttempt(model.QuestionAttempt{
				UserID:      userID,
				QuestionID:  0,
				KnowledgeID: knowledgeID,
				Source:      "homework",
				Answer:      item.StudentAnswer,
				IsCorrect:   item.IsCorrect,
				DurationSec: 60,
				AnsweredAt:  now,
			})
		}
	}

	weaknesses, err := s.GetWeaknesses(context.Background(), userID, subject)
	if err != nil {
		return model.HomeworkGradeResponse{}, err
	}

	return model.HomeworkGradeResponse{
		UploadID:    upload.ID,
		ImageURL:    upload.StoragePublicURL,
		OCRText:     upload.OCRText,
		GradedItems: gradedItems,
		WeakPoints:  weaknesses,
	}, nil
}

func (s *LearningService) GetKnowledgePoints(_ context.Context, subject string) ([]model.KnowledgePointDTO, error) {
	subject = strings.TrimSpace(strings.ToLower(subject))
	if subject == "" {
		return nil, errors.New("subject is required")
	}
	points := s.repo.GetKnowledgePointsBySubject(subject)
	result := make([]model.KnowledgePointDTO, 0, len(points))
	for _, point := range points {
		result = append(result, model.KnowledgePointDTO{
			ID:      point.ID,
			Subject: point.Subject,
			Title:   point.Title,
			Content: point.Content,
		})
	}
	return result, nil
}

func (s *LearningService) GetWeaknesses(_ context.Context, userID string, subject string) ([]model.WeakPointDTO, error) {
	subject = strings.TrimSpace(strings.ToLower(subject))
	if subject == "" {
		return nil, errors.New("subject is required")
	}
	now := time.Now().UTC()
	threshold := now.Add(-14 * 24 * time.Hour)
	points := s.repo.GetKnowledgePointsBySubject(subject)
	weakPoints := make([]model.WeakPointDTO, 0)

	for _, point := range points {
		masteryLevel := 0.5
		if mastery, ok := s.repo.GetMastery(userID, point.ID); ok {
			masteryLevel = mastery.MasteryLevel
		}
		attempts := s.repo.ListQuestionAttempts(userID, point.ID, threshold)
		wrongRate := computeWrongRate(attempts)
		latestAttempt, hasLatest := s.repo.GetLatestQuestionAttempt(userID, point.ID)
		recentWrong := hasLatest && !latestAttempt.IsCorrect
		weakScore := computeWeakScore(masteryLevel, wrongRate, recentWrong)
		if weakScore < 0.45 {
			continue
		}
		reason := "掌握度偏低"
		if recentWrong {
			reason = "最近一次答题错误，建议优先复习"
		} else if wrongRate >= 0.5 {
			reason = "近14天错误率较高"
		}
		weakPoints = append(weakPoints, model.WeakPointDTO{
			KnowledgeID: point.ID,
			Title:       point.Title,
			WeakScore:   weakScore,
			Reason:      reason,
		})
	}

	sort.Slice(weakPoints, func(i, j int) bool {
		if weakPoints[i].WeakScore == weakPoints[j].WeakScore {
			return weakPoints[i].KnowledgeID < weakPoints[j].KnowledgeID
		}
		return weakPoints[i].WeakScore > weakPoints[j].WeakScore
	})
	return weakPoints, nil
}

func (s *LearningService) GetCurrentLearningPath(_ context.Context, userID string, subject string) (model.LearningPathDTO, error) {
	subject = strings.TrimSpace(strings.ToLower(subject))
	if subject == "" {
		return model.LearningPathDTO{}, errors.New("subject is required")
	}
	path, ok := s.repo.GetCurrentLearningPath(userID, subject)
	if !ok {
		return model.LearningPathDTO{}, errors.New("learning path not found")
	}
	return s.buildLearningPathDTO(userID, path, nil, 0)
}

func (s *LearningService) SubmitPracticeAttempt(_ context.Context, userID string, pathID int, payload model.PracticeAttemptPayload) (model.LearningPathDTO, error) {
	path, ok := s.repo.GetLearningPathByID(userID, pathID)
	if !ok {
		return model.LearningPathDTO{}, errors.New("learning path not found")
	}
	question, ok := s.repo.GetQuestion(payload.QuestionID)
	if !ok {
		return model.LearningPathDTO{}, errors.New("question not found")
	}

	now := time.Now().UTC()
	correct := normalizeAnswer(payload.Answer) == normalizeAnswer(question.Content.Answer)
	oldMastery := 0.5
	if mastery, ok := s.repo.GetMastery(userID, payload.KnowledgeID); ok {
		oldMastery = mastery.MasteryLevel
	}
	newMastery := updateMastery(oldMastery, question.Difficulty, payload.DurationSec, correct)
	s.repo.UpsertMastery(userID, payload.KnowledgeID, newMastery, now)
	s.repo.SaveQuestionAttempt(model.QuestionAttempt{
		UserID:      userID,
		QuestionID:  payload.QuestionID,
		KnowledgeID: payload.KnowledgeID,
		Source:      payload.Source,
		Answer:      payload.Answer,
		IsCorrect:   correct,
		DurationSec: payload.DurationSec,
		AnsweredAt:  now,
	})

	state := s.repo.GetPathState(userID, path.ID)
	if correct && float64(payload.DurationSec) <= expectedSecByDifficulty(question.Difficulty)*1.2 {
		state.CorrectStreak++
		state.WrongStreak = 0
	} else if !correct {
		state.WrongStreak++
		state.CorrectStreak = 0
	} else {
		state.CorrectStreak = 0
		state.WrongStreak = 0
	}

	currentKnowledgeID := payload.KnowledgeID
	if path.CurrentIndex >= 0 && path.CurrentIndex < len(path.KnowledgeSequence) {
		currentKnowledgeID = path.KnowledgeSequence[path.CurrentIndex]
	}

	if state.CorrectStreak >= 3 {
		skipped := s.skipRedundantNodes(userID, &path)
		if len(skipped) > 0 {
			s.repo.SavePathAdjustmentEvent(model.PathAdjustmentEvent{
				UserID:    userID,
				PathID:    path.ID,
				EventType: "skip_redundant",
				Payload: map[string]any{
					"knowledgeId":    currentKnowledgeID,
					"skippedNodeIds": skipped,
				},
				CreatedAt: now,
			})
		}
		state.CorrectStreak = 0
	}

	if state.WrongStreak >= 2 {
		inserted := s.insertPrerequisiteReview(userID, &path, currentKnowledgeID)
		if inserted != 0 {
			s.repo.SavePathAdjustmentEvent(model.PathAdjustmentEvent{
				UserID:    userID,
				PathID:    path.ID,
				EventType: "insert_prerequisite",
				Payload: map[string]any{
					"knowledgeId":         currentKnowledgeID,
					"insertedKnowledgeId": inserted,
				},
				CreatedAt: now,
			})
			if path.CurrentIndex+1 < len(path.KnowledgeSequence) {
				path.CurrentIndex++
			}
		}
		state.WrongStreak = 0
	}

	if correct {
		path.CurrentIndex++
		for path.CurrentIndex < len(path.KnowledgeSequence) && path.SkippedNodeIDs[path.KnowledgeSequence[path.CurrentIndex]] {
			path.CurrentIndex++
		}
	}
	if path.CurrentIndex >= len(path.KnowledgeSequence) {
		path.CurrentIndex = len(path.KnowledgeSequence) - 1
	}
	if path.CurrentIndex < 0 {
		path.CurrentIndex = 0
	}

	s.repo.SavePathState(state)
	s.repo.UpdateLearningPath(path)
	return s.buildLearningPathDTO(userID, path, nil, 0)
}

func (s *LearningService) GetPrediction(ctx context.Context, userID string, pathID int) (model.PredictionDTO, error) {
	path, ok := s.repo.GetLearningPathByID(userID, pathID)
	if !ok {
		return model.PredictionDTO{}, errors.New("learning path not found")
	}
	if len(path.KnowledgeSequence) == 0 {
		return model.PredictionDTO{}, errors.New("learning path is empty")
	}

	now := time.Now().UTC()
	since := now.Add(-14 * 24 * time.Hour)
	nodeBase := make(map[int]float64, len(path.KnowledgeSequence))
	aiNodes := make([]model.AIPredictNode, 0, len(path.KnowledgeSequence))
	weights := make(map[int]float64, len(path.KnowledgeSequence))

	goals := make(map[int]bool, len(path.GoalKnowledgeIDs))
	for _, goalID := range path.GoalKnowledgeIDs {
		goals[goalID] = true
	}

	totalWeighted := 0.0
	totalWeight := 0.0
	for _, knowledgeID := range path.KnowledgeSequence {
		point, exists := s.repo.GetKnowledgePoint(knowledgeID)
		if !exists {
			continue
		}
		mastery := 0.5
		if currentMastery, ok := s.repo.GetMastery(userID, knowledgeID); ok {
			mastery = currentMastery.MasteryLevel
		}
		attempts := s.repo.ListQuestionAttempts(userID, knowledgeID, since)
		accuracy := 0.6
		avgDuration := expectedSecByDifficulty(0.5)
		if len(attempts) > 0 {
			correctCount := 0
			totalDuration := 0
			for _, attempt := range attempts {
				if attempt.IsCorrect {
					correctCount++
				}
				totalDuration += attempt.DurationSec
			}
			accuracy = float64(correctCount) / float64(len(attempts))
			avgDuration = float64(totalDuration) / float64(len(attempts))
		}
		timePenalty := clamp((avgDuration-expectedSecByDifficulty(0.5))/expectedSecByDifficulty(0.5), -0.4, 0.6)
		planned := 0.3
		if mastery < 0.85 {
			planned = 1.0
		}
		baseProb := clamp(0.25+0.45*planned+0.25*accuracy-0.1*timePenalty+0.2*(1-mastery), 0.05, 0.98)
		nodeBase[knowledgeID] = baseProb
		aiNodes = append(aiNodes, model.AIPredictNode{
			KnowledgeID:     knowledgeID,
			Title:           point.Title,
			BaseProbability: baseProb,
		})
		weight := 1.0
		if goals[knowledgeID] {
			weight = 2.0
		}
		weights[knowledgeID] = weight
		totalWeighted += baseProb * weight
		totalWeight += weight
	}

	overallBase := totalWeighted / totalWeight
	aiPrediction, err := s.ai.PredictOutcome(ctx, model.AIPredictOutcomeRequest{
		Subject:         path.Subject,
		OverallBaseProb: overallBase,
		Nodes:           aiNodes,
	})
	if err != nil {
		return model.PredictionDTO{}, err
	}

	factor := clamp(aiPrediction.CalibrationFactor, 0.8, 1.2)
	probabilities := make([]model.NodeProbabilityDTO, 0, len(path.KnowledgeSequence))
	weightedFinal := 0.0
	for _, knowledgeID := range path.KnowledgeSequence {
		point, exists := s.repo.GetKnowledgePoint(knowledgeID)
		if !exists {
			continue
		}
		finalProb := clamp(nodeBase[knowledgeID]*factor, 0.05, 0.98)
		probabilities = append(probabilities, model.NodeProbabilityDTO{
			KnowledgeID: knowledgeID,
			Title:       point.Title,
			Probability: finalProb,
		})
		weightedFinal += finalProb * weights[knowledgeID]
	}

	sort.Slice(probabilities, func(i, j int) bool {
		if probabilities[i].Probability == probabilities[j].Probability {
			return probabilities[i].KnowledgeID < probabilities[j].KnowledgeID
		}
		return probabilities[i].Probability > probabilities[j].Probability
	})

	return model.PredictionDTO{
		OverallProbability: clamp(weightedFinal/totalWeight, 0.05, 0.98),
		NodeProbabilities:  probabilities,
		Rationale:          aiPrediction.Rationale,
	}, nil
}

func (s *LearningService) ensureLearningPath(userID string, subject string, goalKnowledgeIDs []int, targetDate time.Time) (model.LearningPath, error) {
	sequence, err := s.buildKnowledgeSequence(userID, subject, goalKnowledgeIDs)
	if err != nil {
		return model.LearningPath{}, err
	}
	if len(sequence) == 0 {
		return model.LearningPath{}, errors.New("learning path sequence is empty")
	}

	existingPath, found := s.repo.GetCurrentLearningPath(userID, subject)
	if found {
		existingPath.GoalKnowledgeIDs = append([]int(nil), goalKnowledgeIDs...)
		existingPath.KnowledgeSequence = sequence
		existingPath.TargetDate = targetDate.UTC()
		existingPath.SkippedNodeIDs = make(map[int]bool)
		existingPath.CurrentIndex = findCurrentIndex(existingPath.KnowledgeSequence, existingPath.SkippedNodeIDs)
		s.repo.UpdateLearningPath(existingPath)
		return existingPath, nil
	}

	path := s.repo.CreateOrUpdateLearningPath(model.LearningPath{
		UserID:            userID,
		Subject:           subject,
		GoalKnowledgeIDs:  append([]int(nil), goalKnowledgeIDs...),
		KnowledgeSequence: sequence,
		CurrentIndex:      0,
		SkippedNodeIDs:    make(map[int]bool),
		TargetDate:        targetDate.UTC(),
	})
	return path, nil
}

func (s *LearningService) buildKnowledgeSequence(userID string, subject string, goalKnowledgeIDs []int) ([]int, error) {
	closure, err := s.collectKnowledgeClosure(subject, goalKnowledgeIDs)
	if err != nil {
		return nil, err
	}
	closureSet := make(map[int]bool, len(closure))
	for _, id := range closure {
		closureSet[id] = true
	}

	deps := s.repo.GetDependenciesBySubject(subject)
	adj := make(map[int][]int)
	indegree := make(map[int]int)
	reverse := make(map[int][]int)
	for _, id := range closure {
		adj[id] = make([]int, 0)
		reverse[id] = make([]int, 0)
		indegree[id] = 0
	}
	for _, dep := range deps {
		if !closureSet[dep.KnowledgeID] || !closureSet[dep.PrerequisiteID] {
			continue
		}
		adj[dep.PrerequisiteID] = append(adj[dep.PrerequisiteID], dep.KnowledgeID)
		reverse[dep.KnowledgeID] = append(reverse[dep.KnowledgeID], dep.PrerequisiteID)
		indegree[dep.KnowledgeID]++
	}

	goalDistance := computeGoalDistance(goalKnowledgeIDs, reverse)
	dependencyDepth := computeDependencyDepth(adj, indegree)
	queue := make([]int, 0)
	for knowledgeID, degree := range indegree {
		if degree == 0 {
			queue = append(queue, knowledgeID)
		}
	}

	result := make([]int, 0, len(closure))
	for len(queue) > 0 {
		sort.Slice(queue, func(i, j int) bool {
			scoreI := s.nodePriorityScore(userID, queue[i], goalDistance[queue[i]], dependencyDepth[queue[i]])
			scoreJ := s.nodePriorityScore(userID, queue[j], goalDistance[queue[j]], dependencyDepth[queue[j]])
			if scoreI == scoreJ {
				return queue[i] < queue[j]
			}
			return scoreI > scoreJ
		})
		nodeID := queue[0]
		queue = queue[1:]
		result = append(result, nodeID)

		for _, nextID := range adj[nodeID] {
			indegree[nextID]--
			if indegree[nextID] == 0 {
				queue = append(queue, nextID)
			}
		}
	}

	if len(result) != len(closure) {
		return nil, errors.New("knowledge dependencies contain cycle")
	}
	return result, nil
}

func (s *LearningService) collectKnowledgeClosure(subject string, goals []int) ([]int, error) {
	deps := s.repo.GetDependenciesBySubject(subject)
	prerequisites := make(map[int][]int)
	for _, dep := range deps {
		prerequisites[dep.KnowledgeID] = append(prerequisites[dep.KnowledgeID], dep.PrerequisiteID)
	}

	set := make(map[int]bool)
	queue := append([]int(nil), goals...)
	for len(queue) > 0 {
		nodeID := queue[0]
		queue = queue[1:]
		if set[nodeID] {
			continue
		}
		point, ok := s.repo.GetKnowledgePoint(nodeID)
		if !ok || point.Subject != subject {
			return nil, fmt.Errorf("knowledge %d does not belong to subject %s", nodeID, subject)
		}
		set[nodeID] = true
		queue = append(queue, prerequisites[nodeID]...)
	}

	closure := make([]int, 0, len(set))
	for id := range set {
		closure = append(closure, id)
	}
	sort.Ints(closure)
	return closure, nil
}

func (s *LearningService) nodePriorityScore(userID string, knowledgeID int, goalDistance int, dependencyDepth int) float64 {
	mastery := 0.5
	if record, ok := s.repo.GetMastery(userID, knowledgeID); ok {
		mastery = record.MasteryLevel
	}
	return 0.5*(1-mastery) + 0.3*float64(goalDistance) + 0.2*float64(dependencyDepth)
}

func computeGoalDistance(goals []int, reverse map[int][]int) map[int]int {
	distance := make(map[int]int)
	queue := make([]int, 0, len(goals))
	for _, goalID := range goals {
		distance[goalID] = 0
		queue = append(queue, goalID)
	}
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		for _, prerequisite := range reverse[node] {
			nextDistance := distance[node] + 1
			currentDistance, seen := distance[prerequisite]
			if !seen || nextDistance < currentDistance {
				distance[prerequisite] = nextDistance
				queue = append(queue, prerequisite)
			}
		}
	}
	for nodeID := range reverse {
		if _, ok := distance[nodeID]; !ok {
			distance[nodeID] = len(reverse)
		}
	}
	return distance
}

func computeDependencyDepth(adj map[int][]int, indegree map[int]int) map[int]int {
	depth := make(map[int]int)
	workingIndegree := make(map[int]int, len(indegree))
	queue := make([]int, 0)
	for nodeID, degree := range indegree {
		workingIndegree[nodeID] = degree
		if degree == 0 {
			queue = append(queue, nodeID)
			depth[nodeID] = 0
		}
	}
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		for _, child := range adj[node] {
			if depth[child] < depth[node]+1 {
				depth[child] = depth[node] + 1
			}
			workingIndegree[child]--
			if workingIndegree[child] == 0 {
				queue = append(queue, child)
			}
		}
	}
	for nodeID := range indegree {
		if _, ok := depth[nodeID]; !ok {
			depth[nodeID] = 0
		}
	}
	return depth
}

func findCurrentIndex(sequence []int, skipped map[int]bool) int {
	for index, knowledgeID := range sequence {
		if skipped[knowledgeID] {
			continue
		}
		return index
	}
	if len(sequence) == 0 {
		return 0
	}
	return len(sequence) - 1
}

func (s *LearningService) buildLearningPathDTO(userID string, path model.LearningPath, nodeProb map[int]float64, overallProb float64) (model.LearningPathDTO, error) {
	now := time.Now().UTC()
	subjectDeps := s.repo.GetDependenciesBySubject(path.Subject)
	pathSet := make(map[int]bool, len(path.KnowledgeSequence))
	for _, id := range path.KnowledgeSequence {
		pathSet[id] = true
	}

	nodes := make([]model.PathNodeDTO, 0, len(path.KnowledgeSequence))
	for index, knowledgeID := range path.KnowledgeSequence {
		point, ok := s.repo.GetKnowledgePoint(knowledgeID)
		if !ok {
			return model.LearningPathDTO{}, fmt.Errorf("knowledge point %d not found", knowledgeID)
		}
		mastery := 0.5
		lastPracticed := time.Time{}
		if currentMastery, ok := s.repo.GetMastery(userID, knowledgeID); ok {
			mastery = currentMastery.MasteryLevel
			lastPracticed = currentMastery.LastPracticedAt
		}
		prerequisites := make([]int, 0)
		for _, dep := range subjectDeps {
			if dep.KnowledgeID == knowledgeID && pathSet[dep.PrerequisiteID] {
				prerequisites = append(prerequisites, dep.PrerequisiteID)
			}
		}
		sort.Ints(prerequisites)
		predProb := 0.0
		if nodeProb != nil {
			predProb = nodeProb[knowledgeID]
		}
		nodes = append(nodes, model.PathNodeDTO{
			ID:                   knowledgeID,
			Title:                point.Title,
			Subject:              point.Subject,
			Status:               calcNodeStatus(mastery, lastPracticed, now),
			Mastery:              mastery,
			PrerequisiteIDs:      prerequisites,
			IsCurrent:            index == path.CurrentIndex,
			IsSkipped:            path.SkippedNodeIDs[knowledgeID],
			PredictedImproveProb: predProb,
		})
	}

	edges := make([]model.PathEdgeDTO, 0)
	for _, dep := range subjectDeps {
		if pathSet[dep.KnowledgeID] && pathSet[dep.PrerequisiteID] {
			edges = append(edges, model.PathEdgeDTO{From: dep.PrerequisiteID, To: dep.KnowledgeID})
		}
	}
	sort.Slice(edges, func(i, j int) bool {
		if edges[i].From == edges[j].From {
			return edges[i].To < edges[j].To
		}
		return edges[i].From < edges[j].From
	})

	events := s.repo.ListPathAdjustmentEvents(path.ID)
	eventDTOs := make([]model.PathAdjustmentEventDTO, 0, len(events))
	for _, event := range events {
		eventDTOs = append(eventDTOs, model.PathAdjustmentEventDTO{
			EventType: event.EventType,
			Payload:   event.Payload,
			CreatedAt: event.CreatedAt.Format(time.RFC3339),
		})
	}

	return model.LearningPathDTO{
		PathID:             path.ID,
		Subject:            path.Subject,
		TargetDate:         path.TargetDate.Format("2006-01-02"),
		CurrentIndex:       path.CurrentIndex,
		Nodes:              nodes,
		Edges:              edges,
		OverallImproveProb: overallProb,
		AdjustmentEvents:   eventDTOs,
	}, nil
}

func (s *LearningService) selectColdStartQuestions(questions []model.Question) ([]model.Question, error) {
	if len(questions) < coldStartQuestionCount {
		return nil, fmt.Errorf("not enough questions for cold start: got %d", len(questions))
	}

	easy := make([]model.Question, 0)
	medium := make([]model.Question, 0)
	hard := make([]model.Question, 0)
	for _, question := range questions {
		switch {
		case question.Difficulty <= 0.35:
			easy = append(easy, question)
		case question.Difficulty <= 0.70:
			medium = append(medium, question)
		default:
			hard = append(hard, question)
		}
	}

	selected := make([]model.Question, 0, coldStartQuestionCount)
	knowledgeCount := make(map[int]int)
	pick := func(bucket []model.Question, target int) {
		for _, question := range bucket {
			if len(selected) >= coldStartQuestionCount || target == 0 {
				return
			}
			if knowledgeCount[question.KnowledgePointID] >= 2 {
				continue
			}
			selected = append(selected, question)
			knowledgeCount[question.KnowledgePointID]++
			target--
		}
	}
	pick(easy, 3)
	pick(medium, 4)
	pick(hard, 3)

	if len(selected) < coldStartQuestionCount {
		for _, question := range questions {
			if len(selected) >= coldStartQuestionCount {
				break
			}
			if knowledgeCount[question.KnowledgePointID] >= 2 {
				continue
			}
			if containsQuestion(selected, question.ID) {
				continue
			}
			selected = append(selected, question)
			knowledgeCount[question.KnowledgePointID]++
		}
	}
	if len(selected) != coldStartQuestionCount {
		return nil, fmt.Errorf("unable to sample %d cold start questions", coldStartQuestionCount)
	}
	sort.Slice(selected, func(i, j int) bool { return selected[i].ID < selected[j].ID })
	return selected, nil
}

func questionIDs(questions []model.Question) []int {
	ids := make([]int, 0, len(questions))
	for _, question := range questions {
		ids = append(ids, question.ID)
	}
	return ids
}

func containsQuestion(questions []model.Question, questionID int) bool {
	for _, question := range questions {
		if question.ID == questionID {
			return true
		}
	}
	return false
}

func (s *LearningService) skipRedundantNodes(userID string, path *model.LearningPath) []int {
	skipped := make([]int, 0, 2)
	if path.SkippedNodeIDs == nil {
		path.SkippedNodeIDs = make(map[int]bool)
	}
	goalSet := make(map[int]bool, len(path.GoalKnowledgeIDs))
	for _, goalID := range path.GoalKnowledgeIDs {
		goalSet[goalID] = true
	}
	for index := path.CurrentIndex + 1; index < len(path.KnowledgeSequence) && len(skipped) < 2; index++ {
		nodeID := path.KnowledgeSequence[index]
		if path.SkippedNodeIDs[nodeID] || goalSet[nodeID] {
			continue
		}
		mastery := 0.5
		if record, ok := s.repo.GetMastery(userID, nodeID); ok {
			mastery = record.MasteryLevel
		}
		if mastery < 0.70 {
			continue
		}
		path.SkippedNodeIDs[nodeID] = true
		skipped = append(skipped, nodeID)
	}
	return skipped
}

func (s *LearningService) insertPrerequisiteReview(userID string, path *model.LearningPath, currentKnowledgeID int) int {
	deps := s.repo.GetDependenciesBySubject(path.Subject)
	candidates := make([]int, 0)
	for _, dep := range deps {
		if dep.KnowledgeID == currentKnowledgeID {
			candidates = append(candidates, dep.PrerequisiteID)
		}
	}
	if len(candidates) == 0 {
		return 0
	}

	selected := 0
	minMastery := 2.0
	for _, candidateID := range candidates {
		mastery := 0.5
		if record, ok := s.repo.GetMastery(userID, candidateID); ok {
			mastery = record.MasteryLevel
		}
		if mastery < 0.60 {
			selected = candidateID
			break
		}
		if mastery < minMastery {
			minMastery = mastery
			selected = candidateID
		}
	}
	if selected == 0 {
		return 0
	}

	insertPos := path.CurrentIndex + 1
	if insertPos < 0 {
		insertPos = 0
	}
	if insertPos > len(path.KnowledgeSequence) {
		insertPos = len(path.KnowledgeSequence)
	}
	if insertPos < len(path.KnowledgeSequence) && path.KnowledgeSequence[insertPos] == selected {
		return selected
	}

	path.KnowledgeSequence = append(path.KnowledgeSequence, 0)
	copy(path.KnowledgeSequence[insertPos+1:], path.KnowledgeSequence[insertPos:])
	path.KnowledgeSequence[insertPos] = selected
	delete(path.SkippedNodeIDs, selected)
	return selected
}

func (s *LearningService) uploadImageToSupabase(ctx context.Context, userID string, subject string, filename string, image []byte) (string, string, error) {
	if s.supabaseURL == "" || s.supabaseServiceRoleKey == "" || s.supabaseStorageBucket == "" {
		return "", "", errors.New("supabase storage config is required")
	}
	if filename == "" {
		filename = "homework-image"
	}
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".jpg"
	}
	name := strings.TrimSuffix(filepath.Base(filename), ext)
	if name == "" {
		name = "homework"
	}
	objectPath := fmt.Sprintf("%s/%s/%s-%d%s", userID, subject, sanitizePathName(name), time.Now().UTC().UnixNano(), ext)
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.supabaseURL, s.supabaseStorageBucket, objectPath)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(image))
	if err != nil {
		return "", "", fmt.Errorf("create supabase storage request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.supabaseServiceRoleKey)
	req.Header.Set("apikey", s.supabaseServiceRoleKey)
	req.Header.Set("x-upsert", "true")
	req.Header.Set("Content-Type", http.DetectContentType(image))

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("upload image to supabase storage: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= http.StatusBadRequest {
		return "", "", fmt.Errorf("supabase storage status=%d body=%s", resp.StatusCode, string(respBody))
	}

	publicURL := ""
	if s.supabaseStorageBaseURL != "" {
		publicURL = fmt.Sprintf("%s/%s", s.supabaseStorageBaseURL, objectPath)
	} else {
		publicURL = fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.supabaseURL, s.supabaseStorageBucket, objectPath)
	}
	return objectPath, publicURL, nil
}

func sanitizePathName(input string) string {
	clean := strings.ToLower(strings.TrimSpace(input))
	clean = strings.ReplaceAll(clean, " ", "-")
	builder := strings.Builder{}
	for _, r := range clean {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			builder.WriteRune(r)
		}
	}
	result := builder.String()
	if result == "" {
		return "image"
	}
	return result
}
