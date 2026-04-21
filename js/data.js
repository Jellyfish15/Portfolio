// ============================================================
// PROJECT DATA - Customize this section with your real projects
// ============================================================

const PROJECTS = [
  // ---- SOFTWARE ENGINEERING PROJECTS ----
  {
    id: 1,
    type: "software",
    blockColor: "#e52521",
    title: "Nudl",
    subtitle: "Educational Video Platform",
    description:
      "A full-stack TikTok-style video platform for educational content. Features algorithmic feed, user authentication, video uploads with Cloudinary, profile management, and a Progressive Web App experience optimized for mobile.",
    technologies: [
      "React",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Cloudinary",
      "JWT",
    ],
    github: "https://github.com/Jellyfish15/final-project-frontend",
    live: "https://jellyfish15.github.io/final-project-frontend/",
    year: "2025",
    highlight: "Full-Stack PWA",
  },
  {
    id: 2,
    type: "software",
    blockColor: "#e52521",
    title: "Spots",
    subtitle: "Image Sharing Site",
    description:
      "A responsive image sharing site where cards and modal elements are rendered via JavaScript. Designed to display effectively on all popular screen sizes with a clean, modern layout.",
    technologies: ["HTML", "CSS", "JavaScript", "Responsive Design"],
    github: "https://github.com/Jellyfish15/se_project_spots",
    live: "https://jellyfish15.github.io/se_project_spots/",
    year: "2024",
    highlight: "Responsive UI",
  },
  {
    id: 3,
    type: "software",
    blockColor: "#e52521",
    title: "Simple Todo App",
    subtitle: "Task Management App",
    description:
      "A simple Todo application that lets you create a list of tasks with names and dates. Built with object-oriented JavaScript and loose coupling principles for clean, maintainable code.",
    technologies: ["JavaScript", "CSS", "HTML", "OOP"],
    github: "https://github.com/Jellyfish15/se_project_todo-app",
    live: "https://jellyfish15.github.io/se_project_todo-app/",
    year: "2024",
    highlight: "OOP Design",
  },
  {
    id: 4,
    type: "software",
    blockColor: "#e52521",
    title: "WTWR",
    subtitle: "Weather Clothing App",
    description:
      "A React app that suggests clothing items based on the current weather. Features a full-stack setup with an Express.js backend, user authentication, and a custom domain deployment.",
    technologies: ["React", "JSX", "CSS", "Express.js", "Vite"],
    github: "https://github.com/Jellyfish15/se_project_react",
    live: "http://wtwrgs.ignorelist.com/",
    year: "2024",
    highlight: "Weather API",
  },
  {
    id: 5,
    type: "software",
    blockColor: "#e52521",
    title: "Triple Peaks Coffee Shop",
    subtitle: "Coffee Shop Landing Page",
    description:
      "A coffee shop website built with semantic HTML5 and CSS, featuring Flexbox layouts, BEM file structure, a custom reservation form, and CSS animations and transforms.",
    technologies: ["HTML", "CSS", "Flexbox", "BEM", "CSS Animations"],
    github: "https://github.com/Jellyfish15/se_project_coffeeshop",
    live: "",
    year: "2024",
    highlight: "Semantic HTML5",
  },

  // ---- VIDEOGRAPHY / CONTENT CREATION ----
  {
    id: 7,
    type: "video",
    blockColor: "#049cd8",
    title: "Editing Showreel",
    subtitle: "Video Editing Portfolio",
    description:
      "A showreel showcasing my video editing abilities and past projects, demonstrating skills in color grading, pacing, transitions, and visual storytelling.",
    technologies: [
      "Premiere Pro",
      "DaVinci Resolve",
      "After Effects",
      "Photoshop",
      "RED Camera",
    ],
    github: "",
    live: "https://www.youtube.com/watch?v=umeWlTL7XA8",
    videoEmbed: "",
    year: "2023",
    highlight: "Showreel",
  },
  {
    id: 8,
    type: "video",
    blockColor: "#049cd8",
    title: "Demo Reel",
    subtitle: "Cinematography Reel",
    description:
      "A demo reel compiling all filmed projects, showcasing cinematography skills across a range of cameras and studio setups.",
    technologies: [
      "Sony A7S II",
      "RED Camera",
      "Blackmagic Camera",
      "Canon Rebel",
      "Studio Lighting",
    ],
    github: "",
    live: "https://youtu.be/zPk3wY8ZCO8",
    videoEmbed: "",
    year: "2022",
    highlight: "Demo Reel",
  },
  {
    id: 9,
    type: "video",
    blockColor: "#049cd8",
    title: "The Final Hand",
    subtitle: "Comedy Short Film",
    description:
      "A poker-themed comedy short film set at an online poker table, following a tense game that unfolds with humor and unexpected twists.",
    technologies: [
      "Premiere Pro",
      "After Effects",
      "Sound Design",
      "Color Grading",
    ],
    github: "",
    live: "https://youtu.be/TBRAvE703s4",
    videoEmbed: "",
    year: "2022",
    highlight: "Short Film",
  },
  {
    id: 10,
    type: "video",
    blockColor: "#049cd8",
    title: "Can You Not See It?",
    subtitle: "Poetic Short Film",
    description:
      "A short poetic film piece evoking the emotions of someone struggling, who finds solace in a flower growing amidst a broken-down house. A meditation on hope and beauty in desolation.",
    technologies: [
      "Cinematography",
      "Premiere Pro",
      "Color Grading",
      "Sound Design",
    ],
    github: "",
    live: "https://youtu.be/v9ri3IjrMTs",
    videoEmbed: "",
    year: "2022",
    highlight: "Poetry Film",
  },
];

// Social / Contact links shown on the end screen
const SOCIAL_LINKS = {
  resume: { url: "#resume", label: "Resume", icon: "📄" },
  github: {
    url: "https://github.com/Jellyfish15",
    label: "GitHub",
    icon: "💻",
  },
  linkedin: {
    url: "https://www.linkedin.com/in/genestrelkov/",
    label: "LinkedIn",
    icon: "🔗",
  },
  email: { url: "mailto:stgenad@gmail.com", label: "Email", icon: "✉️" },
  youtube: {
    url: "https://www.youtube.com/@CodingGene",
    label: "YouTube",
    icon: "▶️",
  },
  instagram: {
    url: "https://www.instagram.com/codinggene/",
    label: "Instagram",
    icon: "📸",
  },
};

// ---- RESUME DATA ----
const RESUME_DATA = {
  name: "Gene Strelkov",
  contact:
    "stgenad@gmail.com | 423-310-0659 | Cleveland, TN | Open to Relocation",
  headline: "Full-Stack Software Engineer",
  summary:
    "Full-Stack Software Engineer with experience in AI integration and modern web architecture, specializing in JavaScript, React, Node.js, and TypeScript. With a background in Digital Media, I bring a strong user-centered perspective to building intelligent, data-driven applications. Curious and adaptable, with a systems-oriented mindset focused on scalable solutions that improve workflow efficiency and drive meaningful impact.",
  skills: [
    "JavaScript",
    "TypeScript",
    "SQL",
    "HTML",
    "CSS",
    "Bash",
    "Git",
    "React",
    "Node.js",
    "Express",
    "REST APIs",
    "MongoDB",
    "PostgreSQL",
    "Data Structures",
    "Algorithms",
  ],
  experience: [
    {
      role: "Junior Software Engineer Extern",
      company: "TripleTen",
      location: "Remote",
      dates: "01/2026 - Present",
      bullets: [
        "Build and maintain full-stack application features contributing to a production-grade TypeScript-based platform serving university users.",
        "Design reusable React components and structured backend routes improving maintainability and enabling faster iterative feature delivery.",
        "Collaborate in an agile-style engineering environment, participating in code reviews, debugging sessions, and sprint-based development cycles.",
        "Troubleshoot application issues and optimize performance, improving usability and system stability through structured debugging and refactoring.",
      ],
    },
    {
      role: "Videographer",
      company: "Freelance",
      location: "Remote",
      dates: "08/2021 - Present",
      bullets: [
        "Creating dynamic and visually engaging video content.",
        "Skilled in filming, editing, and post-production workflows, with a focus on storytelling and brand alignment.",
        "Working with various industries and individual brands to drive engagement via hooks and product promotion.",
      ],
    },
    {
      role: "Marketing Lead",
      company: "PixelLogic",
      location: "Cleveland, TN",
      dates: "02/2018 - 12/2021",
      bullets: [
        "Designed, built, and maintained responsive WordPress websites, ensuring performance optimization, accessibility, and consistent UI/UX standards.",
        "Collaborated directly with clients to translate business requirements into scalable digital solutions and cohesive brand systems.",
        "Implemented SEO strategies through structured content architecture, metadata optimization, and technical site improvements.",
        "Streamlined content publishing workflows and improved maintainability through modular design and reusable components.",
      ],
    },
    {
      role: "Videographer",
      company: "PixelLogic",
      location: "Cleveland, TN",
      dates: "08/2015 - 02/2018",
      bullets: [
        "Managed full production lifecycle for digital media projects, from client requirement gathering to final delivery.",
        "Edited and optimized video content using structured workflows, improving turnaround time and production efficiency.",
        "Scripted and produced short-form branded content aligned with data-driven marketing strategies.",
      ],
    },
    {
      role: "Computer Technician",
      company: "Computers of Cleveland",
      location: "Cleveland, TN",
      dates: "01/2010 - 12/2015",
      bullets: [
        "Diagnosed and resolved hardware, software, and network configuration issues, restoring system functionality and minimizing downtime.",
        "Translated non-technical user problems into actionable technical solutions, improving customer satisfaction.",
        "Identified patterns in recurring technical issues, implementing preventative fixes that reduced repeat service requests.",
      ],
    },
  ],
  education: [
    {
      school: "TripleTen",
      degree: "Software Engineering Certificate",
      year: "2025",
    },
    {
      school: "Lee University, Cleveland, TN",
      degree: "Bachelor of Arts (BA) in Digital Media",
      year: "2016",
    },
  ],
};

// ---- PERSONAL INFO (CUSTOMIZE: replace all placeholder values below) ----
// Update name, title, and tagline to reflect your own details.
// The 'cta' is the call-to-action text on the landing page button.
const PERSONAL_INFO = {
  name: "Gene Strelkov",
  title: "Full-Stack Software Engineer & Content Creator",
  tagline: "Welcome to my Portfolio",
  cta: "Come Play",
};
