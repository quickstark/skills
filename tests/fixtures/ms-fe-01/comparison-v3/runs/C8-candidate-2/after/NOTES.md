# Authoring notes

- Delivered `index.html`: cinematic static hero, exact requested heading/body, square Explore link to `#work`, and Selected work section.
- Local guidance read: qs-design-frontend and its brief, design-direction, implementation, cinematic-landing, media-recipes, restrained-style references.
- Selected treatment: static poster composition informed by R4 framing/text protection; no footage lifecycle or motion. Teal/cream/amber palette, system serif/sans, square controls, dark text scrim. Hero crop 70% center desktop / 72% center mobile; work preview preserves the full 16:9 poster.
- Source: supplied `assets/poster.svg`, repository-owned synthetic fixture per `assets/rights.json`. The manifest mentions scene.webm, but that file is absent; no video source was invented or substituted.
- Static HTML/CSS needs no JavaScript, external fonts, dependencies, or network services. Poster and readable text remain available without playback; page labels its static state and missing footage.
- Validation: one shell content check for required text, local poster, fragment destination, square CTA, and absence of video/external sources. Browser/runtime, responsive appearance, keyboard behavior, and playback are unverified; central observer owns qualification. No browser, server, installation, or second verification workflow used.
