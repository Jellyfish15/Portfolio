# Portfolio — Mario Edition

An interactive, Mario-style portfolio website for Gene — Software Engineer & Content Creator. Instead of a traditional portfolio page, visitors play a side-scrolling platformer game where they collect question-mark blocks to reveal projects, skills, and contact info.

## Live Demo

[View Portfolio](https://codinggene.tech)

## Features

- **Mario-style platformer game** — fully playable side-scroller built on the HTML5 Canvas API
- **Landing screen** with animated starfield and avatar
- **Two project categories** — Software Engineering and Videography/Content Creation
- **Project modals** — triggered by hitting in-game blocks, displaying project details, tech stack, and links
- **Skip option** — bypass the game and jump straight to a static portfolio view
- **Mobile support** — on-screen d-pad and jump button for touch devices
- **Responsive design** — works across desktop and mobile screen sizes

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic) |
| Styling | CSS3 (Flexbox, animations, custom properties) |
| Font | [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) via Google Fonts |
| Game Engine | Vanilla JavaScript (Canvas 2D API) |
| Data Layer | Vanilla JavaScript (`data.js`) |
| Hosting | GitHub Pages |

No frameworks, no build tools, no dependencies — pure HTML, CSS, and JavaScript.

## Projects Showcased

### Software Engineering
| Project | Description | Stack |
|---|---|---|
| **Nudl** | TikTok-style educational video platform (Full-Stack PWA) | React, Node.js, Express.js, MongoDB, Cloudinary, JWT |
| **Spots** | Responsive image sharing site | HTML, CSS, JavaScript |
| **Simple Todo App** | OOP task management app | JavaScript, CSS, HTML |
| **WTWR** | Weather-based clothing suggestion app | React, Express.js, Vite |
| **Triple Peaks Coffee Shop** | Coffee shop landing page | HTML, CSS, Flexbox, BEM |

### Videography / Content Creation
| Project | Description | Tools |
|---|---|---|
| **Editing Showreel** | Video editing portfolio reel | Premiere Pro, DaVinci Resolve, After Effects |
| **Demo Reel** | Cinematography reel across multiple cameras | Sony A7S II, RED, Blackmagic |
| **The Final Hand** | Poker-themed comedy short film | Premiere Pro, After Effects, Sound Design |
| **Can You Not See It?** | Poetic short film | Cinematography, Premiere Pro, Color Grading |

## Project Structure

```
├── index.html        # Main HTML — all screens (landing, game, portfolio)
├── style.css         # All styles
├── js/
│   ├── data.js       # Project and skills data
│   └── game.js       # Mario game engine (Canvas 2D)
├── images/           # Avatar and assets
├── CNAME             # Custom domain config (GitHub Pages)
└── README.md
```

## Controls

**Keyboard**
- `← / A` — Move left
- `→ / D` — Move right
- `Space / ↑ / W` — Jump
- `Escape` — Pause / close modal

**Touch (Mobile)**
- On-screen d-pad and jump button

## Getting Started

No build step required. Just open `index.html` in a browser, or serve with any static file server:

```bash
npx serve .
```

## Author

**Gene** — Software Engineer & Content Creator  
GitHub: [@Jellyfish15](https://github.com/Jellyfish15)
