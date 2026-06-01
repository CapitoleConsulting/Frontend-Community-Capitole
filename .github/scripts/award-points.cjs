const fs = require("fs");

const POINTS_FILE = "community-points.json";
const LEADERBOARD_FILE = "leaderboard.md";

const prAuthor = process.env.PR_AUTHOR;
const prNumber = process.env.PR_NUMBER;
const prTitle = process.env.PR_TITLE;
const prUrl = process.env.PR_URL;
const labels = JSON.parse(process.env.PR_LABELS || "[]").map((l) => l.name);

const pointsMap = {
  "points:doc-small": 10,
  "points:doc-onboarding": 40,
  "points:doc-architecture": 70,
  "points:doc-reference": 120,

  "points:fix-doc": 5,
  "points:small-improvement": 10,
  "points:guide-pattern": 25,
  "points:technical-example": 35,
  "points:refactor-major": 50,
  "points:tooling": 100,

  "bonus:no-changes": 10,
  "bonus:multi-framework": 15,
  "bonus:community-used": 20,
};

function getRank(points) {
  if (points >= 3000) return "Frontend Legend";
  if (points >= 1500) return "Frontend Champion";
  if (points >= 700) return "Community Builder";
  if (points >= 300) return "Advanced Contributor";
  if (points >= 100) return "Contributor";
  return "Rookie";
}

let basePoints = 0;

for (const label of labels) {
  if (pointsMap[label]) {
    basePoints += pointsMap[label];
  }
}

if (labels.includes("penalty:low-effort")) {
  basePoints = Math.floor(basePoints * 0.5);
}

if (basePoints <= 0) {
  console.log("No points labels found. Nothing to award.");
  process.exit(0);
}

const data = fs.existsSync(POINTS_FILE)
  ? JSON.parse(fs.readFileSync(POINTS_FILE, "utf8"))
  : { users: {}, history: [] };

if (!data.users[prAuthor]) {
  data.users[prAuthor] = {
    points: 0,
    rank: "Rookie",
  };
}

const alreadyAwarded = data.history.some((entry) => entry.prNumber === prNumber);

if (alreadyAwarded) {
  console.log(`PR #${prNumber} already awarded. Skipping.`);
  process.exit(0);
}

data.users[prAuthor].points += basePoints;
data.users[prAuthor].rank = getRank(data.users[prAuthor].points);

data.history.push({
  prNumber,
  prTitle,
  prUrl,
  author: prAuthor,
  labels,
  points: basePoints,
  date: new Date().toISOString(),
});

fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 2));

const leaderboardRows = Object.entries(data.users)
  .sort((a, b) => b[1].points - a[1].points)
  .map(([user, info], index) => {
    return `| ${index + 1} | @${user} | ${info.points} | ${info.rank} |`;
  })
  .join("\n");

const leaderboard = `# Frontend Community Leaderboard

| Posición | Usuario | Puntos | Rango |
|---:|---|---:|---|
${leaderboardRows}

_Last updated: ${new Date().toISOString()}_
`;

fs.writeFileSync(LEADERBOARD_FILE, leaderboard);

console.log(`Awarded ${basePoints} points to ${prAuthor}`);
