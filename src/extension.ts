import * as vscode from "vscode";
import * as path from "node:path";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "copyFolderAsMarkdown.copy",
    async (resource: vscode.Uri) => {
      if (!resource || resource.scheme !== "file") {
        vscode.window.showErrorMessage("No folder selected.");
        return;
      }

      const config = vscode.workspace.getConfiguration("copyFolderAsMarkdown");
      const includeGlobs = config.get<string[]>("includes", ["**/*"]);
      const excludeGlobs = config.get<string[]>("excludes", []);
      const maxKB = config.get<number>("maxFileSizeKB", 512);

      const clickedFolder = resource;
      const baseRoot = getPathBase(clickedFolder); // workspace root if available, else clicked folder

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Copying folder as Markdown",
          cancellable: false
        },
        async () => {
          const files = await collectFiles(clickedFolder, includeGlobs, excludeGlobs);
          if (files.length === 0) {
            vscode.window.showWarningMessage("No files matched.");
            return;
          }

          const parts: string[] = [];

          for (const file of files) {
            try {
              const stat = await vscode.workspace.fs.stat(file);
              if (stat.type !== vscode.FileType.File) continue;
              if (stat.size > maxKB * 1024) continue;

              const data = await vscode.workspace.fs.readFile(file);
              if (!looksLikeText(data)) continue;

              const text = bufferToUtf8(data);

              // Relative to workspace folder if present, else to clicked folder
              const relativePath = path
                .relative(baseRoot, file.fsPath)
                .replaceAll("\\", "/");

              parts.push(`[${relativePath}]\n\`\`\`\n${text}\n\`\`\`\n`);
            } catch {
              // ignore unreadable files
            }
          }

          const output = parts.join("\n");
          await vscode.env.clipboard.writeText(output);
          vscode.window.showInformationMessage("Copied folder as Markdown to clipboard.");
        }
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

/* ------------------------------- helpers -------------------------------- */

function getPathBase(clickedFolder: vscode.Uri): string {
  const ws = vscode.workspace.getWorkspaceFolder(clickedFolder);
  // If the clicked folder is within a workspace, use the workspace root
  // Otherwise, use the clicked folder itself
  return ws?.uri.fsPath ?? clickedFolder.fsPath;
}

function bufferToUtf8(buf: Uint8Array): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    buf = buf.slice(3);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

/**
 * Treat as text if:
 *  - no null bytes in first 4 KB
 *  - fewer than 10% control chars in first 4 KB (excluding common whitespace)
 */
function looksLikeText(buf: Uint8Array): boolean {
  const sampleLen = Math.min(buf.length, 4096);
  if (sampleLen === 0) return true;

  let ctrl = 0;
  for (let i = 0; i < sampleLen; i++) {
    const b = buf[i];
    if (b === 0) return false;
    const isCommonWhitespace = b === 9 || b === 10 || b === 12 || b === 13 || b === 32;
    const isPrintableAscii = b >= 32 && b < 127;
    if (!isCommonWhitespace && !isPrintableAscii && b < 32) ctrl++;
  }
  return ctrl <= sampleLen * 0.1;
}

async function collectFiles(
  folder: vscode.Uri,
  includes: string[],
  excludes: string[]
): Promise<vscode.Uri[]> {
  const all = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, "**/*"),
    makeExcludeGlob(excludes)
  );

  if (includes.length === 1 && includes[0] === "**/*") return all;

  const includeMatches = new Set<string>();
  for (const inc of includes) {
    const uris = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, inc),
      makeExcludeGlob(excludes)
    );
    for (const u of uris) includeMatches.add(u.fsPath);
  }

  return all.filter((u) => includeMatches.has(u.fsPath));
}

function makeExcludeGlob(excludes: string[]): string | undefined {
  if (!excludes || excludes.length === 0) return undefined;
  return `{${excludes.join(",")}}`;
}
