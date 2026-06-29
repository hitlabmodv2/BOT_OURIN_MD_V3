import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { logger, chalk } from "./ourin-logger.js";

const execFileAsync = promisify(execFile);

async function checkFileSyntax(filePath) {
  try {
    const code = fs.readFileSync(filePath, "utf-8");
    await execFileAsync(process.execPath, ["--input-type=module", "--check"], {
      input: code,
      timeout: 5000,
    });
    return null;
  } catch (err) {
    const msg = (err.stderr || err.message || "").split("\n")[0].trim();
    return { file: filePath, error: msg };
  }
}

async function runBatch(tasks, concurrency = 20) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

function collectPluginFiles(pluginsDir) {
  const files = [];
  if (!fs.existsSync(pluginsDir)) return files;
  for (const cat of fs.readdirSync(pluginsDir)) {
    const catPath = path.join(pluginsDir, cat);
    if (fs.statSync(catPath).isDirectory()) {
      for (const file of fs.readdirSync(catPath)) {
        if (file.endsWith(".js") && !file.startsWith("_")) {
          files.push(path.join(catPath, file));
        }
      }
    } else if (cat.endsWith(".js") && !cat.startsWith("_")) {
      files.push(catPath);
    }
  }
  return files;
}

function collectFlatFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".js") && !file.startsWith("_")) {
      files.push(path.join(dir, file));
    }
  }
  return files;
}

function printBrokenBox(label, broken) {
  const cGray = chalk.gray;
  const cRed = chalk.redBright;
  const cYellow = chalk.yellowBright;

  console.log("");
  console.log(`  ${cGray("╭─")} ${cRed(`⚠ ${label} SYNTAX ERROR`)} ${cGray("─────────────────╮")}`);
  for (const { file, error } of broken) {
    const rel = path.relative(process.cwd(), file);
    console.log(`  ${cGray("│")} ${cYellow(rel)}`);
    const errLine = error.length > 60 ? error.slice(0, 60) + "…" : error;
    console.log(`  ${cGray("│")}   ${cGray(errLine)}`);
  }
  console.log(`  ${cGray("╰─")} ${cRed(`${broken.length} file rusak — akan di-skip saat load`)} ${cGray("─╯")}`);
  console.log("");
}

async function validateGroup(label, files) {
  if (files.length === 0) return 0;
  const tasks = files.map((f) => () => checkFileSyntax(f));
  const results = await runBatch(tasks, 20);
  const broken = results.filter(Boolean);
  if (broken.length === 0) {
    logger.success("validator", `${files.length} ${label} files — semua syntax OK`);
  } else {
    printBrokenBox(label, broken);
  }
  return broken.length;
}

export async function validatePlugins(pluginsDir) {
  const pluginFiles = collectPluginFiles(pluginsDir);
  await validateGroup("plugin", pluginFiles);
}

export async function validateCore(srcDir) {
  const libFiles = collectFlatFiles(path.join(srcDir, "lib"));
  const scraperFiles = collectFlatFiles(path.join(srcDir, "scraper"));
  const rootSrcFiles = collectFlatFiles(srcDir);

  await Promise.all([
    validateGroup("src/lib", libFiles),
    validateGroup("src/scraper", scraperFiles),
    ...(rootSrcFiles.length ? [validateGroup("src", rootSrcFiles)] : []),
  ]);
}
