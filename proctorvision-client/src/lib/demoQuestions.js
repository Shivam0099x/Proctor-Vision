// Fixed demo question bank — one set per exam session
// Answer is `correctIndex` (0-based). Not sent to backend; graded locally.

export const DEMO_QUESTIONS = [
  {
    id: "q1",
    question: "What is the value of 2² + 3²?",
    options: ["10", "13", "5", "25"],
    correctIndex: 1, // 13
  },
  {
    id: "q2",
    question: "If a train travels 60 km in 45 minutes, its speed in km/h is:",
    options: ["60", "75", "80", "90"],
    correctIndex: 2, // 80
  },
  {
    id: "q3",
    question: "Simplify: (x² − 4) / (x − 2)",
    options: ["x + 2", "x − 2", "x²", "2"],
    correctIndex: 0, // x + 2
  },
  {
    id: "q4",
    question: "Which of these is a prime number?",
    options: ["21", "27", "29", "33"],
    correctIndex: 2, // 29
  },
  {
    id: "q5",
    question: "The sum of angles in a triangle is:",
    options: ["90°", "180°", "270°", "360°"],
    correctIndex: 1, // 180
  },
];

// localStorage key — scoped per attempt so a re-take is a fresh set of answers
export const answersStorageKey = (attemptId) => `pv_answers_${attemptId}`;

export const loadAnswers = (attemptId) => {
  try {
    const raw = localStorage.getItem(answersStorageKey(attemptId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveAnswers = (attemptId, answers) => {
  try {
    localStorage.setItem(answersStorageKey(attemptId), JSON.stringify(answers));
  } catch {}
};

export const clearAnswers = (attemptId) => {
  try {
    localStorage.removeItem(answersStorageKey(attemptId));
  } catch {}
};

// Grade a { qId: optionIndex } map against DEMO_QUESTIONS
export const gradeAnswers = (answers) => {
  let correct = 0;
  let answered = 0;
  DEMO_QUESTIONS.forEach((q) => {
    const picked = answers[q.id];
    if (picked !== undefined && picked !== null) {
      answered += 1;
      if (picked === q.correctIndex) correct += 1;
    }
  });
  return { correct, answered, total: DEMO_QUESTIONS.length };
};