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
  { quote: "The best time to make a sale was yesterday. The second best time is now.", author: "Unknown" },
  { quote: "In sales, a referral is the key to the door of resistance.", author: "Bo Bennett" },
  { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { quote: "Every no brings you closer to a yes.", author: "Unknown" },
  { quote: "Approach each customer with the idea of helping them solve a problem.", author: "Brian Tracy" },
  { quote: "Make a customer, not a sale.", author: "Katherine Barchetti" },
  { quote: "The secret of selling is to be a trusted advisor.", author: "Unknown" },
  { quote: "Motivation will almost always beat mere talent.", author: "Norman Ralph Augustine" },
  { quote: "Quality performance starts with a positive attitude.", author: "Jeffrey Gitomer" },
  { quote: "You don't close a sale, you open a relationship.", author: "Patricia Fripp" },
  { quote: "Pretend everyone you meet has a sign around their neck that says 'Make me feel important.'", author: "Mary Kay Ash" },
  { quote: "If you are not taking care of your customer, your competitor will.", author: "Bob Hooey" },
  { quote: "It's not about having the right opportunities. It's about handling the opportunities right.", author: "Mark Hunter" },
  { quote: "Sales is not about selling anymore, but about building trust.", author: "Siva Devaki" },
  { quote: "Stop selling. Start helping.", author: "Zig Ziglar" },
  { quote: "The sale begins when the customer says no.", author: "Elmer G. Letterman" },
  { quote: "If people like you, they'll listen to you, but if they trust you, they'll do business with you.", author: "Zig Ziglar" },
  { quote: "Our greatest weakness lies in giving up. The most certain way to succeed is to try just one more time.", author: "Thomas Edison" },
];

export function getRandomQuote() {
  const index = Math.floor(Math.random() * motivationalQuotes.length);
  return motivationalQuotes[index];
}
