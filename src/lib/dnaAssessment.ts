export interface DNAQuestion {
  id: string;
  number: number;
  topic: string;
  optionA: string;
  optionB: string;
  category: string;
}

export interface DNACategory {
  name: string;
  questionIds: string[];
}

export const QUESTION_WEIGHTS: Record<string, number> = {
  q1: 1, q2: 2, q3: 2, q4: 3, q5: 1,
  q6: 1, q7: 1, q8: 3, q9: 1, q10: 2,
  q11: 1, q12: 1, q13: 1, q14: 1, q15: 2,
  q16: 1, q17: 0, q18: 1, q19: 2, q20: 3,
};

export const MAX_SCORE = 30;

export const CATEGORY_MAXES: Record<string, number> = {
  "Performance Mindset": 9,
  "Consistency & Commitment": 3,
  "Coaching & Growth": 8,
  "Teamwork & Culture": 5,
  "Leadership Potential": 5,
};

export const dnaCategories: DNACategory[] = [
  {
    name: "Performance Mindset",
    questionIds: ["q1", "q2", "q3", "q4", "q5"],
  },
  {
    name: "Consistency & Commitment",
    questionIds: ["q6", "q13", "q14", "q17"],
  },
  {
    name: "Coaching & Growth",
    questionIds: ["q7", "q8", "q12", "q15", "q18"],
  },
  {
    name: "Teamwork & Culture",
    questionIds: ["q9", "q10", "q11", "q16"],
  },
  {
    name: "Leadership Potential",
    questionIds: ["q19", "q20"],
  },
];

export const dnaQuestions: DNAQuestion[] = [
  {
    id: "q1",
    number: 1,
    topic: "On Performance",
    optionA: "I prefer a steady, predictable environment where my tasks are the same every day.",
    optionB: "I thrive in a high-speed environment where my effort directly determines my rewards.",
    category: "Performance Mindset",
  },
  {
    id: "q2",
    number: 2,
    topic: "On Roadblocks",
    optionA: "When I hit a wall, I step back and wait for the situation to calm down.",
    optionB: 'When I hit a wall, I get aggressive about finding a way over, under, or through it.',
    category: "Performance Mindset",
  },
  {
    id: "q3",
    number: 3,
    topic: "On Feedback",
    optionA: "I value a workspace where feedback is handled with extreme sensitivity.",
    optionB: 'I want the "brutal truth" immediately so I can stop making mistakes and win.',
    category: "Performance Mindset",
  },
  {
    id: "q4",
    number: 4,
    topic: "On Accountability",
    optionA: "If I miss a goal, I can clearly explain the outside factors that caused the failure.",
    optionB: "If I miss a goal, I take the blame entirely and look at how I can change my process.",
    category: "Performance Mindset",
  },
  {
    id: "q5",
    number: 5,
    topic: "On Preparation",
    optionA: "I show up on time and ready to be told what the priority is for the day.",
    optionB: "I show up early with my own plan already made so I don't waste a minute.",
    category: "Performance Mindset",
  },
  {
    id: "q6",
    number: 6,
    topic: "On Consistency",
    optionA: 'My energy levels naturally go up and down based on the "vibe" of the office.',
    optionB: "I bring the same high intensity every single day, regardless of how I feel.",
    category: "Consistency & Commitment",
  },
  {
    id: "q7",
    number: 7,
    topic: "On Problem Solving",
    optionA: 'I feel most secure when a manager gives me a step-by-step "How-To" guide.',
    optionB: "I enjoy the challenge of figuring things out on my own when the answer isn't obvious.",
    category: "Coaching & Growth",
  },
  {
    id: "q8",
    number: 8,
    topic: "On Coaching",
    optionA: "I have a system that works for me and I prefer to stick to it.",
    optionB: "I am constantly looking for a better way to do things and love being coached.",
    category: "Coaching & Growth",
  },
  {
    id: "q9",
    number: 9,
    topic: "On Teamwork",
    optionA: 'I am a "silo" worker—I do my job perfectly and expect others to do theirs.',
    optionB: 'I am a "gap" worker—if I see a teammate struggling, I jump in to help without being asked.',
    category: "Teamwork & Culture",
  },
  {
    id: "q10",
    number: 10,
    topic: "On Communication",
    optionA: "I prefer to wait until I've fixed a problem before telling my supervisor about it.",
    optionB: "I flag issues the second they happen so there are no surprises for my team.",
    category: "Teamwork & Culture",
  },
  {
    id: "q11",
    number: 11,
    topic: "On Workplace Culture",
    optionA: "I enjoy a workplace where everyone gets along and avoids difficult conversations.",
    optionB: "I prefer a culture where we hold each other to a high standard, even if it's uncomfortable.",
    category: "Teamwork & Culture",
  },
  {
    id: "q12",
    number: 12,
    topic: "On Initiative",
    optionA: "I am a great listener who follows instructions to the letter.",
    optionB: "I am a self-starter who looks for work to do when my main tasks are finished.",
    category: "Coaching & Growth",
  },
  {
    id: "q13",
    number: 13,
    topic: "On Commitment",
    optionA: 'I prioritize a strict "9-to-5" schedule to maintain my personal life.',
    optionB: "I am willing to stay until the job is done, because the mission comes first.",
    category: "Consistency & Commitment",
  },
  {
    id: "q14",
    number: 14,
    topic: "On Trust",
    optionA: "I believe trust is earned slowly over a long period of time.",
    optionB: "I believe reliability is the foundation of trust; if I say I'll do it, it's as good as done.",
    category: "Consistency & Commitment",
  },
  {
    id: "q15",
    number: 15,
    topic: "On Mistakes",
    optionA: "I am very careful to avoid making mistakes so I don't look incompetent.",
    optionB: "I own my mistakes loudly and immediately so the team can learn from them.",
    category: "Coaching & Growth",
  },
  {
    id: "q16",
    number: 16,
    topic: "On Reputation",
    optionA: "It is important to me that my coworkers like me personally.",
    optionB: "It is important to me that my coworkers respect my work ethic and results.",
    category: "Teamwork & Culture",
  },
  {
    id: "q17",
    number: 17,
    topic: "On Pace",
    optionA: "I work best when I can focus on one single task for a long time.",
    optionB: 'I work best when I have multiple projects moving at once; I like the "chaos."',
    category: "Consistency & Commitment",
  },
  {
    id: "q18",
    number: 18,
    topic: "On Motivation",
    optionA: "I am motivated by stability and knowing my job is safe.",
    optionB: "I am motivated by growth and seeing how far I can climb in a company.",
    category: "Coaching & Growth",
  },
  {
    id: "q19",
    number: 19,
    topic: "On Leadership",
    optionA: 'I am happy being a high-level "player" who supports the leaders.',
    optionB: "I want to set the pace and eventually lead others to hit bigger goals.",
    category: "Leadership Potential",
  },
  {
    id: "q20",
    number: 20,
    topic: "On NGR Fit",
    optionA: "I am looking for a job where I can do good work and get a fair paycheck.",
    optionB: 'I am looking for a "home" where excellence is the only acceptable standard.',
    category: "Leadership Potential",
  },
];

export type AlignmentCategory = "Excellent Fit" | "Strong Fit" | "Moderate Fit" | "Marginal Fit" | "Low Fit";

export interface DNAResult {
  score: number;
  alignmentCategory: AlignmentCategory;
  recommendedRole: string;
  redFlags: string[];
  positiveIndicators: string[];
}

const HIGH_PERFORMANCE_ROLES = ["Sales - Residential", "Sales - Commercial", "Sales - Gutters", "Canvassing", "Management"];

export function getQuestionWeight(qId: string): number {
  return QUESTION_WEIGHTS[qId] ?? 0;
}

export function getQuestionWeightLabel(qId: string): string {
  const w = QUESTION_WEIGHTS[qId];
  if (w === 3) return "CRITICAL - 3 pts";
  if (w === 2) return "2 pts";
  if (w === 0) return "Informational";
  return "1 pt";
}

export function getPositiveIndicators(answers: Record<string, "A" | "B">): string[] {
  const indicators: string[] = [];

  if (answers.q4 === "B" && answers.q8 === "B" && answers.q20 === "B") {
    indicators.push("Strong cultural alignment");
  }
  if (answers.q2 === "B" && answers.q10 === "B" && answers.q15 === "B") {
    indicators.push("Exceptional accountability");
  }
  if (answers.q8 === "B" && answers.q12 === "B" && answers.q18 === "B") {
    indicators.push("Growth-oriented mindset");
  }

  let score = 0;
  for (let i = 1; i <= 20; i++) {
    if (answers[`q${i}`] === "B") score += QUESTION_WEIGHTS[`q${i}`];
  }
  if (score >= 24) {
    indicators.push("Elite performer profile");
  }

  return indicators;
}

export function calculateDNAResult(
  answers: Record<string, "A" | "B">,
  desiredPosition: string
): DNAResult {
  // Weighted scoring
  let score = 0;
  for (let i = 1; i <= 20; i++) {
    if (answers[`q${i}`] === "B") {
      score += QUESTION_WEIGHTS[`q${i}`];
    }
  }

  // Determine alignment category
  let alignmentCategory: AlignmentCategory;
  if (score >= 24) alignmentCategory = "Excellent Fit";
  else if (score >= 18) alignmentCategory = "Strong Fit";
  else if (score >= 12) alignmentCategory = "Moderate Fit";
  else if (score >= 6) alignmentCategory = "Marginal Fit";
  else alignmentCategory = "Low Fit";

  // Determine recommended role
  let recommendedRole: string;
  if (score >= 24) recommendedRole = "Sales, Canvassing, or Management";
  else if (score >= 18) recommendedRole = "Sales or Canvassing (with training)";
  else if (score >= 12) recommendedRole = "Production, Service, or Admin";
  else if (score >= 6) recommendedRole = "Admin or Production (supervised)";
  else recommendedRole = "Not recommended — additional screening needed";

  // Red flags
  const redFlags: string[] = [];
  if (score < 12) redFlags.push("Low Cultural Fit");
  if (HIGH_PERFORMANCE_ROLES.includes(desiredPosition) && score < 18) {
    redFlags.push("Role Mismatch — desired role requires higher alignment score");
  }

  let criticalCount = 0;
  if (answers.q4 === "A") {
    redFlags.push("External blame mindset (CRITICAL)");
    criticalCount++;
  }
  if (answers.q8 === "A") {
    redFlags.push("Resistant to coaching (CRITICAL)");
    criticalCount++;
  }
  if (answers.q20 === "A") {
    redFlags.push("Not aligned with excellence standard (CRITICAL)");
    criticalCount++;
  }
  if (criticalCount >= 2) {
    redFlags.push("Multiple critical concerns");
  }

  if (desiredPosition.includes("Sales") && answers.q2 === "A" && answers.q3 === "A") {
    redFlags.push("May struggle with rejection and feedback");
  }

  if (desiredPosition === "Admin" && score > 24) {
    redFlags.push("Consider sales/leadership roles — higher potential");
  }

  // Positive indicators
  const positiveIndicators = getPositiveIndicators(answers);

  return { score, alignmentCategory, recommendedRole, redFlags, positiveIndicators };
}

export function getAlignmentStars(category: AlignmentCategory): number {
  switch (category) {
    case "Excellent Fit": return 5;
    case "Strong Fit": return 4;
    case "Moderate Fit": return 3;
    case "Marginal Fit": return 2;
    case "Low Fit": return 1;
  }
}

export function getScoreColor(score: number): string {
  if (score >= 24) return "text-green-600";
  if (score >= 18) return "text-yellow-600";
  if (score >= 12) return "text-orange-500";
  return "text-red-600";
}

export function getScoreBarColor(score: number): string {
  if (score >= 24) return "bg-green-500";
  if (score >= 18) return "bg-yellow-500";
  if (score >= 12) return "bg-orange-500";
  return "bg-red-500";
}

export function getCategoryScore(
  answers: Record<string, "A" | "B">,
  category: DNACategory
): { earned: number; total: number } {
  let earned = 0;
  let total = 0;
  for (const qId of category.questionIds) {
    const weight = QUESTION_WEIGHTS[qId];
    total += weight;
    if (answers[qId] === "B") earned += weight;
  }
  return { earned, total };
}

export const desiredPositions = [
  "Sales - Residential",
  "Sales - Commercial",
  "Sales - Gutters",
  "Canvassing",
  "Admin",
  "Management",
  "Production",
  "Service",
];

export const experienceOptions = ["0-1 years", "2-5 years", "5-10 years", "10+ years"];
export const availabilityOptions = ["Immediate", "2 Weeks", "1 Month"];
