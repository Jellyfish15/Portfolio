// ============================================================
// PROJECT DATA - Customize this section with your real projects
// ============================================================

const PROJECTS = [
  // ---- SOFTWARE ENGINEERING PROJECTS ----
  {
    id: 1,
    type: "software",
    blockColor: "#e52521",
    title: "Project One",
    subtitle: "Full-Stack Web Application",
    description:
      "A full-stack web application built with modern technologies. Features include user authentication, real-time updates, and a responsive design that works across all devices.",
    technologies: ["React", "Node.js", "MongoDB", "Socket.io"],
    github: "https://github.com/Jellyfish15",
    live: "",
    year: "2023",
    highlight: "10k+ Users",
  },
  {
    id: 2,
    type: "software",
    blockColor: "#e52521",
    title: "Project Two",
    subtitle: "Mobile Application",
    description:
      "Cross-platform mobile application developed using React Native. Delivers a seamless native experience on both iOS and Android with offline support and push notifications.",
    technologies: ["React Native", "Firebase", "Redux", "TypeScript"],
    github: "https://github.com/Jellyfish15",
    live: "",
    year: "2023",
    highlight: "4.8★ Rating",
  },
  {
    id: 3,
    type: "software",
    blockColor: "#e52521",
    title: "Project Three",
    subtitle: "API & Microservices",
    description:
      "Scalable REST API architecture using microservices. Handles high traffic with load balancing, caching, and automated CI/CD pipelines for continuous deployment.",
    technologies: ["Python", "FastAPI", "Docker", "AWS", "PostgreSQL"],
    github: "https://github.com/Jellyfish15",
    live: "",
    year: "2022",
    highlight: "99.9% Uptime",
  },
  {
    id: 4,
    type: "software",
    blockColor: "#e52521",
    title: "Project Four",
    subtitle: "Machine Learning Tool",
    description:
      "An ML-powered tool that analyzes data patterns and generates actionable insights. Built with Python and deployed as a web service with an intuitive dashboard.",
    technologies: ["Python", "TensorFlow", "Flask", "D3.js", "Pandas"],
    github: "https://github.com/Jellyfish15",
    live: "",
    year: "2022",
    highlight: "94% Accuracy",
  },
  {
    id: 5,
    type: "software",
    blockColor: "#e52521",
    title: "Project Five",
    subtitle: "Developer CLI Tool",
    description:
      "Command-line tool that automates repetitive development tasks, scaffolding projects, managing configurations, and streamlining workflows for development teams.",
    technologies: ["Go", "Cobra", "Shell", "YAML"],
    github: "https://github.com/Jellyfish15",
    live: "",
    year: "2021",
    highlight: "500+ Stars",
  },
  {
    id: 6,
    type: "software",
    blockColor: "#e52521",
    title: "Project Six",
    subtitle: "E-Commerce Platform",
    description:
      "Feature-rich e-commerce platform with product management, shopping cart, payment processing, inventory tracking, and an admin dashboard.",
    technologies: ["Next.js", "Stripe", "GraphQL", "Prisma", "Tailwind"],
    github: "https://github.com/Jellyfish15",
    live: "",
    year: "2021",
    highlight: "$50k+ Processed",
  },

  // ---- VIDEOGRAPHY / CONTENT CREATION ----
  {
    id: 7,
    type: "video",
    blockColor: "#049cd8",
    title: "Reel One",
    subtitle: "Cinematic Short Film",
    description:
      "A cinematic short film showcasing storytelling through visual composition, color grading, and sound design. Premiered at a local film festival and received audience choice award.",
    technologies: ["Premiere Pro", "After Effects", "DaVinci Resolve", "Drone"],
    github: "",
    live: "https://youtube.com",
    videoEmbed: "",
    year: "2023",
    highlight: "Film Festival",
  },
  {
    id: 8,
    type: "video",
    blockColor: "#049cd8",
    title: "Reel Two",
    subtitle: "Commercial / Brand Video",
    description:
      "Professional brand video produced end-to-end — concept, shooting, editing, color grading, and delivery. Client saw a 40% increase in engagement after launch.",
    technologies: ["Sony A7IV", "Premiere Pro", "After Effects", "Sound Design"],
    github: "",
    live: "https://youtube.com",
    videoEmbed: "",
    year: "2022",
    highlight: "40% Engagement ↑",
  },
  {
    id: 9,
    type: "video",
    blockColor: "#049cd8",
    title: "Reel Three",
    subtitle: "Event Coverage & Highlights",
    description:
      "Dynamic event highlight reel combining live footage, b-roll, interviews, and motion graphics. Delivered within 24 hours of the event for maximum social media impact.",
    technologies: ["Multi-cam Setup", "Premiere Pro", "Motion Graphics", "LUTs"],
    github: "",
    live: "https://youtube.com",
    videoEmbed: "",
    year: "2022",
    highlight: "100k+ Views",
  },
];

// Social / Contact links shown on the end screen
const SOCIAL_LINKS = {
  resume:   { url: "#",                              label: "Resume",    icon: "📄" },
  github:   { url: "https://github.com/Jellyfish15", label: "GitHub",    icon: "💻" },
  linkedin: { url: "https://linkedin.com",           label: "LinkedIn",  icon: "🔗" },
  instagram:{ url: "https://instagram.com",          label: "Instagram", icon: "📸" },
};

// ---- PERSONAL INFO (CUSTOMIZE: replace all placeholder values below) ----
// Update name, title, and tagline to reflect your own details.
// The 'cta' is the call-to-action text on the landing page button.
const PERSONAL_INFO = {
  name: "Your Name",
  title: "Software Engineer & Content Creator",
  tagline: "Welcome to my Portfolio",
  cta: "Come Play",
};
