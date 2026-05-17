const fs = require("fs")
const path = require("path")

function walk(dir) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const fullPath = path.join(dir, file)
    if (file === "node_modules" || file === ".next" || file === ".git") return
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath))
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
      results.push(fullPath)
    }
  })
  return results
}

const appsWebDir = "e:/capture-screen-recorder/apps/web"
const files = walk(appsWebDir)

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8")

  // Replace lib/utils
  content = content.replace(
    /["']@\/lib\/utils["']/g,
    '"@workspace/ui/lib/utils"'
  )

  // Replace components/ui/ with @workspace/ui/components/
  content = content.replace(
    /["']@\/components\/ui\/([^"']+)["']/g,
    (match, p1) => {
      return '"@workspace/ui/components/' + p1 + '"'
    }
  )

  fs.writeFileSync(file, content)
})

console.log(
  "Finished refactoring " +
    files.length +
    " files to use @workspace/ui components."
)
