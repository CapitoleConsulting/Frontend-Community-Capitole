const fs = require("fs");

const POINTS_FILE = "community-points.json";
const LEADERBOARD_FILE = "leaderboard.md";
const README_FILE = "README.md";
const HOME_FILE = "src/content/docs/index.mdx";

const githubToken = process.env.GITHUB_TOKEN;
const prAuthor = process.env.PR_AUTHOR;
const prNumber = process.env.PR_NUMBER;
const prTitle = process.env.PR_TITLE;
const prUrl = process.env.PR_URL;
const labels = JSON.parse(process.env.PR_LABELS || "[]").map((l) => l.name);

const pointsMap = {
  // 📚 Documentación
  "points:doc-small": 10,
  "points:doc-onboarding": 40,
  "points:doc-architecture": 70,
  "points:doc-reference": 120,

  // ✍️ Artículos técnicos
  "points:article-short": 40,
  "points:article-medium": 70,
  "points:article-deep": 120,

  // 🧩 Contribuciones al repositorio (PR)
  "points:fix-doc": 5,
  "points:small-improvement": 10,
  "points:guide-pattern": 25,
  "points:technical-example": 35,
  "points:refactor-major": 50,
  "points:tooling-minor": 80,
  "points:tooling-major": 120,

  // 🎤 Charlas y workshops
  "points:talk-lightning": 80,
  "points:talk-standard": 150,
  "points:workshop-technical": 220,
  "points:workshop-full": 300,

  // 🤝 Ayuda a juniors / mentoría
  "points:help-quick": 10,
  "points:help-session": 25,
  "points:help-mentoring": 40,
  "points:help-recurring": 60,
  "points:help-critical": 80,

  // 👥 Participación en eventos
  "points:event-attendance": 5,
  "points:event-participation": 10,
  "points:event-questions": 15,
  "points:event-feedback": 20,

  // 🧪 PoCs y experimentos
  "points:poc-idea": 15,
  "points:poc-functional": 50,
  "points:poc-advanced": 90,
  "points:poc-adopted": 150,

  // 🏅 Bonus artículos
  "bonus:article-code": 10,
  "bonus:article-diagrams": 10,
  "bonus:article-comparison": 15,
  "bonus:community-valued": 20,

  // 🏅 Bonus PRs
  "bonus:no-changes": 10,
  "bonus:multi-framework": 15,
  "bonus:community-used": 20,

  // 🏅 Bonus charlas
  "bonus:talk-live-demo": 20,
  "bonus:talk-material": 20,
  "bonus:talk-recorded": 25,
  "bonus:talk-feedback": 30,

  // 🏅 Bonus mentoría
  "bonus:help-feedback": 15,
  "bonus:help-consistent": 20,

  // 🔥 Bonus consistencia (se aplican manualmente)
  "bonus:streak-3weeks": 40,
  "bonus:streak-2months": 100,
};

function getRank(points) {
  if (points >= 3000) return "Frontend Legend";
  if (points >= 1500) return "Frontend Champion";
  if (points >= 700) return "Community Builder";
  if (points >= 300) return "Advanced Contributor";
  if (points >= 100) return "Contributor";
  return "Rookie";
}

async function fetchGitHubName(username) {
  try {
    const headers = { "User-Agent": "Frontend-Community-Points-Bot" };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;
    const response = await fetch(`https://api.github.com/users/${username}`, { headers });
    if (!response.ok) return null;
    const userData = await response.json();
    return userData.name || null;
  } catch {
    return null;
  }
}

function generateLeaderboardMarkdown(data) {
  const rows = Object.entries(data.users)
    .sort((a, b) => b[1].points - a[1].points)
    .map(([user, info], index) => {
      const displayName = info.name || user;
      return `| ${index + 1} | ${displayName} | ${info.points} | ${info.rank} |`;
    })
    .join("\n");

  return `| Position | User | Points | Rank |
|---:|---|---:|---|
${rows}

_Last updated: ${new Date().toISOString()}_`;
}

function replaceBlock(filePath, content) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}. Skipping.`);
    return;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");

  const isMdx = filePath.endsWith(".mdx");

  const start = isMdx
    ? "{/* LEADERBOARD:START */}"
    : "<!-- LEADERBOARD:START -->";

  const end = isMdx
    ? "{/* LEADERBOARD:END */}"
    : "<!-- LEADERBOARD:END -->";

  if (!fileContent.includes(start) || !fileContent.includes(end)) {
    console.log(`Leaderboard markers not found in ${filePath}. Skipping.`);
    return;
  }

  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const updatedContent = fileContent.replace(
    new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`),
    `${start}\n\n${content}\n\n${end}`
  );

  fs.writeFileSync(filePath, updatedContent);
}

(async () => {

let basePoints = 0;

for (const label of labels) {
  if (pointsMap[label]) {
    basePoints += pointsMap[label];
  }
}

if (labels.includes("penalty:low-effort")) {
  basePoints = Math.floor(basePoints * 0.5);
}

const data = fs.existsSync(POINTS_FILE)
  ? JSON.parse(fs.readFileSync(POINTS_FILE, "utf8"))
  : { users: {}, history: [] };

const resolvedKey =
  Object.keys(data.users).find(
    (key) => data.users[key].githubUsername === prAuthor
  ) || prAuthor;

if (!data.users[resolvedKey]) {
  data.users[resolvedKey] = {
    points: 0,
    rank: "Rookie",
  };
}

for (const [key, userInfo] of Object.entries(data.users)) {
  const githubUser = userInfo.githubUsername || key;
  const name = await fetchGitHubName(githubUser);
  if (name) userInfo.name = name;
}

if (basePoints <= 0) {
  console.log("No points labels found. Regenerating leaderboard only.");
} else {
  const alreadyAwarded = data.history.some((entry) => entry.prNumber === prNumber);

  if (alreadyAwarded) {
    console.log(`PR #${prNumber} already awarded. Regenerating leaderboard only.`);
  } else {
    data.users[resolvedKey].points += basePoints;
    data.users[resolvedKey].rank = getRank(data.users[resolvedKey].points);

    data.history.push({
      prNumber,
      prTitle,
      prUrl,
      author: resolvedKey,
      labels,
      points: basePoints,
      date: new Date().toISOString(),
    });

    fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 2));
    console.log(`Awarded ${basePoints} points to ${resolvedKey}`);
  }
}

const leaderboardMarkdown = generateLeaderboardMarkdown(data);

const fullLeaderboard = `# Frontend Community Leaderboard

${leaderboardMarkdown}
`;

fs.writeFileSync(LEADERBOARD_FILE, fullLeaderboard);

replaceBlock(README_FILE, leaderboardMarkdown);
replaceBlock(HOME_FILE, leaderboardMarkdown);

})();