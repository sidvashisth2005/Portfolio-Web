// What the shadow clone and the scouter know. Built from the site's own data plus the résumé,
// so the AI never says anything the portfolio doesn't.
import { profile, moves, dojos, awards, leadership, stats } from '../../src/data.js';

const list = (xs) => xs.map((x) => `- ${x}`).join('\n');

export const facts = `
# Siddhant Vashisth: verified facts
Name: ${profile.name}. Based in ${profile.location}. Email: ${profile.email}. LinkedIn: ${profile.linkedin}. GitHub: ${profile.github}.
Headline: Business Development · Business Analyst · Growth Strategy. Business strategist who also builds.
Status: B.Tech CSE student at Jaypee University of Engineering and Technology (JUET), Guna, 2023–2027, CGPA 7.5. Graduating 2027.
Looking for: BD, business analyst, growth and product roles from Q4 2026 (full-time, or internships before that). Happy to relocate or work remote.
Summary: international hackathon champion (Rank 1 of 6,200+ at HackNITR 7.0) recognised for pitching product strategy across AgriTech, AR and AI; real consulting outcomes across 6+ national and international competitions.

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
Technical: Flutter, Python, IoT, Git/GitHub, Android Studio, ARCore, Firebase.
Data & tools: SQL, MS Excel, MS PowerPoint, Agile.
Coursework: data structures & algorithms, DBMS, SQL.
Certifications: Machine Learning (Skill Dzire), Flutter Development (Trustique), Google Cloud Platform.

## Extra
Hosts a podcast on the site, "On Air", about BD in startups, pitching, building teams and the research → product → pitch pipeline.
Pitch style: sole presenter on 6+ hackathon stages; turns raw market signal into products and pitches.
`.trim();
