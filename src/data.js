// All copy and facts live here. Sourced from Siddhant's résumé and previous portfolio.

export const profile = {
  name: 'Siddhant Vashisth',
  email: 'siddhantvashisth05@gmail.com',
  phone: '+91 88715 92579',
  linkedin: 'https://www.linkedin.com/in/siddhant-vashisth-04887b29b/',
  github: 'https://github.com/sidvashisth2005',
  location: 'Guna, Madhya Pradesh, India',
};

export const gallery = [
  { src: 'img/gallery/01.webp', caption: 'The HackNITR 7.0 trophy' },
  { src: 'img/gallery/04.webp', caption: 'Rank 1 · HackNITR 7.0' },
  { src: 'img/gallery/09.webp', caption: 'At the podium' },
  { src: 'img/gallery/13.webp', caption: 'HACKSAGON 2025 · final round' },
  { src: 'img/gallery/06.webp', caption: 'On stage' },
  { src: 'img/gallery/05.webp', caption: 'Award on stage' },
  { src: 'img/gallery/20.webp', caption: 'National seminar · published' },
  { src: 'img/gallery/24.webp', caption: 'The squad' },
  { src: 'img/gallery/08.webp', caption: 'HackNITR certificate' },
  { src: 'img/gallery/10.webp', caption: 'Team JUET' },
  { src: 'img/gallery/03.webp', caption: 'Certificates day' },
  { src: 'img/gallery/02.webp', caption: 'With the jury' },
  { src: 'img/gallery/12.webp', caption: 'HACKSAGON 2025' },
  { src: 'img/gallery/21.webp', caption: 'Blazers on' },
  { src: 'img/gallery/14.webp', caption: 'Group selfie' },
  { src: 'img/gallery/15.webp', caption: 'Industry visit' },
  { src: 'img/gallery/16.webp', caption: 'In the lab' },
  { src: 'img/gallery/18.webp', caption: 'Demo day' },
  { src: 'img/gallery/07.webp', caption: 'The audience' },
  { src: 'img/gallery/23.webp', caption: 'Bhopal Vigyan Mela' },
  { src: 'img/gallery/19.webp', caption: 'Building at the expo' },
  { src: 'img/gallery/22.webp', caption: 'Certified' },
  { src: 'img/gallery/11.webp', caption: 'Line-up' },
  { src: 'img/gallery/17.webp', caption: 'Hands on hardware' },
];

export const moves = [
  {
    id: 'livestock',
    kanji: '農',
    kanjiMeaning: 'agriculture',
    label: 'Livestock',
    title: 'Livestock Monitoring System',
    category: 'IoT & AI AgriTech',
    technique: 'Herd Guardian',
    big: '~65%',
    bigLabel: 'cheaper per head: ₹60,000 against ₹2–3 lakh',
    award: 'HackNITR 7.0 · Rank 1',
    image: 'img/gallery/04.webp',
    github: 'https://github.com/RISHABH12005/LMS',
    tags: ['IoT', 'Cloud ML', 'BLE', 'Python', 'Firmware'],
    bullets: [
      'A sensor-equipped rover and an animal-worn wearable (PPG, SpO₂, heart-rate, thermal, motion) stream vitals to cloud models that alert vets and owners to health problems across 100+ animals per unit.',
      'A first-mover answer to the livestock-insurance fraud paradox: real-time monitoring curbs false claims and cuts farmer premiums, at ~65% lower cost per head.',
    ],
  },
  {
    id: 'aroundyou',
    kanji: '拡',
    kanjiMeaning: 'to augment',
    label: 'ARound You',
    title: 'ARound You',
    category: 'AR social & tourism',
    technique: 'Memory Anchor',
    big: '1st',
    bigLabel: 'to market: a gap found in AR social and tourism',
    award: '',
    image: 'img/gallery/16.webp',
    github: 'https://github.com/sidvashisth2005/NEW-CODE-AROUND-YOU',
    tags: ['ARCore', 'Vuforia', 'Unity', 'Flutter', 'Firebase'],
    bullets: [
      'Geo-tagged 3D AR memories shared across devices, built on the Map Tiles API with ARCore and Vuforia (Unity, Blender, Flutter, Firebase).',
      'Prioritised features from user-behaviour data and built the product pitch from a competitive landscape analysis.',
    ],
  },
  {
    id: 'travelgo',
    kanji: '旅',
    kanjiMeaning: 'journey',
    label: 'TravelGo',
    title: 'TravelGo',
    category: 'AI travel platform',
    technique: 'Route Oracle',
    big: '4',
    bigLabel: 'APIs unified into one planning flow',
    award: '',
    image: 'img/gallery/15.webp',
    github: 'https://github.com/sidvashisth2005/Travelling-App',
    tags: ['Hugging Face LLM', 'TripAdvisor API', 'REST APIs', 'Python'],
    bullets: [
      'Mapped the competitive landscape and found travel planning split across too many tools.',
      'Architected a full-stack platform on 4 APIs (Hugging Face LLM, TripAdvisor, mapping, booking) for AI itineraries and real-time budget planning.',
    ],
  },
  {
    id: 'superstore',
    kanji: '商',
    kanjiMeaning: 'commerce',
    label: 'Superstore',
    title: 'Superstore Marketing Consultancy',
    category: 'BD & growth strategy',
    technique: 'Footfall Surge',
    big: '+25%',
    bigLabel: 'customer footfall after all 3 recommendations shipped',
    award: '',
    image: 'img/gallery/12.webp',
    github: '',
    tags: ['Market research', 'BD strategy', 'Client work'],
    bullets: [
      'Diagnosed low footfall through customer segment mapping, sales-pattern analysis and competitor benchmarking across 3+ categories.',
      'Delivered three recommendations. The client implemented every one and saw a measurable revenue uplift.',
    ],
  },
];

export const stats = [
  { value: 6200, suffix: '+', label: 'Participants outranked at HackNITR 7.0', bar: 1, kanji: '勝', meaning: 'victory', type: 'Pitch', rarity: 'UR', stars: 5 },
  { value: 0, from: 100, suffix: '%', label: 'Attack success on a 5G intrusion detector, down from 100%', bar: 1, kanji: '盾', meaning: 'shield', type: 'Research', rarity: 'UR', stars: 5 },
  { value: 65, suffix: '%', label: 'Cost cut per head on the livestock monitor', bar: 0.65, kanji: '削', meaning: 'cut', type: 'Build', rarity: 'SSR', stars: 5 },
  { value: 30, suffix: '%', label: 'Platform user growth for a B2B marketplace', bar: 0.3, kanji: '成', meaning: 'growth', type: 'Growth', rarity: 'SSR', stars: 4 },
  { value: 15, suffix: '%', label: 'Accuracy gain on an ML classification model', bar: 0.15, kanji: '精', meaning: 'precision', type: 'Data', rarity: 'SR', stars: 3 },
  { value: 100, suffix: '%', label: 'On-time delivery leading 3 teams of 15–18', bar: 1, kanji: '隊', meaning: 'squad', type: 'Lead', rarity: 'UR', stars: 5 },
];

// Newest first. `short` is the name on the level-up track.
export const dojos = [
  {
    company: 'IIIT Design & Manufacturing Jabalpur',
    short: 'IIITDM',
    name: 'IIITDM Jabalpur',
    role: 'Research Intern · Adversarial ML',
    where: 'Jabalpur, MP',
    period: 'May – Jul 2026',
    metric: '0%',
    metricLabel: 'attack success (was 100%)',
    // the level-up card shows these; `notes` (full detail) feed the AI clone
    brief: [
      'Built STDA, a gradient-free adversarial defense that shields a 5G intrusion detector from evasion attacks.',
      'Its log-scaled quantization took attack success from 100% to 0.00% at 99.94% F1, #1 of 19 baselines.',
      '30 attack variants, 5 datasets, 5 seeds (p < 0.0001), at 345,966 flows a second.',
    ],
    classChange: 'Builder → Researcher',
    stats: { str: 86, bld: 84, dat: 96, ldr: 92 },
    notes: [
      'Engineered STDA, a 4-stage gradient-free adversarial defense pipeline (Python, scikit-learn, XGBoost) that shields a 5G network intrusion detector from evasion attacks through feature quantization.',
      'Designed Adaptive Log-Scaled Quantization (ALQ): attack success fell from 100% to 0.00% at 99.94% F1 on 1.2M flows, ranking #1 of 19 baselines.',
      'Ran 9 experiments against 30 adversarial variants (FGSM, PGD, C&W, ZOO, PSO) on 5 datasets, validated across 5 seeds (p < 0.0001) at 345,966 flows per second.',
    ],
  },
  {
    company: 'Trustique Assists Pvt. Ltd.',
    short: 'Trustique',
    role: 'Software Development & BD Intern → Team Lead',
    where: 'Hybrid',
    period: 'Jun – Aug 2025',
    metric: '+30%',
    metricLabel: 'platform user base',
    classChange: 'Intern → Team Lead',
    stats: { str: 84, bld: 72, dat: 76, ldr: 90 },
    brief: [
      'Promoted to Team Lead: 3 cross-functional teams of 15–18, 100% on-time delivery with Agile and Scrum.',
      'Data-led feature prioritisation behind 30% user growth on a B2B marketplace.',
    ],
    notes: [
      'Promoted to Team Lead; led 3 cross-functional teams of 15–18 shipping a B2B marketplace app at 100% on-time delivery with Agile and Scrum.',
      'Prioritised product features from user-behaviour analytics, contributing to 30% growth in the platform user base through data-informed, API-driven delivery.',
    ],
  },
  {
    company: 'Skill Dzire',
    short: 'Skill Dzire',
    role: 'Machine Learning Intern',
    where: 'Remote',
    period: 'Dec 2024 – Jan 2025',
    metric: '+15%',
    metricLabel: 'ML model accuracy',
    stats: { str: 38, bld: 64, dat: 72, ldr: 24 },
    notes: ['Improved ML classification accuracy by 15% through data cleaning, feature engineering and EDA in Python.'],
  },
  {
    company: 'Codesoft',
    short: 'Codesoft',
    role: 'Software Development Intern',
    where: 'Remote',
    period: 'Jun – Jul 2024',
    metric: '−20%',
    metricLabel: 'code-review cycles',
    stats: { str: 30, bld: 60, dat: 22, ldr: 18 },
    notes: ['Cut code-review cycles by 20% by shipping 3 modular components with Agile methods.'],
  },
];

export const awards = [
  { title: 'Rank 1 · HackNITR 7.0', scope: 'International', desc: 'Topped 6,200+ participants from 20+ countries with the most advanced livestock-monitoring build, adding BLE and data hashing for tamper-proof telemetry. Sole presenter to a global jury.' },
  { title: '1st Runner-up · HACKSAGON 2025', scope: 'National', desc: 'Advanced the hardware prototype at a product-focused hackathon, refining the wearable-and-sensor build and its go-to-market.' },
  { title: 'Winner · University Ideathon 2024', scope: 'University', desc: 'Originated the concept among 30+ teams: preventable-disease monitoring that protects farmers’ high-value animals at a fraction of one animal’s price.' },
  { title: 'Team Lead · Bhopal Vigyan Mela 2024', scope: 'National', desc: 'Four projects shown at a four-day national science exhibition.' },
  { title: 'Published · JUET National Conference', scope: 'Research', desc: 'Authored and presented a paper on Social and Library Sciences to 100+ attendees.' },
];

// Stat sheet for the level-up screen: a self-assessed read of how each internship grew each skill (0–100)
export const statNames = [
  { key: 'str', label: 'Strategy', short: 'STR' },
  { key: 'bld', label: 'Build', short: 'BLD' },
  { key: 'dat', label: 'Data', short: 'DAT' },
  { key: 'ldr', label: 'Lead', short: 'LDR' },
];

export const leadership = [
  'Advisor, VRARMR Club: guiding the 100+ member AR/VR/MR club after serving as Joint Secretary, where I screened 50+ candidates through technical interviews.',
  'Co-Organiser, Code Srijan (JUET): led the sponsorship team and ran problem-setting, logistics and participant coordination for the university coding contest.',
  'Organiser, TACHYON 2025: logistics, sponsorship and partner outreach for a tech fest that drew 2,000+ attendees.',
  'Sole pitcher: 6+ hackathon stages, national and international.',
];

export const episodes = [
  { ep: 'EP 01', title: 'What BD Actually Means in a Startup' },
  { ep: 'EP 02', title: 'Pitching to Judges Who’ve Seen It All' },
  { ep: 'EP 03', title: 'How I Built a Team at 19 and Led It' },
  { ep: 'EP 04', title: 'The Research → Product → Pitch Pipeline' },
];
