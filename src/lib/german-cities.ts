export interface GermanCity {
  name: string;
  state: string;
}

export const GERMAN_CITIES: GermanCity[] = [
  // Baden-Württemberg
  { name: "Stuttgart", state: "Baden-Württemberg" },
  { name: "Mannheim", state: "Baden-Württemberg" },
  { name: "Karlsruhe", state: "Baden-Württemberg" },
  { name: "Freiburg im Breisgau", state: "Baden-Württemberg" },
  { name: "Heidelberg", state: "Baden-Württemberg" },
  { name: "Heilbronn", state: "Baden-Württemberg" },
  { name: "Ulm", state: "Baden-Württemberg" },
  { name: "Pforzheim", state: "Baden-Württemberg" },
  { name: "Reutlingen", state: "Baden-Württemberg" },
  { name: "Ludwigsburg", state: "Baden-Württemberg" },
  { name: "Konstanz", state: "Baden-Württemberg" },
  { name: "Villingen-Schwenningen", state: "Baden-Württemberg" },
  { name: "Offenburg", state: "Baden-Württemberg" },
  { name: "Esslingen am Neckar", state: "Baden-Württemberg" },
  { name: "Sindelfingen", state: "Baden-Württemberg" },
  { name: "Tübingen", state: "Baden-Württemberg" },
  { name: "Ravensburg", state: "Baden-Württemberg" },
  { name: "Göppingen", state: "Baden-Württemberg" },
  { name: "Friedrichshafen", state: "Baden-Württemberg" },
  { name: "Aalen", state: "Baden-Württemberg" },
  { name: "Schwäbisch Gmünd", state: "Baden-Württemberg" },
  { name: "Waiblingen", state: "Baden-Württemberg" },
  { name: "Böblingen", state: "Baden-Württemberg" },

  // Bayern
  { name: "München", state: "Bayern" },
  { name: "Nürnberg", state: "Bayern" },
  { name: "Augsburg", state: "Bayern" },
  { name: "Regensburg", state: "Bayern" },
  { name: "Ingolstadt", state: "Bayern" },
  { name: "Würzburg", state: "Bayern" },
  { name: "Fürth", state: "Bayern" },
  { name: "Erlangen", state: "Bayern" },
  { name: "Bayreuth", state: "Bayern" },
  { name: "Bamberg", state: "Bayern" },
  { name: "Landshut", state: "Bayern" },
  { name: "Rosenheim", state: "Bayern" },
  { name: "Kempten", state: "Bayern" },
  { name: "Aschaffenburg", state: "Bayern" },
  { name: "Neu-Ulm", state: "Bayern" },
  { name: "Schweinfurt", state: "Bayern" },
  { name: "Passau", state: "Bayern" },

  // Berlin
  { name: "Berlin", state: "Berlin" },

  // Brandenburg
  { name: "Potsdam", state: "Brandenburg" },
  { name: "Cottbus", state: "Brandenburg" },
  { name: "Brandenburg an der Havel", state: "Brandenburg" },
  { name: "Frankfurt (Oder)", state: "Brandenburg" },

  // Bremen
  { name: "Bremen", state: "Bremen" },
  { name: "Bremerhaven", state: "Bremen" },

  // Hamburg
  { name: "Hamburg", state: "Hamburg" },

  // Hessen
  { name: "Frankfurt am Main", state: "Hessen" },
  { name: "Wiesbaden", state: "Hessen" },
  { name: "Kassel", state: "Hessen" },
  { name: "Darmstadt", state: "Hessen" },
  { name: "Offenbach am Main", state: "Hessen" },
  { name: "Hanau", state: "Hessen" },
  { name: "Marburg", state: "Hessen" },
  { name: "Fulda", state: "Hessen" },
  { name: "Gießen", state: "Hessen" },
  { name: "Rüsselsheim am Main", state: "Hessen" },
  { name: "Wetzlar", state: "Hessen" },
  { name: "Bad Homburg vor der Höhe", state: "Hessen" },

  // Mecklenburg-Vorpommern
  { name: "Rostock", state: "Mecklenburg-Vorpommern" },
  { name: "Schwerin", state: "Mecklenburg-Vorpommern" },
  { name: "Neubrandenburg", state: "Mecklenburg-Vorpommern" },
  { name: "Stralsund", state: "Mecklenburg-Vorpommern" },
  { name: "Greifswald", state: "Mecklenburg-Vorpommern" },

  // Niedersachsen
  { name: "Hannover", state: "Niedersachsen" },
  { name: "Braunschweig", state: "Niedersachsen" },
  { name: "Osnabrück", state: "Niedersachsen" },
  { name: "Oldenburg", state: "Niedersachsen" },
  { name: "Wolfsburg", state: "Niedersachsen" },
  { name: "Göttingen", state: "Niedersachsen" },
  { name: "Salzgitter", state: "Niedersachsen" },
  { name: "Hildesheim", state: "Niedersachsen" },
  { name: "Delmenhorst", state: "Niedersachsen" },
  { name: "Lüneburg", state: "Niedersachsen" },
  { name: "Wilhelmshaven", state: "Niedersachsen" },
  { name: "Wolfenbüttel", state: "Niedersachsen" },
  { name: "Celle", state: "Niedersachsen" },
  { name: "Garbsen", state: "Niedersachsen" },
  { name: "Hameln", state: "Niedersachsen" },
  { name: "Lingen", state: "Niedersachsen" },
  { name: "Nordhorn", state: "Niedersachsen" },
  { name: "Langenhagen", state: "Niedersachsen" },
  { name: "Goslar", state: "Niedersachsen" },
  { name: "Emden", state: "Niedersachsen" },

  // Nordrhein-Westfalen
  { name: "Köln", state: "Nordrhein-Westfalen" },
  { name: "Düsseldorf", state: "Nordrhein-Westfalen" },
  { name: "Dortmund", state: "Nordrhein-Westfalen" },
  { name: "Essen", state: "Nordrhein-Westfalen" },
  { name: "Duisburg", state: "Nordrhein-Westfalen" },
  { name: "Bochum", state: "Nordrhein-Westfalen" },
  { name: "Wuppertal", state: "Nordrhein-Westfalen" },
  { name: "Bielefeld", state: "Nordrhein-Westfalen" },
  { name: "Bonn", state: "Nordrhein-Westfalen" },
  { name: "Münster", state: "Nordrhein-Westfalen" },
  { name: "Gelsenkirchen", state: "Nordrhein-Westfalen" },
  { name: "Krefeld", state: "Nordrhein-Westfalen" },
  { name: "Oberhausen", state: "Nordrhein-Westfalen" },
  { name: "Aachen", state: "Nordrhein-Westfalen" },
  { name: "Hagen", state: "Nordrhein-Westfalen" },
  { name: "Hamm", state: "Nordrhein-Westfalen" },
  { name: "Mülheim an der Ruhr", state: "Nordrhein-Westfalen" },
  { name: "Solingen", state: "Nordrhein-Westfalen" },
  { name: "Leverkusen", state: "Nordrhein-Westfalen" },
  { name: "Neuss", state: "Nordrhein-Westfalen" },
  { name: "Paderborn", state: "Nordrhein-Westfalen" },
  { name: "Remscheid", state: "Nordrhein-Westfalen" },
  { name: "Moers", state: "Nordrhein-Westfalen" },
  { name: "Siegen", state: "Nordrhein-Westfalen" },
  { name: "Gütersloh", state: "Nordrhein-Westfalen" },
  { name: "Herne", state: "Nordrhein-Westfalen" },
  { name: "Bottrop", state: "Nordrhein-Westfalen" },
  { name: "Recklinghausen", state: "Nordrhein-Westfalen" },
  { name: "Bergisch Gladbach", state: "Nordrhein-Westfalen" },
  { name: "Troisdorf", state: "Nordrhein-Westfalen" },
  { name: "Witten", state: "Nordrhein-Westfalen" },
  { name: "Iserlohn", state: "Nordrhein-Westfalen" },
  { name: "Mönchengladbach", state: "Nordrhein-Westfalen" },
  { name: "Velbert", state: "Nordrhein-Westfalen" },
  { name: "Minden", state: "Nordrhein-Westfalen" },
  { name: "Marl", state: "Nordrhein-Westfalen" },
  { name: "Lünen", state: "Nordrhein-Westfalen" },
  { name: "Dormagen", state: "Nordrhein-Westfalen" },
  { name: "Ratingen", state: "Nordrhein-Westfalen" },
  { name: "Hattingen", state: "Nordrhein-Westfalen" },
  { name: "Castrop-Rauxel", state: "Nordrhein-Westfalen" },
  { name: "Detmold", state: "Nordrhein-Westfalen" },
  { name: "Dinslaken", state: "Nordrhein-Westfalen" },
  { name: "Gladbeck", state: "Nordrhein-Westfalen" },
  { name: "Viersen", state: "Nordrhein-Westfalen" },
  { name: "Unna", state: "Nordrhein-Westfalen" },
  { name: "Rheine", state: "Nordrhein-Westfalen" },
  { name: "Wesel", state: "Nordrhein-Westfalen" },
  { name: "Lüdenscheid", state: "Nordrhein-Westfalen" },
  { name: "Herford", state: "Nordrhein-Westfalen" },
  { name: "Dorsten", state: "Nordrhein-Westfalen" },
  { name: "Pulheim", state: "Nordrhein-Westfalen" },
  { name: "Sankt Augustin", state: "Nordrhein-Westfalen" },
  { name: "Kerpen", state: "Nordrhein-Westfalen" },

  // Rheinland-Pfalz
  { name: "Mainz", state: "Rheinland-Pfalz" },
  { name: "Ludwigshafen am Rhein", state: "Rheinland-Pfalz" },
  { name: "Koblenz", state: "Rheinland-Pfalz" },
  { name: "Trier", state: "Rheinland-Pfalz" },
  { name: "Kaiserslautern", state: "Rheinland-Pfalz" },
  { name: "Worms", state: "Rheinland-Pfalz" },
  { name: "Neustadt an der Weinstraße", state: "Rheinland-Pfalz" },
  { name: "Bad Kreuznach", state: "Rheinland-Pfalz" },
  { name: "Speyer", state: "Rheinland-Pfalz" },

  // Saarland
  { name: "Saarbrücken", state: "Saarland" },

  // Sachsen
  { name: "Dresden", state: "Sachsen" },
  { name: "Leipzig", state: "Sachsen" },
  { name: "Chemnitz", state: "Sachsen" },
  { name: "Zwickau", state: "Sachsen" },
  { name: "Plauen", state: "Sachsen" },
  { name: "Görlitz", state: "Sachsen" },

  // Sachsen-Anhalt
  { name: "Halle (Saale)", state: "Sachsen-Anhalt" },
  { name: "Magdeburg", state: "Sachsen-Anhalt" },
  { name: "Dessau-Roßlau", state: "Sachsen-Anhalt" },

  // Schleswig-Holstein
  { name: "Kiel", state: "Schleswig-Holstein" },
  { name: "Lübeck", state: "Schleswig-Holstein" },
  { name: "Flensburg", state: "Schleswig-Holstein" },
  { name: "Neumünster", state: "Schleswig-Holstein" },
  { name: "Norderstedt", state: "Schleswig-Holstein" },

  // Thüringen
  { name: "Erfurt", state: "Thüringen" },
  { name: "Jena", state: "Thüringen" },
  { name: "Gera", state: "Thüringen" },
  { name: "Weimar", state: "Thüringen" },
];

export const CITIES = GERMAN_CITIES;
export const STATES = [...new Set(CITIES.map((c) => c.state))].sort();
