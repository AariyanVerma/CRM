const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dirs = ["app", "components", "lib", "hooks", "prisma", "types", "scripts"];
const exts = [".ts", ".tsx", ".js", ".jsx", ".css"];

function stripBlockComments(str) {
  return str.replace(/\/\*[\s\S]*?\*\
}

function stripLineComments(str) {
  return str.replace(/^\s*\/\/.*$/gm, "");
}

function stripTrailingInlineComment(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("//")) return line;
  const idx = line.indexOf("//");
  if (idx === -1) return line;
  const before = line.slice(0, idx);
  if (/https?:$/i.test(before.trimEnd())) return line;
  const inString = (before.match(/['"`]/g) || []).length % 2 !== 0;
  if (inString) return line;
  return before.replace(/\s+$/, "");
}

function stripComments(content, ext) {
  let out = content;
  if (ext !== ".css") {
    out = stripBlockComments(out);
    out = stripLineComments(out);
    out = out
      .split("\n")
      .map((line) => stripTrailingInlineComment(line))
      .join("\n");
  } else {
    out = stripBlockComments(out);
  }
  return out.replace(/\n{3,}/g, "\n\n");
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== ".next") walk(full, files);
    } else if (exts.some((ext) => e.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

let files = [];
for (const d of dirs) {
  const dir = path.join(root, d);
  files = files.concat(walk(dir));
}
files = [...new Set(files)];

let count = 0;
for (const file of files) {
  const ext = path.extname(file);
  const content = fs.readFileSync(file, "utf8");
  const next = stripComments(content, ext);
  if (next !== content) {
    fs.writeFileSync(file, next, "utf8");
    count++;
    console.log(file.replace(root + path.sep, ""));
  }
}
console.log("Stripped comments from " + count + " files.");
