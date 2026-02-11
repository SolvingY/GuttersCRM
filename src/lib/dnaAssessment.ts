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

export type AlignmentCategory = "High Performance" | "Mid Performance" | "Support" | "Low Fit";

export interface DNAResult {
  score: number;
  alignmentCategory: AlignmentCategory;
  recommendedRole: string;
  redFlags: string[];
}

const HIGH_PERFORMANCE_ROLES = ["Sales - Residential", "Sales - Commercial", "Sales - Gutters", "Canvassing", "Management"];

export function calculateDNAResult(
  answers: Record<string, "A" | "B">,
  desiredPosition: string
): DNAResult {
  // Count B answers
  let score = 0;
  for (let i = 1; i <= 20; i++) {
    if (answers[`q${i}`] === "B") score++;
  }

  // Determine alignment category
  let alignmentCategory: AlignmentCategory;
  if (score >= 16) alignmentCategory = "High Performance";
  else if (score >= 11) alignmentCategory = "Mid Performance";
  else if (score >= 6) alignmentCategory = "Support";
  else alignmentCategory = "Low Fit";

  // Determine recommended role
  let recommendedRole: string;
  if (score >= 16) recommendedRole = "Sales, Canvassing, or Management";
  else if (score >= 11) recommendedRole = "Production, Service, or Sales (with training)";
  else if (score >= 6) recommendedRole = "Admin or Production (supervised)";
  else recommendedRole = "Not recommended — additional screening needed";

  // Red flags
  const redFlags: string[] = [];
  if (score < 6) redFlags.push("Low Cultural Fit");
  if (HIGH_PERFORMANCE_ROLES.includes(desiredPosition) && score < 11) {
    redFlags.push("Role Mismatch — desired role requires higher alignment score");
  }
  if (answers.q4 === "A") redFlags.push("External blame mindset");
  if (answers.q8 === "A") redFlags.push("Resistant to coaching");
  if (answers.q20 === "A") redFlags.push("Not aligned with excellence standard");

  return { score, alignmentCategory, recommendedRole, redFlags };
}

export function getAlignmentStars(category: AlignmentCategory): number {
  switch (category) {
    case "High Performance": return 5;
    case "Mid Performance": return 4;
    case "Support": return 3;
    case "Low Fit": return 1;
  }
}

export function getScoreColor(score: number): string {
  if (score >= 16) return "text-green-600";
  if (score >= 11) return "text-yellow-600";
  if (score >= 6) return "text-orange-500";
  return "text-red-600";
}

export function getScoreBarColor(score: number): string {
  if (score >= 16) return "bg-green-500";
  if (score >= 11) return "bg-yellow-500";
  if (score >= 6) return "bg-orange-500";
  return "bg-red-500";
}

export function getCategoryScore(
  answers: Record<string, "A" | "B">,
  category: DNACategory
): { earned: number; total: number } {
  let earned = 0;
  for (const qId of category.questionIds) {
    if (answers[qId] === "B") earned++;
  }
  return { earned, total: category.questionIds.length };
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
