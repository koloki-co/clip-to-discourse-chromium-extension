# Posts on Discourse Meat about this extension

**Link** https://meta.discourse.org/t/clip-to-discourse-chrome-extension/392335/4

## Post #1 (29th Dec 2025)

Dear Discourse Community, here's my little :wrapped_gift: Christmas present :christmas_tree: to you all. It's simple but useful, and was built purely because I wanted it.

Inspired by [Simon Willison's great blog about using LLMs for development](https://simonwillison.net/2025/Dec/15/porting-justhtml/), I vibe-coded this over Christmas, in between social events, watching movies, and wrapping presents! I wrote **none** of the code, but I _have_ reviewed code and supervised the LLM. Everything was driven from `spec.md` and `roadmap.md`.

https://chromewebstore.google.com/detail/clip-to-discourse/copdhiejkkdblhdcdjapcoalldkondhi

### What is it for?

I use a self-hosted, personal [Discourse](https://bawmedical.co.uk/) as a [Notebook](https://meta.discourse.org/t/using-a-private-discourse-as-our-own-notebook/231865/3), [Journal](https://bawmedical.co.uk/t/discourse-as-a-personal-journal/1261), Blog, CV, Wiki, AI tool and developer knowledgebase. Frequently I find myself wanting to 'clip' content from the web (page title + URL) anbd drop it directly into my Discourse, from where I can incorporate it in a Note or a Journal entry.

My needs are simple so this is fairly bare-bones, it just posts Page Title and URL, although I would like in the future to add 'Include page excerpt' and 'Clip entire page' as options.

## Privacy

- It does not gather any data at all about you or your content.
- All data is sent directly to your Discourse instance from your browser.
- No third-party servers are involved.
- Open source. GitHub repo: https://github.com/koloki-co/clip-to-discourse-chromium-extension

## Features

- Clips page title and URL. Optional 'page excerpt' or 'full page text' are mplemented but it's a bit unsophisticated (however your Discourse AI could summarise it for you later on your Discourse instance?..)
- Create **new Topics** with each clip, or append clips as replies to an **existing Topic**.
- Supports multiple profiles, allowing you to store multiple API keys, destination Discourses, and default settings - for different use-cases.
- Clip To Discourse icon will automatically change to reflect the Currently selected Profile's site Favicon, so you can easily tell **where** you're clipping to!

### Limitations

- The main limitation is that **an Admin needs to create a user-scoped API key for you, on the Discourse instance you are clipping to**. For me this isn't a problem as I am the primary Admin on all the Discourses I intend to use this for.

- Clearly if Clip To Discourse capability was enabled for too many users, it could produce a lot of low-quality posting, on a shared or public Discourse instance. So I primarily aim this Extension towards those of you who are, like me, using Discourse as a personal notebook.

### How To Install

- Install to any Chromium-based browser (Chrome, Edge, Brave, etc) via the link to Chrome Web Store https://chromewebstore.google.com/detail/clip-to-discourse/copdhiejkkdblhdcdjapcoalldkondhi

- (Optional but recommended) 'Pin' the extension to the browser's toolbar.

- Create a Single User API key with the following Granular scopes: **Topics: `read` (used for the connection test only), `write`, and `update`**

- Determine which Category you want Clips to go into. If you want each clip to be a new **Topic**, then you only need the CategoryID. When viewing the Category, this ID is in the URL like this: `https://discourse.yourdomain.com/c/CategoryName/CategoryID`)

- You can also set a Topic to reply to, and all Clips will be appended as new replies to this Topic. To get the Topic ID you also get it from the URL: When viewing the Topic, this ID is in the URL like this: `https://discourse.yourdomain.com/t/TopicTitle/TopicID`)

- Click on the extension icon to get the popup, and go to Settings to configure the API key and set your defaults. Note that you can have multiple 'profiles' for various different Discourses that you might want to use.

- Save settings and (optionally) test the connection, which will read _one_ topic to ensure the API connection works.

- Close Settings and clip stuff to test!

### Images

[grid]
![Clipping Settings|279x500](upload://heySsqemU2bb56Lx9CbHnJ4pXw8.png)
![Demo Clip to New Topic|690x469](upload://b2j8lDwDfdV16mswopDaWOPx8n3.jpeg)
![Demo Clipped Topic|690x431](upload://acD9uWk1XHuuu74VXdy9gepVY2N.png)
![Demo Clipped as a Reply|612x500](upload://hGFmF4dkmQKcMCRCHDEg6mMdL00.png)
[/grid]

### Roadmap

- 'Include page excerpt' and 'Clip entire page' might need a bit of testing and refinement. Alternatively this feature could allow the user to select the area of text to be clipped as the excerpt.

- I'm not planning on a Firefox or Safari extension (as I don't use those browsers) but would happy for someone to take on the task of porting this extension over. Could collaborate to keep it all in one repo and keep feature parity.

- May consider implementing the [Discourse User API flow](https://meta.discourse.org/t/user-api-keys-specification/48536), so that API keys don't have to be created by Admins, however the User API works via an OAuth flow so wouldn't be a drop-in alternative.

### Related discussions

Request for basically this tool: https://meta.discourse.org/t/chrome-firefox-extension-share-to-discourse/21104/28

A related post, suggesting additional features when **clipping** a Discourse: https://meta.discourse.org/t/need-web-clipper-for-discourse-post/45105

Social Share is a related concept, but uses simple URLs https://meta.discourse.org/t/social-share/89980

### Feedback, Ideas, and Contributing

This topic is a pretty good place to put any feedback you have. I am open to ideas for improvements as long as they don't overcomplicate the extension and/or make it less useful for me!

If you want to open issues or make PRs, the GitHub repo is here:

https://github.com/koloki-co/clip-to-discourse-chromium-extension

> This extension is a free, open-source, and privacy-first tool, created for the Discourse community by my company Koloki.co
