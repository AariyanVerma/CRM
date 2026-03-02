import fs from "fs"
import path from "path"

const stripComments = require("strip-comments") as (input: string) => string

const ROOT = path.resolve(__dirname, "..")

const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  ".idea",
  ".vscode",
  "dist",
  "build",
])

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])

function walkAndStrip(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkAndStrip(path.join(dir, entry.name))
      }
      continue
    }
    const ext = path.extname(entry.name)
    if (!EXTENSIONS.has(ext)) continue

    const filePath = path.join(dir, entry.name)
    const original = fs.readFileSync(filePath, "utf8")
    const stripped = stripComments(original)
    if (stripped !== original) {
      fs.writeFileSync(filePath, stripped, "utf8")
      console.log("Stripped comments from", path.relative(ROOT, filePath))
    }
  }
}

walkAndStrip(ROOT)

