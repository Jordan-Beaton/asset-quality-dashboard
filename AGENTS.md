<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Enshore IMS push workflow

When the user says `push changes`, `push all changes`, `push changes live`, or equivalent:

1. Treat the request as approval to inspect the complete worktree, run the handover-required validation, stage all current changes, create one appropriate commit on `main`, and push it to `origin/main` using the repository's existing Git credentials.
2. Do not ask whether to include unrelated existing work unless inspection identifies a secret, generated artifact, unexpectedly large file, database migration, or another materially risky change. Report and stop only for one of those evidenced risks.
3. The successful push to `origin/main` is the established deployment workflow. Allow the existing GitHub-to-Vercel integration to deploy it automatically.
4. Do not propose or install deployment plugins, create a Vercel CLI link, run a separate Vercel deployment, create a branch or pull request, or switch deployment methods unless the user explicitly requests that alternative.
5. If a push fails because of a transient network or DNS error, retry the same normal `git push origin main` workflow before reporting the failure. Keep any successfully created local commit intact.
6. A push request does not authorize database migrations or an additional manual deployment.
