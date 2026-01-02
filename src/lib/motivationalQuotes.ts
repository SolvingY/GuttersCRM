export const motivationalQuotes = [
  { quote: "Every sale begins with a conversation.", author: "Unknown" },
  { quote: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
  { quote: "The harder you work, the luckier you get.", author: "Gary Player" },
  { quote: "Closing is not just a skill, it's a mindset.", author: "Grant Cardone" },
  { quote: "Be so good they can't ignore you.", author: "Steve Martin" },
  { quote: "Your only limit is the amount of action you take.", author: "Unknown" },
  { quote: "Top performers never wait for motivation.", author: "Unknown" },
  { quote: "The fortune is in the follow-up.", author: "Jim Rohn" },
  { quote: "Winners are not people who never fail, but people who never quit.", author: "Unknown" },
  { quote: "The difference between try and triumph is just a little umph!", author: "Marvin Phillips" },
  { quote: "Sales are contingent upon the attitude of the salesman, not the attitude of the prospect.", author: "W. Clement Stone" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
];

export function getRandomQuote() {
  const index = Math.floor(Math.random() * motivationalQuotes.length);
  return motivationalQuotes[index];
}
