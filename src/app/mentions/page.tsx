"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Person {
  name: string;
  count?: number;
  context?: string; // e.g., "Black Book", "Flight Logs", "Court Docs"
}

// ── PRINCIPALS ──
const PRINCIPALS: Person[] = [
  { name: "Jeffrey Epstein", count: 3247, context: "Convicted sex trafficker" },
  { name: "Ghislaine Maxwell", count: 1892, context: "Convicted accomplice, sentenced 20 years" },
];

// ── VICTIMS / WITNESSES ──
const VICTIMS_WITNESSES: Person[] = [
  { name: "Virginia Giuffre", count: 1453, context: "Key accuser, formerly Virginia Roberts" },
  { name: "Virginia Roberts", context: "Same as Virginia Giuffre" },
  { name: "Courtney Wild", context: "Victim, flight logs" },
  { name: "Annie Farmer", context: "Victim, testified at Maxwell trial" },
  { name: "Carolyn Andriano", context: "Victim, testified at Maxwell trial" },
  { name: "Kate", context: "Victim pseudonym, Maxwell trial witness" },
  { name: "Jane Doe", context: "Multiple victims used this pseudonym" },
];

// ── INNER CIRCLE / ASSOCIATES ──
const ASSOCIATES: Person[] = [
  { name: "Sarah Kellen", count: 423, context: "Assistant, unindicted co-conspirator, flight logs" },
  { name: "Jean-Luc Brunel", count: 389, context: "Model agent, died awaiting trial, black book" },
  { name: "Nadia Marcinkova", context: "Associate, unindicted co-conspirator, flight logs" },
  { name: "Adriana Mucinska", context: "Assistant, unindicted co-conspirator, flight logs" },
  { name: "Emmy Taylor", context: "Maxwell's personal assistant, flight logs" },
  { name: "Lesley Groff", context: "Epstein's executive assistant" },
  { name: "Haley Robson", context: "Recruited victims for Epstein" },
  { name: "Mark Epstein", context: "Jeffrey's brother, flight logs" },
  { name: "Jo Jo Fontanella", context: "Epstein's butler, flight logs" },
  { name: "Brent Tindall", context: "Chef for Epstein, flight logs" },
  { name: "Juan Alessi", context: "Former house manager, testified" },
  { name: "Alfredo Rodriguez", context: "Former butler, stole black book" },
  { name: "Igor Zinoviev", context: "Bodyguard / trainer" },
  { name: "Larry Visoski", context: "Epstein's pilot" },
  { name: "David Rodgers", context: "Epstein's pilot, flight logs" },
];

// ── POLITICIANS / GOVERNMENT ──
const POLITICIANS: Person[] = [
  { name: "Bill Clinton", count: 743, context: "Flight logs, black book, multiple trips" },
  { name: "Donald Trump", count: 612, context: "Flight logs, black book, birthday card" },
  { name: "Prince Andrew", count: 892, context: "Accused by Giuffre, settled lawsuit" },
  { name: "Alexander Acosta", count: 487, context: "Negotiated 2008 plea deal as US Attorney" },
  { name: "Bill Richardson", context: "Former NM Governor, black book, accused by Giuffre" },
  { name: "George Mitchell", context: "Former Senator, accused by Giuffre" },
  { name: "Ehud Barak", context: "Former Israeli PM, visited Epstein properties" },
  { name: "Robert F. Kennedy Jr.", context: "Named in black book" },
  { name: "Mary Kennedy", context: "Late wife of RFK Jr., black book" },
  { name: "Marla Maples", context: "Flight logs" },
  { name: "Tiffany Trump", context: "Flight logs" },
  { name: "Sarah Ferguson", context: "Duchess of York, flight logs" },
  { name: "Doug Band", context: "Clinton aide, flight logs, black book" },
  { name: "Alistar Campbell", context: "Black book" },
  { name: "Jose Aznar", context: "Black book" },
];

// ── LEGAL ──
const LEGAL: Person[] = [
  { name: "Alan Dershowitz", count: 534, context: "Defense attorney, flight logs, accused by Giuffre" },
  { name: "Kenneth Starr", context: "Represented Epstein in plea deal negotiations" },
  { name: "Jay Lefkowitz", context: "Represented Epstein in 2008 plea deal" },
  { name: "Gerald Lefcourt", context: "Defense attorney for Epstein" },
  { name: "Roy Black", context: "Defense attorney for Epstein" },
  { name: "David Boies", context: "Attorney for Virginia Giuffre" },
  { name: "Sigrid McCawley", context: "Attorney for Virginia Giuffre" },
  { name: "Brad Edwards", context: "Attorney for Epstein victims" },
  { name: "Jack Scarola", context: "Attorney for Epstein victims" },
  { name: "Marie Villafaña", context: "Prosecutor, Palm Beach case" },
  { name: "Ann Marie Villafaña", context: "Federal prosecutor" },
  { name: "Michael Reiter", context: "Palm Beach Police Chief who investigated" },
  { name: "Joseph Recarey", context: "Lead Palm Beach detective" },
  { name: "Pam Bondi", context: "AG who released 2025-2026 documents" },
];

// ── BUSINESS / FINANCE ──
const BUSINESS: Person[] = [
  { name: "Les Wexner", context: "L Brands founder, Epstein's biggest client, black book" },
  { name: "Abigail Wexner", context: "Wife of Les Wexner, black book" },
  { name: "Bill Gates", context: "Met with Epstein multiple times after 2008 conviction" },
  { name: "Leon Black", context: "Apollo Global, paid Epstein $158M, birthday book" },
  { name: "Glenn Dubin", context: "Hedge fund manager, flight logs, black book" },
  { name: "Eva Andersson-Dubin", context: "Dated Epstein, flight logs, black book" },
  { name: "Tom Pritzker", context: "Hyatt heir, flight logs" },
  { name: "Mort Zuckerman", context: "Media mogul, black book" },
  { name: "Lynn Forester de Rothschild", context: "Black book" },
  { name: "Evelyn de Rothschild", context: "Black book" },
  { name: "Edgar Bronfman Jr.", context: "Seagram heir, black book" },
  { name: "Peter Soros", context: "Black book" },
  { name: "Ron Burkle", context: "Investor, black book" },
  { name: "Sultan Ahmed bin Sulayem", context: "DP World CEO, recently unredacted 2026" },
  { name: "Howard Lutnick", context: "Cantor Fitzgerald CEO" },
  { name: "Mike Bloomberg", context: "Black book" },
  { name: "Elon Musk", context: "Referenced in documents" },
  { name: "Peter Marino", context: "Architect, flight logs" },
  { name: "Ricardo Legoretta", context: "Designer, flight logs" },
  { name: "Mark Zeff", context: "Decorator, black book" },
  { name: "Larry Coben", context: "Sunrise Capital, black book" },
  { name: "Bill Berkman", context: "Black book" },
  { name: "Nicolas Berggruen", context: "Investor, black book" },
  { name: "Arki Busson", context: "Hedge fund manager, black book" },
  { name: "Clive Bannister", context: "HSBC, black book" },
  { name: "Peter Cohen", context: "Black book" },
  { name: "Daniel Bodini", context: "Black book" },
  { name: "Andre Balazs", context: "Hotelier, black book" },
  { name: "Jason Calacanis", context: "Black book" },
  { name: "Vikram Chatwal", context: "Hampshire Hotels, black book" },
  { name: "Gustavo Cisneros", context: "Media mogul, black book" },
  { name: "Frederic Fekkai", context: "Celebrity hairstylist, flight logs" },
];

// ── CELEBRITIES / ENTERTAINMENT ──
const CELEBRITIES: Person[] = [
  { name: "Kevin Spacey", context: "Actor, black book, flight logs referenced" },
  { name: "Chris Tucker", context: "Actor, flight logs, black book" },
  { name: "Naomi Campbell", context: "Model, flight logs, black book" },
  { name: "Mick Jagger", context: "Rolling Stones, black book" },
  { name: "Michael Jackson", context: "Black book" },
  { name: "Courtney Love", context: "Black book" },
  { name: "David Blaine", context: "Magician, black book" },
  { name: "Alec Baldwin", context: "Actor, black book" },
  { name: "Ralph Fiennes", context: "Actor, black book" },
  { name: "Dustin Hoffman", context: "Actor, black book" },
  { name: "Minnie Driver", context: "Actress, black book" },
  { name: "Elizabeth Hurley", context: "Actress/model, black book" },
  { name: "Jimmy Buffett", context: "Musician, black book" },
  { name: "John Cleese", context: "Actor, black book" },
  { name: "Candice Bushnell", context: "Author, black book" },
  { name: "Tamara Beckwith", context: "Socialite, black book" },
  { name: "Tania Bryer", context: "TV presenter, black book" },
  { name: "Barbara Carrera", context: "Actress, black book" },
  { name: "Richard Branson", context: "Black book" },
  { name: "Flavio Briatore", context: "F1, black book" },
  { name: "Caprice", context: "Model, black book" },
  { name: "Forest Sawyer", context: "Journalist, flight logs" },
];

// ── ACADEMICS / SCIENTISTS ──
const ACADEMICS: Person[] = [
  { name: "Stephen Hawking", context: "Physicist, attended conference on Epstein's island" },
  { name: "Marvin Minsky", context: "AI pioneer, flight logs, accused" },
  { name: "Lawrence Krauss", context: "Physicist, visited Epstein" },
  { name: "Steven Pinker", context: "Harvard, flew on Epstein's plane" },
  { name: "Henry Rosovsky", context: "Harvard, black book" },
  { name: "Martin Nowak", context: "Harvard, received Epstein funding" },
  { name: "George Church", context: "Harvard geneticist, met with Epstein" },
  { name: "Danny Hillis", context: "Computer scientist, black book" },
  { name: "Gerald Edelman", context: "Nobel laureate, black book" },
  { name: "Oliver Sacks", context: "Neurologist, black book" },
  { name: "Murray Gell-Mann", context: "Physicist, Nobel laureate, black book" },
];

// ── ROYALTY / ARISTOCRACY ──
const ROYALTY: Person[] = [
  { name: "Prince Andrew", count: 892, context: "Duke of York, accused by Giuffre, settled" },
  { name: "Sarah Ferguson", context: "Duchess of York, flight logs" },
  { name: "William Astor", context: "Viscount, black book" },
  { name: "Lord Beaumont", context: "Black book" },
  { name: "Baron Bentinck", context: "Black book" },
  { name: "Debbie Von Bismarck", context: "Black book" },
  { name: "Nuno Brandolini", context: "Black book" },
  { name: "Conrad Black", context: "Black book" },
  { name: "Ashley Hicks", context: "Designer, Lord Mountbatten's grandson, black book" },
  { name: "Charlie Althorp", context: "Earl Spencer's son, black book" },
];

// ── RECENTLY UNREDACTED (Feb 2026) ──
const RECENTLY_UNREDACTED: Person[] = [
  { name: "Leslie Wexner", context: "Victoria's Secret founder, unredacted Feb 2026" },
  { name: "Sultan Ahmed bin Sulayem", context: "DP World CEO, unredacted Feb 2026" },
  { name: "Nicola Caputo", context: "Unredacted Feb 2026" },
  { name: "Salvatore Nuara", context: "Unredacted Feb 2026" },
  { name: "Zurab Mikeladze", context: "Unredacted Feb 2026" },
  { name: "Leonic Leonov", context: "Unredacted Feb 2026" },
];

// ── LOCATIONS ──
const LOCATIONS: Person[] = [
  { name: "Little St. James Island", context: "Epstein's private island, U.S. Virgin Islands" },
  { name: "Palm Beach Mansion", context: "358 El Brillo Way, site of abuse" },
  { name: "New York Mansion", context: "9 E 71st St, Manhattan townhouse" },
  { name: "Zorro Ranch", context: "New Mexico property" },
  { name: "Great St. James Island", context: "Second island Epstein purchased" },
  { name: "Paris Apartment", context: "Avenue Foch, France" },
  { name: "Lolita Express", context: "Epstein's Boeing 727 private jet" },
];

// ── OTHER NOTABLE NAMES FROM BLACK BOOK / DOCS ──
const OTHER_NOTABLE: Person[] = [
  { name: "Saffron Aldridge", context: "Model, black book" },
  { name: "Conrad Black", context: "Media baron, black book" },
  { name: "Samantha Boardman", context: "Socialite, black book" },
  { name: "Robin Birley", context: "Club owner, black book" },
  { name: "Nicholas Candy", context: "Developer, black book" },
  { name: "Tom Ford", context: "Designer, black book" },
  { name: "Hamish Bowles", context: "Vogue editor, black book" },
  { name: "Sheridan Gibson-Butte", context: "Flight logs" },
  { name: "Shelly Harrison", context: "Flight logs" },
  { name: "Victoria Hazell", context: "Flight logs" },
  { name: "Dana Burns", context: "Flight logs" },
  { name: "Kelly Spamm", context: "Flight logs" },
  { name: "Alexandra Dixon", context: "Flight logs" },
  { name: "Sharon Reynolds", context: "Flight logs" },
  { name: "Kristy Rodgers", context: "Flight logs" },
  { name: "David Mullen", context: "Flight logs" },
  { name: "Joe Pagano", context: "Flight logs" },
  { name: "Eric Gany", context: "Black book" },
];

const CATEGORIES = [
  { key: "principals", label: "Principals", data: PRINCIPALS },
  { key: "victims", label: "Victims / Witnesses", data: VICTIMS_WITNESSES },
  { key: "associates", label: "Inner Circle / Associates", data: ASSOCIATES },
  { key: "politicians", label: "Politicians / Government", data: POLITICIANS },
  { key: "legal", label: "Legal Figures", data: LEGAL },
  { key: "business", label: "Business / Finance", data: BUSINESS },
  { key: "celebrities", label: "Celebrities / Entertainment", data: CELEBRITIES },
  { key: "academics", label: "Academics / Scientists", data: ACADEMICS },
  { key: "royalty", label: "Royalty / Aristocracy", data: ROYALTY },
  { key: "unredacted", label: "Recently Unredacted (2026)", data: RECENTLY_UNREDACTED },
  { key: "other", label: "Other Notable Names", data: OTHER_NOTABLE },
  { key: "locations", label: "Key Locations", data: LOCATIONS },
];

// Deduplicate by name across all categories (some appear in multiple)
function getAllItems() {
  const seen = new Set<string>();
  const items: (Person & { category: string })[] = [];
  for (const cat of CATEGORIES) {
    for (const person of cat.data) {
      const key = person.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ ...person, category: cat.label });
      }
    }
  }
  return items;
}

const ALL_ITEMS = getAllItems();

export default function MentionsPage() {
  const router = useRouter();
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const filteredItems = ALL_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (item.context && item.context.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const toggleExpand = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSearch = (name: string) => {
    const question = `Where and how is ${name} mentioned in the Epstein files?`;
    sessionStorage.setItem("pendingQuestion", question);
    router.push("/ask");
  };

  const totalNames = ALL_ITEMS.length;

  return (
    <div className="max-w-5xl mx-auto font-mono">
      <p className="text-xs text-muted-foreground mb-2 tracking-widest">
        [ MODULE: NAME_TRACKING ]
      </p>
      <h1 className="text-2xl font-bold text-primary mb-2">NOTABLE SUBJECTS</h1>
      <p className="text-muted-foreground mb-2 text-xs">
        <span className="text-primary">&gt;</span> {totalNames} notable names compiled from the black book, flight logs, court documents, and DOJ releases.
      </p>
      <p className="text-muted-foreground mb-6 text-xs">
        <span className="text-primary">&gt;</span> Click any name to search across 400,000+ documents. The full archive contains 23,000+ named individuals.
      </p>

      <Input
        placeholder="Filter by name or context (e.g. 'flight logs', 'black book')..."
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        className="mb-6 max-w-lg"
      />

      {searchFilter && (
        <p className="text-xs text-muted-foreground mb-4">
          {filteredItems.length} results for &quot;{searchFilter}&quot;
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map((category) => {
          // When filtering, show filtered items; otherwise show category data (deduped)
          const categoryItems = searchFilter
            ? filteredItems.filter(item => item.category === category.label)
            : category.data;
          
          if (categoryItems.length === 0) return null;

          const isExpanded = expandedCategories.has(category.key) || !!searchFilter;
          const INITIAL_SHOW = 8;
          const displayItems = isExpanded ? categoryItems : categoryItems.slice(0, INITIAL_SHOW);
          const hasMore = categoryItems.length > INITIAL_SHOW;

          return (
            <Card key={category.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                  <span>{category.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {categoryItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className={isExpanded && categoryItems.length > 12 ? "max-h-96" : ""}>
                  <div className="space-y-0.5">
                    {displayItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleSearch(item.name)}
                        className="w-full flex items-start justify-between px-3 py-2 rounded-md text-left hover:bg-accent transition-colors group gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-sm block">{item.name}</span>
                          {item.context && (
                            <span className="text-xs text-muted-foreground block mt-0.5 leading-tight">
                              {item.context}
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {item.count ? (
                            <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-xs">
                              {item.count.toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                              Search →
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                    {hasMore && !isExpanded && (
                      <button
                        onClick={() => toggleExpand(category.key)}
                        className="w-full px-3 py-2 text-xs text-primary hover:underline text-left"
                      >
                        + {categoryItems.length - INITIAL_SHOW} more...
                      </button>
                    )}
                    {hasMore && isExpanded && !searchFilter && (
                      <button
                        onClick={() => toggleExpand(category.key)}
                        className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-primary text-left"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg space-y-2">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">NOTE:</span> Being named in Epstein&apos;s documents does not indicate wrongdoing.
          Names appear as investigators, attorneys, witnesses, employees, victims, and incidental contacts.
          Always check the source documents for context.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">TIP:</span> Use the{" "}
          <a href="/ask" className="text-primary hover:underline">Ask AI</a>{" "}
          feature to ask questions like &quot;What is the connection between [name] and Epstein?&quot; for AI-powered analysis.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">SOURCES:</span> Names compiled from Epstein&apos;s black book (1,971 entries),
          flight logs, DOJ document releases (10 datasets), court filings, and the Feb 2026 unredacted documents.
          The full archive references 23,000+ individuals.
        </p>
      </div>
    </div>
  );
}
