# Daymark submission checklist

The user supplied a screenshot of the submission form on 2026-09-05. These are the visible required fields. The form has not been submitted.

| Required field | Accepted content | Current status |
| --- | --- | --- |
| Working prototype link | Cloud Run deployment URL, or a blog/video showing an app walkthrough | Use the published Hugging Face article after adding screenshots or a screen recording |
| Demo social post link | Public post using `#AccelerateAIwithCloudRun` | Use `docs/submission/LINKEDIN_POST.md` after publishing |
| Public code repository link | Public GitHub or GitLab URL including `https://` or `http://` | Pushed to `main` at commit `69218d6`; confirm the repository is publicly visible before submitting |
| Brief solution description | Explain Firebase, Firestore, Cloud Run, and Gemini use; maximum 1,024 characters | Copy `docs/submission/BRIEF_DESCRIPTION.md` into the dashboard field |

The form also requires confirmation of all four services:

- User authentication via Firebase.
- Multi-turn interaction with the Gemini API.
- User-isolated Firestore document storage.
- Secure API key retrieval through Google Cloud Secret Manager.

Check these only after the corresponding behavior has been implemented and verified. A local fake-service test does not prove that a live Google integration has been configured.

The walkthrough alternative applies to the first form field. It does not establish that the challenge's Cloud Run deployment requirement is waived. A deployed service must carry `dev-tutorial=cloud-run-ai-challenge`.

Publishing the social post and clicking Submit remain user actions unless separately authorized. Prepared drafts must not claim deployed services or successful live checks without evidence.
