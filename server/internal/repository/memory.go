package repository

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/prism/server/internal/model"
)

type MemoryRepository struct {
	mu sync.RWMutex

	knowledgePoints map[int]model.KnowledgePoint
	dependencies   []model.KnowledgeDependency
	questions      map[int]model.Question

	sessions map[int]model.AssessmentSession

	masteries map[string]map[int]model.KnowledgeMastery
	attempts  []model.QuestionAttempt

	paths              map[int]model.LearningPath
	pathByUserSubject  map[string]int
	pathStates         map[string]model.LearningPathState
	pathAdjustments    map[int][]model.PathAdjustmentEvent

	homeworkUploads map[int]model.HomeworkUpload
	assignments     map[int]model.Assignment

	nextSessionID    int
	nextPathID       int
	nextAttemptID    int
	nextAdjustmentID int
	nextUploadID     int
	nextAssignmentID int
}

func NewMemoryRepository() *MemoryRepository {
	repo := &MemoryRepository{
		knowledgePoints: make(map[int]model.KnowledgePoint),
		dependencies:    make([]model.KnowledgeDependency, 0),
		questions:       make(map[int]model.Question),
		sessions:        make(map[int]model.AssessmentSession),
		masteries:       make(map[string]map[int]model.KnowledgeMastery),
		attempts:        make([]model.QuestionAttempt, 0, 256),
		paths:           make(map[int]model.LearningPath),
		pathByUserSubject: make(map[string]int),
		pathStates:      make(map[string]model.LearningPathState),
		pathAdjustments: make(map[int][]model.PathAdjustmentEvent),
		homeworkUploads: make(map[int]model.HomeworkUpload),
		assignments:     make(map[int]model.Assignment),
		nextSessionID:   1,
		nextPathID:      1,
		nextAttemptID:   1,
		nextAdjustmentID: 1,
		nextUploadID:    1,
		nextAssignmentID: 1,
	}
	repo.seedKnowledgeData()
	return repo
}

func (r *MemoryRepository) seedKnowledgeData() {
	points := []model.KnowledgePoint{
		{ID: 101, Subject: "math", Title: "有理数运算", Content: "掌握有理数加减乘除与符号规则。"},
		{ID: 102, Subject: "math", Title: "一元一次方程", Content: "理解移项与等式性质，完成一元一次方程求解。"},
		{ID: 103, Subject: "math", Title: "整式运算", Content: "完成整式加减与同类项合并。"},
		{ID: 104, Subject: "math", Title: "因式分解", Content: "掌握提公因式与公式法分解。"},
		{ID: 105, Subject: "math", Title: "函数基础", Content: "理解函数对应关系与图像基础。"},
		{ID: 106, Subject: "math", Title: "二次函数", Content: "掌握二次函数图像、顶点与应用。"},
		{ID: 201, Subject: "physics", Title: "速度与位移", Content: "理解速度、位移与时间关系。"},
		{ID: 202, Subject: "physics", Title: "牛顿第二定律", Content: "掌握 F=ma 的计算与分析。"},
		{ID: 203, Subject: "physics", Title: "功和功率", Content: "理解功、功率与效率的计算。"},
		{ID: 204, Subject: "physics", Title: "动能定理", Content: "掌握动能变化与外力做功关系。"},
		{ID: 205, Subject: "physics", Title: "电流与电压", Content: "理解欧姆定律和串并联基础。"},
		{ID: 206, Subject: "physics", Title: "电功率", Content: "掌握电功率、电能与安全应用。"},
	}
	for _, point := range points {
		r.knowledgePoints[point.ID] = point
	}

	r.dependencies = []model.KnowledgeDependency{
		{KnowledgeID: 102, PrerequisiteID: 101},
		{KnowledgeID: 103, PrerequisiteID: 102},
		{KnowledgeID: 104, PrerequisiteID: 103},
		{KnowledgeID: 105, PrerequisiteID: 102},
		{KnowledgeID: 106, PrerequisiteID: 104},
		{KnowledgeID: 106, PrerequisiteID: 105},
		{KnowledgeID: 202, PrerequisiteID: 201},
		{KnowledgeID: 203, PrerequisiteID: 202},
		{KnowledgeID: 204, PrerequisiteID: 203},
		{KnowledgeID: 205, PrerequisiteID: 201},
		{KnowledgeID: 206, PrerequisiteID: 205},
		{KnowledgeID: 206, PrerequisiteID: 203},
	}

	questions := []model.Question{
		{ID: 1001, KnowledgePointID: 101, Difficulty: 0.2, Content: model.QuestionContent{Question: "计算：-3 + 7 = ?", Options: []string{"2", "4", "10", "-10"}, Answer: "4", Explanation: "异号相加取绝对值差。"}},
		{ID: 1002, KnowledgePointID: 101, Difficulty: 0.3, Content: model.QuestionContent{Question: "计算：(-2)×(-5) = ?", Options: []string{"-10", "10", "7", "-7"}, Answer: "10", Explanation: "负负得正。"}},
		{ID: 1003, KnowledgePointID: 102, Difficulty: 0.3, Content: model.QuestionContent{Question: "解方程：2x+3=11", Options: []string{"x=3", "x=4", "x=5", "x=6"}, Answer: "x=4", Explanation: "2x=8。"}},
		{ID: 1004, KnowledgePointID: 102, Difficulty: 0.4, Content: model.QuestionContent{Question: "解方程：5x-2=3x+6", Options: []string{"x=2", "x=3", "x=4", "x=1"}, Answer: "x=4", Explanation: "2x=8。"}},
		{ID: 1005, KnowledgePointID: 103, Difficulty: 0.5, Content: model.QuestionContent{Question: "化简：3a+2b-a+b", Options: []string{"2a+3b", "4a+3b", "2a+b", "a+3b"}, Answer: "2a+3b", Explanation: "同类项合并。"}},
		{ID: 1006, KnowledgePointID: 103, Difficulty: 0.5, Content: model.QuestionContent{Question: "化简：2x-(3x-4)", Options: []string{"-x+4", "x-4", "-x-4", "5x-4"}, Answer: "-x+4", Explanation: "去括号后合并。"}},
		{ID: 1007, KnowledgePointID: 104, Difficulty: 0.6, Content: model.QuestionContent{Question: "分解：x^2-9", Options: []string{"(x-3)^2", "(x-3)(x+3)", "(x+9)(x-1)", "x(x-9)"}, Answer: "(x-3)(x+3)", Explanation: "平方差公式。"}},
		{ID: 1008, KnowledgePointID: 104, Difficulty: 0.7, Content: model.QuestionContent{Question: "分解：2x^2+4x", Options: []string{"2x(x+2)", "x(2x+4)", "2(x^2+2x)", "以上都可"}, Answer: "以上都可", Explanation: "多种等价形式。"}},
		{ID: 1009, KnowledgePointID: 105, Difficulty: 0.6, Content: model.QuestionContent{Question: "函数 y=2x+1 中 x=3 时 y=?", Options: []string{"6", "7", "8", "9"}, Answer: "7", Explanation: "代入求值。"}},
		{ID: 1010, KnowledgePointID: 105, Difficulty: 0.7, Content: model.QuestionContent{Question: "下列属于函数的是？", Options: []string{"每人对应多个学号", "每人对应唯一学号", "一个学号对应多人", "以上都不是"}, Answer: "每人对应唯一学号", Explanation: "唯一对应。"}},
		{ID: 1011, KnowledgePointID: 106, Difficulty: 0.8, Content: model.QuestionContent{Question: "y=x^2-4x+3 顶点横坐标为？", Options: []string{"-2", "2", "4", "1"}, Answer: "2", Explanation: "-b/2a。"}},
		{ID: 1012, KnowledgePointID: 106, Difficulty: 0.9, Content: model.QuestionContent{Question: "y=-x^2+2x 开口方向？", Options: []string{"向上", "向下", "左右", "无法判断"}, Answer: "向下", Explanation: "a<0。"}},
		{ID: 2001, KnowledgePointID: 201, Difficulty: 0.2, Content: model.QuestionContent{Question: "v=s/t 中 s=20m,t=4s，v=?", Options: []string{"4", "5", "6", "8"}, Answer: "5", Explanation: "v=20/4。"}},
		{ID: 2002, KnowledgePointID: 201, Difficulty: 0.3, Content: model.QuestionContent{Question: "位移-时间图像斜率表示？", Options: []string{"位移", "速度", "加速度", "功率"}, Answer: "速度", Explanation: "斜率=速度。"}},
		{ID: 2003, KnowledgePointID: 202, Difficulty: 0.4, Content: model.QuestionContent{Question: "质量2kg受力6N，加速度为？", Options: []string{"2", "3", "4", "6"}, Answer: "3", Explanation: "a=F/m。"}},
		{ID: 2004, KnowledgePointID: 202, Difficulty: 0.5, Content: model.QuestionContent{Question: "m 不变，F增大，a如何变化？", Options: []string{"减小", "不变", "增大", "先增后减"}, Answer: "增大", Explanation: "正比例。"}},
		{ID: 2005, KnowledgePointID: 203, Difficulty: 0.5, Content: model.QuestionContent{Question: "功的单位是？", Options: []string{"N", "W", "J", "Pa"}, Answer: "J", Explanation: "焦耳。"}},
		{ID: 2006, KnowledgePointID: 203, Difficulty: 0.6, Content: model.QuestionContent{Question: "10s 做功100J，功率为？", Options: []string{"5W", "10W", "20W", "100W"}, Answer: "10W", Explanation: "P=W/t。"}},
		{ID: 2007, KnowledgePointID: 204, Difficulty: 0.7, Content: model.QuestionContent{Question: "动能表达式是？", Options: []string{"mv", "1/2mv", "1/2mv^2", "mv^2"}, Answer: "1/2mv^2", Explanation: "标准公式。"}},
		{ID: 2008, KnowledgePointID: 204, Difficulty: 0.8, Content: model.QuestionContent{Question: "外力做正功时，动能通常？", Options: []string{"减小", "不变", "增大", "变号"}, Answer: "增大", Explanation: "动能定理。"}},
		{ID: 2009, KnowledgePointID: 205, Difficulty: 0.5, Content: model.QuestionContent{Question: "欧姆定律表达式？", Options: []string{"U=IR", "P=UI", "W=Pt", "Q=cm△t"}, Answer: "U=IR", Explanation: "电路基础。"}},
		{ID: 2010, KnowledgePointID: 205, Difficulty: 0.6, Content: model.QuestionContent{Question: "串联电路电流特点？", Options: []string{"各处相等", "两端最大", "只在电源处有", "与电压成反比"}, Answer: "各处相等", Explanation: "串联电流相等。"}},
		{ID: 2011, KnowledgePointID: 206, Difficulty: 0.8, Content: model.QuestionContent{Question: "电功率单位是？", Options: []string{"A", "V", "W", "J"}, Answer: "W", Explanation: "瓦特。"}},
		{ID: 2012, KnowledgePointID: 206, Difficulty: 0.9, Content: model.QuestionContent{Question: "P=UI 中 U=220V,I=2A，P=?", Options: []string{"110W", "220W", "440W", "880W"}, Answer: "440W", Explanation: "相乘即可。"}},
	}
	for _, question := range questions {
		r.questions[question.ID] = question
	}
}

func (r *MemoryRepository) GetKnowledgePointsBySubject(subject string) []model.KnowledgePoint {
	r.mu.RLock()
	defer r.mu.RUnlock()

	points := make([]model.KnowledgePoint, 0)
	for _, point := range r.knowledgePoints {
		if point.Subject == subject {
			points = append(points, point)
		}
	}
	sort.Slice(points, func(i, j int) bool { return points[i].ID < points[j].ID })
	return points
}

func (r *MemoryRepository) GetKnowledgePoint(id int) (model.KnowledgePoint, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	point, ok := r.knowledgePoints[id]
	return point, ok
}

func (r *MemoryRepository) GetDependenciesBySubject(subject string) []model.KnowledgeDependency {
	r.mu.RLock()
	defer r.mu.RUnlock()
	deps := make([]model.KnowledgeDependency, 0)
	for _, dep := range r.dependencies {
		point, ok := r.knowledgePoints[dep.KnowledgeID]
		if !ok || point.Subject != subject {
			continue
		}
		deps = append(deps, dep)
	}
	return deps
}

func (r *MemoryRepository) GetQuestionsByKnowledgeIDs(knowledgeIDs []int) []model.Question {
	r.mu.RLock()
	defer r.mu.RUnlock()

	knowledgeSet := make(map[int]bool, len(knowledgeIDs))
	for _, knowledgeID := range knowledgeIDs {
		knowledgeSet[knowledgeID] = true
	}

	questions := make([]model.Question, 0)
	for _, question := range r.questions {
		if knowledgeSet[question.KnowledgePointID] {
			questions = append(questions, question)
		}
	}
	sort.Slice(questions, func(i, j int) bool { return questions[i].ID < questions[j].ID })
	return questions
}

func (r *MemoryRepository) GetQuestion(id int) (model.Question, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	question, ok := r.questions[id]
	return question, ok
}

func (r *MemoryRepository) CreateAssessmentSession(session model.AssessmentSession) model.AssessmentSession {
	r.mu.Lock()
	defer r.mu.Unlock()

	session.ID = r.nextSessionID
	r.nextSessionID++
	r.sessions[session.ID] = cloneSession(session)
	return cloneSession(session)
}

func (r *MemoryRepository) GetAssessmentSession(sessionID int) (model.AssessmentSession, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	session, ok := r.sessions[sessionID]
	if !ok {
		return model.AssessmentSession{}, false
	}
	return cloneSession(session), true
}

func (r *MemoryRepository) UpdateAssessmentSession(session model.AssessmentSession) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.sessions[session.ID] = cloneSession(session)
}

func (r *MemoryRepository) UpsertMastery(userID string, knowledgeID int, mastery float64, practicedAt time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.masteries[userID] == nil {
		r.masteries[userID] = make(map[int]model.KnowledgeMastery)
	}
	r.masteries[userID][knowledgeID] = model.KnowledgeMastery{
		UserID:          userID,
		KnowledgeID:     knowledgeID,
		MasteryLevel:    mastery,
		LastPracticedAt: practicedAt,
	}
}

func (r *MemoryRepository) GetMastery(userID string, knowledgeID int) (model.KnowledgeMastery, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	userMasteries, ok := r.masteries[userID]
	if !ok {
		return model.KnowledgeMastery{}, false
	}
	mastery, ok := userMasteries[knowledgeID]
	if !ok {
		return model.KnowledgeMastery{}, false
	}
	return mastery, true
}

func (r *MemoryRepository) ListMasteryByUserSubject(userID string, subject string) []model.KnowledgeMastery {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]model.KnowledgeMastery, 0)
	for knowledgeID, mastery := range r.masteries[userID] {
		point, ok := r.knowledgePoints[knowledgeID]
		if !ok || point.Subject != subject {
			continue
		}
		result = append(result, mastery)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].KnowledgeID < result[j].KnowledgeID })
	return result
}

func (r *MemoryRepository) SaveQuestionAttempt(attempt model.QuestionAttempt) model.QuestionAttempt {
	r.mu.Lock()
	defer r.mu.Unlock()

	attempt.ID = r.nextAttemptID
	r.nextAttemptID++
	r.attempts = append(r.attempts, attempt)
	return attempt
}

func (r *MemoryRepository) ListQuestionAttempts(userID string, knowledgeID int, since time.Time) []model.QuestionAttempt {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]model.QuestionAttempt, 0)
	for _, attempt := range r.attempts {
		if attempt.UserID != userID || attempt.KnowledgeID != knowledgeID {
			continue
		}
		if attempt.AnsweredAt.Before(since) {
			continue
		}
		result = append(result, attempt)
	}
	return result
}

func (r *MemoryRepository) GetLatestQuestionAttempt(userID string, knowledgeID int) (model.QuestionAttempt, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var latest model.QuestionAttempt
	found := false
	for _, attempt := range r.attempts {
		if attempt.UserID != userID || attempt.KnowledgeID != knowledgeID {
			continue
		}
		if !found || attempt.AnsweredAt.After(latest.AnsweredAt) {
			latest = attempt
			found = true
		}
	}
	return latest, found
}

func (r *MemoryRepository) CreateOrUpdateLearningPath(path model.LearningPath) model.LearningPath {
	r.mu.Lock()
	defer r.mu.Unlock()

	if path.ID == 0 {
		path.ID = r.nextPathID
		r.nextPathID++
	}
	if path.SkippedNodeIDs == nil {
		path.SkippedNodeIDs = make(map[int]bool)
	}
	path.UpdatedAt = time.Now().UTC()
	r.paths[path.ID] = clonePath(path)
	r.pathByUserSubject[userSubjectKey(path.UserID, path.Subject)] = path.ID
	return clonePath(path)
}

func (r *MemoryRepository) GetCurrentLearningPath(userID string, subject string) (model.LearningPath, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	pathID, ok := r.pathByUserSubject[userSubjectKey(userID, subject)]
	if !ok {
		return model.LearningPath{}, false
	}
	path, ok := r.paths[pathID]
	if !ok {
		return model.LearningPath{}, false
	}
	return clonePath(path), true
}

func (r *MemoryRepository) GetLearningPathByID(userID string, pathID int) (model.LearningPath, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	path, ok := r.paths[pathID]
	if !ok || path.UserID != userID {
		return model.LearningPath{}, false
	}
	return clonePath(path), true
}

func (r *MemoryRepository) UpdateLearningPath(path model.LearningPath) {
	r.mu.Lock()
	defer r.mu.Unlock()
	path.UpdatedAt = time.Now().UTC()
	r.paths[path.ID] = clonePath(path)
	r.pathByUserSubject[userSubjectKey(path.UserID, path.Subject)] = path.ID
}

func (r *MemoryRepository) SavePathState(state model.LearningPathState) {
	r.mu.Lock()
	defer r.mu.Unlock()
	state.UpdatedAt = time.Now().UTC()
	r.pathStates[pathStateKey(state.UserID, state.PathID)] = state
}

func (r *MemoryRepository) GetPathState(userID string, pathID int) model.LearningPathState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	state, ok := r.pathStates[pathStateKey(userID, pathID)]
	if !ok {
		return model.LearningPathState{UserID: userID, PathID: pathID, CorrectStreak: 0, WrongStreak: 0}
	}
	return state
}

func (r *MemoryRepository) SavePathAdjustmentEvent(event model.PathAdjustmentEvent) model.PathAdjustmentEvent {
	r.mu.Lock()
	defer r.mu.Unlock()
	event.ID = r.nextAdjustmentID
	r.nextAdjustmentID++
	r.pathAdjustments[event.PathID] = append(r.pathAdjustments[event.PathID], event)
	return event
}

func (r *MemoryRepository) ListPathAdjustmentEvents(pathID int) []model.PathAdjustmentEvent {
	r.mu.RLock()
	defer r.mu.RUnlock()
	events := append([]model.PathAdjustmentEvent(nil), r.pathAdjustments[pathID]...)
	sort.Slice(events, func(i, j int) bool { return events[i].CreatedAt.Before(events[j].CreatedAt) })
	return events
}

func (r *MemoryRepository) SaveHomeworkUpload(upload model.HomeworkUpload) model.HomeworkUpload {
	r.mu.Lock()
	defer r.mu.Unlock()
	upload.ID = r.nextUploadID
	r.nextUploadID++
	r.homeworkUploads[upload.ID] = upload
	return upload
}

func (r *MemoryRepository) SaveAssignment(assignment model.Assignment) model.Assignment {
	r.mu.Lock()
	defer r.mu.Unlock()
	assignment.ID = r.nextAssignmentID
	r.nextAssignmentID++
	r.assignments[assignment.ID] = assignment
	return assignment
}

func userSubjectKey(userID string, subject string) string {
	return userID + "|" + subject
}

func pathStateKey(userID string, pathID int) string {
	return fmt.Sprintf("%s|%d", userID, pathID)
}

func cloneSession(session model.AssessmentSession) model.AssessmentSession {
	copySession := session
	copySession.GoalKnowledgeIDs = append([]int(nil), session.GoalKnowledgeIDs...)
	copySession.QuestionIDs = append([]int(nil), session.QuestionIDs...)
	return copySession
}

func clonePath(path model.LearningPath) model.LearningPath {
	copyPath := path
	copyPath.GoalKnowledgeIDs = append([]int(nil), path.GoalKnowledgeIDs...)
	copyPath.KnowledgeSequence = append([]int(nil), path.KnowledgeSequence...)
	copyPath.SkippedNodeIDs = make(map[int]bool, len(path.SkippedNodeIDs))
	for key, value := range path.SkippedNodeIDs {
		copyPath.SkippedNodeIDs[key] = value
	}
	return copyPath
}
