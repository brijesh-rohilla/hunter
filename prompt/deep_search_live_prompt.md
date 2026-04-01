Goal:
Create a structured job-hunting system targeting MERN / Full Stack (Node.js / React) roles with a focus on fast hiring and high-probability opportunities.

Target Locations:
- Mohali
- Chandigarh
- Panchkula

Tasks:
1. Find IT companies that are CURRENTLY hiring MERN / Full Stack (Node.js / React) engineers.
   - Only include companies with active job openings (posted within last 30 days).
   - Prioritize roles with keywords:
     - "Immediate joiner"
     - "Urgent hiring"
     - "0-30 days notice period"

2. Focus on:
   - Product-based companies
   - Startups (Seed to Series C, YC / funded, SaaS)
   - Mid-size companies
   - Service-based companies (fast hiring)

3. Also identify “Hidden Job Opportunities”:
   - Companies NOT currently listing roles but:
     - Recently funded
     - Recently launched product
     - Growing engineering team
   - These are targets for cold outreach (LinkedIn / Email)

4. Collect Data:
   - Company Name
   - Company Type (Product / Startup / Service)
   - Website
   - Company Size
   - Location
   - Careers Page URL
   - Job Posting URL (if available)
   - Hiring Status (Active / Hidden Opportunity)
   - Hiring Speed (Fast / Medium / Slow)
   - Career Email (optional)
   - HR Email (1-2 if available)
   - LinkedIn Hiring Manager (Name + Profile URL)


Scoring Rules:

| Condition                         | Score |
|----------------------------------|-------|
| Startup using MERN               | +3    |
| Recently funded / growing        | +2    |
| Active job posting (<30 days)    | +3    |
| Fast hiring (≤ 30 days)          | +2    |
| Careers updated frequently       | +2    |
| Referral possible                | +3    |
| Contact found (HR / Manager)     | +2    |
| Hidden job (good outreach target)| +2    |

Priority:
Score ≥ 8 → HIGH (apply immediately / message)
Score 5–7 → MEDIUM
Score ≤ 4 → LOW

===========================================================
List of all companies in a JSON file with keys below:
   - Company Name
   - Location
   - Company Type
   - Hiring Status (Active / Hidden)
   - Website
   - Company Size
   - Careers URL
   - Job URL
   - Hiring Speed
   - Referral Status
   - Contact Available (Yes / No)
   - Last Checked Date
   - Score
   - Priority