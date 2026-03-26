---
id: "23da6d2e-9c9c-44cd-8181-d1751f1e4185"
title: "Build Your First Website for Free (With AI!)"
subtitle: "Follow step-by-step to design, build, and share your website—just a little GitHub experience helps!"
author: "Ryan Jones"
author_slug: "ryan-jones"
date: "2026-03-25"
category: "Tutorial"
tags:
  - vite
  - react
  - pnpm
  - google ai studio
  - cloudflare pages
  - github
  - github desktop
  - claude ai
  - claude cli
  - claude code
  - website
  - ai development
  - prompt design

feature_image: "/images/articles/vibe-code-a-website-google-to-claude-to-cloudflare-pages.png"
feature_image_alt: "Build Your First Website for Free (With AI!)"
feature_image_caption: "Think it, design it, vibe it out — from Google AI Studio to Claude Code to free hosting on Cloudflare Pages."
excerpt: "Learn how to design, build, and host a website for free using Google AI Studio, Claude Code, GitHub, and Cloudflare Pages — no web development experience required."
status: published
prev:
next:
---

# Build Your First Website for Free (With AI!)

## 📌 Lesson Objectives

- Design a website/app layout in `Google AI Studio`
- Create a `GitHub` repository for the project
- Use `Claude CLI` to clean up the code and build out the site
- Host site on `Cloudflare Pages` for free

## Project Requirements

Make sure you have the following free personal accounts created:

- [x] GitHub - https://github.com
- [x] Google Account (Gmail works)
- [x] Google AI Studio - https://aistudio.google.com
- [x] Cloudflare - https://www.cloudflare.com
- [x] VS Code - https://code.visualstudio.com (NOT Visual Studio)

## 🚀 Tutorial

**Watch the video**

<figure>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/PDB9Ka7LMsU" frameborder="0" allowfullscreen></iframe>
</figure>

> Important Note: This tutorial uses Claude Code CLI, which is a paid service. You could technically use Google Gemini CLI as an alternative.

1. Log into GitHub.com and create a new repository for your website/web app.

2. Clone the newly created repo to your local machine (computer). I like to use GitHub Desktop.

3. Log into Google and go to https://aistudio.google.com. Agree to the terms, and click the **Build** link in the left navigation.

4. In the prompt, explain what type of website you want. Consider pasting in an image of a concept you like or a color theme, and tell the prompt to design the site to look like the image while still keeping the idea you want.

5. With Google AI Studio, we just want to design the look and feel of the home page. You can swap out image placeholders here if you want.

6. Once your site has the desired look and feel, click the **Code** tab, then find the download button above the code and click it.

7. Download this into the local Git repository you created on GitHub and cloned to your computer. The downloaded file is a `.zip`.

8. Extract the contents of the `.zip`, then move all the contents—including hidden files—into the root of the project directory.

9. Remove the empty folder and `.zip` file.

10. Open the project in VS Code and open a new Claude prompt using the [VS Code Plugin](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code).

11. In the prompt, give it the following commands one at a time:

```
    1. Remove all Google AI dependencies and libraries, except Google Fonts.
    2. Install PNPM.
    3. Update the README.md to reflect these changes.
    4. /init (this will create a CLAUDE.md file)
```

12. Open a new terminal window via **Terminal > New Terminal**, then type:

```
pnpm dev
```

13. This will start a local server and show you a couple of IP addresses. You can click on `http://localhost:3000` to view your current website and make sure it is still working. Press `Ctrl + C` to stop the local server.

14. In the Claude prompt, type: `create a title and description for these changes in code blocks. use markdown syntax tag for the description.` Wait for it to generate.

15. Copy the title and paste it into your GitHub Desktop title field. Do the same for the description.

16. Click the **Commit** button, then click **Push** to upload the changes to the online GitHub repository.

17. Log into your Cloudflare account. Click the **Build** link in the left navigation. This will expand some menu items. Click **Workers & Pages**.

18. Click the blue **Create application** button, then below the popup click the text: **Looking to deploy Pages? Get Started**.

19. Select **Import an existing Git repository**, then click **Get Started**.

20. Under the GitHub section (which should already be selected), click **Add account** and log into your GitHub account. You can choose to select a single repo or all repos—it's up to you. This can take anywhere from 30 seconds to 5 minutes to connect.

21. Once it is connected, click on your repo under **Select a repository**.

22. For the build command, type: `pnpm build`

23. For the build output directory, type: `dist`

24. Scroll down and click **Save and Deploy**, then wait for the site to build. Once it finishes, click **Continue to project**.

25. Click the link to load your live, freely hosted website!
