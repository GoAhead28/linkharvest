import { useState, useEffect } from "react";

// ─── API ────────────────────────────────────────────────────
const callClaude = async (prompt, max_tokens = 700, useSearch = false) => {
  const body = {
    model: "claude-haiku-4-5-20251001",
    max_tokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "";
};

// ─── DATA RÉELLE ─────────────────────────────────────────────
// Seuils karma Reddit documentés (seo-true.com, leadmore.ai, leadsfromurl.com 2025-2026)
const REDDIT_SUBS_FR = [
  { sub: "r/france", karma: 100, age_days: 30, members: "1.2M", niche: "général", link_ok: "réponses profondes seulement" },
  { sub: "r/financepersonnelle", karma: 50, age_days: 14, members: "180k", niche: "fiscal/épargne", link_ok: "contexte obligatoire" },
  { sub: "r/immobilier", karma: 100, age_days: 30, members: "95k", niche: "immo", link_ok: "expertise prouvée" },
  { sub: "r/entrepreneuriat", karma: 200, age_days: 45, members: "75k", niche: "business", link_ok: "Self-promo samedi seulement" },
  { sub: "r/juridique", karma: 150, age_days: 30, members: "60k", niche: "droit/fiscal", link_ok: "sources officielles préférées" },
  { sub: "r/domotique", karma: 50, age_days: 7, members: "45k", niche: "rénovation/tech", link_ok: "tutoriels bienvenus" },
  { sub: "r/renovationmaison", karma: 30, age_days: 7, members: "28k", niche: "rénovation", link_ok: "liens d'aide acceptés" },
];

// Hiérarchie technique des liens Reddit (seo-true.com 2026)
const REDDIT_LINK_HIERARCHY = [
  { type: "Reply profonde (commentaire de commentaire)", karma_min: 50, risk: "faible" },
  { type: "Self-post long texte", karma_min: 200, risk: "moyen" },
  { type: "Post principal (link post)", karma_min: 500, risk: "élevé" },
];

// Canaux enrichis avec données réelles
const CHANNELS = [
  {
    id: "haro_sos",
    name: "HARO / Source of Sources",
    icon: "📰",
    category: "presse",
    dofollow: true,
    da_range: "70–98",
    effort: "medium",
    speed: "medium",
    score: 95,
    why_pro: "Backlinks presse éditoriaux — Forbes, Fast Company, Yahoo. Introuvable en SEO classique.",
    trustSteps: [
      { label: "S'inscrire sur haro.com + sos.pr + qwoted.com", days: 0, canLink: false, detail: "HARO relancé par Featured.com en avril 2025, email digest gratuit 3x/jour. SOS = créateur original de HARO, 36% de liens dofollow (étude BuzzStream 2025)" },
      { label: "Scanner les requêtes de ta niche", days: 1, canLink: false, detail: "Mots-clés : finance, immobilier, fiscalité, rénovation, entrepreneur. Délai moyen de réponse : 2–4h après l'email" },
      { label: "Pitcher en 150 mots max", days: 1, canLink: true, detail: "Journalistes reçoivent 100+ réponses. Structure gagnante : credential 1 phrase → insight 2–3 phrases → quote prête à copier. Pas de lien dans le pitch, il vient dans la publication." },
    ],
    tips: "SOS a 36% de liens dofollow vs 25% pour Featured. Qwoted = qualité premium mais 2 pitches/mois gratuits. Sur X/LinkedIn chercher #journorequest #prrequest.",
    data_source: "BuzzStream study 2025 — 7 platforms analysées, mai–juin 2025",
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: "🔴",
    category: "communautés",
    dofollow: false,
    da_range: "91",
    effort: "high",
    speed: "slow",
    score: 87,
    why_pro: "Cité par Google AI Overview sur 22 000+ keywords. Deal Google/Reddit 60M$/an signé 2024.",
    trustSteps: [
      { label: "Compte + lurk 7 jours", days: 0, canLink: false, detail: "0 karma. Upvotes uniquement. CQS (Content Quality Score) interne Reddit commence à se constituer dès J1." },
      { label: "Phase commentaires courts", days: 7, canLink: false, detail: "10 commentaires/jour dans r/AskReddit, r/NoStupidQuestions, r/explainlikeimfive. Cible : 50 karma comment en 2 semaines." },
      { label: "Réponses longues dans la niche", days: 21, canLink: false, detail: "r/financepersonnelle (50 karma), r/renovationmaison (30 karma). Réponses 200+ mots, pas de lien." },
      { label: "1er lien : reply profonde uniquement", days: 45, canLink: true, detail: "Karma 100+. Lien uniquement en reply de reply (depth 2+). Seuil minimum : 50–100 karma. Self-post : 200–500 karma. r/Entrepreneur : 500 karma minimum + 90 jours." },
    ],
    tips: "r/france (100k+30j), r/financepersonnelle (50k+14j), r/renovationmaison (30k+7j). Reply profonde = seuil le plus bas (50–100 karma). Post principal = interdit avant 500+.",
    data_source: "seo-true.com 2026 + leadmore.ai Reddit Survival Guide 2026",
  },
  {
    id: "quora",
    name: "Quora FR",
    icon: "🔵",
    category: "Q&A",
    dofollow: false,
    da_range: "93",
    effort: "medium",
    speed: "medium",
    score: 82,
    why_pro: "Ranke en position 1 Google sur queries informationnelles. Threads Quora cités par AI Overviews.",
    trustSteps: [
      { label: "Profil expert complet", days: 0, canLink: false, detail: "Photo réelle, bio 150 mots, 3 domaines d'expertise précis. Quora a un 'trust score' interne invisible qui booste la distribution des réponses de comptes consistants (BlackHatWorld 2026)." },
      { label: "5 réponses longues sans lien", days: 3, canLink: false, detail: "500+ mots, structure : contexte → chiffres → conseil actionnable → disclaimer. Upvotes = signal de distribution sur les prochaines réponses." },
      { label: "Lien contextuel en fin de réponse", days: 10, canLink: true, detail: "Jamais en 1er paragraphe. Formulation : 'J'ai détaillé le calcul ici [lien] si tu veux creuser'. Les liens d'affiliation directs sont bannis et les comptes suspendus en cas de détection." },
    ],
    tips: "Quora FR bien moins compétitif que EN. Niche fiscale/immo quasi vierge. Répondre aux questions < 48h = meilleure visibilité. Topic authority : répondre 5x sur même sujet = boost de distribution.",
    data_source: "BlackHatWorld thread 2026 — analyse comptes Quora FR",
  },
  {
    id: "stackoverflow",
    name: "Stack Exchange Network",
    icon: "🟠",
    category: "Q&A tech",
    dofollow: false,
    da_range: "93",
    effort: "high",
    speed: "slow",
    score: 79,
    why_pro: "Sites niches : Money.SE (finance perso), Law.SE, Webmasters.SE. Réponses indexées en < 24h.",
    trustSteps: [
      { label: "10 rep points — commentaires seulement", days: 0, canLink: false, detail: "Stack Overflow : poster un lien externe = flaggé spam si < 50 rep. Money.SE : questions fisales FR souvent sans réponse = opportunité." },
      { label: "50 rep — lien autorisé", days: 7, canLink: true, detail: "Règle absolue : lien UNIQUEMENT si c'est la meilleure ressource possible sur la question. 1 lien vers ton outil dans 10 réponses = normal. 5/10 = shadowban." },
    ],
    tips: "Money.SE (money.stackexchange.com) : questions fiscales FR peu couvertes. Webmasters.SE : questions SEO techniques. Cibles parfaites pour simulateurs et outils.",
    data_source: "Stack Exchange help center — rep thresholds officiels",
  },
  {
    id: "substack",
    name: "Substack",
    icon: "📧",
    category: "newsletters",
    dofollow: true,
    da_range: "91",
    effort: "low",
    speed: "fast",
    score: 78,
    why_pro: "Liens dans articles Substack = DOFOLLOW confirmé (inspection HTML, pas de rel=nofollow). Négligé par 95% des SEO.",
    trustSteps: [
      { label: "Commenter des newsletters de ta niche", days: 0, canLink: false, detail: "Commentaires Substack sont publics et indexés. 3–5 commentaires substantiels sur newsletters populaires de ta niche." },
      { label: "Créer ta propre newsletter", days: 7, canLink: true, detail: "Articles Substack = liens DOFOLLOW sur domaine DA91. 1 article/semaine avec lien vers ton outil. Connecter à Google Search Console via /feed.xml pour accélérer l'indexation." },
      { label: "Cross-recommandations", days: 21, canLink: true, detail: "Demander des recommandations mutuelles à des newsletters de ta niche. Chaque recommandation = backlink dofollow depuis un autre Substack." },
    ],
    tips: "ATTENTION : les commentaires Substack sont nofollow. Seuls les articles et recommandations sont dofollow. Créer une newsletter dans ta niche = machine à backlinks dofollow légitimes.",
    data_source: "tanweerali.substack.com — inspection HTML confirmée 2024",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "🔷",
    category: "pro",
    dofollow: true,
    da_range: "99",
    effort: "medium",
    speed: "fast",
    score: 85,
    why_pro: "Liens profil = dofollow DA99. Articles LinkedIn indexés par Google. Journalistes #journorequest sur LinkedIn.",
    trustSteps: [
      { label: "Profil 100% complété + lien site", days: 0, canLink: true, detail: "Section 'Site web' du profil = dofollow. Bios LinkedIn indexées par Google." },
      { label: "5 posts natifs sans lien", days: 7, canLink: false, detail: "L'algo LinkedIn pénalise les posts avec liens externes (-70% de reach). Posts natifs = visibilité maximale." },
      { label: "Lien dans 1er commentaire", days: 14, canLink: true, detail: "Stratégie validée : post sans lien → 1er commentaire avec lien. Reach préservé + lien indexé. Articles LinkedIn longs = liens internes autorisés sans pénalité." },
    ],
    tips: "#journorequest et #prrequest sur LinkedIn = opportunités presse gratuites. Journalistes FR très actifs sur LinkedIn vs Twitter/X.",
    data_source: "LinkedIn algorithm research 2025",
  },
  {
    id: "medium",
    name: "Medium",
    icon: "⬛",
    category: "blog",
    dofollow: false,
    da_range: "95",
    effort: "medium",
    speed: "fast",
    score: 72,
    why_pro: "Articles Medium rankent sur Google pour des requêtes où ton site ne rankerait jamais seul.",
    trustSteps: [
      { label: "Article pilier 1200+ mots", days: 0, canLink: true, detail: "Liens dans articles Medium = nofollow MAIS articles Medium eux-mêmes rankent en position 1-3 sur Google. Trafic direct > valeur SEO directe." },
    ],
    tips: "Medium = nofollow mais trafic réel. Meilleure stratégie : articles Medium qui rankent → trafic → conversions. Pas pour le juice SEO direct.",
    data_source: "Vérification HTML Medium 2025",
  },
  {
    id: "github",
    name: "GitHub",
    icon: "⚫",
    category: "dev",
    dofollow: true,
    da_range: "98",
    effort: "low",
    speed: "fast",
    score: 76,
    why_pro: "README.md indexés rapidement. Issues GitHub de projets populaires = backlinks dofollow DA98.",
    trustSteps: [
      { label: "Repo public + README avec lien", days: 0, canLink: true, detail: "Même un repo minimal avec un README bien rédigé = backlink dofollow DA98. Indexé en 24–72h." },
      { label: "Contribuer aux Issues de projets populaires", days: 7, canLink: true, detail: "Répondre à des Issues où ton outil est pertinent. Technique ignorée par 99% des SEO non-dev." },
    ],
    tips: "Créer un repo 'awesome-[ta-niche]' (ex: awesome-fiscalite-fr) = liste de ressources. Ces repos attirent des stars et des liens naturels.",
    data_source: "GitHub SEO analysis 2025",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    icon: "🟡",
    category: "dev/startup",
    dofollow: false,
    da_range: "87",
    effort: "high",
    speed: "slow",
    score: 74,
    why_pro: "Un Show HN qui performe = cascade de backlinks naturels depuis des blogs tech, newsletters, podcasts.",
    trustSteps: [
      { label: "Commenter 3 semaines", days: 0, canLink: false, detail: "10+ karma en commentaires techniques avant tout. Ton karma HN n'est pas public mais les mods le voient." },
      { label: "Show HN", days: 21, canLink: true, detail: "Format : 'Show HN: [Outil] — [Problème résolu en 1 phrase]'. Soumettre entre 8h-11h PT (14h-17h FR). Jamais le week-end." },
    ],
    tips: "Un Show HN avec 50+ points = articles sur IndieHackers, newsletters SaaS, blogs tech. Effet multiplicateur impossible à acheter.",
    data_source: "HN best practices — empirique 2024–2025",
  },
  {
    id: "wikipedia",
    name: "Wikipédia",
    icon: "📖",
    category: "encyclopédie",
    dofollow: false,
    da_range: "94",
    effort: "high",
    speed: "slow",
    score: 68,
    why_pro: "Nofollow MAIS citations Wikipedia = signal E-E-A-T fort pour Google. Apparaître dans Wikipedia = légitimité institutionnelle.",
    trustSteps: [
      { label: "50 éditions légitimes", days: 0, canLink: false, detail: "Corrections typos, ajout de sources officielles, traductions depuis WP anglais. Construire un historique réel." },
      { label: "Ajouter ton site comme référence externe", days: 60, canLink: true, detail: "Uniquement si ton contenu est la source primaire sur un fait vérifiable. Toute auto-promotion évidente = retrait immédiat + blocage compte." },
    ],
    tips: "Stratégie réaliste : créer du contenu (étude, données originales) qui mérite d'être cité. Puis quelqu'un d'autre l'ajoute sur WP. C'est le seul chemin durable.",
    data_source: "Wikipedia sourcing guidelines",
  },
  {
    id: "forums_fr",
    name: "Forums FR de niche (DA30–73)",
    icon: "🇫🇷",
    category: "forums",
    dofollow: true,
    da_range: "30–73",
    effort: "medium",
    speed: "medium",
    score: 70,
    why_pro: "CommentCaMarche (DA73), Developpez.com (DA73), Futura-Sciences (DA71) — quasi absents de tous les guides anglais.",
    trustSteps: [
      { label: "10 posts sans lien", days: 0, canLink: false, detail: "CommentCaMarche, Forum-immobilier.fr, Forum-assurance.com, Hardware.fr (niche tech). Présentation + réponses utiles." },
      { label: "Lien en signature ou réponse", days: 21, canLink: true, detail: "Signature visible sur chaque post. Lien contextuel dans réponses pertinentes. CCM autorise les liens dès 10 posts sur des sujets fiscaux/immo." },
    ],
    tips: "CCM (DA73) et Developpez.com (DA73) sont dofollow sur les liens de réponses. Quasi inexploités par les SEO car guides EN ne les mentionnent jamais.",
    data_source: "Moz DA scores 2025 — vérification manuelle",
  },
  {
    id: "producthunt",
    name: "Product Hunt",
    icon: "🐱",
    category: "startup",
    dofollow: true,
    da_range: "90",
    effort: "low",
    speed: "fast",
    score: 77,
    why_pro: "Page produit = dofollow DA90. Launch bien préparé = couverture presse automatique.",
    trustSteps: [
      { label: "Upvoter 10 projets", days: 7, canLink: false, detail: "Compte actif requis. Trouver un 'hunter' influent augmente la visibilité du jour J." },
      { label: "Lancer le produit", days: 14, canLink: true, detail: "Mardi–jeudi = meilleurs jours. Préparer une communauté à upvoter dès 0h01 PT. Chaque upvote = signal de trafic." },
    ],
    tips: "Trouver un hunter via hunterr.com. 100+ upvotes = articles automatiques sur The Startup, HackerNoon, etc.",
    data_source: "Product Hunt launch guides 2025",
  },
  {
    id: "annuaires_ia",
    name: "Annuaires IA & outils",
    icon: "📂",
    category: "annuaires",
    dofollow: true,
    da_range: "40–65",
    effort: "low",
    speed: "fast",
    score: 62,
    why_pro: "50+ annuaires IA actifs. Chaque soumission = 1 backlink dofollow. 2h de travail = 50 liens.",
    trustSteps: [
      { label: "Soumission batch", days: 0, canLink: true, detail: "Futurepedia (DA65), There's An AI For That (DA60), AI Tools FYI, Toolify.ai, AiToolHunt, TopAI.tools, SaaSHub, AlternativeTo." },
    ],
    tips: "Créer un template de description (150 mots) et le réutiliser. Certains annuaires font payer pour l'indexation rapide — inutile, l'indexation organique arrive en 2–4 semaines.",
    data_source: "Liste compilée manuellement 2024–2025",
  },
];

// Seuils Stack Exchange officiels
const SE_REP_THRESHOLDS = [
  { rep: 1, action: "Voter, commenter sur ses propres posts" },
  { rep: 15, action: "Voter positivement (upvote)" },
  { rep: 50, action: "Commenter partout — seuil pour links" },
  { rep: 75, action: "Voter négativement" },
  { rep: 125, action: "Voter pour fermer/rouvrir" },
];

// Platforms HARO/presse documentées 2025
const PR_PLATFORMS = [
  { name: "HARO (via Featured.com)", url: "haro.com", free: true, dofollow_rate: "~30%", note: "Relancé avril 2025. Email digest 3x/jour. Gratuit." },
  { name: "Source of Sources (SOS)", url: "sos.pr", free: true, dofollow_rate: "36%", note: "Créateur original HARO. Meilleur taux dofollow (étude BuzzStream 2025)." },
  { name: "Qwoted", url: "qwoted.com", free: "2 pitches/mois", dofollow_rate: "40%", note: "Forbes, Men's Health, Medical News Today. Vetting strict = moins de concurrence." },
  { name: "Featured.com", url: "featured.com", free: true, dofollow_rate: "~25%", note: "Fortune, Fast Company, Yahoo. Format Q&A court (4–5 phrases)." },
  { name: "Help a B2B Writer", url: "helpab2bwriter.com", free: true, dofollow_rate: "~20%", note: "B2B uniquement. API 2025 pour réponses instantanées." },
  { name: "#journorequest", url: "linkedin.com + x.com", free: true, dofollow_rate: "variable", note: "Journalistes FR très actifs sur LinkedIn. Chercher aussi #prrequest #mediarequest." },
];

const KEYWORDS = ["rénovation", "MaPrimeRénov", "DPE", "isolation", "PAC", "simulateur impôt", "quittance loyer", "fiscalité", "rendement locatif", "SCI", "déficit foncier", "crédit immo"];

// ─── UTILS ──────────────────────────────────────────────────
const ScoreBadge = ({ score }) => {
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444";
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{score}/100</span>;
};

const Tag = ({ label, color = "#6366f1" }) => (
  <span style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 600, marginRight: 4 }}>{label}</span>
);

// ─── CHANNEL CARD ────────────────────────────────────────────
const ChannelCard = ({ ch, expanded, onToggle }) => {
  const [activeStep, setActiveStep] = useState(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const text = await callClaude(
      `Tu réponds sur ${ch.name} à : "${query}"\n120-180 mots. Expert, naturel. PAS de lien — phase build. Commence directement.`
    );
    setDraft(text);
    setLoading(false);
  };

  return (
    <div style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{ch.icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{ch.name}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>DA {ch.da_range} · {ch.dofollow ? "✅ dofollow" : "nofollow"} · <Tag label={ch.category} color="#475569" /></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ScoreBadge score={ch.score} />
          <span style={{ color: "#475569" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e2030" }}>
          {/* Why pro */}
          <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "9px 12px", marginTop: 14, marginBottom: 12, fontSize: 12, color: "#a5b4fc", lineHeight: 1.5 }}>
            🎯 <strong>Différenciateur :</strong> {ch.why_pro}
          </div>

          {/* Trust steps */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>🗓 Agenda de confiance</div>
            {ch.trustSteps.map((s, i) => (
              <div key={i} onClick={() => setActiveStep(activeStep === i ? null : i)}
                style={{ background: s.canLink ? "#052e1644" : "#0f1117", border: `1px solid ${s.canLink ? "#22c55e44" : "#1e2030"}`, borderRadius: 7, padding: "9px 12px", marginBottom: 6, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.canLink ? "#4ade80" : "#cbd5e1" }}>
                    {s.canLink ? "🔗 " : "🔒 "}{s.label}
                    {s.days > 0 && <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>J{s.days}+</span>}
                  </span>
                  <span style={{ color: "#475569", fontSize: 11 }}>{activeStep === i ? "▲" : "▼"}</span>
                </div>
                {activeStep === i && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 7, lineHeight: 1.6 }}>{s.detail}</div>}
              </div>
            ))}
          </div>

          {/* Tips + source */}
          <div style={{ background: "#1e1b2e", border: "1px solid #312e5e", borderRadius: 7, padding: "9px 12px", marginBottom: 12, fontSize: 12, color: "#a5b4fc", lineHeight: 1.6 }}>
            💡 {ch.tips}
            <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>Source : {ch.data_source}</div>
          </div>

          {/* Generator */}
          <div style={{ background: "#0a0c14", border: "1px solid #1e2030", borderRadius: 7, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>✍️ Draft de réponse rapide</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Question de ta niche..."
                onKeyDown={e => e.key === "Enter" && generate()}
                style={{ flex: 1, background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "7px 10px", fontSize: 13 }} />
              <button onClick={generate} disabled={loading || !query.trim()} style={{ background: loading ? "#1e2030" : "#312e81", color: loading ? "#64748b" : "#e0e7ff", border: "none", borderRadius: 6, padding: "7px 14px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13 }}>
                {loading ? "..." : "Go"}
              </button>
            </div>
            {draft && (
              <div>
                <div style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 6, padding: 10, fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: 10, maxHeight: 200, overflowY: "auto" }}>{draft}</div>
                <button onClick={() => { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ marginTop: 8, background: copied ? "#052e16" : "#0f1117", color: copied ? "#4ade80" : "#818cf8", border: `1px solid ${copied ? "#22c55e44" : "#312e81"}`, borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {copied ? "✅ Copié" : "📋 Copier"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── REDDIT DATA VIEW ────────────────────────────────────────
const RedditDataView = () => (
  <div>
    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
      Seuils documentés par subreddit FR + hiérarchie technique des liens. Sources : seo-true.com 2026, leadmore.ai Survival Guide 2026.
    </div>
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Subreddits FR — seuils observés</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#0f1117" }}>
              {["Subreddit", "Karma min", "Âge compte", "Membres", "Niche", "Liens"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #1e2030" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REDDIT_SUBS_FR.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1a1c2a" }}>
                <td style={{ padding: "8px 12px", color: "#818cf8", fontWeight: 600 }}>{r.sub}</td>
                <td style={{ padding: "8px 12px", color: "#f59e0b", fontWeight: 700 }}>{r.karma}+</td>
                <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{r.age_days}j</td>
                <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.members}</td>
                <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{r.niche}</td>
                <td style={{ padding: "8px 12px", color: "#22c55e", fontSize: 11 }}>{r.link_ok}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Hiérarchie technique des liens (seuils réels AutoMod)</div>
      {REDDIT_LINK_HIERARCHY.map((r, i) => (
        <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 7, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#e2e8f0" }}>{r.type}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Tag label={`${r.karma_min}+ karma`} color="#f59e0b" />
            <Tag label={`risque ${r.risk}`} color={r.risk === "faible" ? "#22c55e" : r.risk === "moyen" ? "#f59e0b" : "#ef4444"} />
          </div>
        </div>
      ))}
    </div>
    <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 8, padding: 14, fontSize: 12, color: "#a5b4fc", lineHeight: 1.7 }}>
      <strong>CQS (Content Quality Score)</strong> — Reddit a un score interne invisible (Highest/High/Moderate/Low/Lowest). Les comptes qui construisent du karma dans des "karma farms" (r/FreeKarma4You) voient leur CQS baisser même avec 500+ karma. Le seul chemin : contributions originales dans des vrais subs.
      <br /><br />
      <strong>Coordinated behavior detection (2026)</strong> : 89% des comptes startup marketing bannis en 30 jours selon ReddiReach (analyse 340 comptes, mars 2026). Pattern = posting rapide + liens dès le début.
    </div>
  </div>
);

// ─── PR PLATFORMS VIEW ───────────────────────────────────────
const PRView = () => {
  const [selected, setSelected] = useState(null);
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState("simulateurs fiscaux et rénovation énergétique");

  const generatePitch = async (platform) => {
    setSelected(platform);
    setLoading(true);
    setPitch("");
    const text = await callClaude(
      `Rédige un pitch journaliste pour ${platform.name} dans la niche "${niche}".
Structure : credential 1 phrase → insight chiffré → quote prête à copier-coller.
150 mots max. Pas d'intro. Pas de "Bonjour je suis". Commence par le credential.`
    );
    setPitch(text);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Plateformes de connexion journalistes↔experts. Backlinks éditoriaux DA70–98. Gratuit. Ignoré par 90% des SEO FR.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ta niche..."
          style={{ flex: 1, background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", fontSize: 13 }} />
      </div>
      {PR_PLATFORMS.map((p, i) => (
        <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{p.name}</span>
                <Tag label={typeof p.free === "boolean" ? "Gratuit" : p.free} color="#22c55e" />
                <Tag label={`dofollow ${p.dofollow_rate}`} color="#818cf8" />
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{p.note}</div>
              <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>→ {p.url}</div>
            </div>
            <button onClick={() => generatePitch(p)}
              style={{ background: "#1a1c2a", color: "#818cf8", border: "1px solid #312e81", borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600, marginLeft: 12, whiteSpace: "nowrap" }}>
              Pitch →
            </button>
          </div>
          {selected === p && (
            <div style={{ marginTop: 12, background: "#0a0c14", border: "1px solid #22c55e33", borderRadius: 7, padding: 12, fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {loading ? "✍️ Génération..." : pitch}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── AGENDA VIEW ─────────────────────────────────────────────
const AgendaView = ({ onNavigate }) => {
  const weeks = [
    {
      w: "Semaine 1–2", color: "#f59e0b", title: "Fondations (liens immédiats)",
      actions: [
        { ch: "GitHub", task: "Repo public + README avec lien → dofollow DA98 en 24h", type: "link", tpl: "github" },
        { ch: "Annuaires IA", task: "Soumission sur 20+ annuaires (Futurepedia, TAAFT, Toolify…) → 20 dofollow en 2h", type: "link", tpl: "annuaires" },
        { ch: "LinkedIn", task: "Profil 100% + lien site (dofollow DA99) + 3 posts natifs sans lien", type: "link", tpl: "linkedin" },
        { ch: "Substack", task: "Créer newsletter niche + article 1000 mots avec lien → dofollow DA91", type: "link", tpl: "substack" },
        { ch: "Product Hunt", task: "Créer compte, upvoter 10 projets pour activer le compte", type: "build", tpl: "producthunt" },
        { ch: "HARO/SOS", task: "S'inscrire sur haro.com, sos.pr, qwoted.com — scanner les emails dès J1", type: "build", tpl: "haro" },
        { ch: "Reddit", task: "Créer compte(s). Lurk 7 jours. ZÉRO post. Upvotes seulement.", type: "build", tpl: "reddit" },
        { ch: "Quora FR", task: "Profil expert complet. 2 réponses longues sans lien.", type: "build", tpl: "quora" },
      ],
    },
    {
      w: "Semaine 3–4", color: "#6366f1", title: "Construction d'autorité",
      actions: [
        { ch: "Reddit", task: "10 commentaires/jour sur r/AskReddit, r/NoStupidQuestions → 50 karma comment", type: "build", tpl: "reddit" },
        { ch: "Quora FR", task: "5 réponses 500+ mots → 1ers liens contextuels en fin de réponse (J10+)", type: "link", tpl: "quora" },
        { ch: "Stack Exchange", task: "Money.SE ou Webmasters.SE — 5 réponses techniques → atteindre 50 rep", type: "build", tpl: "stackoverflow" },
        { ch: "LinkedIn", task: "2 posts natifs → lien dans 1er commentaire du post", type: "link", tpl: "linkedin" },
        { ch: "HARO/SOS", task: "3 pitches/semaine. Format : credential → insight → quote. Délai < 2h après email", type: "link", tpl: "haro" },
        { ch: "Forums FR", task: "S'inscrire CCM + Developpez.com. 5 posts sans lien.", type: "build", tpl: "forums_fr" },
        { ch: "Substack", task: "Commenter 5 newsletters de ta niche", type: "build", tpl: "substack" },
        { ch: "Product Hunt", task: "Préparer le lancement : description, screenshots, trouver un hunter", type: "build", tpl: "producthunt" },
      ],
    },
    {
      w: "Semaine 5–8", color: "#22c55e", title: "Activation des liens",
      actions: [
        { ch: "Reddit", task: "100 karma atteint → 1er lien en reply profonde (depth 2+) sur thread pertinent", type: "link", tpl: "reddit" },
        { ch: "Stack Exchange", task: "50 rep → lien si ressource indispensable à la réponse", type: "link", tpl: "stackoverflow" },
        { ch: "Forums FR", task: "10 posts CCM/Developpez → lien en signature activé (dofollow DA73)", type: "link", tpl: "forums_fr" },
        { ch: "Hacker News", task: "10 karma → Show HN — mardi-jeudi 8h-11h PT", type: "link", tpl: "hackernews" },
        { ch: "Product Hunt", task: "Lancement officiel avec communauté mobilisée", type: "link", tpl: "producthunt" },
        { ch: "Substack", task: "Demander cross-recommandations à 3 newsletters de ta niche → dofollow", type: "link", tpl: "substack" },
      ],
    },
    {
      w: "Mois 3+", color: "#818cf8", title: "Scaling organique",
      actions: [
        { ch: "Broken link building", task: "Trouver pages 404 sur sites DA30+ de ta niche → proposer remplacement", type: "outreach" },
        { ch: "Mentions non-linkées", task: "Google: '[ton outil]' -site:ton-domaine → contacter pour ajouter le lien", type: "outreach" },
        { ch: "Wikipedia", task: "50 éditions légitimes → ajouter comme référence externe", type: "link", tpl: "wikipedia" },
        { ch: "Reddit", task: "500+ karma → créer propre subreddit ou AMA", type: "build", tpl: "reddit" },
        { ch: "GitHub", task: "Repo awesome-[ta-niche] → attire des stars et des liens naturels", type: "link", tpl: "github" },
        { ch: "Medium", task: "Article pilier 1200 mots avec lien vers ton outil", type: "link", tpl: "medium" },
      ],
    },
  ];

  return (
    <div>
      {weeks.map((wk, i) => (
        <div key={i} style={{ background: "#0f1117", border: `1px solid ${wk.color}33`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: wk.color + "11", borderBottom: `1px solid ${wk.color}22`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, color: wk.color }}>{wk.w}</span>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>— {wk.title}</span>
            <span style={{ fontSize: 12, color: "#475569" }}>{wk.actions.filter(a => a.type === "link").length} liens</span>
          </div>
          <div style={{ padding: "10px 16px" }}>
            {wk.actions.map((a, j) => (
              <div key={j} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: j < wk.actions.length - 1 ? "1px solid #1a1c2a" : "none", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1 }}>
                  <span style={{ fontSize: 14, marginTop: 1 }}>{a.type === "link" ? "🔗" : a.type === "outreach" ? "📧" : "🔨"}</span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: a.type === "link" ? "#4ade80" : a.type === "outreach" ? "#f59e0b" : "#818cf8", marginRight: 8 }}>[{a.ch}]</span>
                    <span style={{ fontSize: 13, color: "#cbd5e1" }}>{a.task}</span>
                  </div>
                </div>
                {a.tpl && onNavigate && <button onClick={() => onNavigate("templates", a.tpl)} style={{ background: "#1a1c2a", color: "#818cf8", border: "1px solid #312e81", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Template →</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── QUICK DRAFT VIEW ────────────────────────────────────────
const QuickDraftView = () => {
  const [channel, setChannel] = useState("reddit");
  const [phase, setPhase] = useState("build");
  const [question, setQuestion] = useState("");
  const [keyword, setKeyword] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const ch = CHANNELS.find(c => c.id === channel);

  const generate = async () => {
    if (!question.trim()) return;
    setLoading(true); setDraft(""); setCopied(false);
    const canLink = phase === "ready";
    const text = await callClaude(
      `Tu réponds sur ${ch?.name} : "${question}"
${keyword ? `Niche : ${keyword}` : ""}
Règles STRICTES :
- 120-180 mots max
- Naturel, expert, jamais publicitaire
- ${canLink ? "1 lien utile en toute fin, formulation naturelle" : "AUCUN lien — valeur pure"}
- Commence directement par la réponse
- Ton : ${channel === "reddit" ? "direct et communautaire" : channel === "linkedin" ? "professionnel" : channel === "stackoverflow" ? "technique et précis" : "clair"}`
    );
    setDraft(text); setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {KEYWORDS.map(k => (
          <button key={k} onClick={() => setKeyword(k)} style={{ background: keyword === k ? "#312e81" : "#0f1117", color: keyword === k ? "#e0e7ff" : "#64748b", border: `1px solid ${keyword === k ? "#818cf8" : "#2d3048"}`, borderRadius: 20, padding: "3px 11px", fontSize: 12, cursor: "pointer" }}>{k}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <select value={channel} onChange={e => setChannel(e.target.value)} style={{ background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 13 }}>
          {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={phase} onChange={e => setPhase(e.target.value)} style={{ background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 13 }}>
          <option value="build">🔨 Phase build — sans lien</option>
          <option value="ready">🔗 Lien autorisé</option>
        </select>
      </div>
      <div style={{ background: phase === "ready" ? "#052e1644" : "#1a1a2e", border: `1px solid ${phase === "ready" ? "#22c55e44" : "#312e81"}`, borderRadius: 7, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: phase === "ready" ? "#4ade80" : "#818cf8" }}>
        {phase === "ready" ? "✅ Lien contextuel — 1 seul, fin de réponse, formulation naturelle" : "🔒 Phase build — réponse pure valeur, 0 lien"}
      </div>
      <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Colle la question repérée..." rows={3}
        style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "9px 12px", fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
      <button onClick={generate} disabled={loading || !question.trim()} style={{ width: "100%", background: loading ? "#1e2030" : "#312e81", color: loading ? "#64748b" : "#e0e7ff", border: "none", borderRadius: 6, padding: 10, cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
        {loading ? "⏳ Génération..." : "⚡ Générer le draft"}
      </button>
      {draft && (
        <div>
          <div style={{ background: "#0a0c14", border: "1px solid #1e2030", borderRadius: 8, padding: 14, fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 8 }}>{draft}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ flex: 1, background: copied ? "#052e16" : "#0f1117", color: copied ? "#4ade80" : "#818cf8", border: `1px solid ${copied ? "#22c55e44" : "#312e81"}`, borderRadius: 6, padding: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              {copied ? "✅ Copié !" : "📋 Copier"}
            </button>
            <button onClick={generate} style={{ background: "#0f1117", color: "#64748b", border: "1px solid #2d3048", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>↺</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── BACKLINK CHECKER VIEW ───────────────────────────────────
const PLATFORM_QUERIES = [
  { id: "reddit", label: "Reddit", icon: "🔴", query: d => `site:reddit.com "${d}"` },
  { id: "quora", label: "Quora", icon: "🔵", query: d => `site:quora.com "${d}"` },
  { id: "medium", label: "Medium", icon: "⬛", query: d => `site:medium.com "${d}"` },
  { id: "linkedin", label: "LinkedIn", icon: "🔷", query: d => `site:linkedin.com "${d}"` },
  { id: "github", label: "GitHub", icon: "⚫", query: d => `site:github.com "${d}"` },
  { id: "substack", label: "Substack", icon: "📧", query: d => `site:substack.com "${d}"` },
  { id: "all", label: "Tout le web", icon: "🌐", query: d => `"${d}" -site:${d}` },
];

const BacklinkCheckerView = () => {
  const [domain, setDomain] = useState("");
  const [results, setResults] = useState([]);
  const [checking, setChecking] = useState(false);
  const [selected, setSelected] = useState(["reddit", "quora", "linkedin", "github", "substack"]);

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const check = async () => {
    if (!domain.trim()) return;
    const clean = domain.replace(/https?:\/\//, "").replace(/\/$/, "");
    setChecking(true); setResults([]);
    const platforms = PLATFORM_QUERIES.filter(p => selected.includes(p.id));
    const newResults = [];
    for (const p of platforms) {
      const q = p.query(clean);
      try {
        const text = await callClaude(
          `Recherche exactement via web_search: ${q}\nRéponds UNIQUEMENT en JSON valide:\n{"found":true,"count":3,"urls":["url1","url2"],"snippet":"extrait"}`,
          500, true
        );
        const clean2 = text.replace(/```json|```/g, "").trim();
        let parsed = { found: false, count: 0, urls: [], snippet: "" };
        try { parsed = JSON.parse(clean2); } catch {}
        newResults.push({ platform: p, query: q, ...parsed });
      } catch {
        newResults.push({ platform: p, query: q, found: false, count: 0, urls: [], snippet: "" });
      }
    }
    setResults(newResults); setChecking(false);
  };

  const total = results.reduce((s, r) => s + (r.count || 0), 0);
  const found = results.filter(r => r.found).length;

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Scan en temps réel des mentions de ton domaine sur chaque plateforme.</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="fiscalc.fr" onKeyDown={e => e.key === "Enter" && check()}
          style={{ flex: 1, background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "9px 12px", fontSize: 13 }} />
        <button onClick={check} disabled={checking || !domain.trim()} style={{ background: checking ? "#1e2030" : "#312e81", color: checking ? "#64748b" : "#e0e7ff", border: "none", borderRadius: 6, padding: "9px 18px", cursor: checking ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13 }}>
          {checking ? "⏳" : "🔍 Scan"}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {PLATFORM_QUERIES.map(p => (
          <button key={p.id} onClick={() => toggle(p.id)} style={{ background: selected.includes(p.id) ? "#1e2030" : "#0a0c14", color: selected.includes(p.id) ? "#e2e8f0" : "#475569", border: `1px solid ${selected.includes(p.id) ? "#818cf8" : "#1e2030"}`, borderRadius: 20, padding: "3px 11px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
          {[{ label: "Scannés", val: results.length, color: "#e2e8f0" }, { label: "Avec présence", val: found, color: found > 0 ? "#22c55e" : "#ef4444" }, { label: "Mentions ~", val: total, color: "#818cf8" }].map((s, i) => (
            <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {results.map((r, i) => (
        <div key={i} style={{ background: "#0f1117", border: `1px solid ${r.found ? "#22c55e33" : "#1e2030"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{r.platform.icon}</span>
              <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 13 }}>{r.platform.label}</span>
              <span style={{ background: r.found ? "#22c55e18" : "#ef444418", color: r.found ? "#4ade80" : "#f87171", border: `1px solid ${r.found ? "#22c55e44" : "#ef444444"}`, borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                {r.found ? `✅ ~${r.count} mention(s)` : "❌ Aucune"}
              </span>
            </div>
            <a href={`https://www.google.com/search?q=${encodeURIComponent(r.query)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#475569", textDecoration: "none" }}>Google ↗</a>
          </div>
          {r.found && r.snippet && <div style={{ fontSize: 12, color: "#94a3b8", background: "#0a0c14", borderRadius: 6, padding: "7px 10px", marginTop: 8, lineHeight: 1.5 }}>{r.snippet}</div>}
          {r.found && r.urls?.filter(Boolean).map((url, j) => (
            <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 11, color: "#818cf8", wordBreak: "break-all", padding: "2px 0", textDecoration: "none", marginTop: 4 }}>🔗 {url}</a>
          ))}
          <div style={{ fontSize: 10, color: "#2d3048", marginTop: 6, fontFamily: "monospace" }}>{r.query}</div>
        </div>
      ))}
    </div>
  );
};

// ─── TRACKER VIEW ────────────────────────────────────────────
const TRACKER_KEY = "linkharvest-progress";

const TrackerView = () => {
  const [progress, setProgress] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(TRACKER_KEY);
        if (r) setProgress(JSON.parse(r.value));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const save = async (next) => {
    setProgress(next);
    try { await window.storage.set(TRACKER_KEY, JSON.stringify(next)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const setStep = (chId, stepIdx) => {
    const next = { ...progress, [chId]: { step: stepIdx, date: progress[chId]?.date || new Date().toISOString().slice(0,10), updated: new Date().toISOString().slice(0,10) } };
    save(next);
  };

  const reset = (chId) => {
    const next = { ...progress };
    delete next[chId];
    save(next);
  };

  const activeCount = Object.keys(progress).length;
  const linkedCount = Object.entries(progress).filter(([id, v]) => {
    const ch = CHANNELS.find(c => c.id === id);
    return ch && ch.trustSteps[v.step]?.canLink;
  }).length;

  if (!loaded) return <div style={{ color: "#475569", padding: 20 }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 18 }}>
        {[
          { label: "Canaux actifs", val: activeCount, color: "#818cf8" },
          { label: "Liens débloqués", val: linkedCount, color: "#22c55e" },
          { label: "Restants", val: CHANNELS.length - activeCount, color: "#f59e0b" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {saved && <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#4ade80", marginBottom: 12 }}>✅ Sauvegardé</div>}

      {CHANNELS.sort((a, b) => b.score - a.score).map(ch => {
        const p = progress[ch.id];
        const currentStep = p?.step ?? -1;
        const canLinkNow = currentStep >= 0 && ch.trustSteps[currentStep]?.canLink;

        return (
          <div key={ch.id} style={{ background: "#0f1117", border: `1px solid ${canLinkNow ? "#22c55e33" : "#1e2030"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: p ? 10 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{ch.icon}</span>
                <div>
                  <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 13 }}>{ch.name}</span>
                  {p && <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>Démarré le {p.date} · mis à jour {p.updated}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {canLinkNow && <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>🔗 Lien OK</span>}
                {p && <button onClick={() => reset(ch.id)} style={{ background: "transparent", color: "#475569", border: "1px solid #2d3048", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>Reset</button>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!p && (
                <button onClick={() => setStep(ch.id, 0)} style={{ background: "#1a1c2a", color: "#818cf8", border: "1px solid #312e81", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  + Démarrer
                </button>
              )}
              {p && ch.trustSteps.map((s, i) => (
                <button key={i} onClick={() => setStep(ch.id, i)}
                  style={{ background: i <= currentStep ? (s.canLink ? "#052e16" : "#1a1c2a") : "#0a0c14", color: i <= currentStep ? (s.canLink ? "#4ade80" : "#e2e8f0") : "#475569", border: `1px solid ${i === currentStep ? "#818cf8" : i < currentStep ? "#2d3048" : "#1e2030"}`, borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: i === currentStep ? 700 : 400 }}>
                  {i < currentStep ? "✓" : i === currentStep ? "▶" : "○"} {s.label.length > 25 ? s.label.slice(0,25) + "…" : s.label}
                </button>
              ))}
              {p && currentStep < ch.trustSteps.length - 1 && (
                <button onClick={() => setStep(ch.id, currentStep + 1)} style={{ background: "#312e81", color: "#e0e7ff", border: "none", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  Étape suivante →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── DA CHECKER VIEW ─────────────────────────────────────────
const DACheckerView = () => {
  const [domains, setDomains] = useState("");
  const [results, setResults] = useState([]);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    const list = domains.split("\n").map(d => d.trim()).filter(Boolean).slice(0, 8);
    if (!list.length) return;
    setChecking(true); setResults([]);
    const out = [];
    for (const domain of list) {
      try {
        const text = await callClaude(
          `Via web_search, cherche le Domain Authority (DA Moz) et Domain Rating (DR Ahrefs) pour "${domain}".
Cherche sur des sources comme ahrefs.com, moz.com, semrush.com, ou des analyses récentes.
Réponds UNIQUEMENT en JSON valide:
{"domain":"${domain}","da":42,"dr":38,"traffic_monthly":"50k","niche":"fiscal","dofollow_links":120,"source":"moz.com 2025"}`,
          500, true
        );
        const clean = text.replace(/```json|```/g, "").trim();
        let parsed = { domain, da: null, dr: null, traffic_monthly: "?", niche: "?", dofollow_links: null, source: "?" };
        try { parsed = { ...parsed, ...JSON.parse(clean) }; } catch {}
        out.push(parsed);
      } catch {
        out.push({ domain, da: null, dr: null, traffic_monthly: "?", niche: "?", dofollow_links: null, source: "erreur" });
      }
    }
    setResults(out); setChecking(false);
  };

  const daColor = (da) => !da ? "#475569" : da >= 70 ? "#22c55e" : da >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
        DA/DR en temps réel via recherche web. Utile pour qualifier des cibles de guest post ou broken link building. Max 8 domaines à la fois.
      </div>
      <textarea value={domains} onChange={e => setDomains(e.target.value)} placeholder={"commentcamarche.net\ndeveloppez.com\nfutura-sciences.com\nton-concurrent.fr"} rows={5}
        style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "10px 12px", fontSize: 13, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box", marginBottom: 10 }} />
      <button onClick={check} disabled={checking || !domains.trim()} style={{ width: "100%", background: checking ? "#1e2030" : "#312e81", color: checking ? "#64748b" : "#e0e7ff", border: "none", borderRadius: 6, padding: 10, cursor: checking ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
        {checking ? "⏳ Analyse en cours..." : "🔍 Analyser"}
      </button>

      {results.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0f1117" }}>
                {["Domaine", "DA (Moz)", "DR (Ahrefs)", "Trafic/mois", "Niche", "Liens dofollow", "Source"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #1e2030", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a1c2a" }}>
                  <td style={{ padding: "8px 12px", color: "#818cf8", fontWeight: 600 }}>{r.domain}</td>
                  <td style={{ padding: "8px 12px", color: daColor(r.da), fontWeight: 700 }}>{r.da ?? "—"}</td>
                  <td style={{ padding: "8px 12px", color: daColor(r.dr), fontWeight: 700 }}>{r.dr ?? "—"}</td>
                  <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{r.traffic_monthly}</td>
                  <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{r.niche}</td>
                  <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{r.dofollow_links ?? "—"}</td>
                  <td style={{ padding: "8px 12px", color: "#475569", fontSize: 10 }}>{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


// ─── GLOSSAIRE ───────────────────────────────────────────────
const GLOSSAIRE = {
  "Backlink": "Un lien depuis un autre site vers le vôtre. Plus vous en avez de qualité, mieux Google vous classe.",
  "Dofollow": "Type de lien qui transmet de l'autorité SEO à votre site. Le plus précieux.",
  "Nofollow": "Lien qui n'est pas pris en compte par Google pour le SEO. Utile quand même pour le trafic direct.",
  "DA": "Domain Authority (Moz) — score de 0 à 100 qui mesure la crédibilité d'un site aux yeux de Google. Plus c'est élevé, mieux c'est.",
  "DR": "Domain Rating (Ahrefs) — similaire au DA mais calculé par Ahrefs. Les deux mesurent la même chose.",
  "Karma": "Système de points Reddit. Vous en gagnez quand vos posts/commentaires sont upvotés. Requis pour poster des liens.",
  "CQS": "Content Quality Score — score interne invisible de Reddit qui évalue la qualité de vos contributions. Impossible à tricher.",
  "HARO": "Help A Reporter Out — plateforme où des journalistes cherchent des experts à citer. Chaque citation = backlink dans un article de presse.",
  "Phase build": "Période où vous construisez votre crédibilité sur une plateforme SANS mettre de lien. Obligatoire avant de pouvoir en placer un.",
  "Phase lien": "Période où vous avez gagné suffisamment de confiance sur une plateforme pour y placer un lien vers votre site.",
  "Karma farm": "Sous-reddit utilisé pour gagner du karma facilement. Interdit car Reddit pénalise les comptes qui le font.",
  "AutoMod": "Robot modérateur automatique de Reddit qui supprime les posts/liens qui ne respectent pas les règles du subreddit.",
  "Indexation": "Moment où Google découvre et enregistre une page dans sa base de données. Sans indexation = invisible.",
  "Impression": "Nombre de fois où votre site apparaît dans les résultats Google, même si personne ne clique.",
};

const Tooltip = ({ term }) => {
  const [show, setShow] = useState(false);
  if (!GLOSSAIRE[term]) return <span style={{ color: "#818cf8", fontWeight: 600 }}>{term}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={() => setShow(!show)}
        style={{ color: "#818cf8", fontWeight: 600, borderBottom: "1px dashed #818cf8", cursor: "pointer" }}
      >{term}</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7,
          padding: "8px 12px", fontSize: 11, color: "#a5b4fc", lineHeight: 1.6,
          width: 260, boxShadow: "0 4px 20px #00000066",
        }}>
          <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{term}</div>
          {GLOSSAIRE[term]}
          <div onClick={() => setShow(false)} style={{ color: "#475569", fontSize: 10, marginTop: 6, cursor: "pointer" }}>✕ Fermer</div>
        </div>
      )}
    </span>
  );
};

// ─── ONBOARDING VIEW ─────────────────────────────────────────

// ─── GLOSSAIRE ───────────────────────────────────────────────

// ─── ONBOARDING ──────────────────────────────────────────────
const STORAGE_KEY = "lh-data-v2";

const OnboardingView = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ site: "", url: "", desc: "", niche: "", nicheCustom: "", hours: "", goal: "" });
  const set = (k, v) => setAnswers(a => ({ ...a, [k]: v }));

  // Exemples pré-remplis par niche
  const EXEMPLES = {
    "Fiscalité / Impôts": { desc: "Simulateur d'impôt sur le revenu et PEA 100% gratuit", kw: "fiscalité, simulateur impôt, PEA, déficit foncier" },
    "Immobilier": { desc: "Calculateur de rendement locatif et prix au m² en France", kw: "immobilier, rendement locatif, prix m², investissement" },
    "Rénovation / Travaux": { desc: "Calculateur d'aides rénovation et de prix de travaux", kw: "rénovation, MaPrimeRénov, DPE, isolation, travaux" },
    "Finance personnelle": { desc: "Outil de simulation d'épargne et de budget mensuel", kw: "épargne, budget, assurance vie, placement" },
    "Juridique": { desc: "Guide pratique du droit des contrats et des locataires en France", kw: "droit, contrat, locataire, bail, juridique" },
    "E-commerce / SaaS": { desc: "Outil SaaS de gestion et d'automatisation pour e-commerçants", kw: "e-commerce, SaaS, automatisation, vente en ligne" },
    "Tech / Développement": { desc: "Outil développeur pour automatiser les tâches répétitives", kw: "développement, API, automatisation, productivité" },
    "Autre": { desc: "", kw: "" },
  };

  const steps = [
    {
      title: "Bienvenue sur LinkHarvest 👋",
      subtitle: "En 2 minutes, on crée ton plan d'action personnalisé. Réponds à 4 questions.",
      content: (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>🌱</div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.9, maxWidth: 420, margin: "0 auto" }}>
            LinkHarvest t'aide à obtenir des <strong style={{ color: "#818cf8" }}>backlinks</strong> (= liens depuis d'autres sites vers le tien) gratuitement, en suivant une stratégie plateforme par plateforme — dans le bon ordre, au bon moment.
            <br /><br />
            <strong style={{ color: "#e2e8f0" }}>Pourquoi c'est important ?</strong> Google classe les sites qui ont des backlinks de qualité avant les autres. Plus tu en as, plus tu es visible.
          </div>
        </div>
      ),
      valid: true,
    },
    {
      title: "Ton site web",
      subtitle: "Sur quel site veux-tu obtenir des backlinks ?",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Nom du site</div>
            <input value={answers.site} onChange={e => set("site", e.target.value)} placeholder="ex: FiscalC" style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "11px 12px", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Adresse du site (URL)</div>
            <input value={answers.url} onChange={e => set("url", e.target.value)} placeholder="ex: https://fiscalc.fr" style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "11px 12px", fontSize: 14, boxSizing: "border-box" }} />
            <div style={{ fontSize: 11, color: "#475569", marginTop: 5 }}>Commence par https://</div>
          </div>
        </div>
      ),
      valid: answers.site.trim().length > 0 && answers.url.trim().length > 4,
    },
    {
      title: "Ta niche",
      subtitle: "Sur quel sujet est ton site ? Choisis le plus proche.",
      content: (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {Object.keys(EXEMPLES).map(n => (
              <button key={n} onClick={() => {
                set("niche", n);
                if (EXEMPLES[n].desc) set("desc", EXEMPLES[n].desc);
              }} style={{ background: answers.niche === n ? "#312e81" : "#0f1117", color: answers.niche === n ? "#e0e7ff" : "#94a3b8", border: `1px solid ${answers.niche === n ? "#818cf8" : "#2d3048"}`, borderRadius: 7, padding: "10px 12px", cursor: "pointer", fontSize: 12, fontWeight: answers.niche === n ? 700 : 400, textAlign: "left" }}>
                {n}
              </button>
            ))}
          </div>
          {answers.niche && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description de ton site (1 phrase)</div>
              <input value={answers.desc} onChange={e => set("desc", e.target.value)} placeholder="Ce que fait ton site en 1 phrase" style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "10px 12px", fontSize: 13, boxSizing: "border-box" }} />
              {EXEMPLES[answers.niche]?.desc && answers.desc === EXEMPLES[answers.niche].desc && (
                <div style={{ fontSize: 10, color: "#22c55e", marginTop: 4 }}>✅ Pré-rempli automatiquement — tu peux personnaliser</div>
              )}
            </div>
          )}
        </div>
      ),
      valid: answers.niche.trim().length > 0 && answers.desc.trim().length > 5,
    },
    {
      title: "Ton temps disponible",
      subtitle: "Combien d'heures par semaine peux-tu y consacrer ?",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { val: "1h", label: "1h / semaine", desc: "Parfait pour commencer — 2-3 actions rapides, GitHub + LinkedIn" },
            { val: "3h", label: "3h / semaine", desc: "Standard — 5-6 canaux en parallèle, Quora + Reddit + Substack" },
            { val: "5h", label: "5h+ / semaine", desc: "Intensif — tous les canaux simultanément, résultats en 4-6 semaines" },
          ].map(o => (
            <button key={o.val} onClick={() => set("hours", o.val)} style={{ background: answers.hours === o.val ? "#312e81" : "#0f1117", color: answers.hours === o.val ? "#e0e7ff" : "#94a3b8", border: `1px solid ${answers.hours === o.val ? "#818cf8" : "#2d3048"}`, borderRadius: 7, padding: "12px 16px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{o.label}</div>
              <div style={{ fontSize: 11, color: answers.hours === o.val ? "#a5b4fc" : "#475569" }}>{o.desc}</div>
            </button>
          ))}
        </div>
      ),
      valid: answers.hours.trim().length > 0,
    },
    {
      title: "Ton objectif prioritaire",
      subtitle: "Qu'est-ce qui compte le plus pour toi en ce moment ?",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { val: "rapidite", label: "⚡ Premiers liens cette semaine", desc: "GitHub, LinkedIn, annuaires — des backlinks dofollow en 24-48h" },
            { val: "autorite", label: "🏛 Autorité durable sur 3-6 mois", desc: "Reddit, Quora, forums — présence profonde et difficile à copier" },
            { val: "trafic", label: "👥 Visites directes sur mon site", desc: "Medium, LinkedIn, Quora — trafic immédiat même sans SEO" },
          ].map(o => (
            <button key={o.val} onClick={() => set("goal", o.val)} style={{ background: answers.goal === o.val ? "#312e81" : "#0f1117", color: answers.goal === o.val ? "#e0e7ff" : "#94a3b8", border: `1px solid ${answers.goal === o.val ? "#818cf8" : "#2d3048"}`, borderRadius: 7, padding: "12px 16px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{o.label}</div>
              <div style={{ fontSize: 11, color: answers.goal === o.val ? "#a5b4fc" : "#475569" }}>{o.desc}</div>
            </button>
          ))}
        </div>
      ),
      valid: answers.goal.trim().length > 0,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const niche = answers.niche === "Autre" ? (answers.nicheCustom || "votre niche") : answers.niche;
  const kw = EXEMPLES[answers.niche]?.kw || niche;

  const planActions = {
    rapidite: [
      { semaine: "Cette semaine", canal: "⚫ GitHub", action: "Créer un repo public avec README + lien → dofollow DA98 en 24h", tpl: "github", type: "link" },
      { semaine: "Cette semaine", canal: "📂 Annuaires IA", action: "Soumettre sur 10 annuaires gratuits → 10 backlinks en 2h", tpl: "annuaires", type: "link" },
      { semaine: "Cette semaine", canal: "🔷 LinkedIn", action: "Compléter le profil + ajouter lien site → dofollow DA99 immédiat", tpl: "linkedin", type: "link" },
      { semaine: "Semaine 2", canal: "📧 Substack", action: "Créer une newsletter + 1 article avec lien → dofollow DA91", tpl: "substack", type: "link" },
      { semaine: "Semaine 2", canal: "🐱 Product Hunt", action: "Créer compte + upvoter 10 projets (activation du compte)", tpl: "producthunt", type: "build" },
      { semaine: "Semaine 3", canal: "📰 HARO", action: "S'inscrire sur haro.com + répondre à 3 requêtes journalistes", tpl: "haro", type: "link" },
    ],
    autorite: [
      { semaine: "Cette semaine", canal: "⚫ GitHub", action: "Repo public + README + Awesome List de ta niche", tpl: "github", type: "link" },
      { semaine: "Cette semaine", canal: "🔴 Reddit", action: "Créer le compte — lurk 7 jours, upvotes uniquement, ZÉRO post", tpl: "reddit", type: "build" },
      { semaine: "Cette semaine", canal: "🔵 Quora FR", action: "Profil expert complet + 2 premières réponses longues sans lien", tpl: "quora", type: "build" },
      { semaine: "Semaine 2", canal: "📧 Substack", action: "Créer newsletter de niche + article pilier avec lien", tpl: "substack", type: "link" },
      { semaine: "Semaine 2", canal: "🇫🇷 Forums FR", action: "Inscription sur CommentCaMarche + Developpez.com (DA73 dofollow)", tpl: "forums_fr", type: "build" },
      { semaine: "Semaine 3+", canal: "🔴 Reddit", action: "Répondre aux questions de ta niche — sans lien jusqu'à 100 karma", tpl: "reddit", type: "build" },
    ],
    trafic: [
      { semaine: "Cette semaine", canal: "🔷 LinkedIn", action: "Post lancement + lien dans le 1er commentaire (pas dans le post)", tpl: "linkedin", type: "link" },
      { semaine: "Cette semaine", canal: "⬛ Medium", action: "Article 1200 mots sur ta niche avec lien → ranke sur Google", tpl: "medium", type: "link" },
      { semaine: "Semaine 2", canal: "🔵 Quora FR", action: "5 réponses longues sur questions populaires de ta niche", tpl: "quora", type: "build" },
      { semaine: "Semaine 2", canal: "📰 HARO", action: "S'inscrire + 3 pitches journalistes → backlinks presse DA70-98", tpl: "haro", type: "link" },
      { semaine: "Semaine 3", canal: "🟡 Hacker News", action: "Commenter 10 threads techniques (avant de pouvoir poster)", tpl: "hackernews", type: "build" },
      { semaine: "Semaine 3", canal: "📧 Substack", action: "Newsletter + article avec lien + cross-recommandations", tpl: "substack", type: "link" },
    ],
  };

  const handleFinish = () => {
    const data = {
      site: answers.site,
      url: answers.url,
      desc: answers.desc,
      niche,
      kw,
      hours: answers.hours,
      goal: answers.goal,
      plan: planActions[answers.goal] || planActions.rapidite,
      createdAt: new Date().toISOString(),
    };
    try { window.storage.set(STORAGE_KEY, JSON.stringify(data)); } catch {}
    onComplete(data);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "#818cf8" : "#1e2030", transition: "background 0.3s" }} />
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Question {step + 1} sur {steps.length}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>{current.title}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>{current.subtitle}</div>

      <div style={{ marginBottom: 28 }}>{current.content}</div>

      <div style={{ display: "flex", gap: 8 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ background: "#0f1117", color: "#64748b", border: "1px solid #2d3048", borderRadius: 6, padding: "11px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Retour</button>
        )}
        <button onClick={() => isLast ? handleFinish() : setStep(s => s + 1)} disabled={!current.valid}
          style={{ flex: 1, background: current.valid ? "#312e81" : "#1e2030", color: current.valid ? "#e0e7ff" : "#64748b", border: "none", borderRadius: 6, padding: "12px", cursor: current.valid ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 14, transition: "background 0.2s" }}>
          {isLast ? "Créer mon plan →" : "Continuer →"}
        </button>
      </div>
    </div>
  );
};

// ─── PLAN VIEW ───────────────────────────────────────────────
const PlanView = ({ userData, onReset, onNavigate }) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const plan = userData?.plan || [];
  const semaines = [...new Set(plan.map(a => a.semaine))];
  const goalLabel = { rapidite: "⚡ Premiers liens rapidement", autorite: "🏛 Autorité durable", trafic: "👥 Trafic direct" };

  return (
    <div>
      {/* Summary card */}
      <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#4ade80", marginBottom: 6 }}>✅ Ton plan — {userData.site}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          {[
            { label: "Site", val: userData.url },
            { label: "Niche", val: userData.niche },
            { label: "Objectif", val: goalLabel[userData.goal] || userData.goal },
          ].map((s, i) => (
            <div key={i} style={{ background: "#0a1f14", borderRadius: 6, padding: "6px 10px" }}>
              <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", wordBreak: "break-all" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How to use */}
      <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 8, padding: "12px 16px", marginBottom: 18, fontSize: 12, color: "#a5b4fc", lineHeight: 1.8 }}>
        <strong style={{ color: "#e2e8f0" }}>Comment utiliser ce plan :</strong>
        <ol style={{ margin: "8px 0 0 16px", padding: 0 }}>
          <li>Clique sur <strong style={{ color: "#e2e8f0" }}>"Template →"</strong> pour obtenir le texte exact à coller sur chaque plateforme</li>
          <li>Le texte est <strong style={{ color: "#e2e8f0" }}>pré-rempli avec ton site</strong> — tu n'as que les parties <strong style={{ color: "#f59e0b" }}>[EN MAJUSCULES]</strong> à personnaliser</li>
          <li>Coche dans l'onglet <strong style={{ color: "#e2e8f0" }}>📊 Tracker</strong> quand c'est publié</li>
          <li>Attends 3 semaines puis vérifie dans <strong style={{ color: "#e2e8f0" }}>🔎 Vérifier</strong> si ton site apparaît</li>
        </ol>
      </div>

      {/* Plan actions */}
      {semaines.map(sem => (
        <div key={sem} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1e2030" }}>{sem}</div>
          {plan.filter(a => a.semaine === sem).map((a, i) => (
            <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: "12px 16px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 13 }}>{a.canal}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: a.type === "link" ? "#4ade80" : "#818cf8", background: a.type === "link" ? "#052e16" : "#1a1c2a", border: `1px solid ${a.type === "link" ? "#22c55e44" : "#312e81"}`, borderRadius: 3, padding: "1px 6px" }}>
                    {a.type === "link" ? "🔗 Lien" : "🔨 Setup"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{a.action}</div>
              </div>
              <button onClick={() => onNavigate("templates", a.tpl)} style={{ background: "#312e81", color: "#e0e7ff", border: "none", borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                Template →
              </button>
            </div>
          ))}
        </div>
      ))}

      {/* Reset with confirmation */}
      <div style={{ marginTop: 28, padding: "14px 16px", background: "#0a0c14", border: "1px solid #1e2030", borderRadius: 8 }}>
        {!confirmReset ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#475569" }}>Changer de site ou recommencer ?</span>
            <button onClick={() => setConfirmReset(true)} style={{ background: "transparent", color: "#475569", border: "1px solid #2d3048", borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 11 }}>Réinitialiser</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "#f87171", fontWeight: 600, marginBottom: 10 }}>⚠️ Es-tu sûr ? Cette action supprime ton plan et ta progression.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { onReset(); setConfirmReset(false); }} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 5, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Oui, réinitialiser</button>
              <button onClick={() => setConfirmReset(false)} style={{ background: "#0f1117", color: "#94a3b8", border: "1px solid #2d3048", borderRadius: 5, padding: "7px 14px", cursor: "pointer", fontSize: 12 }}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TemplatesView = ({ initialChannel = "github", userData = null }) => {
  const [siteName, setSiteName] = useState(userData?.site || "");
  const [siteUrl, setSiteUrl] = useState(userData?.url || "");
  const [siteDesc, setSiteDesc] = useState(userData?.desc || "");
  const [niche, setNiche] = useState(userData?.niche || "");
  const [ready, setReady] = useState(!!(userData?.site && userData?.url && userData?.desc && userData?.niche));
  const [copied, setCopied] = useState(null);
  const [activeChannel, setActiveChannel] = useState(initialChannel);

  const copy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  const domain = siteUrl.replace(/https?:\/\//, "").replace(/\/$/, "");
  const awesomeName = "awesome-" + (niche.split(",")[0].trim().replace(/\s+/g, "-").toLowerCase() || "ressources") + "-fr";

  const Step = ({ n, text }) => (
    <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
      <div style={{ background: "#312e81", color: "#e0e7ff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );

  const Block = ({ id, label, text, note }) => (
    <div style={{ background: "#0a0c14", border: "1px solid #1e2030", borderRadius: 7, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ padding: "7px 12px", background: "#0f1117", borderBottom: "1px solid #1e2030", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{label}</span>
        <button onClick={() => copy(id, text)} style={{ background: copied === id ? "#052e16" : "#1a1c2a", color: copied === id ? "#4ade80" : "#818cf8", border: `1px solid ${copied === id ? "#22c55e44" : "#312e81"}`, borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
          {copied === id ? "✅ Copié !" : "📋 Copier"}
        </button>
      </div>
      {note && <div style={{ padding: "6px 12px", background: "#1a1a2e", borderBottom: "1px solid #1e2030", fontSize: 11, color: "#818cf8" }}>💡 {note}</div>}
      <pre style={{ margin: 0, padding: "10px 12px", fontSize: 11, color: "#94a3b8", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{text}</pre>
    </div>
  );

  const channels = [
    { id: "github", label: "⚫ GitHub", color: "#e2e8f0" },
    { id: "substack", label: "📧 Substack", color: "#f59e0b" },
    { id: "linkedin", label: "🔷 LinkedIn", color: "#0ea5e9" },
    { id: "reddit", label: "🔴 Reddit", color: "#ef4444" },
    { id: "quora", label: "🔵 Quora", color: "#818cf8" },
    { id: "medium", label: "⬛ Medium", color: "#e2e8f0" },
    { id: "forums_fr", label: "🇫🇷 Forums FR", color: "#22c55e" },
    { id: "stackoverflow", label: "🟠 Stack Exchange", color: "#f97316" },
    { id: "hackernews", label: "🟡 Hacker News", color: "#f59e0b" },
    { id: "producthunt", label: "🐱 Product Hunt", color: "#f97316" },
    { id: "wikipedia", label: "📖 Wikipédia", color: "#94a3b8" },
    { id: "annuaires", label: "📂 Annuaires IA", color: "#22c55e" },
    { id: "haro", label: "📰 HARO / Presse", color: "#a78bfa" },
  ];

  if (!ready) return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.6 }}>
        Remplis ces 4 champs <strong style={{ color: "#e2e8f0" }}>une seule fois</strong>. Tous les textes pour tous les canaux se génèrent automatiquement, prêts à coller.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Nom du site", placeholder: "FiscalC", val: siteName, set: setSiteName },
          { label: "URL complète", placeholder: "https://fiscalc.fr", val: siteUrl, set: setSiteUrl },
          { label: "Description courte (1 phrase)", placeholder: "Simulateur d'impôt sur le revenu et PEA 100% gratuit", val: siteDesc, set: setSiteDesc },
          { label: "Niche / mots-clés", placeholder: "fiscalité, simulateur impôt, PEA, investissement", val: niche, set: setNiche },
        ].map((f, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</div>
            <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3048", color: "#e2e8f0", borderRadius: 6, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        ))}
      </div>
      <button onClick={() => { if (siteName && siteUrl && siteDesc && niche) setReady(true); }}
        disabled={!siteName || !siteUrl || !siteDesc || !niche}
        style={{ width: "100%", background: (!siteName || !siteUrl || !siteDesc || !niche) ? "#1e2030" : "#312e81", color: (!siteName || !siteUrl || !siteDesc || !niche) ? "#64748b" : "#e0e7ff", border: "none", borderRadius: 6, padding: 12, cursor: (!siteName || !siteUrl || !siteDesc || !niche) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14 }}>
        Générer les templates pour les 13 canaux →
      </button>
    </div>
  );

  const renderChannel = () => {
    switch(activeChannel) {

      case "github": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">github.com</strong> → connecte-toi → clique sur ton repo existant (ex: quittancezen)`} />
          <Step n="2" text={`Clique sur <strong style="color:#e2e8f0">Add file → Create new file</strong> → nomme-le <strong style="color:#4ade80">README.md</strong>`} />
          <Step n="3" text={`Colle le texte ci-dessous → clique <strong style="color:#e2e8f0">Commit changes</strong>`} />
          <Step n="4" text={`Répète pour chacun de tes repos. Google indexe en <strong style="color:#4ade80">24–72h</strong>.`} />
        </div>
        <Block id="gh1" label="README.md — Section à ajouter dans chaque repo existant" text={`## Outil en ligne

Ce dépôt est la base de code de **[${siteName}](${siteUrl})**.

👉 **[Accéder à l'outil en ligne](${siteUrl})** — ${siteDesc}

> Gratuit, sans inscription, directement dans le navigateur.

---

## Description

${siteDesc}.

## Stack technique

- [À compléter selon ton projet]

## Licence

MIT`} />
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14, marginTop: 18 }}>
          <Step n="1" text={`Sur GitHub, clique sur le bouton vert <strong style="color:#e2e8f0">New</strong> (haut gauche)`} />
          <Step n="2" text={`Nom du repo : <strong style="color:#4ade80">${awesomeName}</strong> — coche <strong style="color:#e2e8f0">Public</strong> et <strong style="color:#e2e8f0">Add a README file</strong>`} />
          <Step n="3" text={`Clique sur le README créé → icône crayon → colle le texte ci-dessous → Commit`} />
        </div>
        <Block id="gh2" label={`README.md — Repo "${awesomeName}" (nouveau repo à créer)`} text={`# ${awesomeName}

> Liste curatée de ressources gratuites sur ${niche} en France.

## 🛠 Outils & Simulateurs gratuits

- [${siteName}](${siteUrl}) — ${siteDesc}
- [Impots.gouv.fr](https://www.impots.gouv.fr) — Simulateur officiel de l'administration fiscale
- [MoneyVox](https://www.moneyvox.fr) — Comparateurs et calculettes financières
- [Meilleurtaux](https://www.meilleurtaux.com) — Comparateur de crédit et assurance
- [Service-public.fr](https://www.service-public.fr) — Portail officiel de l'administration

## 📚 Ressources officielles

- [Legifrance](https://www.legifrance.gouv.fr) — Base de données législative
- [Bofip](https://bofip.impots.gouv.fr) — Bulletin officiel des finances publiques
- [AMF](https://www.amf-france.org) — Autorité des marchés financiers
- [Banque de France](https://www.banque-france.fr) — Données économiques officielles

## 📰 Médias et blogs de référence

- [MoneyVox](https://www.moneyvox.fr)
- [Capital.fr](https://www.capital.fr)
- [Les Échos](https://www.lesechos.fr)

## 🤝 Contribuer

Les contributions sont bienvenues ! Ouvrez une issue ou une PR.

---
*Maintenu activement — 2025-2026*`} />
      </div>);

      case "substack": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">substack.com</strong> → crée un compte → <strong style="color:#e2e8f0">Start writing</strong>`} />
          <Step n="2" text={`Nom de la newsletter : quelque chose comme <strong style="color:#4ade80">"La Lettre ${niche.split(",")[0].trim()}"</strong>`} />
          <Step n="3" text={`Clique <strong style="color:#e2e8f0">New post</strong> → colle l'article ci-dessous → publie en <strong style="color:#e2e8f0">Public</strong>`} />
          <Step n="4" text={`Dans les settings Substack → <strong style="color:#e2e8f0">Publication details</strong> → ajoute le lien de ton site dans la bio`} />
          <Step n="5" text={`Va dans Google Search Console → <strong style="color:#e2e8f0">Sitemaps</strong> → ajoute <strong style="color:#4ade80">ton-nom.substack.com/feed</strong> pour accélérer l'indexation`} />
        </div>
        <Block id="sub1" label="Article Substack #1 — À publier dès le 1er jour (avec lien dofollow)" text={`# ${niche.split(",")[0].trim().charAt(0).toUpperCase() + niche.split(",")[0].trim().slice(1)} en France : le guide complet 2025

Si vous cherchez à comprendre ${niche.split(",")[0].trim()} sans vous perdre dans des textes de loi incompréhensibles, vous êtes au bon endroit.

J'ai créé **[${siteName}](${siteUrl})** après avoir moi-même galéré à trouver des outils simples et gratuits pour ${siteDesc.toLowerCase()}.

## Ce que vous trouverez dans cette newsletter

Chaque semaine, je partage :
- Des explications claires sur ${niche}
- Des outils gratuits testés et validés
- Des actualités réglementaires digestes

## Pour commencer

La meilleure façon de commencer est d'utiliser **[${siteName}](${siteUrl})** — ${siteDesc}. C'est gratuit, sans inscription, et ça prend moins de 2 minutes.

---

*Vous avez des questions ? Répondez directement à cet email.*`} />
        <Block id="sub2" label="Bio Substack — À remplir dans Publication details" text={`${siteDesc}. Créateur de ${siteName} (${siteUrl}). Je partage chaque semaine des ressources gratuites sur ${niche}.`} />
        <Block id="sub3" label="Message de cross-recommandation — À envoyer à d'autres newsletters" text={`Bonjour [PRÉNOM],

Je suis [TON PRÉNOM], créateur de ${siteName} et de la newsletter [NOM DE TA NEWSLETTER].

Nos audiences se ressemblent : vous couvrez [LEUR SUJET], je couvre ${niche}.

Je serais ravi de faire une recommandation croisée — je recommande votre newsletter à mes abonnés, vous faites de même si vous pensez que mon contenu leur serait utile.

Intéressé(e) ?

[TON PRÉNOM]
${siteUrl}`} />
      </div>);

      case "linkedin": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">linkedin.com</strong> → clique sur <strong style="color:#e2e8f0">Moi → Voir le profil → Modifier</strong>`} />
          <Step n="2" text={`Dans <strong style="color:#e2e8f0">Coordonnées → Site web</strong> → colle ton URL. Ce lien est <strong style="color:#4ade80">dofollow DA99</strong>.`} />
          <Step n="3" text={`Dans la section <strong style="color:#e2e8f0">Infos (bio)</strong> → colle la bio ci-dessous`} />
          <Step n="4" text={`Publie le post ci-dessous <strong style="color:#e2e8f0">SANS lien</strong> → puis colle le lien dans le <strong style="color:#4ade80">1er commentaire</strong> (l'algo LinkedIn pénalise les liens dans les posts : -70% de reach)`} />
          <Step n="5" text={`Attends 2 semaines avec 5 posts natifs avant de mettre des liens en commentaire`} />
        </div>
        <Block id="li1" label="Bio LinkedIn — Section Infos" text={`Créateur de ${siteName} — ${siteDesc}.

Je construis des outils gratuits pour simplifier ${niche} en France.

🔗 ${siteUrl}`} />
        <Block id="li2" label="Post LinkedIn #1 — Lancement (SANS lien, le lien va en commentaire)" note="L'algo LinkedIn pénalise -70% de reach si le lien est dans le post. Toujours mettre en commentaire." text={`J'ai passé [X] mois à construire quelque chose qui me manquait.

Le problème : [PROBLÈME CONCRET QUE TU RÉSOUS].

La solution que j'ai trouvée partout ? Des outils soit payants, soit trop complexes, soit en anglais.

Alors je l'ai construit moi-même.

${siteName} : ${siteDesc}.

Gratuit. Sans inscription. En français.

[Lien en commentaire ↓]

#solopreneur #outilgratuit #${niche.split(",")[0].trim().replace(/\s+/g, "")} #france`} />
        <Block id="li3" label="Commentaire LinkedIn — 1er commentaire sous le post ci-dessus" text={`👉 ${siteUrl}

Retours bienvenus — je l'améliore chaque semaine.`} />
        <Block id="li4" label="Post LinkedIn #2 — Contenu expert (semaine 2, sans lien)" text={`[CHIFFRE SURPRENANT] sur ${niche.split(",")[0].trim()} en France.

La plupart des gens ne savent pas que [FAIT CONTRE-INTUITIF].

Voici pourquoi ça change tout :

1/ [POINT 1 — explication courte]

2/ [POINT 2 — explication courte]

3/ [POINT 3 — explication courte]

La bonne nouvelle : [CONCLUSION POSITIVE ET ACTIONNABLE].

Vous connaissiez ce chiffre ?

#fiscalite #financeperso #france`} />
      </div>);

      case "reddit": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Crée un compte sur <strong style="color:#e2e8f0">reddit.com</strong> avec un pseudo crédible (pas de chiffres aléatoires)`} />
          <Step n="2" text={`<strong style="color:#ef4444">Jours 1-7 : ZERO post, ZERO commentaire.</strong> Upvote uniquement. Le CQS (score interne Reddit) se construit.`} />
          <Step n="3" text={`Jours 8-21 : Poste les commentaires <strong style="color:#e2e8f0">Phase Build</strong> ci-dessous dans <strong style="color:#4ade80">r/AskReddit, r/NoStupidQuestions, r/france</strong>. Cible 50 karma.`} />
          <Step n="4" text={`Jours 22-45 : Réponds aux questions de ta niche sur <strong style="color:#4ade80">r/financepersonnelle, r/immobilier, r/renovationmaison</strong>. Toujours sans lien.`} />
          <Step n="5" text={`Jour 45+ avec 100+ karma : Utilise le template <strong style="color:#4ade80">Phase Lien</strong> — uniquement en reply d'un commentaire (jamais en post direct)`} />
        </div>
        <Block id="re1" label="Commentaire Reddit — Phase Build (J8 à J45) — À adapter à chaque question" note="200+ mots minimum. Pas de lien. Expertise pure." text={`Bonne question, et c'est souvent mal compris.

[EXPLICATION DÉTAILLÉE EN 3-4 PARAGRAPHES SUR LE SUJET DE LA QUESTION]

Ce que la plupart des gens ratent : [POINT CLEF CONTRE-INTUITIF].

Concrètement, si tu es dans la situation que tu décris, voici ce que je ferais :
1. [ACTION 1 précise et actionnable]
2. [ACTION 2 précise et actionnable]  
3. [ACTION 3 précise et actionnable]

La nuance importante : [CAVEAT OU CAS PARTICULIER À MENTIONNER].

N'hésite pas si tu as des questions sur ta situation spécifique.`} />
        <Block id="re2" label="Commentaire Reddit — Phase Lien (100+ karma, en reply d'un commentaire)" note="Jamais en post principal. Uniquement en réponse à un commentaire existant. 1 lien max / 10 posts." text={`Exactement, et pour aller plus loin sur ce point — j'ai fait un outil gratuit pour ça : ${domain}

Ça automatise [CE QUE L'OUTIL FAIT] en 30 secondes. Utile si tu fais ce genre de calcul régulièrement.`} />
        <Block id="re3" label="Texte de présentation pour r/france ou r/entrepreneuriat (Self-promo samedi seulement)" note="Uniquement le samedi dans r/entrepreneuriat — c'est le seul jour autorisé pour la self-promo" text={`[Self-promo] J'ai construit ${siteName} — ${siteDesc}

Ça fait [X] mois que je travaille dessus. C'est gratuit, sans inscription, et ça répond à [PROBLÈME PRÉCIS].

${siteUrl}

Retours bienvenus, je lis tout.`} />
      </div>);

      case "quora": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">fr.quora.com</strong> → crée un compte → clique sur <strong style="color:#e2e8f0">Modifier le profil</strong>`} />
          <Step n="2" text={`Remplis : Photo réelle, bio 150 mots, <strong style="color:#e2e8f0">3 domaines d'expertise précis</strong> (ex: fiscalité France, PEA, investissement)`} />
          <Step n="3" text={`Colle la <strong style="color:#e2e8f0">bio ci-dessous</strong> dans le champ "À propos de moi"`} />
          <Step n="4" text={`Jours 1-10 : <strong style="color:#e2e8f0">5 réponses longues SANS lien</strong>. Cherche des questions sur ${niche} avec peu de réponses.`} />
          <Step n="5" text={`Jour 10+ : Tu peux glisser le lien en fin de réponse avec la formulation ci-dessous`} />
        </div>
        <Block id="qr1" label="Bio Quora — À coller dans 'À propos de moi'" text={`Créateur de ${siteName} (${siteUrl}) — ${siteDesc}.

Spécialisé en ${niche}. Je réponds aux questions sur ces sujets depuis [X] ans.

Background : [TON EXPÉRIENCE EN 1-2 PHRASES].`} />
        <Block id="qr2" label="Réponse Quora — Phase Build (J0 à J10) — Structure type" note="500+ mots. Pas de lien. Répondre aux questions récentes (< 48h) pour la meilleure visibilité." text={`[RÉPONDRE DIRECTEMENT À LA QUESTION EN 1-2 PHRASES]

**Explication détaillée**

[PARAGRAPHE 1 — Contexte et base de la réponse, 80-100 mots]

[PARAGRAPHE 2 — Détail technique ou nuance importante, 80-100 mots]

[PARAGRAPHE 3 — Cas pratique ou exemple concret, 80-100 mots]

**Ce que la plupart des gens ratent**

[POINT CONTRE-INTUITIF OU ERREUR COURANTE]

**En résumé**

- [POINT CLÉ 1]
- [POINT CLÉ 2]
- [POINT CLÉ 3]

Si vous avez une situation spécifique, posez la en commentaire je regarderai.`} />
        <Block id="qr3" label="Réponse Quora — Phase Lien (J10+, après 5 réponses sans lien)" note="Le lien va TOUJOURS en dernière ligne, jamais en premier paragraphe." text={`[RÉPONDRE DIRECTEMENT À LA QUESTION EN 1-2 PHRASES]

**Explication détaillée**

[PARAGRAPHE 1 — Contexte et base de la réponse, 80-100 mots]

[PARAGRAPHE 2 — Détail technique ou nuance importante, 80-100 mots]

[PARAGRAPHE 3 — Cas pratique ou exemple concret, 80-100 mots]

**Ce que la plupart des gens ratent**

[POINT CONTRE-INTUITIF OU ERREUR COURANTE]

**En résumé**

- [POINT CLÉ 1]
- [POINT CLÉ 2]
- [POINT CLÉ 3]

---
*Si vous souhaitez automatiser ce calcul, j'ai développé ${siteName} (${siteUrl}) — ${siteDesc}. Gratuit et sans inscription.*`} />
      </div>);

      case "medium": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">medium.com</strong> → crée un compte → clique sur ton avatar → <strong style="color:#e2e8f0">Write a story</strong>`} />
          <Step n="2" text={`Colle l'article ci-dessous → ajoute des images si possible → clique <strong style="color:#e2e8f0">Publish</strong>`} />
          <Step n="3" text={`Dans les settings de publication → ajoute 5 tags pertinents sur ${niche}`} />
          <Step n="4" text={`<strong style="color:#f59e0b">Note :</strong> Les liens Medium sont nofollow mais les articles Medium <strong style="color:#e2e8f0">rankent directement sur Google</strong>. L'objectif = trafic, pas le juice SEO.`} />
          <Step n="5" text={`Rejoins des <strong style="color:#e2e8f0">Publications Medium</strong> de ta niche → soumettre l'article pour plus de visibilité`} />
        </div>
        <Block id="med1" label="Article Medium #1 — Prêt à publier (1200+ mots recommandés)" text={`# ${niche.split(",")[0].trim().charAt(0).toUpperCase() + niche.split(",")[0].trim().slice(1)} en France : tout ce que vous devez savoir en 2025

*[SOUS-TITRE ACCROCHEUR DE 1-2 PHRASES]*

---

## Introduction

[2-3 PARAGRAPHES D'INTRODUCTION — Poser le problème que le lecteur rencontre]

---

## [SECTION 1 — Premier point important]

[200-250 MOTS SUR CE POINT]

---

## [SECTION 2 — Deuxième point important]

[200-250 MOTS SUR CE POINT]

---

## [SECTION 3 — Troisième point important]

[200-250 MOTS SUR CE POINT]

---

## Les outils pour aller plus loin

Pour mettre en pratique ce que nous venons de voir, [${siteName}](${siteUrl}) vous permet de ${siteDesc.toLowerCase()} directement en ligne, gratuitement.

---

## Conclusion

[RÉSUMÉ EN 2-3 PARAGRAPHES + CALL TO ACTION]

---

*Créateur de [${siteName}](${siteUrl}) — ${siteDesc}.*`} />
        <Block id="med2" label="Bio Medium — À remplir dans les settings du profil" text={`Créateur de ${siteName} — ${siteDesc}. Je partage des guides pratiques sur ${niche} en France.

🔗 ${siteUrl}`} />
      </div>);

      case "forums_fr": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Crée un compte sur <strong style="color:#e2e8f0">commentcamarche.net</strong> ET <strong style="color:#e2e8f0">developpez.com</strong> (les deux ont DA 73, dofollow)`} />
          <Step n="2" text={`Remplis le profil complet → dans <strong style="color:#e2e8f0">Signature</strong> : colle le texte signature ci-dessous (visible sur chaque post)`} />
          <Step n="3" text={`Poste <strong style="color:#e2e8f0">10 réponses utiles SANS lien</strong> dans les fils de ta niche. Cherche les questions sans réponse.`} />
          <Step n="4" text={`Après 10 posts : ton lien en signature est activé. Tu peux aussi glisser des liens contextuels dans les réponses.`} />
          <Step n="5" text={`Autres forums à créer : <strong style="color:#4ade80">forum-immobilier.fr, forum-assurance.com, futura-sciences.com</strong>`} />
        </div>
        <Block id="fo1" label="Signature forum — À coller dans les paramètres du profil (visible sur chaque post)" text={`--
${siteName} | ${siteDesc}
${siteUrl}`} />
        <Block id="fo2" label="Réponse forum — Phase Build (posts 1 à 10, sans lien)" note="Réponses longues et précises. Pas de lien. Construire la réputation d'expert." text={`Bonjour,

[RÉPONDRE PRÉCISÉMENT À LA QUESTION POSÉE DANS LE FIL]

Pour être plus précis sur votre situation : [DÉTAIL COMPLÉMENTAIRE UTILE].

La chose importante à ne pas oublier : [POINT CLÉ OU MISE EN GARDE].

Bonne continuation,
[TON PRÉNOM]`} />
        <Block id="fo3" label="Réponse forum — Avec lien (après 10 posts)" text={`Bonjour,

[RÉPONDRE PRÉCISÉMENT À LA QUESTION POSÉE DANS LE FIL]

Pour aller plus loin sur ce point, il existe un outil gratuit qui automatise ce calcul : ${siteName} (${siteUrl}).

N'hésitez pas si vous avez d'autres questions.

Bonne continuation,
[TON PRÉNOM]`} />
      </div>);

      case "stackoverflow": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">money.stackexchange.com</strong> (finance perso) ou <strong style="color:#e2e8f0">webmasters.stackexchange.com</strong> (SEO/web) → crée un compte`} />
          <Step n="2" text={`Cherche des questions sur ${niche} sans réponse acceptée → <strong style="color:#e2e8f0">Reputation → 10 points</strong> minimum avant de commenter`} />
          <Step n="3" text={`<strong style="color:#ef4444">Règle absolue :</strong> lien uniquement à 50 rep minimum ET uniquement si c'est la meilleure ressource possible sur la question`} />
          <Step n="4" text={`Upvotes reçus sur tes réponses = rep points. 1 upvote = +10 points.`} />
        </div>
        <Block id="se1" label="Réponse Stack Exchange — Phase Build (< 50 rep, sans lien)" note="Réponse technique précise. Code ou formules si pertinent. Sourcer avec liens officiels (pas ton site)." text={`[RÉPONDRE DIRECTEMENT ET PRÉCISÉMENT À LA QUESTION]

**Explication**

[DÉTAIL TECHNIQUE EN 100-150 MOTS]

**Exemple concret**

[EXEMPLE CHIFFRÉ OU CAS D'USAGE]

**Source**

[LIEN VERS SOURCE OFFICIELLE : legifrance, impots.gouv.fr, etc.]`} />
        <Block id="se2" label="Réponse Stack Exchange — Avec lien (50+ rep)" note="Le lien ne fonctionne que si ton outil est genuinement la meilleure ressource sur cette question précise." text={`[RÉPONDRE DIRECTEMENT ET PRÉCISÉMENT À LA QUESTION]

**Explication**

[DÉTAIL TECHNIQUE EN 100-150 MOTS]

**Outil pour automatiser ce calcul**

Si vous faites ce type de calcul régulièrement, [${siteName}](${siteUrl}) permet de ${siteDesc.toLowerCase()} sans installation.

**Source**

[LIEN VERS SOURCE OFFICIELLE]`} />
      </div>);

      case "hackernews": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">news.ycombinator.com</strong> → crée un compte → <strong style="color:#e2e8f0">NE POSTE RIEN pendant 3 semaines</strong>`} />
          <Step n="2" text={`Semaines 1-3 : commente des articles techniques existants. Cible <strong style="color:#4ade80">10+ karma</strong>.`} />
          <Step n="3" text={`Semaine 4+ : soumets ton Show HN ci-dessous — <strong style="color:#e2e8f0">mardi ou jeudi entre 14h et 17h (heure FR)</strong> uniquement`} />
          <Step n="4" text={`<strong style="color:#ef4444">Jamais le week-end.</strong> Les soumissions du week-end sont enterrées.`} />
        </div>
        <Block id="hn1" label="Commentaire HN — Phase Build (3 semaines avant le lancement)" text={`[RÉPONDRE À UN POINT TECHNIQUE DANS UN THREAD EXISTANT]

From my experience building [TYPE D'OUTIL], [OBSERVATION PERTINENTE].

The tricky part is [NUANCE TECHNIQUE]. [EXPLICATION EN 2-3 PHRASES].`} />
        <Block id="hn2" label="Show HN — Titre et description (à soumettre mardi-jeudi 14h-17h FR)" note="Le titre doit expliquer le problème résolu en moins de 10 mots. Pas de superlatifs." text={`Titre : Show HN: ${siteName} – ${siteDesc}

URL : ${siteUrl}

---

Texte du post (optionnel mais recommandé) :

I built ${siteName} because [PROBLÈME PERSONNEL QUE TU AVAIS].

Most existing solutions are either paid, in English, or too complex. This is free, in French, and works in the browser with no signup.

Would love feedback, especially on [POINT SPÉCIFIQUE SUR LEQUEL TU VEUX DES RETOURS].

Tech stack: [TA STACK]`} />
      </div>);

      case "producthunt": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">producthunt.com</strong> → crée un compte → upvote et commente <strong style="color:#e2e8f0">10 produits existants</strong> cette semaine`} />
          <Step n="2" text={`Cherche un "hunter" influent sur <strong style="color:#e2e8f0">hunterr.com</strong> — un hunter avec audience augmente la visibilité`} />
          <Step n="3" text={`Planifie le lancement : <strong style="color:#4ade80">mardi ou mercredi</strong>. Préviens ta communauté J-7.`} />
          <Step n="4" text={`Le jour J : poste à <strong style="color:#e2e8f0">0h01 PT (9h FR)</strong> pour maximiser les upvotes sur 24h`} />
        </div>
        <Block id="ph1" label="Description produit Product Hunt" text={`**${siteName}** — ${siteDesc}

**Le problème**
[PROBLÈME CONCRET EN 1-2 PHRASES]

**La solution**
${siteName} permet de [CE QUE L'OUTIL FAIT CONCRÈTEMENT] en moins de 2 minutes, gratuitement, sans inscription.

**Pourquoi je l'ai construit**
[HISTOIRE PERSONNELLE EN 2-3 PHRASES]

**Fonctionnalités**
• [FEATURE 1]
• [FEATURE 2]
• [FEATURE 3]

**C'est 100% gratuit.** Aucune carte de crédit requise.`} />
        <Block id="ph2" label="Premier commentaire sous ton lancement — À poster dès la mise en ligne" text={`Bonjour la communauté PH 👋

Je suis [TON PRÉNOM], créateur de ${siteName}.

J'ai construit cet outil parce que [RAISON PERSONNELLE].

Je suis dispo toute la journée pour répondre à vos questions. N'hésitez pas à tester et à me dire ce qui vous manque — je note tout pour la prochaine version.

Merci pour votre soutien 🙏

${siteUrl}`} />
      </div>);

      case "wikipedia": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Va sur <strong style="color:#e2e8f0">fr.wikipedia.org</strong> → crée un compte → <strong style="color:#ef4444">NE PAS ajouter de lien vers ton site tout de suite</strong>`} />
          <Step n="2" text={`Semaines 1-8 : fais <strong style="color:#e2e8f0">50 petites éditions légitimes</strong> — corrections de typos, ajout de sources officielles, amélioration de mise en forme`} />
          <Step n="3" text={`Après 50 éditions : tu peux proposer ton site comme <strong style="color:#e2e8f0">référence externe</strong> sur un article pertinent — uniquement si ton contenu est une source primaire vérifiable`} />
          <Step n="4" text={`<strong style="color:#ef4444">Toute auto-promotion évidente = retrait immédiat + blocage compte.</strong> La communauté surveille les nouveaux comptes.`} />
        </div>
        <Block id="wp1" label="Résumé d'édition Wikipedia — À coller dans le champ 'Résumé' quand tu fais une correction" text={`Correction orthographique / Ajout de source officielle / Mise à jour de donnée chiffrée`} />
        <Block id="wp2" label="Ajout de référence externe (après 50 éditions seulement)" note="À insérer dans la section 'Liens externes' d'un article pertinent, PAS en corps d'article." text={`* [${siteName} — ${siteDesc}](${siteUrl})`} />
        <Block id="wp3" label="Note de discussion Wikipedia — Pour justifier l'ajout de ta référence" text={`Bonjour,

Je propose d'ajouter [${siteName}](${siteUrl}) dans les liens externes de cet article. 

Cet outil permet de ${siteDesc.toLowerCase()} et constitue une ressource pratique complémentaire aux sources déjà présentes.

Il n'existe pas d'outil similaire gratuit en français référencé ici actuellement.

Cordialement`} />
      </div>);

      case "annuaires": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Copie la <strong style="color:#e2e8f0">description courte et longue</strong> ci-dessous`} />
          <Step n="2" text={`Soumets sur chaque annuaire de la liste : <strong style="color:#4ade80">Futurepedia, There's An AI For That, AI Tools FYI, Toolify.ai, AiToolHunt, TopAI.tools, SaaSHub, AlternativeTo, G2, Capterra</strong>`} />
          <Step n="3" text={`Chaque soumission = <strong style="color:#4ade80">1 backlink dofollow</strong>. 2h de travail = 20-50 liens.`} />
          <Step n="4" text={`Indexation organique en 2-4 semaines. Inutile de payer pour l'indexation rapide.`} />
        </div>
        <Block id="an1" label="Description courte — À coller dans tous les annuaires (< 150 caractères)" text={`${siteName} — ${siteDesc}. Gratuit, sans inscription, 100% en français.`} />
        <Block id="an2" label="Description longue — Pour les annuaires avec champ détaillé (300-500 mots)" text={`${siteName} est un outil gratuit qui permet de ${siteDesc.toLowerCase()}.

**Pourquoi ${siteName} ?**

La plupart des outils similaires sont soit payants, soit en anglais, soit trop complexes pour une utilisation rapide. ${siteName} a été conçu pour être utilisable en moins de 2 minutes, sans inscription, directement dans le navigateur.

**Fonctionnalités principales**
- [FEATURE 1]
- [FEATURE 2]
- [FEATURE 3]

**Public cible**
${niche} — particuliers et professionnels en France.

**Tarif**
100% gratuit.

**Lien**
${siteUrl}`} />
      </div>);

      case "haro": return (<div>
        <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "10px 14px", marginBottom: 14 }}>
          <Step n="1" text={`Inscris-toi sur <strong style="color:#e2e8f0">haro.com</strong> (gratuit), <strong style="color:#e2e8f0">sos.pr</strong> (gratuit), <strong style="color:#e2e8f0">qwoted.com</strong> (2 pitches/mois gratuits)`} />
          <Step n="2" text={`Tu recevras des emails avec des requêtes journalistes 3x/jour. <strong style="color:#ef4444">Réponds dans les 2h</strong> — les journalistes choisissent en premiers arrivés.`} />
          <Step n="3" text={`Filtre les requêtes avec les mots : <strong style="color:#4ade80">${niche.split(",").slice(0,3).join(", ")}, entrepreneur, solopreneur, France</strong>`} />
          <Step n="4" text={`Colle le pitch ci-dessous en l'adaptant à chaque requête. Structure fixe : credential → insight → quote.`} />
          <Step n="5" text={`Sur LinkedIn et X (Twitter) : cherche <strong style="color:#4ade80">#journorequest #prrequest</strong> tous les matins`} />
        </div>
        <Block id="ha1" label="Pitch HARO/SOS — Structure gagnante (150 mots max)" note="Les journalistes reçoivent 100+ pitches. Commence par ton credential, pas par 'Bonjour je suis'." text={`**[CREDENTIAL]** : Créateur de ${siteName} (${siteUrl}), outil utilisé par [X] personnes pour ${siteDesc.toLowerCase()}.

**[INSIGHT CHIFFRÉ]** : D'après mon expérience sur ce sujet, [OBSERVATION CONCRÈTE ET CHIFFRÉE SUR TA NICHE].

**[QUOTE PRÊTE À PUBLIER]** : « [CITATION DE 2-3 PHRASES, PROFESSIONNELLE, PUBLIABLE TELLE QUELLE DANS UN ARTICLE] »

—
[TON PRÉNOM NOM]
${siteName} | ${siteUrl}
[TON EMAIL] | [TON TÉLÉPHONE]`} />
        <Block id="ha2" label="Template #journorequest LinkedIn/X — À adapter selon la requête vue" text={`@[JOURNALISTE] Je peux vous aider sur ce sujet.

Créateur de ${siteName} — ${siteDesc}. 

[1 PHRASE D'INSIGHT SUR LE SUJET DE LEUR REQUÊTE].

DM ouvert si vous voulez qu'on échange.

${siteUrl}`} />
      </div>);

      default: return null;
    }
  };

  return (
    <div>
      <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 7, padding: "8px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#4ade80" }}>✅ <strong>{siteName}</strong> — {siteUrl}</div>
        <button onClick={() => setReady(false)} style={{ background: "transparent", color: "#64748b", border: "1px solid #2d3048", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>Modifier</button>
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>Les parties en <strong style={{ color: "#f59e0b" }}>[MAJUSCULES]</strong> sont à personnaliser. Tout le reste est prêt à coller.</div>

      {/* Channel selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {channels.map(c => (
          <button key={c.id} onClick={() => setActiveChannel(c.id)} style={{ background: activeChannel === c.id ? "#312e81" : "#0f1117", color: activeChannel === c.id ? "#e0e7ff" : "#64748b", border: `1px solid ${activeChannel === c.id ? "#818cf8" : "#2d3048"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: activeChannel === c.id ? 700 : 400 }}>
            {c.label}
          </button>
        ))}
      </div>

      {renderChannel()}
    </div>
  );
};

// ─── COMPETITOR VIEW ─────────────────────────────────────────
const COMPETITORS = [
  {
    name: "Ahrefs",
    logo: "🔵",
    category: "Analyse SEO",
    price: "129$/mois",
    positioning: "Base de données de 3000+ milliards de backlinks. Crawler #2 mondial après Google.",
    does: ["Analyse backlinks existants", "Broken link finder", "Competitor gap analysis", "Keyword research"],
    doesnt: ["Stratégie d'acquisition communautaire", "Calendrier de crédibilité par plateforme", "Génération de réponses contextuelles", "Seuils Reddit/Quora documentés", "Agenda de confiance plateforme par plateforme"],
    verdict: "Outil d'analyse, pas d'acquisition. Il te dit où sont les backlinks de tes concurrents — pas comment les obtenir toi-même gratuitement.",
    threat: "faible",
    da: 91,
  },
  {
    name: "Semrush",
    logo: "🟠",
    category: "Suite SEO",
    price: "139$/mois",
    positioning: "Suite complète SEO. Backlink Gap = identifier les liens concurrents que tu n'as pas.",
    does: ["Backlink Gap analysis", "Link building outreach", "Rank tracking", "Content audit"],
    doesnt: ["Stratégie communautaire gratuite", "Seuils karma Reddit documentés", "Agenda timing par plateforme", "Génération de drafts de réponses", "HARO/presse workflow intégré"],
    verdict: "Concurrent indirect. Il gère les campagnes payantes d'outreach. LinkHarvest cible les canaux 100% gratuits — segment différent.",
    threat: "faible",
    da: 92,
  },
  {
    name: "Lasso",
    logo: "🌵",
    category: "Gestion liens affiliés",
    price: "39$/mois",
    positioning: "Plugin WordPress. Gère et optimise les liens affiliés sur ton propre site. Scanne les mots-clés non-monétisés.",
    does: ["Gestion liens affiliés", "Product display boxes", "Broken link monitoring", "Opportunity finder (sur ton site)"],
    doesnt: ["Stratégie backlinks externe", "Présence communautaire", "Outreach presse", "Canaux gratuits", "Vérification de présence externe"],
    verdict: "Pas un concurrent — angle complètement différent. Lasso optimise ton site existant, LinkHarvest construit une autorité externe. Complémentaires.",
    threat: "nul",
    da: 63,
  },
  {
    name: "Linkody",
    logo: "🔗",
    category: "Monitoring backlinks",
    price: "14$/mois",
    positioning: "Surveillance et tracking de backlinks. Alerte quand tu perds/gagnes un lien.",
    does: ["Suivi backlinks 24/7", "Alerte perte de liens", "Analyse profil concurrent", "Désaveu liens toxiques"],
    doesnt: ["Acquisition de nouveaux liens", "Stratégie communautaire", "Génération de contenu", "Seuils plateformes", "Workflow HARO"],
    verdict: "Outil de monitoring pur. LinkHarvest peut se positionner en amont (acquisition) avec Linkody en aval (suivi). Stack complémentaire.",
    threat: "nul",
    da: 52,
  },
  {
    name: "BuzzStream",
    logo: "📢",
    category: "Outreach & relations",
    price: "24$/mois",
    positioning: "CRM pour campagnes d'outreach link building. Gestion de contacts journalistes/blogueurs.",
    does: ["CRM outreach", "Templates emails", "Suivi réponses", "Gestion relations presse"],
    doesnt: ["Stratégie communautaire gratuite", "Calendrier crédibilité", "Seuils Reddit/Quora", "Draft AI de réponses", "Vérification présence web"],
    verdict: "Concurrent partiel sur l'outreach presse. Mais BuzzStream = outil de masse pour agences. LinkHarvest = outil stratégique pour solopreneurs/PME FR.",
    threat: "moyen",
    da: 71,
  },
  {
    name: "Respona",
    logo: "🎯",
    category: "Link building outreach",
    price: "99$/mois",
    positioning: "Plateforme IA pour trouver et contacter des sites pour guest posts et backlinks. Très orienté agences EN.",
    does: ["Prospection automatisée", "Emails personnalisés IA", "Recherche opportunités", "Suivi campagnes"],
    doesnt: ["Stratégie communautaire (Reddit/Quora)", "Agenda crédibilité", "Seuils karma documentés", "Marché FR spécifique", "HARO workflow", "Gratuit"],
    verdict: "Concurrent le plus direct sur l'outreach IA. Mais 99$/mois, EN uniquement, zero stratégie communautaire. LinkHarvest = gratuit + FR + communautaire.",
    threat: "moyen",
    da: 68,
  },
];

const FEATURES_MATRIX = [
  { feature: "Stratégie communautaire (Reddit, Quora, forums)", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "Agenda de crédibilité par plateforme", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "Seuils karma Reddit documentés", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "Génération de réponses IA contextuelles", lh: true, ahrefs: false, semrush: false, lasso: false, respona: "partial" },
  { feature: "Workflow HARO/presse intégré", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "Vérification présence web (checker)", lh: true, ahrefs: true, semrush: true, lasso: false, respona: false },
  { feature: "Analyse backlinks concurrents", lh: false, ahrefs: true, semrush: true, lasso: false, respona: false },
  { feature: "Marché français spécifique", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "100% gratuit", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "Tracker de progression persistant", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "Forums FR DA73+ couverts", lh: true, ahrefs: false, semrush: false, lasso: false, respona: false },
  { feature: "Gestion liens affiliés sur site", lh: false, ahrefs: false, semrush: false, lasso: true, respona: false },
];

const CompetitorView = () => {
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("cards");
  const threatColor = { nul: "#22c55e", faible: "#f59e0b", moyen: "#ef4444" };

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Audit concurrentiel basé sur recherche publique 2025–2026. Identifier le positionnement exact de LinkHarvest.
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["cards", "Fiches"], ["matrix", "Matrice"]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ background: view === id ? "#312e81" : "#0f1117", color: view === id ? "#e0e7ff" : "#64748b", border: `1px solid ${view === id ? "#818cf8" : "#2d3048"}`, borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Positioning statement */}
      <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 8, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: "#a5b4fc", lineHeight: 1.7 }}>
        <strong style={{ color: "#e2e8f0" }}>Positionnement LinkHarvest</strong> — Aucun outil sur le marché ne combine : stratégie communautaire gratuite + agenda de crédibilité par plateforme + seuils documentés + génération IA de réponses + focus marché FR. Les outils existants coûtent 14–139$/mois et ciblent l'analyse ou l'outreach payant. LinkHarvest est le seul outil d'acquisition organique communautaire gratuit avec intelligence plateforme intégrée.
      </div>

      {view === "cards" && (
        <div>
          {COMPETITORS.map((c, i) => (
            <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
              <div onClick={() => setExpanded(expanded === i ? null : i)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{c.logo}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{c.name}
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400, marginLeft: 8 }}>{c.category}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>DA {c.da} · {c.price}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: threatColor[c.threat], background: threatColor[c.threat] + "18", border: `1px solid ${threatColor[c.threat]}44`, borderRadius: 4, padding: "1px 8px" }}>
                    menace {c.threat}
                  </span>
                  <span style={{ color: "#475569" }}>{expanded === i ? "▲" : "▼"}</span>
                </div>
              </div>
              {expanded === i && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e2030" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, marginBottom: 12, lineHeight: 1.5 }}>{c.positioning}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={{ background: "#052e1611", border: "1px solid #22c55e22", borderRadius: 7, padding: 10 }}>
                      <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Ce qu'il fait</div>
                      {c.does.map((d, j) => <div key={j} style={{ fontSize: 11, color: "#94a3b8", padding: "2px 0" }}>✅ {d}</div>)}
                    </div>
                    <div style={{ background: "#ef444411", border: "1px solid #ef444422", borderRadius: 7, padding: 10 }}>
                      <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Ce qu'il ne fait PAS</div>
                      {c.doesnt.map((d, j) => <div key={j} style={{ fontSize: 11, color: "#94a3b8", padding: "2px 0" }}>❌ {d}</div>)}
                    </div>
                  </div>
                  <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#a5b4fc", lineHeight: 1.5 }}>
                    💡 {c.verdict}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "matrix" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#0f1117" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #1e2030", minWidth: 220 }}>Fonctionnalité</th>
                {[
                  { name: "LinkHarvest", color: "#818cf8" },
                  { name: "Ahrefs", color: "#64748b" },
                  { name: "Semrush", color: "#64748b" },
                  { name: "Lasso", color: "#64748b" },
                  { name: "Respona", color: "#64748b" },
                ].map(h => (
                  <th key={h.name} style={{ padding: "10px 12px", textAlign: "center", color: h.color, fontWeight: 700, borderBottom: "1px solid #1e2030", minWidth: 90 }}>{h.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES_MATRIX.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a1c2a", background: i % 2 === 0 ? "transparent" : "#0a0c1400" }}>
                  <td style={{ padding: "8px 12px", color: "#cbd5e1", fontSize: 12 }}>{row.feature}</td>
                  {[row.lh, row.ahrefs, row.semrush, row.lasso, row.respona].map((v, j) => (
                    <td key={j} style={{ padding: "8px 12px", textAlign: "center" }}>
                      {v === true ? <span style={{ color: "#22c55e", fontWeight: 700 }}>✅</span>
                        : v === "partial" ? <span style={{ color: "#f59e0b" }}>⚠️</span>
                        : <span style={{ color: "#475569" }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 10 }}>Sources : pages produit officielles + Capterra/GetApp FR 2025–2026</div>
        </div>
      )}
    </div>
  );
};


// ─── PUBLISH VIEW ────────────────────────────────────────────
const PublishView = () => {
  const [activeStep, setActiveStep] = useState(null);
  const [copied, setCopied] = useState(null);

  const copy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ id, text }) => (
    <button onClick={() => copy(id, text)} style={{
      background: copied === id ? "#052e16" : "#1a1c2a",
      color: copied === id ? "#4ade80" : "#818cf8",
      border: `1px solid ${copied === id ? "#22c55e44" : "#312e81"}`,
      borderRadius: 4, padding: "3px 10px", cursor: "pointer",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
    }}>{copied === id ? "✅ Copié" : "📋 Copier"}</button>
  );

  const steps = [
    {
      num: 1,
      title: "Crée un compte GitHub",
      duration: "2 min",
      status: "github",
      color: "#e2e8f0",
      icon: "⚫",
      why: "GitHub = l'endroit où ton code est stocké. Gratuit à vie.",
      actions: [
        { label: "Ouvre ce lien dans ton navigateur", link: "https://github.com/signup", linkLabel: "github.com/signup →" },
        { label: "Entre ton email, choisis un mot de passe, un pseudo" },
        { label: "Vérifie ton email (lien de confirmation)" },
        { label: "✅ Compte GitHub créé" },
      ],
    },
    {
      num: 2,
      title: "Crée un nouveau repo sur GitHub",
      duration: "2 min",
      status: "github",
      color: "#e2e8f0",
      icon: "⚫",
      why: "Un repo = un dossier en ligne pour ton projet LinkHarvest.",
      actions: [
        { label: "Une fois connecté, clique sur le bouton vert", img: "bouton vert « New » en haut à gauche" },
        { label: "Repository name : tape exactement", code: "linkharvest" },
        { label: "Coche", bold: "Public" },
        { label: "Coche", bold: "Add a README file" },
        { label: "Clique sur le bouton vert", bold: "Create repository" },
        { label: "✅ Ton repo est créé — tu vois une page avec des fichiers" },
      ],
    },
    {
      num: 3,
      title: "Uploade les fichiers du projet",
      duration: "3 min",
      status: "github",
      color: "#e2e8f0",
      icon: "⚫",
      why: "Tu vas déposer le code de LinkHarvest dans ton repo.",
      actions: [
        { label: "Dézipe le fichier", bold: "linkharvest-vercel.zip", note: "que tu as téléchargé" },
        { label: "Sur ton repo GitHub, clique sur", bold: "Add file → Upload files" },
        { label: "Glisse TOUT le contenu du dossier dézippé", bold: "sauf le dossier node_modules", note: "(s'il existe)" },
        { label: "En bas, laisse le message par défaut et clique", bold: "Commit changes" },
        { label: "✅ Tes fichiers sont en ligne sur GitHub" },
      ],
    },
    {
      num: 4,
      title: "Crée un compte Vercel",
      duration: "1 min",
      status: "vercel",
      color: "#818cf8",
      icon: "▲",
      why: "Vercel va prendre ton code GitHub et le transformer en site web accessible partout. Gratuit à vie.",
      actions: [
        { label: "Ouvre ce lien", link: "https://vercel.com/signup", linkLabel: "vercel.com/signup →" },
        { label: "Clique sur", bold: "Continue with GitHub" },
        { label: "Autorise Vercel à accéder à ton GitHub (bouton vert)" },
        { label: "✅ Compte Vercel créé et connecté à GitHub" },
      ],
    },
    {
      num: 5,
      title: "Déploie LinkHarvest sur Vercel",
      duration: "2 min",
      status: "vercel",
      color: "#818cf8",
      icon: "▲",
      why: "Vercel lit ton code GitHub et crée le site automatiquement.",
      actions: [
        { label: "Sur le dashboard Vercel, clique", bold: "Add New… → Project" },
        { label: "Tu vois ton repo", bold: "linkharvest", note: "— clique sur Import" },
        { label: "Vercel détecte automatiquement que c'est du Vite/React — ne touche rien" },
        { label: "Clique sur le bouton bleu", bold: "Deploy" },
        { label: "Attends 1-2 minutes (barre de progression)" },
        { label: "✅ Ton site est en ligne !", bold: "linkharvest.vercel.app" },
      ],
    },
    {
      num: 6,
      title: "Mettre à jour LinkHarvest plus tard",
      duration: "1 min",
      status: "update",
      color: "#22c55e",
      icon: "🔄",
      why: "Quand LinkHarvest sera mis à jour, voilà comment déployer la nouvelle version.",
      actions: [
        { label: "Télécharge le nouveau fichier", bold: "backlink_hub.jsx" },
        { label: "Va sur ton repo GitHub → src → App.jsx" },
        { label: "Clique sur l'icône crayon (modifier)" },
        { label: "Sélectionne tout (Ctrl+A) et colle le nouveau code" },
        { label: "Clique", bold: "Commit changes" },
        { label: "✅ Vercel redéploie automatiquement en 1-2 minutes" },
      ],
    },
  ];

  const statusColors = { github: "#e2e8f0", vercel: "#818cf8", update: "#22c55e" };
  const statusLabels = { github: "GitHub", vercel: "Vercel", update: "Mise à jour" };

  return (
    <div>
      {/* Header */}
      <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>Mettre LinkHarvest en ligne — gratuitement et pour toujours</div>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
          Tu vas créer deux comptes gratuits : <strong style={{ color: "#e2e8f0" }}>GitHub</strong> (stocke le code) et <strong style={{ color: "#818cf8" }}>Vercel</strong> (publie le site). Durée totale : environ 10 minutes.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "100% gratuit", color: "#22c55e" },
            { label: "Pas de carte bancaire", color: "#22c55e" },
            { label: "URL permanente", color: "#818cf8" },
            { label: "Mis à jour automatiquement", color: "#818cf8" },
          ].map((t, i) => (
            <span key={i} style={{ background: t.color + "18", color: t.color, border: `1px solid ${t.color}33`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {steps.map(s => (
          <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ background: activeStep === s.num ? "#312e81" : "#0f1117", border: `1px solid ${activeStep === s.num ? "#818cf8" : "#1e2030"}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: activeStep === s.num ? "#e0e7ff" : "#64748b", fontWeight: activeStep === s.num ? 700 : 400 }} onClick={() => setActiveStep(activeStep === s.num ? null : s.num)}>
              {s.icon} Étape {s.num}
            </div>
            {s.num < steps.length && <span style={{ color: "#2d3048", fontSize: 12 }}>→</span>}
          </div>
        ))}
      </div>

      {/* Steps */}
      {steps.map(s => (
        <div key={s.num} style={{ background: "#0f1117", border: `1px solid ${activeStep === s.num ? "#818cf8" : "#1e2030"}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
          <div onClick={() => setActiveStep(activeStep === s.num ? null : s.num)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#1a1c2a", border: `1px solid ${statusColors[s.status]}33`, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: statusColors[s.status], flexShrink: 0 }}>{s.num}</div>
              <div>
                <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                  <span style={{ color: statusColors[s.status], fontWeight: 600 }}>{statusLabels[s.status]}</span>
                  {" · "}{s.duration}
                </div>
              </div>
            </div>
            <span style={{ color: "#475569", fontSize: 16 }}>{activeStep === s.num ? "▲" : "▼"}</span>
          </div>

          {activeStep === s.num && (
            <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e2030" }}>
              {/* Why */}
              <div style={{ background: "#1a1a2e", border: "1px solid #312e81", borderRadius: 7, padding: "8px 12px", margin: "12px 0", fontSize: 12, color: "#a5b4fc" }}>
                💡 {s.why}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {s.actions.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ background: a.label.startsWith("✅") ? "#052e16" : "#1a1c2a", color: a.label.startsWith("✅") ? "#4ade80" : "#818cf8", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                      {a.label.startsWith("✅") ? "✅" : i + 1}
                    </div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                      {a.label.startsWith("✅") ? (
                        <span style={{ color: "#4ade80", fontWeight: 700 }}>{a.label}</span>
                      ) : (
                        <>
                          {a.label}{" "}
                          {a.bold && <strong style={{ color: "#e2e8f0" }}>{a.bold}</strong>}
                          {a.note && <span style={{ color: "#64748b" }}> {a.note}</span>}
                          {a.code && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                              <code style={{ background: "#0a0c14", border: "1px solid #2d3048", borderRadius: 4, padding: "1px 8px", fontSize: 12, color: "#4ade80", fontFamily: "monospace" }}>{a.code}</code>
                              <CopyBtn id={`code-${s.num}-${i}`} text={a.code} />
                            </span>
                          )}
                          {a.link && (
                            <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, color: "#818cf8", fontWeight: 700, textDecoration: "none", borderBottom: "1px solid #818cf855" }}>
                              {a.linkLabel}
                            </a>
                          )}
                          {a.img && <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 2 }}>→ {a.img}</span>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Next step button */}
              {s.num < steps.length && (
                <button onClick={() => setActiveStep(s.num + 1)} style={{ marginTop: 16, background: "#312e81", color: "#e0e7ff", border: "none", borderRadius: 6, padding: "9px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  Étape suivante : {steps[s.num].title} →
                </button>
              )}
              {s.num === steps.length && (
                <div style={{ marginTop: 14, background: "#052e16", border: "1px solid #22c55e44", borderRadius: 7, padding: "12px 14px", fontSize: 13, color: "#4ade80", fontWeight: 600 }}>
                  🎉 LinkHarvest est en ligne ! Partage l'URL linkharvest.vercel.app avec qui tu veux.
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Download reminder */}
      <div style={{ background: "#0a0c14", border: "1px solid #1e2030", borderRadius: 8, padding: "12px 16px", marginTop: 16 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>📦 Fichier à télécharger pour le déploiement</div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          Le fichier <strong style={{ color: "#e2e8f0" }}>linkharvest-vercel.zip</strong> est disponible dans tes téléchargements Claude. Si tu ne le trouves plus, dis-le moi et je le régénère.
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ────────────────────────────────────────────────

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("start");
  const [expandedCh, setExpandedCh] = useState(null);
  const [userData, setUserData] = useState(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [templateChannel, setTemplateChannel] = useState("github");

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r) { const d = JSON.parse(r.value); setUserData(d); setOnboardingDone(true); setTab("plan"); }
      } catch {}
    })();
  }, []);

  const handleOnboardingComplete = (data) => { setUserData(data); setOnboardingDone(true); setTab("plan"); };
  const handleNavigate = (tabId, channel) => { if (channel) setTemplateChannel(channel); setTab(tabId); };
  const handleReset = () => { setOnboardingDone(false); setUserData(null); setTab("start"); try { window.storage.delete(STORAGE_KEY); } catch {} };

  const sorted = [...CHANNELS].sort((a, b) => b.score - a.score);

  const tabs = [
    { id: "start", label: onboardingDone ? "🏠 Accueil" : "🚀 Démarrer" },
    { id: "plan", label: "📋 Mon plan", hidden: !onboardingDone },
    { id: "templates", label: "✍️ Templates" },
    { id: "agenda", label: "🗓 Agenda" },
    { id: "channels", label: "📡 Canaux" },
    { id: "tracker", label: "📊 Tracker" },
    { id: "quickdraft", label: "⚡ Draft IA" },
    { id: "checker", label: "🔎 Vérifier" },
    { id: "reddit_data", label: "🔴 Reddit" },
    { id: "pr", label: "📰 Presse" },
    { id: "da", label: "🎯 DA Check" },
    { id: "competitors", label: "⚔️ Concurrence" },
    { id: "publish", label: "🌐 Publier" },
  ].filter(t => !t.hidden);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#06080f", minHeight: "100vh", color: "#e2e8f0" }}>
      <div style={{ background: "#0f1117", borderBottom: "1px solid #1e2030", padding: "16px 20px 0" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>LinkHarvest</div>
            <span style={{ background: "#312e8122", color: "#818cf8", border: "1px solid #312e81", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>v2.2</span>
            {onboardingDone && userData && (
              <span style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>· {userData.site}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>
            Obtiens des <Tooltip term="Backlink" />s gratuits · 13 canaux · données réelles 2025–2026
          </div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "transparent", border: "none", borderBottom: tab === t.id ? "2px solid #818cf8" : "2px solid transparent", color: tab === t.id ? "#e2e8f0" : "#64748b", padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 40px" }}>
        {tab === "start" && (
          onboardingDone ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>👋</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Bon retour sur {userData?.site} !</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>Reprends exactement là où tu t'es arrêté.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {[{ label: "📋 Mon plan", id: "plan" }, { label: "✍️ Templates", id: "templates" }, { label: "📊 Tracker", id: "tracker" }].map(b => (
                  <button key={b.id} onClick={() => setTab(b.id)} style={{ background: "#312e81", color: "#e0e7ff", border: "none", borderRadius: 7, padding: "11px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{b.label}</button>
                ))}
              </div>
            </div>
          ) : (
            <OnboardingView onComplete={handleOnboardingComplete} />
          )
        )}
        {tab === "plan" && userData && <PlanView userData={userData} onReset={handleReset} onNavigate={handleNavigate} />}
        {tab === "templates" && <TemplatesView initialChannel={templateChannel} userData={userData} />}
        {tab === "agenda" && <AgendaView onNavigate={handleNavigate} />}
        {tab === "channels" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
              {[{ label: "Canaux", val: CHANNELS.length }, { label: "Dofollow", val: CHANNELS.filter(c => c.dofollow).length }, { label: "Score moyen", val: Math.round(CHANNELS.reduce((s, c) => s + c.score, 0) / CHANNELS.length) }, { label: "Score max", val: Math.max(...CHANNELS.map(c => c.score)) }].map((s, i) => (
                <div key={i} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 7, padding: "8px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#818cf8" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {sorted.map(ch => <ChannelCard key={ch.id} ch={ch} expanded={expandedCh === ch.id} onToggle={() => setExpandedCh(expandedCh === ch.id ? null : ch.id)} />)}
          </>
        )}
        {tab === "tracker" && <TrackerView />}
        {tab === "quickdraft" && <QuickDraftView />}
        {tab === "checker" && <BacklinkCheckerView />}
        {tab === "reddit_data" && <RedditDataView />}
        {tab === "pr" && <PRView />}
        {tab === "da" && <DACheckerView />}
        {tab === "competitors" && <CompetitorView />}
        {tab === "publish" && <PublishView />}
      </div>
    </div>
  );
}
