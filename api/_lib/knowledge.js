// What the shadow clone and the scouter know. Built from the site's own data plus the résumé,
// so the AI never says anything the portfolio doesn't.
import { profile, moves, dojos, awards, leadership, stats } from '../../src/data.js';

const list = (xs) => xs.map((x) => `- ${x}`).join('\n');

export const facts = `
# Siddhant Vashisth: verified facts
Name: ${profile.name}. Based in ${profile.location}. Email: ${profile.email}. LinkedIn: ${profile.linkedin}. GitHub: ${profile.github}.
Headline: strategist who builds: business development and product strategy on one side; software, ML and adversarial-ML research on the other.
Status: final-year B.Tech CSE student at Jaypee University of Engineering and Technology (JUET), Guna, July 2023 – May 2027, CGPA 7.5/10. Graduating 2027. School: Jay Jyoti School, Guna (CBSE Class X and XII, 2021–2023).
Looking for: BD, business analyst, growth and product roles from Q4 2026 (full-time, or internships before that). Happy to relocate or work remote.
Summary: international hackathon champion (Rank 1 of 6,200+ at HackNITR 7.0) and research intern in adversarial machine learning at IIITDM Jabalpur (May–July 2026), where his defense took attack success on a 5G intrusion detector from 100% to 0.00%. Pitches product strategy across AgriTech, AR and AI; sole pitcher on 6+ national and international hackathon stages.

## Experience
${dojos.map((d) => `### ${d.role}, ${d.company} (${d.where}, ${d.period})\n${list(d.notes)}`).join('\n')}

## Projects
${moves.map((m) => `### ${m.title} (${m.category})${m.award ? `, ${m.award}` : ''}\nHeadline number: ${m.big}, ${m.bigLabel}.\n${list(m.bullets)}\nTags: ${m.tags.join(', ')}.${m.github ? ` Code: ${m.github}` : ''}`).join('\n')}
The Livestock Monitoring System also won 1st Runner-up at HACKSAGON 2025.

## Awards
${list(awards.map((a) => `${a.title} (${a.scope}): ${a.desc}`))}

## Leadership
${list(leadership)}
Also active across the Bitwise, Mozilla, NSS and BIS clubs.

## Numbers
${list(stats.map((s) => `${s.value}${s.suffix}: ${s.label}`))}

## Skills
Business: business development, market research, ROI analysis, go-to-market strategy, lead generation, competitive analysis, pitching.
Languages & databases: Python, C++, Dart (Flutter), MySQL, Firebase.
ML & data science: adversarial ML, scikit-learn, XGBoost, feature engineering, NumPy, Pandas, Matplotlib.
Frameworks & tools: Flutter, ARCore, Vuforia, Unity, REST APIs, Git/GitHub, Android Studio, IoT, GCP.
Core CS: data structures & algorithms, DBMS, operating systems, OOP, computer networks.
Also: SQL, MS Excel, MS PowerPoint, Agile and Scrum.
Certifications: Machine Learning (Skill Dzire), Flutter Development (Trustique), Google Cloud Platform.

## Extra
Hosts a podcast on the site, "On Air", about BD in startups, pitching, building teams and the research → product → pitch pipeline.
Pitch style: sole presenter on 6+ hackathon stages; turns raw market signal into products and pitches.
`.trim();
