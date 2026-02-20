import { mutation } from "./_generated/server";

const prospects = [
  { name: "Seven Sundays", category: "DTC/CPG" as const, contact: "Hannah Barnstable", title: "Co-Founder & CEO", email: "hannah@sevensundays.com", confidence: "verified" as const },
  { name: "So Good So You", category: "DTC/CPG" as const, contact: "Rita Katona", title: "Chief Brand & Innovation Officer", email: "rita@sogoodsoyou.com", confidence: "constructed" as const },
  { name: "Welly", category: "DTC/CPG" as const, contact: "Doug Stukenborg", title: "Co-Founder & CEO", email: "doug.stukenborg@getwelly.com", confidence: "constructed" as const },
  { name: "Humble Nut Butter", category: "DTC/CPG" as const, contact: "Jessica Waller", title: "Co-Founder", email: "jess@humblenutbutter.com", confidence: "constructed" as const },
  { name: "Faribault Mill", category: "DTC/CPG" as const, contact: "Ini Iyamba", title: "VP of Merchandising", email: "iiyamba@faribaultmill.com", confidence: "constructed" as const },
  { name: "Finnegans Brew Co.", category: "DTC/CPG" as const, contact: "Jacquie Berglund", title: "Founder & CEO", email: "jacquie@finnegans.org", confidence: "constructed" as const },
  { name: "Fulton Brewing", category: "DTC/CPG" as const, contact: "Holly Manthei", title: "VP of Marketing", email: "holly@fultonbeer.com", confidence: "constructed" as const },
  { name: "Colle McVoy", category: "Agency" as const, contact: "Ciro Sarmiento", title: "Chief Creative Officer", email: "ciro.sarmiento@collemcvoy.com", confidence: "constructed" as const },
  { name: "Carmichael Lynch", category: "Agency" as const, contact: "Marty Senn", title: "Chief Creative Officer", email: "marty.senn@clynch.com", confidence: "constructed" as const },
  { name: "Fallon", category: "Agency" as const, contact: "Leslie Shaffer", title: "Chief Creative Officer", email: "leslie.shaffer@fallon.com", confidence: "constructed" as const },
  { name: "SixSpeed", category: "Agency" as const, contact: "Grant Johnson", title: "Chief Creative Officer", email: "grant.johnson@six-speed.com", confidence: "constructed" as const },
  { name: "Russell Herder", category: "Agency" as const, contact: "Brian Herder", title: "Chief Creative Officer", email: "brian.herder@russellherder.com", confidence: "constructed" as const },
  { name: "Betty", category: "Agency" as const, contact: "Nicole Meyer", title: "Group Creative Director", email: "nmeyer@bettyagency.com", confidence: "constructed" as const },
  { name: "Sota Clothing", category: "Fashion" as const, contact: "Spencer Johnson", title: "Owner/Founder", email: "spencer@sotaclothing.com", confidence: "constructed" as const },
  { name: "Love Your Melon", category: "Fashion" as const, contact: "Zach Quinn", title: "Founder & CEO", email: "zach@loveyourmelon.com", confidence: "constructed" as const },
  { name: "Duluth Pack", category: "Fashion" as const, contact: "Andrea Johnson", title: "Marketing Manager", email: "andreaj@duluthpack.com", confidence: "constructed" as const },
  { name: "Mugsy Jeans", category: "Fashion" as const, contact: "Leo Tropeano", title: "Founder & CEO", email: "leo@mugsy.com", confidence: "constructed" as const },
  { name: "Dearborn Denim", category: "Fashion" as const, contact: "Robert McMillan", title: "Founder", email: "robert.mcmillan@dearborndenim.us", confidence: "constructed" as const },
  { name: "Shinola", category: "Fashion" as const, contact: "Jonathan Bailey", title: "Creative Director", email: "jbailey@shinola.com", confidence: "constructed" as const },
  { name: "Schwan's Company", category: "DTC/CPG" as const, contact: "Federico Arreola", title: "VP of Marketing", email: "federico.arreola@schwans.com", confidence: "constructed" as const },
  { name: "Kaskaid Hospitality", category: "E-commerce" as const, contact: "Courtney Earle", title: "Marketing Director", email: "courtney.earle@steelebrands.com", confidence: "constructed" as const },
  { name: "Creatis", category: "Agency" as const, contact: "Omar Ben Hassine", title: "CEO", email: "omar.benhassine@creatis.com", confidence: "constructed" as const },
];

export const seedCrm = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("clients").first();
    if (existing) return "Already seeded";

    const now = Date.now();
    for (const p of prospects) {
      const clientId = await ctx.db.insert("clients", {
        name: p.name,
        category: p.category,
        status: "prospect",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("crmContacts", {
        clientId,
        name: p.contact,
        title: p.title,
        email: p.email,
        emailConfidence: p.confidence,
        isPrimary: true,
      });
    }
    return `Seeded ${prospects.length} clients with contacts`;
  },
});
