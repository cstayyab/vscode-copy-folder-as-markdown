<center>
<img src="images/icon.png" />
</center>

 <center><h1>Copy Folder as Markdown</h1></center>

Right-click any folder in the Explorer and choose **Copy folder as Markdown**.  
The extension walks the folder recursively, reads only text files, and copies a single Markdown string to your clipboard.

Each file is emitted in this exact format:

```

[RELATIVE_FILE_PATH]

\`\`\` 
Code/TEXT in file
\`\`\`


```

## Text file detection

* Files are treated as text if:

  * No null bytes appear in the first 4 KB, and
  * Fewer than 10% of the first 4 KB are control characters other than common whitespace.

Everything else is skipped.

## Settings

* `copyFolderAsMarkdown.excludes`
  Glob patterns to skip. Defaults include `.git`, `node_modules`, build outputs, and caches.

* `copyFolderAsMarkdown.includes`
  Glob patterns to include. Defaults to `**/*`.

* `copyFolderAsMarkdown.maxFileSizeKB`
  Files larger than this are skipped. Default 512 KB.

## Build and run

1. Clone or place these files under a folder, for example `vscode-copy-folder-as-markdown`.
2. Run `npm i`.
3. Run `npm run compile`.
4. Press **F5** in VS Code to launch an Extension Development Host.
5. In the Explorer, right-click a folder and choose **Copy folder as Markdown**. Paste the result anywhere.

## Notes

* Paths are relative to the workspace root if present, otherwise to the clicked folder.
* No language fences are used.
* Binary or oversized files are ignored.
