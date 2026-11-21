/**
 * DocuForge CLI (P1).
 *
 * Usage:
 *   docuforge new <name> [--title <title>] [--runtime <minutes>]
 *                      [--language <code>] [--theme <theme>] [--strict]
 *   docuforge list
 *
 * Creates a plain-file project under projects/<name>/.
 * Project files are the source of truth.
 */

import { createProject, listProjects, defaultProjectsRoot } from "@docuforge/engine";

function printHelp(): void {
  console.log(
    [
      "DocuForge CLI",
      "",
      "Usage:",
      "  docuforge new <name> [--title <title>] [--runtime <minutes>] [--language <code>] [--theme <theme>] [--strict]",
      "  docuforge list",
      "",
      "Examples:",
      '  docuforge new my-film --title "My Film" --runtime 25 --language en',
      "  docuforge list",
    ].join("\n")
  );
}

function parseArgs(argv: string[]): { cmd: string; name?: string; opts: Record<string, string | boolean> } {
  const cmd = argv[0] ?? "";
  const opts: Record<string, string | boolean> = {};
  let name: string | undefined;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--title" && argv[i + 1]) opts.title = argv[++i];
    else if (a === "--runtime" && argv[i + 1]) opts.runtime = argv[++i];
    else if (a === "--language" && argv[i + 1]) opts.language = argv[++i];
    else if (a === "--theme" && argv[i + 1]) opts.theme = argv[++i];
    else if (a === "--strict") opts.strict = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (!a.startsWith("--") && !name) name = a;
  }
  return { cmd, name, opts };
}

function main(): void {
  const { cmd, name, opts } = parseArgs(process.argv.slice(2));

  if (!cmd || opts.help) {
    printHelp();
    process.exit(cmd ? 0 : 1);
  }

  if (cmd === "new") {
    if (!name) {
      console.error("ERROR: `docuforge new` requires a project name.\n");
      printHelp();
      process.exit(1);
    }
    const runtime = opts.runtime ? parseInt(String(opts.runtime), 10) : undefined;
    if (opts.runtime && (Number.isNaN(runtime) || runtime! <= 0)) {
      console.error(`ERROR: --runtime must be a positive number of minutes (got "${opts.runtime}").`);
      process.exit(1);
    }
    try {
      const { projectDir, project } = createProject(name, {
        title: opts.title ? String(opts.title) : undefined,
        runtimeTargetMinutes: runtime,
        language: opts.language ? String(opts.language) : undefined,
        theme: opts.theme ? String(opts.theme) : undefined,
        strictMode: Boolean(opts.strict),
      });
      console.log(`Created project "${project.name}" at ${projectDir}`);
      console.log(`  Title: ${project.title}`);
      console.log(`  Runtime target: ${project.runtime_target_minutes} min`);
      console.log(`  Language: ${project.language}`);
      console.log(`  Script: ${projectDir}/script/script.md`);
    } catch (err) {
      console.error(`ERROR: ${(err as Error).message}`);
      process.exit(1);
    }
    return;
  }

  if (cmd === "list") {
    const projects = listProjects(defaultProjectsRoot());
    if (projects.length === 0) {
      console.log("No projects yet. Create one with: docuforge new <name>");
      return;
    }
    for (const p of projects) {
      console.log(`${p.name} — ${p.title} (${p.runtime_target_minutes} min, ${p.language})`);
    }
    return;
  }

  console.error(`ERROR: Unknown command "${cmd}".`);
  printHelp();
  process.exit(1);
}

if (require.main === module) {
  main();
}
