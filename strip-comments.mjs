import fs from "fs"
import path from "path"

const exts = new Set([".ts", ".tsx", ".js", ".jsx"])

function stripCommentsInCode(code) {
  let out = ""
  let i = 0
  const n = code.length
  const peek = (k = 0) => (i + k < n ? code[i + k] : "")

  let inSingle = false
  let inDouble = false
  let inTemplate = false

  while (i < n) {
    const ch = code[i]
    const next = peek(1)

    if (!inSingle && !inDouble && !inTemplate && ch === "/" && next === "/") {
      while (i < n && code[i] !== "\n") i++
      continue
    }

    if (!inSingle && !inDouble && !inTemplate && ch === "/" && next === "*") {
      i += 2
      while (i < n && !(code[i] === "*" && peek(1) === "/")) i++
      if (i < n) i += 2
      continue
    }

    if (!inDouble && !inTemplate && ch === "'" && code[i - 1] !== "\\") {
      inSingle = !inSingle
      out += ch
      i++
      continue
    }
    if (!inSingle && !inTemplate && ch === '"' && code[i - 1] !== "\\") {
      inDouble = !inDouble
      out += ch
      i++
      continue
    }
    if (!inSingle && !inDouble && ch === "`" && code[i - 1] !== "\\") {
      inTemplate = !inTemplate
      out += ch
      i++
      continue
    }

    out += ch
    i++
  }

  return out
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
    } else {
      const ext = path.extname(entry.name)
      if (!exts.has(ext)) continue
      const src = fs.readFileSync(full, "utf8")
      const stripped = stripCommentsInCode(src)
      if (stripped !== src) {
        fs.writeFileSync(full, stripped, "utf8")
      }
    }
  }
}

const root = process.cwd()
walk(root)
console.log("Comments stripped from TS/TSX/JS files.")

