# LinkedIn post draft

I built Daymark, a private Gemini journal for the Cloud Run AI Challenge.

The goal was to treat an AI demo like a real product:

- Firebase Google Sign-In creates the identity boundary.
- Firestore records are scoped to the verified user.
- Gemini runs only on the server through an allowlisted, structured gateway.
- Secret Manager is designed to inject the Gemini authorization key at runtime.
- Failed generations keep the draft instead of reporting a half-saved turn.

The original feature is Context Contract. Gemini may propose a fact, commitment, preference, or question, but it cannot silently turn that proposal into memory. I can inspect the source text, approve it, edit it, retire it, or delete it. Reflection Compass then shows recurring themes and only the memories I approved.

I documented the walkthrough, threat model, data-isolation rules, tests, and Cloud Run release plan in the public repository:

https://github.com/Auenchanters/gen-ai-apac-c3-idea

Walkthrough article: [paste the published Hugging Face URL here]

#AccelerateAIwithCloudRun #Gemini #Firebase #Firestore #CloudRun #ResponsibleAI
