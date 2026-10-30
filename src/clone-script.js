// 影分身 · The shadow clone's offline answers: what it says when the AI isn't switched on (or on a static preview).
// The full site (src/ui/services.js) and the 3D world's study (src/world/founder.js) both use them.
import { profile } from './data.js';

// Offline answers so the clone still helps when the AI isn't switched on (or on a static preview).
export const scripted = [
  [/hack|nitr|win|rank|trophy|6,?200|compet/i, 'HackNITR 7.0 is the big one: Rank 1 out of 6,200+ participants from 20+ countries, and I was the sole presenter, pitching commercialisation, competitive analysis and ROI to a global jury. Same project took 1st Runner-up at HACKSAGON 2025, and I won the University Ideathon 2024 against 30+ teams.'],
  [/intern|experience|work|job|trustique|codesoft|skill ?dzire|team lead|research|iiit|jabalpur|adversarial/i, 'Four internships. Most recent: research intern at IIITDM Jabalpur (May–Jul 2026), where I built STDA, an adversarial defense for a 5G intrusion detector that took attack success from 100% to 0.00% at 99.94% F1, ranked #1 of 19 baselines. Before that, Team Lead at Trustique (3 teams of 15–18, 100% on-time, +30% users), +15% ML accuracy at Skill Dzire, and 20% faster code reviews at Codesoft.'],
  [/project|build|livestock|iot|around|\bar\b|travel|superstore|product/i, 'Four special moves: a Livestock Monitoring System (IoT + AI, ~65% cheaper per head), ARound You (geo-tagged AR memories with ARCore), TravelGo (AI trip planning across 4 APIs) and a superstore consultancy that lifted footfall 25%+. Scroll to Special moves to see each one.'],
  [/hire|why|fit|role|strength|value/i, 'I sit where strategy meets building: I can research a market, build the thing, and then pitch it to a jury of strangers and win. Rank 1 of 6,200+, a promotion to Team Lead in one internship, and real client results. Open to BD, business analyst, growth and product roles from Q4 2026.'],
  [/skill|tech|stack|tool|python|flutter|sql|excel|\bml\b|machine learning|c\+\+/i, 'Languages: Python, C++, Dart (Flutter), MySQL, Firebase. ML: adversarial ML, scikit-learn, XGBoost, feature engineering, NumPy, Pandas. Tools: Flutter, ARCore, REST APIs, Git, Android Studio, IoT, GCP. On the business side: BD, market research, ROI analysis and go-to-market.'],
  [/study|college|universit|degree|juet|cgpa|graduat|educat|school/i, 'Final-year B.Tech in Computer Science at JUET Guna (2023–2027, CGPA 7.5). Before that, Jay Jyoti School in Guna for Class X and XII (CBSE).'],
  [/contact|email|reach|call|linkedin|talk to/i, `Best way: send me a scroll from this site, or email ${profile.email}. I’m also on LinkedIn.`],
  [/lead|club|organi|tachyon|vrarmr|code srijan|advisor/i, 'I’m now Advisor to the VRARMR Club (100+ members, AR/VR/MR) after serving as its Joint Secretary, where I screened 50+ candidates. I co-organised Code Srijan, JUET’s coding contest, leading sponsorship, and organised TACHYON 2025 for 2,000+ attendees. I’ve also been sole pitcher on 6+ hackathon stages.'],
  [/podcast|on air|episode/i, 'On Air is my podcast: what BD actually means in a startup, pitching to judges who’ve seen it all, building a team at 19, and the research → product → pitch pipeline.'],
  [/where|location|relocat|remote|based/i, 'I’m based in Guna, Madhya Pradesh, and happy to relocate or work remote.'],
  [/\b(hi|hello|hey|yo|namaste)\b/i, 'Hey! I’m Siddhant’s shadow clone. Ask me about the HackNITR win, my internships, projects, or why I’d fit your team.'],
];
export const scriptedReply = (q) => (scripted.find(([re]) => re.test(q)) || [null, 'Good question for the real me. Send me a scroll from this site, or ask about my wins, internships, projects or skills.'])[1];

