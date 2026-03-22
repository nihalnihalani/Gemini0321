import type { GitHubMetadata } from "./types";

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function fetchGitHubMetadata(owner: string, repo: string): Promise<GitHubMetadata> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "AI-Video-Generator",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(`GitHub API error: ${repoRes.status} ${repoRes.statusText}`);
  }
  const repoData = await repoRes.json();

  let readmeContent = "";
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
    });
    if (readmeRes.ok) {
      readmeContent = await readmeRes.text();
    }
  } catch {
    // README not available
  }

  const features = extractFeaturesFromReadme(readmeContent);

  return {
    name: repoData.name,
    description: repoData.description || "",
    stars: repoData.stargazers_count,
    language: repoData.language || "Unknown",
    topics: repoData.topics || [],
    readmeContent,
    ownerAvatarUrl: repoData.owner?.avatar_url || "",
    features,
  };
}

function extractFeaturesFromReadme(readme: string): string[] {
  const features: string[] = [];
  const lines = readme.split("\n");

  let inFeaturesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^#{1,3}\s*(features|highlights|what|why|key|benefits)/i.test(trimmed)) {
      inFeaturesSection = true;
      continue;
    }

    if (inFeaturesSection && /^#{1,3}\s/.test(trimmed) && !/features|highlights/i.test(trimmed)) {
      inFeaturesSection = false;
    }

    if (inFeaturesSection && /^[-*]\s+/.test(trimmed)) {
      const feature = trimmed.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
      if (feature.length > 5 && feature.length < 200) {
        features.push(feature);
      }
    }

    if (features.length >= 6) break;
  }

  if (features.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[-*]\s+/.test(trimmed)) {
        const feature = trimmed.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
        if (feature.length > 10 && feature.length < 200) {
          features.push(feature);
        }
      }
      if (features.length >= 4) break;
    }
  }

  return features;
}

export async function extractGitHubContent(url: string): Promise<GitHubMetadata> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return fetchGitHubMetadata(parsed.owner, parsed.repo);
}
