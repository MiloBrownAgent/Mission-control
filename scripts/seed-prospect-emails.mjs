/**
 * Seed script: Prospect outreach emails for Look & Seen
 * Run: CONVEX_DEPLOYMENT='cloud:proper-rat-443' node scripts/seed-prospect-emails.mjs
 *
 * Uses Convex HTTP API directly to insert into production.
 */

const CONVEX_URL = "https://proper-rat-443.convex.cloud";

const emails = [
  {
    prospectName: "Maria Vu",
    company: "Glossier",
    role: "Creative Director",
    email: "",
    subject: "Look & Seen — retouching for your new visual era",
    body: `Hi Maria,

Congrats on the Creative Director role — the brand's shift toward cleaner, more editorial imagery since you came on is already noticeable, and the packaging campaign you ran last quarter had that quiet confidence Glossier's been missing.

We're a Minneapolis-based retouching and digital tech studio with credits across Target, On Running, and a few beauty campaigns you'd recognize — we're also deep into AI image generation for brands that want to prototype campaign looks before committing to a full shoot budget.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "DTC/CPG",
    notes: "New CD hired 2025, former Nike/Calvin Klein. Perfect timing.",
  },
  {
    prospectName: "Creative Director",
    company: "Cleveland Clinic",
    role: "Creative Director",
    email: "",
    subject: "Commercial retouching — we work with Mayo, and Cleveland Clinic is on the shortlist",
    body: `Hi,

Mayo Clinic has been a Look & Seen account for a while now — the level of craft their team requires for patient-facing campaigns and brand photography is a bar we're built for, and I imagine Cleveland Clinic's standards are identical.

We specialize in medical and healthcare commercial retouching: clean, technically precise, no over-processing — the kind of work that holds up in print, OOH, and broadcast without looking like a stock photo.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Healthcare",
    notes: "Mayo Clinic credential is the perfect door opener here.",
  },
  {
    prospectName: "Art Director, Commercial Creative",
    company: "Condé Nast",
    role: "Art Director, Vogue Commercial Creative",
    email: "",
    subject: "Expanding the Look & Seen relationship — Allure, GQ, AD",
    body: `Hi,

We've been doing retouching for Vogue's commercial side for a bit now and the work has been going well — wanted to reach out directly about bringing that same relationship to Allure, GQ, and Architectural Digest when the right project comes up.

Our turnaround, editorial sensibility, and skin work translate directly across titles — we understand the Condé Nast visual standard and we're already in the system.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Editorial",
    notes: "Existing Vogue relationship — expanding to other CN titles.",
  },
  {
    prospectName: "Head of Art Production",
    company: "Leo Burnett Chicago",
    role: "Head of Art Production",
    email: "",
    subject: "Retouching partner for Burnett's production volume — based in Minneapolis",
    body: `Hi,

Leo Burnett's production output for Coca-Cola, P&G, and McDonald's is the kind of volume that demands a retouching partner who can operate at that pace without dropping quality — we built Look & Seen specifically for that kind of sustained commercial work.

We're Minneapolis-based (close to Chicago, same timezone), have digital tech experience on national shoots, and do a lot of work in food, lifestyle, and consumer product categories that map directly to your client roster.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Agency",
    notes: "Publicis network, massive production volume.",
  },
  {
    prospectName: "Head of Art Production",
    company: "Energy BBDO Chicago",
    role: "Head of Art Production",
    email: "",
    subject: "Look & Seen — retouching for BBDO's Chicago campaigns",
    body: `Hi,

Energy BBDO's been on the Ad Age A-List two years running for a reason — the production quality on your national brand work is consistently excellent, and that requires a retouching partner that doesn't slow the machine down.

We're Look & Seen, a Minneapolis studio with credits at Target, On Running, and several major national campaigns — same market, short flights, and we move fast on deadlines.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Agency",
    notes: "BBDO worldwide, Ad Age A-List 2025.",
  },
  {
    prospectName: "Director of Creative Photography",
    company: "General Mills",
    role: "Director of Creative Photography",
    email: "",
    subject: "Look & Seen — local retouching partner for General Mills",
    body: `Hi,

Golden Valley and Minneapolis — we're practically neighbors, and that matters when you're running the kind of food and lifestyle photography volume General Mills produces in-house.

We've done commercial retouching and on-set digital tech for a lot of consumer product shoots and know what it takes to make food look real and appetizing without the artificial polish that screams "retouched" — the Cheerios and Nature Valley aesthetic you're protecting is something we understand.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "DTC/CPG",
    notes: "Fortune 500, local to Minneapolis, massive photo volume.",
  },
  {
    prospectName: "Creative Director",
    company: "Medtronic",
    role: "Creative Director",
    email: "",
    subject: "Medical device photography retouching — we work with Mayo",
    body: `Hi,

Medtronic's marketing photography sits in a specific category — it has to be medically credible, emotionally resonant, and polished enough for a Fortune 100 brand. We know that space well from our work with Mayo Clinic, and I think the standards translate directly.

Look & Seen is a Minneapolis retouching studio focused on commercial and healthcare photography — Fridley to Minneapolis is nothing, and we've never missed a medical campaign deadline.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Healthcare",
    notes: "World's largest medtech, local to Minneapolis.",
  },
  {
    prospectName: "Jonathan Cheung",
    company: "Lululemon",
    role: "Global Creative Director",
    email: "",
    subject: "Look & Seen — retouching and AI generation for Lululemon's campaign work",
    body: `Hi Jonathan,

The direction you've been taking Lululemon's creative since joining — that tension between athletic utility and fashion-forward editorial — is a look that requires really precise retouching to land correctly. Too much and it loses the authenticity. Too little and it doesn't hit the quality bar.

We do high-end commercial retouching for athletic and fashion brands, and we've been building out AI image generation as a production tool — useful for rapid concepting when you want to pressure-test a campaign direction before committing to a full shoot.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Fashion",
    notes: "Named contact. New GCD hired 2024, former Gap/Levi.",
  },
  {
    prospectName: "Head of Brand Creative",
    company: "On Running",
    role: "Head of Brand Creative (US)",
    email: "",
    subject: "Expanding our work together as On Running's US presence grows",
    body: `Hi,

We've been proud to support On Running's creative work as it's scaled in the US — and with the brand's growth trajectory and the new campaign directions you're running, I wanted to open a conversation about deepening that relationship.

Whether it's increased retouching volume, digital tech support on set for upcoming US shoots, or using AI generation to concept campaign variations before you fly the crew — we're built to grow with you.

Happy to send examples of our expanded work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Brand",
    notes: "Existing client — relationship expansion play.",
  },
  {
    prospectName: "Head of Production",
    company: "72andSunny",
    role: "Head of Production",
    email: "",
    subject: "Look & Seen — production retouching for 72's lifestyle campaigns",
    body: `Hi,

72andSunny's on the A-List back to back for a reason — the photo direction on your lifestyle campaigns is consistently some of the best in the industry, and that quality requires a retouching partner who doesn't water it down in post.

We're Look & Seen, a Minneapolis studio with credits at Target, Nike, and On Running — we do commercial retouching, on-set digital tech, and AI image generation for brands that care about craft.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Agency",
    notes: "Ad Age A-List 2024 and 2025, LA/Brooklyn offices.",
  },
  {
    prospectName: "Head of Production",
    company: "Wieden+Kennedy New York",
    role: "Head of Production",
    email: "",
    subject: "Look & Seen — retouching for W+K NY (we're already in the Nike portfolio)",
    body: `Hi,

We've done retouching for Nike campaigns, so we already know the visual standard that W+K demands — and we know you can't send that work to a generalist shop and expect it to come back right.

Look & Seen is a Minneapolis-based commercial retouching studio — on-set digital tech experience, fast turnaround on campaign assets, and AI generation capability for concepts. Stanley Post handles your UK retouching; we'd love to be the conversation for the US side.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Agency",
    notes: "Priority target. Nike in L&S portfolio. NY office opening.",
  },
  {
    prospectName: "Creative Director",
    company: "Periscope (Quad Company)",
    role: "Creative Director",
    email: "",
    subject: "Look & Seen — local retouching partner for Periscope",
    body: `Hi,

Periscope runs photo-heavy retail and lifestyle work for Target, Bridgestone, and Raw Sugar — and we work with Target directly, so we already understand the pace and visual standard those relationships require.

We're Minneapolis-based, which means no timezone friction, and we have experience across the full retouching pipeline — campaign photography, product, lifestyle, and on-set digital tech support.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Agency",
    notes: "Largest indie agency in Twin Cities, Target is a shared client.",
  },
  {
    prospectName: "Signe Peterson",
    company: "Allina Health",
    role: "Director of Marketing & Brand Expression",
    email: "",
    subject: "Commercial retouching for Allina Health — we're local, and we work with Mayo",
    body: `Hi Signe,

Allina Health's marketing photography — Abbott Northwestern, United Hospital, the system brand — sits in the same category as Mayo Clinic's work, which we've been retouching for a while now. The technical and emotional precision required is something most generalist shops can't deliver.

We're Look & Seen, a Minneapolis studio, and we've built our healthcare retouching practice around exactly this type of work: medically credible, warm, and polished enough for a top health system's standard.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Healthcare",
    notes: "Named contact. Local Minneapolis, Mayo credential is key.",
  },
  {
    prospectName: "Creative Director",
    company: "Colle McVoy",
    role: "Creative Director",
    email: "",
    subject: "Look & Seen — Minneapolis retouching for Colle McVoy's food and brand campaigns",
    body: `Hi,

Colle McVoy's work for Land O'Lakes, McCormick, and Crystal Farms requires exactly the kind of retouching that's easy to get wrong — food photography especially is all in the detail, the lighting hold, the texture that reads real.

We're Look & Seen, a Minneapolis studio, and we love working with agencies that care about craft — your B Corp status tells me you think about quality the same way we do. We can turn around campaign retouching at agency pace without sacrificing what makes the image worth looking at.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Agency",
    notes: "Ad Age Best Agency 2024, BCorp, local Minneapolis.",
  },
  {
    prospectName: "Head of Art Production",
    company: "Carmichael Lynch",
    role: "Head of Art Production",
    email: "",
    subject: "Look & Seen — your Minneapolis retouching partner for Subaru, Porsche, and Harley",
    body: `Hi,

Carmichael Lynch's automotive and lifestyle campaigns — Subaru's emotional storytelling, the Porsche precision, Harley's grit — all require retouching that serves the brand voice instead of homogenizing it. That's a narrow craft and it's what we do.

We're right here in Minneapolis, we've worked on major national campaigns across automotive, lifestyle, and consumer products, and we can support on-set digital tech or take assets post-production — whatever the shoot requires.

Happy to send examples of our work — would a quick call make sense?

Dave Sweeney
Look & Seen, Inc.
lookandseen.com`,
    category: "Agency",
    notes: "Tier 1 local agency, Subaru/Porsche/Harley clients.",
  },
];

async function seed() {
  let inserted = 0;
  const now = Date.now();

  for (const email of emails) {
    try {
      const res = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Convex-Client": "npm-1.33.0",
        },
        body: JSON.stringify({
          path: "prospectEmails:create",
          args: {
            prospectName: email.prospectName,
            company: email.company,
            role: email.role,
            email: email.email,
            subject: email.subject,
            body: email.body,
            category: email.category,
            notes: email.notes,
          },
          format: "json",
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        inserted++;
        console.log(`✓ ${email.company} — ${email.prospectName}`);
      } else {
        console.error(`✗ ${email.company}:`, JSON.stringify(data));
      }
    } catch (err) {
      console.error(`✗ ${email.company}:`, err.message);
    }
  }

  console.log(`\nDone: ${inserted}/${emails.length} emails seeded.`);
}

seed();
