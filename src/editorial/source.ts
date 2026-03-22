import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import type { EditorialSection, EditorialSource, SectionKind } from "./types";

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".rst",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cc",
  ".cpp",
  ".h",
  ".hpp",
  ".sh",
]);

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "from",
  "this",
  "into",
  "your",
  "about",
  "have",
  "will",
  "uses",
  "using",
  "used",
  "when",
  "where",
  "what",
  "how",
  "they",
  "them",
  "their",
  "there",
  "more",
  "than",
  "into",
  "over",
  "under",
  "across",
  "build",
  "video",
  "project",
]);

const cleanWhitespace = (value: string) =>
  value.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();

const stripMarkup = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_~]+/g, "");

const truncate = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trim()}…`;

const firstMeaningfulLine = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

const extractMarkdownTitle = (value: string) => {
  const heading = value.match(/^#\s+(.+)$/m)?.[1];
  if (heading) {
    return heading.trim();
  }

  return firstMeaningfulLine(value)?.replace(/^#+\s*/, "").trim();
};

const sentenceSummary = (value: string, fallback: string) =>
  truncate(extractSentences(value)[0] ?? normalizeReadableText(value) ?? fallback, 180);

const classifySectionKind = (title: string, summary: string, points: string[]): SectionKind => {
  const corpus = `${title} ${summary} ${points.join(" ")}`.toLowerCase();
  if (/\b(install|setup|get started|quickstart|configuration|config)\b/.test(corpus)) {
    return "setup";
  }
  if (/\b(command|cli|flags|option|script|terminal|shell|npm run|pnpm|yarn)\b/.test(corpus)) {
    return "commands";
  }
  if (/\b(api|endpoint|sdk|function|method|hook|component|props)\b/.test(corpus)) {
    return "api";
  }
  if (/\b(architecture|system|pipeline|flow|design|internals)\b/.test(corpus)) {
    return "architecture";
  }
  if (/\b(performance|benchmark|latency|speed|optimi[sz]e|throughput)\b/.test(corpus)) {
    return "performance";
  }
  if (/\b(help|guide|troubleshoot|faq|support|docs|documentation)\b/.test(corpus)) {
    return "help";
  }
  if (/\b(usage|example|examples|walkthrough|tutorial)\b/.test(corpus)) {
    return "usage";
  }
  if (/\b(conclusion|closing|outro|final|license|contact)\b/.test(corpus)) {
    return "closing";
  }
  if (/\b(overview|intro|introduction|welcome|about)\b/.test(corpus)) {
    return "overview";
  }
  return "detail";
};

const extractSections = (value: string): EditorialSection[] => {
  const normalized = value.replace(/\r/g, "");
  const headingMatches = [...normalized.matchAll(/^#{1,3}\s+(.+)$/gm)];

  if (headingMatches.length === 0) {
    const paragraphs = extractSentences(normalized).slice(0, 4);
    return paragraphs.map((paragraph, index) => ({
      id: `section-${index + 1}`,
      title: index === 0 ? "Overview" : `Detail ${index}`,
      summary: truncate(paragraph, 180),
      points: extractSentences(paragraph).slice(0, 2).map((item) => truncate(item, 90)),
      order: index,
      kind: index === 0 ? "overview" : "detail",
    }));
  }

  return headingMatches
    .map((match, index) => {
      const title = match[1].trim();
      const start = match.index ?? 0;
      const next = headingMatches[index + 1];
      const end = next?.index ?? normalized.length;
      const body = normalizeReadableText(normalized.slice(start, end).replace(/^#{1,3}\s+.+$/m, ""));
      const points = extractSentences(body).slice(0, 3).map((item) => truncate(item, 90));

      const summary = sentenceSummary(body, title);
      return {
        id: `section-${index + 1}`,
        title,
        summary,
        points,
        order: index,
        kind: classifySectionKind(title, summary, points),
      };
    })
    .filter((section) => section.summary.length > 0);
};

const buildSectionsFromFiles = (files: string[]) =>
  files.slice(0, 6).map((path, index) => {
    const summary = summarizeFile(path);
    const title = basename(path, extname(path));
    return {
      id: `section-${index + 1}`,
      title,
      summary: sentenceSummary(summary, title),
      points: extractSentences(summary).slice(0, 2).map((item) => truncate(item, 90)),
      order: index,
      kind: classifySectionKind(title, summary, extractSentences(summary).slice(0, 2)),
    } satisfies EditorialSection;
  });

const mergeSections = (
  primary: EditorialSection[],
  secondary: EditorialSection[],
  limit: number,
) => {
  const usedTitles = new Set(primary.map((section) => section.title.toLowerCase()));
  const merged = [...primary];

  for (const section of secondary) {
    if (merged.length >= limit) {
      break;
    }

    if (usedTitles.has(section.title.toLowerCase())) {
      continue;
    }

    usedTitles.add(section.title.toLowerCase());
    merged.push({
      ...section,
      id: `section-${merged.length + 1}`,
      order: merged.length,
    });
  }

  return merged;
};

const extractPackageJsonInfo = (value: string) => {
  try {
    const parsed = JSON.parse(value) as { name?: string; description?: string };
    return {
      title: parsed.name?.trim(),
      abstract: parsed.description?.trim(),
    };
  } catch {
    return {};
  }
};

const stripCodeFences = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1");

const normalizeReadableText = (value: string) =>
  cleanWhitespace(
    stripMarkup(stripCodeFences(value))
      .replace(/^\s+$/gm, "")
      .replace(/\n{3,}/g, "\n\n"),
  );

const extractSentences = (value: string) =>
  normalizeReadableText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const keywordList = (value: string) => {
  const counts = new Map<string, number>();
  cleanWhitespace(stripCodeFences(value))
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .split(/[^a-z0-9_\-]+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token))
    .forEach((token) => {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([token]) => token);
};

const isTextFile = (path: string) => TEXT_EXTENSIONS.has(extname(path).toLowerCase());

const readUtf8 = (path: string) => readFileSync(path, "utf8");

const repoPriority = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.startsWith("readme")) {
    return 0;
  }
  if (normalized === "package.json" || normalized === "pyproject.toml" || normalized === "cargo.toml") {
    return 1;
  }
  if (normalized.startsWith("docs")) {
    return 2;
  }
  if (normalized.includes("index")) {
    return 3;
  }
  return 4;
};

const collectRepoFiles = (root: string) => {
  const queue = [root];
  const collected: string[] = [];

  while (queue.length > 0 && collected.length < 18) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = readdirSync(current, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && entry.name !== "out")
      .sort((left, right) => repoPriority(left.name) - repoPriority(right.name));

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (collected.length < 18) {
          queue.push(fullPath);
        }
        continue;
      }

      if (isTextFile(fullPath)) {
        collected.push(fullPath);
      }

      if (collected.length >= 18) {
        break;
      }
    }
  }

  return collected;
};

const summarizeFile = (path: string) => {
  const raw = readUtf8(path);
  const cleaned = normalizeReadableText(raw);
  return truncate(cleaned, 1800);
};

const resolveInlineSource = (input: string): EditorialSource => {
  const cleaned = cleanWhitespace(input);
  const sentences = extractSentences(cleaned);
  const title = truncate(sentences[0] ?? cleaned, 72);
  const abstract = truncate(sentences[1] ?? cleaned, 180);

  return {
    kind: "idea",
    input,
    title,
    abstract,
    body: truncate(cleaned, 2400),
    highlights: sentences.slice(0, 5).map((sentence) => truncate(sentence, 120)),
    keywords: keywordList(cleaned),
    files: [],
    sections: extractSections(cleaned),
  };
};

const resolveFileSource = (inputPath: string): EditorialSource => {
  const path = resolve(inputPath);
  const raw = readUtf8(path);
  const cleaned = normalizeReadableText(raw);
  const packageInfo = extname(path) === ".json" ? extractPackageJsonInfo(raw) : {};
  const title =
    packageInfo.title ??
    (extname(path).match(/\.mdx?/) ? extractMarkdownTitle(raw) : undefined) ??
    basename(path, extname(path));
  const sentences = extractSentences(cleaned);

  return {
    kind: "file",
    input: path,
    title: truncate(title ?? basename(path), 72),
    abstract: truncate(packageInfo.abstract ?? sentences[0] ?? cleaned, 180),
    body: truncate(cleaned, 2400),
    highlights: sentences.slice(0, 5).map((sentence) => truncate(sentence, 120)),
    keywords: keywordList(cleaned),
    files: [path],
    sections: extractSections(raw),
  };
};

const resolveRepoSource = (inputPath: string): EditorialSource => {
  const root = resolve(inputPath);
  const files = collectRepoFiles(root);
  const summaries = files.map((path) => `# ${basename(path)}\n${summarizeFile(path)}`);
  const readmePath = files.find((path) => basename(path).toLowerCase().startsWith("readme"));
  const packageJsonPath = files.find((path) => basename(path).toLowerCase() === "package.json");
  const readmeRaw = readmePath ? readUtf8(readmePath) : "";
  const packageInfo = packageJsonPath ? extractPackageJsonInfo(readUtf8(packageJsonPath)) : {};
  const combined = normalizeReadableText(summaries.join("\n\n"));
  const title =
    extractMarkdownTitle(readmeRaw) ??
    packageInfo.title ??
    basename(root);
  const abstract =
    packageInfo.abstract ??
    extractSentences(readmeRaw)[0] ??
    extractSentences(combined)[0] ??
    title;
  const highlights = [
    ...extractSentences(readmeRaw).slice(0, 3),
    ...extractSentences(combined).slice(0, 5),
  ]
    .map((sentence) => truncate(sentence, 120))
    .filter(Boolean)
    .slice(0, 6);
  const sections = readmeRaw
    ? mergeSections(extractSections(readmeRaw).slice(0, 4), buildSectionsFromFiles(files), 6)
    : buildSectionsFromFiles(files);

  return {
    kind: "repo",
    input: root,
    title: truncate(title, 72),
    abstract: truncate(abstract, 180),
    body: truncate(combined, 3200),
    highlights,
    keywords: keywordList(`${title} ${abstract} ${combined}`),
    files,
    sections,
  };
};

export const resolveEditorialSource = (input: string): EditorialSource => {
  if (!input.trim()) {
    return resolveInlineSource("Untitled quiet editorial system.");
  }

  if (!existsSync(input)) {
    return resolveInlineSource(input);
  }

  const stats = statSync(input);
  if (stats.isDirectory()) {
    return resolveRepoSource(input);
  }

  return resolveFileSource(input);
};

export const sourceToPromptText = (source: EditorialSource) =>
  cleanWhitespace(
    [
      source.title,
      source.abstract,
      ...source.highlights,
      source.body,
      source.keywords.join(" "),
    ].join("\n\n"),
  );
