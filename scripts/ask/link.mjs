// Ask your library, in a Claude session: turns a question and a lookup
// (the shape in src/lib/ask.ts) into a link to its answer page, where
// Alexandra can see the answer and pin it.
//   node scripts/ask/link.mjs "Which horror haven't I read?" '{"v":1,"status":["unread"],"where":[{"field":"genre","any":["Horror"]}],"show":{"kind":"list"}}'
const [question, json] = process.argv.slice(2);
const lookup = JSON.parse(json);
const base = process.env.APP_URL ?? "https://home-library-mocha.vercel.app";
console.log(`${base}/ask?q=${encodeURIComponent(question)}&l=${encodeURIComponent(JSON.stringify(lookup))}`);
