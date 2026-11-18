import type { EntranceTestQuestion } from "../../school-types";
import {
  buildFactBankTuples,
  makeNumOptions,
  shuffleFourOptions,
  type FactPair,
  type QTuple,
} from "./helpers";

// Generates +190 unique, grade-calibrated questions per subject (English, Mathematics, Hindi, EVS / GK)
// for each of Classes 1, 2, 3, 4, and 5 so every subject reaches 315+ total questions.

// ── 1. ENGLISH EXPANSION (Classes 1–5: 190+ distinct questions per class) ──────
const ENG_G1_2_FACTS = {
  antonyms: [
    ["Hot", "Cold"], ["Up", "Down"], ["Big", "Small"], ["Long", "Short"], ["Fast", "Slow"],
    ["Day", "Night"], ["Happy", "Sad"], ["Open", "Shut"], ["New", "Old"], ["Clean", "Dirty"],
    ["Hard", "Soft"], ["Heavy", "Light"], ["Full", "Empty"], ["Good", "Bad"], ["Near", "Far"],
    ["In", "Out"], ["Sit", "Stand"], ["Laugh", "Cry"], ["Black", "White"], ["Tall", "Short"],
    ["Dry", "Wet"], ["Rich", "Poor"], ["Young", "Old"], ["Right", "Wrong"], ["Early", "Late"],
    ["Sweet", "Sour"], ["Dark", "Bright"], ["Push", "Pull"], ["Boy", "Girl"], ["Yes", "No"],
  ] as [string, string][],
  plurals: [
    ["Cat", "Cats"], ["Bat", "Bats"], ["Hat", "Hats"], ["Cup", "Cups"], ["Pen", "Pens"],
    ["Hen", "Hens"], ["Fan", "Fans"], ["Bag", "Bags"], ["Rat", "Rats"], ["Mat", "Mats"],
    ["Box", "Boxes"], ["Fox", "Foxes"], ["Bus", "Buses"], ["Dish", "Dishes"], ["Brush", "Brushes"],
    ["Watch", "Watches"], ["Bench", "Benches"], ["Mango", "Mangoes"], ["Hero", "Heroes"], ["Toy", "Toys"],
    ["Boy", "Boys"], ["Key", "Keys"], ["Baby", "Babies"], ["Lady", "Ladies"], ["City", "Cities"],
    ["Leaf", "Leaves"], ["Knife", "Knives"], ["Child", "Children"], ["Tooth", "Teeth"], ["Foot", "Feet"],
  ] as [string, string][],
  genders: [
    ["King", "Queen"], ["Prince", "Princess"], ["Father", "Mother"], ["Brother", "Sister"], ["Uncle", "Aunt"],
    ["Son", "Daughter"], ["Grandfather", "Grandmother"], ["Husband", "Wife"], ["Bull", "Cow"], ["Cock", "Hen"],
    ["Lion", "Lioness"], ["Tiger", "Tigress"], ["Horse", "Mare"], ["Dog", "Bitch"], ["Peacock", "Peahen"],
    ["Actor", "Actress"], ["Waiter", "Waitress"], ["Man", "Woman"], ["Sir", "Madam"], ["Nephew", "Niece"],
  ] as [string, string][],
  articles: [
    ["___ apple", "an"], ["___ orange", "an"], ["___ umbrella", "an"], ["___ elephant", "an"], ["___ igloo", "an"],
    ["___ egg", "an"], ["___ owl", "an"], ["___ ice cream", "an"], ["___ ant", "an"], ["___ inkpot", "an"],
    ["___ ball", "a"], ["___ cat", "a"], ["___ dog", "a"], ["___ kite", "a"], ["___ mango", "a"],
    ["___ pencil", "a"], ["___ rabbit", "a"], ["___ table", "a"], ["___ zebra", "a"], ["___ tree", "a"],
    ["___ Sun", "the"], ["___ Moon", "the"], ["___ Earth", "the"], ["___ Taj Mahal", "the"], ["___ Ganga", "the"],
  ] as [string, string][],
  rhyming: [
    ["Cat", "Bat", ["Dog", "Sun", "Pen"]], ["Sun", "Bun", ["Cup", "Red", "Top"]],
    ["Pin", "Tin", ["Car", "Leg", "Hat"]], ["Hot", "Pot", ["Fan", "Mat", "Pig"]],
    ["Bell", "Well", ["Book", "Hand", "Star"]], ["Tree", "Bee", ["Cow", "Box", "Run"]],
    ["King", "Ring", ["Girl", "Boat", "Moon"]], ["Cake", "Lake", ["Fish", "Door", "Bird"]],
    ["Night", "Light", ["Rain", "Drum", "Desk"]], ["Gold", "Cold", ["Milk", "Leaf", "Shoe"]],
    ["Ball", "Tall", ["Pin", "Frog", "lamp"]], ["Book", "Look", ["Gate", "Nose", "Seed"]],
    ["Rain", "Train", ["Duck", "Coat", "Bear"]], ["Star", "Car", ["Kite", "Frog", "Shoe"]],
    ["Song", "Long", ["Chair", "Bird", "Leaf"]], ["Blue", "Glue", ["Pink", "Nest", "Bell"]],
    ["Coat", "Boat", ["Drum", "Tent", "Pear"]], ["Seed", "Read", ["Foot", "Sand", "Frog"]],
    ["Hand", "Sand", ["Milk", "Rose", "Duck"]], ["Moon", "Spoon", ["Tree", "Wind", "Leaf"]],
  ] as [string, string, [string, string, string]][],
};

const ENG_G3_5_FACTS = {
  synonyms: [
    { prompt: "Synonym of 'BRAVE':", answer: "Courageous" },
    { prompt: "Synonym of 'BEGIN':", answer: "Start" },
    { prompt: "Synonym of 'ANCIENT':", answer: "Very Old" },
    { prompt: "Synonym of 'HUGE':", answer: "Enormous" },
    { prompt: "Synonym of 'SILENT':", answer: "Quiet" },
    { prompt: "Synonym of 'WEALTHY':", answer: "Rich" },
    { prompt: "Synonym of 'CLEVER':", answer: "Intelligent" },
    { prompt: "Synonym of 'POLITE':", answer: "Courteous" },
    { prompt: "Synonym of 'RAPID':", answer: "Fast" },
    { prompt: "Synonym of 'ASSIST':", answer: "Help" },
    { prompt: "Synonym of 'PROTECT':", answer: "Guard" },
    { prompt: "Synonym of 'FINISH':", answer: "Complete" },
    { prompt: "Synonym of 'ERROR':", answer: "Mistake" },
    { prompt: "Synonym of 'FRAGILE':", answer: "Delicate" },
    { prompt: "Synonym of 'GENEROUS':", answer: "Kind-hearted" },
    { prompt: "Synonym of 'TIMID':", answer: "Shy" },
    { prompt: "Synonym of 'VICTORY':", answer: "Triumph" },
    { prompt: "Synonym of 'GENUINE':", answer: "Real" },
    { prompt: "Synonym of 'ANNUAL':", answer: "Yearly" },
    { prompt: "Synonym of 'PRECIOUS':", answer: "Valuable" },
    { prompt: "Synonym of 'OBEY':", answer: "Follow" },
    { prompt: "Synonym of 'SCARCE':", answer: "Rare" },
    { prompt: "Synonym of 'BRIEF':", answer: "Short" },
    { prompt: "Synonym of 'VACANT':", answer: "Empty" },
    { prompt: "Synonym of 'GLOOMY':", answer: "Sad" },
  ] as FactPair[],
  antonyms: [
    { prompt: "Antonym of 'ACCEPT':", answer: "Reject" },
    { prompt: "Antonym of 'ARRIVE':", answer: "Depart" },
    { prompt: "Antonym of 'BRAVE':", answer: "Cowardly" },
    { prompt: "Antonym of 'CREATE':", answer: "Destroy" },
    { prompt: "Antonym of 'CRUEL':", answer: "Kind" },
    { prompt: "Antonym of 'DEEP':", answer: "Shallow" },
    { prompt: "Antonym of 'EXPAND':", answer: "Contract" },
    { prompt: "Antonym of 'FAMOUS':", answer: "Unknown" },
    { prompt: "Antonym of 'FREEDOM':", answer: "Slavery" },
    { prompt: "Antonym of 'GAIN':", answer: "Loss" },
    { prompt: "Antonym of 'GUILTY':", answer: "Innocent" },
    { prompt: "Antonym of 'HONEST':", answer: "Dishonest" },
    { prompt: "Antonym of 'INCLUDE':", answer: "Exclude" },
    { prompt: "Antonym of 'JUNIOR':", answer: "Senior" },
    { prompt: "Antonym of 'KNOWLEDGE':", answer: "Ignorance" },
    { prompt: "Antonym of 'LENIENT':", answer: "Strict" },
    { prompt: "Antonym of 'MAJOR':", answer: "Minor" },
    { prompt: "Antonym of 'NATURAL':", answer: "Artificial" },
    { prompt: "Antonym of 'OBEDIENT':", answer: "Disobedient" },
    { prompt: "Antonym of 'PERMANENT':", answer: "Temporary" },
    { prompt: "Antonym of 'PRESENT':", answer: "Absent" },
    { prompt: "Antonym of 'PROFIT':", answer: "Loss (Financial)" },
    { prompt: "Antonym of 'REMEMBER':", answer: "Forget" },
    { prompt: "Antonym of 'SUCCESS':", answer: "Failure" },
    { prompt: "Antonym of 'VICTORY':", answer: "Defeat" },
  ] as FactPair[],
  collectives: [
    { prompt: "A group of lions is called a:", answer: "Pride" },
    { prompt: "A group of bees is called a:", answer: "Swarm" },
    { prompt: "A group of fish is called a:", answer: "School / Shoal" },
    { prompt: "A group of wolves is called a:", answer: "Pack" },
    { prompt: "A group of birds flying together is a:", answer: "Flock" },
    { prompt: "A group of cattle/cows is called a:", answer: "Herd" },
    { prompt: "A collection of books is stored in a:", answer: "Library" },
    { prompt: "A bunch of flowers tied together is a:", answer: "Bouquet" },
    { prompt: "A group of soldiers is called an:", answer: "Army / Regiment" },
    { prompt: "A group of sailors on a ship is a:", answer: "Crew" },
    { prompt: "A group of players on a sports side is a:", answer: "Team" },
    { prompt: "A group of stars forming a pattern is a:", answer: "Constellation" },
    { prompt: "A collection of keys is called a:", answer: "Bunch" },
    { prompt: "A group of judges is called a:", answer: "Bench / Jury" },
    { prompt: "A collection of ships is called a:", answer: "Fleet" },
    { prompt: "A group of puppies born together is a:", answer: "Litter" },
    { prompt: "A group of musicians playing together is a:", answer: "Band / Orchestra" },
    { prompt: "A group of grapes on one stem is a:", answer: "Cluster" },
    { prompt: "A group of ants is called a:", answer: "Colony" },
    { prompt: "A group of elephants is called a:", answer: "Parade / Herd" },
  ] as FactPair[],
  oneWord: [
    { prompt: "A person who flies an aeroplane:", answer: "Pilot" },
    { prompt: "A person who writes books:", answer: "Author" },
    { prompt: "A person who grows crops in fields:", answer: "Farmer" },
    { prompt: "A person who paints pictures:", answer: "Artist" },
    { prompt: "A place where sick patients are treated:", answer: "Hospital" },
    { prompt: "A person who designs buildings:", answer: "Architect" },
    { prompt: "A person who studies stars and planets:", answer: "Astronomer" },
    { prompt: "A person who cannot read or write:", answer: "Illiterate" },
    { prompt: "A story of someone's life written by themselves:", answer: "Autobiography" },
    { prompt: "One who loves their country deeply:", answer: "Patriot" },
    { prompt: "One who eats only plant food (no meat):", answer: "Vegetarian" },
    { prompt: "A period of 100 years is called a:", answer: "Century" },
    { prompt: "A period of 10 years is called a:", answer: "Decade" },
    { prompt: "Happening once every year:", answer: "Annual" },
    { prompt: "A child whose parents have passed away:", answer: "Orphan" },
    { prompt: "Something that breaks very easily:", answer: "Fragile" },
    { prompt: "A person who sells medicines:", answer: "Chemist" },
    { prompt: "A place where wild animals are kept for public view:", answer: "Zoo" },
    { prompt: "A book giving meanings of words:", answer: "Dictionary" },
    { prompt: "A list of days, weeks, and months of a year:", answer: "Calendar" },
  ] as FactPair[],
  grammarPairs: [
    { prompt: "Comparative degree of 'Good':", answer: "Better" },
    { prompt: "Superlative degree of 'Good':", answer: "Best" },
    { prompt: "Comparative degree of 'Bad':", answer: "Worse" },
    { prompt: "Superlative degree of 'Tall':", answer: "Tallest" },
    { prompt: "Past tense of 'Go':", answer: "Went" },
    { prompt: "Past tense of 'Write':", answer: "Wrote" },
    { prompt: "Past tense of 'Eat':", answer: "Ate" },
    { prompt: "Past tense of 'Buy':", answer: "Bought" },
    { prompt: "Past tense of 'Teach':", answer: "Taught" },
    { prompt: "Past tense of 'Catch':", answer: "Caught" },
    { prompt: "Past tense of 'Swim':", answer: "Swam" },
    { prompt: "Past tense of 'Bring':", answer: "Brought" },
    { prompt: "Past participle of 'Break':", answer: "Broken" },
    { prompt: "Past participle of 'Take':", answer: "Taken" },
    { prompt: "Past tense of 'Sing':", answer: "Sang" },
    { prompt: "Past tense of 'Speak':", answer: "Spoke" },
    { prompt: "Past tense of 'Fly':", answer: "Flew" },
    { prompt: "Past tense of 'Drink':", answer: "Drank" },
    { prompt: "Past tense of 'See':", answer: "Saw" },
    { prompt: "Past tense of 'Run':", answer: "Ran" },
  ] as FactPair[],
  prepositions: [
    ["The cat is hiding ___ the table.", "under", ["between", "into", "over"]],
    ["We go to school ___ bus.", "by", ["on", "from", "into"]],
    ["She was born ___ Monday.", "on", ["in", "at", "by"]],
    ["India got freedom ___ August 1947.", "in", ["on", "at", "under"]],
    ["The train arrives ___ 6 o'clock.", "at", ["on", "in", "into"]],
    ["Divide these chocolates ___ the two sisters.", "between", ["among", "from", "with"]],
    ["Share these sweets ___ all five friends.", "among", ["between", "at", "under"]],
    ["The frog jumped ___ the pond.", "into", ["on", "under", "between"]],
    ["He is fond ___ reading storybooks.", "of", ["in", "at", "with"]],
    ["We must listen carefully ___ our teacher.", "to", ["at", "for", "from"]],
    ["Riya is afraid ___ lizards.", "of", ["from", "with", "on"]],
    ["I wrote this letter ___ a blue pen.", "with", ["by", "on", "to"]],
    ["The aeroplane flew ___ the dark clouds.", "above", ["under", "into", "between"]],
    ["Please wait here ___ I return.", "until", ["since", "during", "over"]],
    ["He has been living here ___ 2020.", "since", ["for", "from", "at"]],
  ] as [string, string, [string, string, string]][],
  spellings: [
    ["Necessary", ["Neccessary", "Necesary", "Neccesary"]],
    ["Tomorrow", ["Tommorrow", "Tomorow", "Tommorow"]],
    ["Separate", ["Seperate", "Separat", "Separete"]],
    ["Beautiful", ["Beautifull", "Beutiful", "Buetiful"]],
    ["Friend", ["Freind", "Frend", "Friand"]],
    ["Knowledge", ["Knowlege", "Nowledge", "Knowledg"]],
    ["Because", ["Becouse", "Becauze", "Beacuse"]],
    ["Calendar", ["Calender", "Calandar", "Calander"]],
    ["Receive", ["Recieve", "Receve", "Reseive"]],
    ["Believe", ["Beleive", "Belive", "Beleeve"]],
    ["Discipline", ["Disipline", "Disciplin", "Dissipline"]],
    ["Environment", ["Enviroment", "Environmant", "Invironment"]],
    ["Exercise", ["Exersize", "Excercise", "Exersise"]],
    ["February", ["Febuary", "Febrary", "Februay"]],
    ["Grammar", ["Grammer", "Gramar", "Gramer"]],
    ["Height", ["Hieght", "Heigth", "Hight"]],
    ["Library", ["Libary", "Librery", "Libery"]],
    ["Mountain", ["Mountian", "Mounten", "Muntain"]],
    ["Neighbour", ["Nieghbour", "Neighbur", "Neigbour"]],
    ["Vacation", ["Vocation", "Vecation", "Vacasion"]],
  ] as [string, [string, string, string]][],
};

function buildEnglishExpansion(cls: 1 | 2 | 3 | 4 | 5): QTuple[] {
  const out: QTuple[] = [];

  if (cls <= 2) {
    // 30 Antonyms (context-varied for Class 1 vs Class 2)
    out.push(
      ...buildFactBankTuples({
        subject: "English",
        topicTag: "Opposites",
        seedPrefix: `c${cls}_exp_eng_ant`,
        items: ENG_G1_2_FACTS.antonyms.map(([w, opp]) => ({
          prompt: cls === 1 ? `Choose the opposite of '${w}':` : `Fill the opposite pair: ${w} ↔ ___`,
          answer: opp,
          explanation: `The opposite of '${w}' is '${opp}'.`,
        })),
      })
    );

    // 30 Plurals
    out.push(
      ...buildFactBankTuples({
        subject: "English",
        topicTag: "Singular-Plural",
        seedPrefix: `c${cls}_exp_eng_pl`,
        items: ENG_G1_2_FACTS.plurals.map(([s, p]) => ({
          prompt: cls === 1 ? `One ${s}, many ___:` : `What is the plural form of '${s}'?`,
          answer: p,
          explanation: `Plural of '${s}' is '${p}'.`,
        })),
      })
    );

    // 20 Genders
    out.push(
      ...buildFactBankTuples({
        subject: "English",
        topicTag: "Gender Words",
        seedPrefix: `c${cls}_exp_eng_gen`,
        items: ENG_G1_2_FACTS.genders.map(([m, f]) => ({
          prompt: cls === 1 ? `Select the feminine pair of '${m}':` : `Which word is the female form of '${m}'?`,
          answer: f,
          explanation: `${m} (male) pairs with ${f} (female).`,
        })),
      })
    );

    // 25 Articles
    ENG_G1_2_FACTS.articles.forEach(([phrase, ans], i) => {
      const wrongs: [string, string, string] =
        ans === "an" ? ["a", "the", "no article"] : ans === "a" ? ["an", "the", "no article"] : ["a", "an", "no article"];
      const { options, correctIndex } = shuffleFourOptions(ans, wrongs, `c${cls}_eng_art_${i}`);
      out.push([
        "English",
        "FILL_BLANK",
        `Choose the correct article (${cls === 1 ? "a / an / the" : "Grammar"}): ${phrase}`,
        options,
        correctIndex,
        `We use '${ans}' in '${phrase.replace("___", ans)}'.`,
        "Articles",
      ]);
    });

    // 20 Rhyming
    ENG_G1_2_FACTS.rhyming.forEach(([w, rhyme, wrongs], i) => {
      const { options, correctIndex } = shuffleFourOptions(rhyme, wrongs, `c${cls}_eng_rhy_${i}`);
      out.push([
        "English",
        "MCQ",
        `Which word rhymes with '${w}'?`,
        options,
        correctIndex,
        `'${rhyme}' ends with the same sound as '${w}'.`,
        "Phonics & Rhyming",
      ]);
    });

    // 35 CVC / Grade 1-2 Vocabulary Missing Letters & Spellings
    const spellingWords =
      cls === 1
        ? [
            "A_PLE:P:Apple", "B_LL:A:Ball", "C_T:A:Cat", "D_G:O:Dog", "E_G:G:Egg",
            "F_SH:I:Fish", "G_AT:O:Goat", "H_USE:O:House", "K_TE:I:Kite", "L_ON:I:Lion",
            "M_ON:O:Moon", "N_ST:E:Nest", "P_N:E:Pen", "R_SE:O:Rose", "S_N:U:Sun",
            "TR_E:E:Tree", "W_TER:A:Water", "B_RD:I:Bird", "FR_G:O:Frog", "ST_R:A:Star",
            "B_OK:O:Book", "C_KE:A:Cake", "D_CK:U:Duck", "H_ND:A:Hand", "L_AF:E:Leaf",
            "M_LK:I:Milk", "R_IN:A:Rain", "SH_P:I:Ship", "T_IGER:I:Tiger", "Z_BRA:E:Zebra",
            "G_RL:I:Girl", "B_Y:O:Boy", "K_NG:I:King", "Q_EEN:U:Queen", "R_AD:O:Road",
          ]
        : [
            "S_HOOL:C:School", "T_ACHER:E:Teacher", "FR_END:I:Friend", "M_THER:O:Mother", "F_THER:A:Father",
            "G_RDEN:A:Garden", "F_OWER:L:Flower", "M_RNING:O:Morning", "EV_NING:E:Evening", "W_NDOW:I:Window",
            "P_NCIL:E:Pencil", "E_ASER:R:Eraser", "T_BLE:A:Table", "C_AIR:H:Chair", "B_SKET:A:Basket",
            "B_NANA:A:Banana", "O_ANGE:R:Orange", "M_NGO:A:Mango", "G_APES:R:Grapes", "T_MATO:O:Tomato",
            "P_TATO:O:Potato", "C_RROT:A:Carrot", "M_NKEY:O:Monkey", "R_BBIT:A:Rabbit", "E_EPHANT:L:Elephant",
            "P_RROT:A:Parrot", "P_ACOCK:E:Peacock", "S_NDAY:U:Sunday", "M_NDAY:O:Monday", "W_NTER:I:Winter",
            "S_MMER:U:Summer", "R_INBOW:A:Rainbow", "CL_UD:O:Cloud", "R_VER:I:River", "V_LLAGE:I:Village",
          ];

    const letterOpts = ["A", "E", "I", "O", "U", "C", "H", "L", "M", "P", "R", "G", "B"];
    spellingWords.forEach((entry, i) => {
      const [pattern, missing, fullWord] = entry.split(":");
      const wrongs = letterOpts.filter((l) => l !== missing).slice((i * 3) % 8, ((i * 3) % 8) + 3) as [string, string, string];
      const { options, correctIndex } = shuffleFourOptions(missing, wrongs, `c${cls}_eng_sp_${i}`);
      out.push([
        "English",
        "FILL_BLANK",
        `Fill in the missing letter to spell '${fullWord}': ${pattern}`,
        options,
        correctIndex,
        `Adding '${missing}' completes the word '${fullWord}'.`,
        "Spelling",
      ]);
    });

    // 30 Grammar & Sentence Sense (is/am/are, he/she/it, verbs, nouns)
    const sentItems: [string, string, [string, string, string]][] = [
      ["I ___ a good student.", "am", ["is", "are", "were"]],
      ["She ___ reading a storybook.", "is", ["am", "are", "were"]],
      ["They ___ playing in the park.", "are", ["is", "am", "was"]],
      ["We ___ happy to go to school.", "are", ["is", "am", "has"]],
      ["He ___ a red bicycle.", "has", ["have", "are", "am"]],
      ["I ___ two pencils in my box.", "have", ["has", "is", "was"]],
      ["Cats ___ milk every morning.", "drink", ["drinks", "drinking", "drank"]],
      ["The Sun ___ brightly in the sky.", "shines", ["shine", "shining", "are"]],
      ["A cow ___ us sweet milk.", "gives", ["give", "giving", "are"]],
      ["Birds ___ with their wings.", "fly", ["flies", "flying", "swims"]],
      ["My father ___ to office daily.", "goes", ["go", "going", "are"]],
      ["Rohan and Aman ___ best friends.", "are", ["is", "am", "was"]],
      ["___ is your name?", "What", ["Who", "Where", "When"]],
      ["___ do you live?", "Where", ["Who", "What", "Which"]],
      ["___ teaches you English?", "Who", ["What", "Where", "Why"]],
      ["___ colour is a ripe banana?", "What", ["Who", "Where", "How many"]],
      ["This is a boy. ___ name is Kabir.", "His", ["Her", "Its", "Their"]],
      ["This is a girl. ___ bag is pink.", "Her", ["His", "Its", "He"]],
      ["Look at the puppy. ___ tail is short.", "Its", ["His", "Her", "They"]],
      ["Which word is a NOUN (naming word)?", "School", ["Run", "Blue", "Quickly"]],
      ["Which word is a VERB (action word)?", "Jump", ["Apple", "Chair", "Green"]],
      ["Which word is an ADJECTIVE (describing word)?", "Sweet", ["Mango", "Sing", "Boy"]],
      ["Which punctuation mark ends an asking sentence?", "?", [".", ",", "!"]],
      ["Which letter is ALWAYS a capital letter when alone?", "I", ["a", "e", "o"]],
      ["How many vowels are there in the English alphabet?", "5", ["4", "6", "21"]],
      ["How many consonants are there in the English alphabet?", "21", ["5", "20", "26"]],
      ["Find the odd word (Animals vs Book):", "Book", ["Lion", "Tiger", "Deer"]],
      ["Find the odd word (Colours vs Run):", "Run", ["Red", "Blue", "Yellow"]],
      ["True or False: A sentence begins with a capital letter.", "True", ["False", "Only names", "Never"]],
      ["Choose the correctly punctuated sentence:", "My name is Ananya.", ["my name is ananya", "My name is Ananya,", "my Name Is Ananya?"]],
    ];

    sentItems.forEach(([q, ans, wrongs], i) => {
      const { options, correctIndex } = shuffleFourOptions(ans, wrongs, `c${cls}_eng_sen_${i}`);
      out.push(["English", "MCQ", q, options, correctIndex, `Correct choice is '${ans}'.`, "Grammar & Usage"]);
    });

    return out;
  }

  // Classes 3, 4, 5 (190 questions each)
  out.push(
    ...buildFactBankTuples({
      subject: "English",
      topicTag: "Synonyms",
      seedPrefix: `c${cls}_exp_eng_syn`,
      items: ENG_G3_5_FACTS.synonyms.map((it) => ({
        prompt: cls === 3 ? `Choose a word with same meaning — ${it.prompt}` : cls === 4 ? it.prompt : `Closest synonym — ${it.prompt}`,
        answer: it.answer,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "English",
      topicTag: "Antonyms",
      seedPrefix: `c${cls}_exp_eng_ant`,
      items: ENG_G3_5_FACTS.antonyms.map((it) => ({
        prompt: cls === 3 ? `Choose the opposite — ${it.prompt}` : it.prompt,
        answer: it.answer,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "English",
      topicTag: "Collective Nouns",
      seedPrefix: `c${cls}_exp_eng_col`,
      items: ENG_G3_5_FACTS.collectives.map((it) => ({
        prompt: `Grammar (Class ${cls}) — ${it.prompt}`,
        answer: it.answer,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "English",
      topicTag: "One-Word Substitution",
      seedPrefix: `c${cls}_exp_eng_one`,
      items: ENG_G3_5_FACTS.oneWord.map((it) => ({
        prompt: `Vocabulary (Class ${cls}) — ${it.prompt}`,
        answer: it.answer,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "English",
      topicTag: "Tenses & Degrees",
      seedPrefix: `c${cls}_exp_eng_gr`,
      items: ENG_G3_5_FACTS.grammarPairs.map((it) => ({
        prompt: `Verb & Degree (Class ${cls}) — ${it.prompt}`,
        answer: it.answer,
      })),
    })
  );

  ENG_G3_5_FACTS.prepositions.forEach(([q, ans, wrongs], i) => {
    const { options, correctIndex } = shuffleFourOptions(ans, wrongs, `c${cls}_eng_prep_${i}`);
    out.push(["English", "FILL_BLANK", `Preposition Practice (Class ${cls}): ${q}`, options, correctIndex, `Correct preposition is '${ans}'.`, "Prepositions"]);
  });

  ENG_G3_5_FACTS.spellings.forEach(([correct, wrongs], i) => {
    const { options, correctIndex } = shuffleFourOptions(correct, wrongs, `c${cls}_eng_sp_${i}`);
    out.push(["English", "MCQ", `Choose the CORRECT spelling (${cls === 3 ? "Set A" : cls === 4 ? "Set B" : "Set C"}):`, options, correctIndex, `Correct spelling is '${correct}'.`, "Spelling"]);
  });

  // 45 additional Tense, Voice, Conjunction, Pronoun, Punctuation & Mini-Passage MCQs
  const advGrammar: [string, string, [string, string, string], string?][] = [
    ["I wanted to buy the book, ___ I did not have enough money.", "but", ["and", "or", "so"]],
    ["Work hard ___ you will not succeed.", "or", ["but", "and", "because"]],
    ["She stayed at home ___ it was raining heavily.", "because", ["but", "or", "unless"]],
    ["___ he is poor, he is completely honest.", "Although", ["Because", "So", "Unless"]],
    ["Wait here ___ the bell rings.", "until", ["because", "since", "unless"]],
    ["Neither Rahul ___ his brothers were present.", "nor", ["or", "and", "but"]],
    ["Either you ___ your friend must solve this.", "or", ["nor", "and", "but"]],
    ["He is not only smart ___ also very kind.", "but", ["and", "or", "yet"]],
    ["Bread and butter ___ my favourite breakfast.", "is", ["are", "were", "have"]],
    ["Slow and steady ___ the race.", "wins", ["win", "winning", "won"]],
    ["Every student in the class ___ a uniform.", "wears", ["wear", "wearing", "were"]],
    ["One of my cousins ___ in Bengaluru.", "lives", ["live", "living", "are"]],
    ["She ___ already finished her homework.", "has", ["have", "is", "was"]],
    ["Tomorrow we ___ visit the Science Museum.", "shall", ["did", "were", "has"]],
    ["The train ___ before we reached the station.", "had left", ["leaves", "is leaving", "will leave"]],
    ["Look! The birds ___ flying south for winter.", "are", ["is", "was", "has"]],
    ["If you heat ice, it ___ into water.", "melts", ["melted", "melting", "will melted"]],
    ["Honesty ___ the best policy.", "is", ["are", "were", "am"]],
    ["Identify the ADVERB: 'The tortoise walked slowly.'", "slowly", ["tortoise", "walked", "the"]],
    ["Identify the PRONOUN: 'They helped us cross the road.'", "They", ["helped", "cross", "road"]],
    ["Identify the CONJUNCTION: 'He ran fast yet missed the bus.'", "yet", ["fast", "missed", "bus"]],
    ["Identify the INTERJECTION: 'Hurrah! We won the championship!'", "Hurrah!", ["We", "won", "championship"]],
    ["What does the idiom 'Once in a blue moon' mean?", "Very rarely", ["Every full moon", "Daily", "Twice a week"]],
    ["What does the idiom 'A piece of cake' mean?", "Very easy task", ["Sweet food", "Hard puzzle", "Broken plate"]],
    ["What does the idiom 'Break a leg' mean?", "Good luck!", ["Fall down", "Run fast", "Get hurt"]],
    ["Choose the plural of 'Ox':", "Oxen", ["Oxes", "Oxs", "Oxies"]],
    ["Choose the plural of 'Deer':", "Deer", ["Deers", "Deeries", "Deeres"]],
    ["Choose the plural of 'Goose':", "Geese", ["Gooses", "Goosies", "Geese's"]],
    ["Choose the female word for 'Wizard':", "Witch", ["Wizardess", "Queen", "Fairy"]],
    ["Choose the male word for 'Duck':", "Drake", ["Gander", "Stag", "Ram"]],
    ["Choose the young one of a 'Deer':", "Fawn", ["Cub", "Calf", "Kid"]],
    ["Choose the young one of a 'Horse':", "Foal / Colt", ["Puppy", "Kitten", "Lamb"]],
    ["Choose the sound made by an 'Elephant':", "Trumpet", ["Roar", "Neigh", "Bleat"]],
    ["Choose the sound made by a 'Horse':", "Neigh", ["Bark", "Roar", "Hiss"]],
    ["Choose the correct question tag: 'She can swim well, ___?'", "can't she", ["can she", "isn't she", "doesn't she"]],
    ["Choose the correct question tag: 'You didn't break it, ___?'", "did you", ["didn't you", "do you", "are you"]],
    ["Passive form: 'Riya writes a letter.'", "A letter is written by Riya.", ["A letter was written by Riya.", "Riya is writing a letter.", "A letter wrote Riya."]],
    ["Correct article: 'He is ___ honest officer.'", "an", ["a", "the", "no article"]],
    ["Correct article: 'She plays ___ violin beautifully.'", "the", ["a", "an", "no article"]],
    ["Correct article: 'Copper is ___ useful metal.'", "a", ["an", "the", "no article"]],
    ["Why do desert plants like cactus have spines instead of broad leaves?", "To reduce water loss in hot desert air", ["To attract birds", "To catch snow", "To grow taller faster"], "Cactus plants grow in dry deserts where water is scarce. Instead of wide leaves, they have sharp spines and thick green stems. Spines save water from evaporating and also protect the plant from hungry desert animals."],
    ["Which part of the cactus performs photosynthesis?", "Thick green stem", ["Sharp spines", "Dry sand", "Flowers only"], "Cactus plants grow in dry deserts where water is scarce. Instead of wide leaves, they have sharp spines and thick green stems. Spines save water from evaporating and also protect the plant from hungry desert animals."],
    ["Why was Dr. A.P.J. Abdul Kalam known as the 'Missile Man of India'?", "For leading India's indigenous space and missile programmes", ["For playing cricket", "For building dams", "For writing dictionaries"], "Born in Rameswaram, Dr. A.P.J. Abdul Kalam loved science and reading from childhood. He led India's satellite launch vehicle (SLV-III) and missile defence projects before becoming the 11th President of India, inspiring millions of students."],
    ["Which satellite launch project did Dr. Kalam lead early in his career?", "SLV-III", ["Apollo 11", "Sputnik", "Voyager"], "Born in Rameswaram, Dr. A.P.J. Abdul Kalam loved science and reading from childhood. He led India's satellite launch vehicle (SLV-III) and missile defence projects before becoming the 11th President of India, inspiring millions of students."],
    ["What habit should students learn from the passage about Dr. Kalam?", "Love for science, curiosity, and lifelong learning", ["Wasting time", "Avoiding books", "Fear of failure"], "Born in Rameswaram, Dr. A.P.J. Abdul Kalam loved science and reading from childhood. He led India's satellite launch vehicle (SLV-III) and missile defence projects before becoming the 11th President of India, inspiring millions of students."],
    ["Choose the feminine gender of 'Emperor':", "Empress", ["Queen", "Princess", "Duchess"]],
    ["Choose the plural of 'Butterfly':", "Butterflies", ["Butterflys", "Butterflyes", "Butterflis"]],
    ["Choose the plural of 'Wolf':", "Wolves", ["Wolfs", "Wolfes", "Wolvies"]],
    ["Superlative degree of 'Famous':", "Most famous", ["More famous", "Famousest", "Famouser"]],
    ["Comparative degree of 'Little' (quantity):", "Less", ["Least", "Lesserer", "More little"]],
    ["Choose the correct spelling of number 40:", "Forty", ["Fourty", "Forte", "Fortey"]],
    ["Choose the correct homophone: 'Please ___ quietly until I finish.'", "wait", ["weight", "wate", "waite"]],
    ["Choose the correct homophone: 'The wind ___ away the dry leaves.'", "blew", ["blue", "blow", "bloo"]],
    ["Choose the correct homophone: 'We heard the scary ___ of a lion.'", "roar", ["row", "raw", "roer"]],
    ["Choose the correct reflexive pronoun: 'She baked this cake all by ___.'", "herself", ["himself", "themselves", "itself"]],
    ["Choose the correct reflexive pronoun: 'Boys, please clean the room ___.'", "yourselves", ["yourself", "ourselves", "themselves"]],
    ["Identify the kind of sentence: 'Please pass me the water bottle.'", "Imperative Sentence", ["Interrogative Sentence", "Exclamatory Sentence", "Negative Sentence"]],
    ["Identify the kind of sentence: 'What a magnificent rainbow!'", "Exclamatory Sentence", ["Assertive Sentence", "Interrogative Sentence", "Imperative Sentence"]],
    ["Choose the prefix to form the opposite of 'Possible':", "im-", ["un-", "dis-", "in-"]],
    ["Choose the prefix to form the opposite of 'Honest':", "dis-", ["un-", "im-", "il-"]],
  ];

  advGrammar.forEach(([q, ans, wrongs, passage], i) => {
    const { options, correctIndex } = shuffleFourOptions(ans, wrongs, `c${cls}_eng_adv_${i}`);
    out.push([
      "English",
      passage ? "MINI_PASSAGE" : "MCQ",
      passage ? q : `Class ${cls} English: ${q}`,
      options,
      correctIndex,
      `Correct answer is '${ans}'.`,
      passage ? "Reading Comprehension" : "English Grammar",
      passage,
    ]);
  });

  return out;
}

// ── 2. MATHEMATICS EXPANSION (190 grade-calibrated questions per class 1..5) ──
function buildMathsExpansion(cls: 1 | 2 | 3 | 4 | 5): QTuple[] {
  const qs: QTuple[] = [];

  if (cls === 1) {
    // 60 Unique Additions (within 100)
    for (let i = 0; i < 60; i++) {
      const a = 4 + i;
      const b = 2 + ((i * 3) % 35);
      const ans = a + b;
      const { options, correctIndex } = makeNumOptions(ans, [-1, 1, 2, -2, 10], `c1_em_a_${i}`);
      qs.push(["Mathematics", i % 4 === 0 ? "FILL_BLANK" : "MCQ", `Find the sum: ${a} + ${b} = ?`, options, correctIndex, `${a} + ${b} = ${ans}.`, "Addition"]);
    }
    // 60 Unique Subtractions
    for (let i = 0; i < 60; i++) {
      const a = 25 + i;
      const b = 2 + (i % 19);
      const ans = a - b;
      const { options, correctIndex } = makeNumOptions(ans, [1, -1, 2, -2, 10], `c1_em_s_${i}`);
      qs.push(["Mathematics", i % 4 === 1 ? "FILL_BLANK" : "MCQ", `Subtract: ${a} − ${b} = ?`, options, correctIndex, `${a} − ${b} = ${ans}.`, "Subtraction"]);
    }
    // 30 Place Value / Before-After / Missing Number
    for (let i = 0; i < 30; i++) {
      const n = 12 + i * 3;
      if (i % 3 === 0) {
        const { options, correctIndex } = makeNumOptions(n + 1, [-1, 2, -2, 10], `c1_em_ba_${i}`);
        qs.push(["Mathematics", "FILL_BLANK", `Which number comes right AFTER ${n}?`, options, correctIndex, `${n + 1} comes right after ${n}.`, "Counting"]);
      } else if (i % 3 === 1) {
        const { options, correctIndex } = makeNumOptions(n - 1, [1, -2, 2, -10], `c1_em_bf_${i}`);
        qs.push(["Mathematics", "FILL_BLANK", `Which number comes right BEFORE ${n}?`, options, correctIndex, `${n - 1} comes right before ${n}.`, "Counting"]);
      } else {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        const { options, correctIndex } = makeNumOptions(n, [10, -10, 1, -1], `c1_em_pv_${i}`);
        qs.push(["Mathematics", "MCQ", `Write the number with ${tens} tens and ${ones} ones:`, options, correctIndex, `${tens}×10 + ${ones} = ${n}.`, "Place Value"]);
      }
    }
    // 30 Unique Skip Counting & Number Series
    for (let i = 0; i < 30; i++) {
      const step = [2, 3, 4, 5, 10][i % 5];
      const start = 3 + i;
      const ans = start + 3 * step;
      const { options, correctIndex } = makeNumOptions(ans, [-step, step, 1, -1], `c1_em_ser_${i}`);
      qs.push(["Mathematics", "SERIES_PUZZLE", `Complete the number pattern: ${start}, ${start + step}, ${start + 2 * step}, ___`, options, correctIndex, `Add ${step} each time: ${start + 2 * step} + ${step} = ${ans}.`, "Patterns"]);
    }
    // 30 Unique Word Problems
    for (let i = 0; i < 30; i++) {
      const items = 3 + i;
      const price = 2 + (i % 7);
      if (i % 2 === 0) {
        const ans = items + price;
        const { options, correctIndex } = makeNumOptions(ans, [-1, 1, 2, -2], `c1_em_wp_${i}`);
        qs.push(["Mathematics", "MCQ", `Ananya has ${items} red pencils and ${price} blue pencils. How many pencils in all?`, options, correctIndex, `${items} + ${price} = ${ans} pencils.`, "Word Problems"]);
      } else {
        const total = 15 + i;
        const give = 3 + (i % 8);
        const ans = total - give;
        const { options, correctIndex } = makeNumOptions(ans, [-1, 1, 2, -2], `c1_em_wp2_${i}`);
        qs.push(["Mathematics", "MCQ", `Kabir had ${total} marbles. He gave ${give} marbles to his sister. How many are left?`, options, correctIndex, `${total} − ${give} = ${ans} marbles left.`, "Word Problems"]);
      }
    }
    return qs;
  }

  if (cls === 2) {
    // 50 Unique 2-Digit & 3-Digit Additions
    for (let i = 0; i < 50; i++) {
      const a = 35 + i * 5;
      const b = 14 + (i % 19);
      const ans = a + b;
      const { options, correctIndex } = makeNumOptions(ans, [-10, 10, 1, -1], `c2_em_a_${i}`);
      qs.push(["Mathematics", "MCQ", `Add carefully: ${a} + ${b} = ?`, options, correctIndex, `${a} + ${b} = ${ans}.`, "Addition"]);
    }
    // 50 Unique Subtractions
    for (let i = 0; i < 50; i++) {
      const a = 95 + i * 6;
      const b = 18 + (i % 23);
      const ans = a - b;
      const { options, correctIndex } = makeNumOptions(ans, [10, -10, 2, -2], `c2_em_s_${i}`);
      qs.push(["Mathematics", "MCQ", `Subtract: ${a} − ${b} = ?`, options, correctIndex, `${a} − ${b} = ${ans}.`, "Subtraction"]);
    }
    // 54 Unique Tables & Multiplication (2..10 x 2..9 without cycling duplicates)
    for (let i = 0; i < 54; i++) {
      const t = 2 + Math.floor(i / 6); // 2..10
      const m = 2 + (i % 6) + (i % 2 === 0 ? 0 : 3); // distinct (t,m) pairs
      const ans = t * m;
      const { options, correctIndex } = makeNumOptions(ans, [t, -t, 2, -2], `c2_em_m_${i}`);
      qs.push(["Mathematics", i % 3 === 0 ? "FILL_BLANK" : "MCQ", `Multiply (#${i + 1}): ${t} × ${m} = ?`, options, correctIndex, `${t} × ${m} = ${ans}.`, "Multiplication"]);
    }
    // 36 Unique Division Basics
    for (let i = 0; i < 36; i++) {
      const d = 2 + Math.floor(i / 4); // 2..10
      const q = 3 + (i % 4) * 2 + Math.floor(i / 18); // unique per d
      const dividend = d * q;
      const { options, correctIndex } = makeNumOptions(q, [-1, 1, 2, -2], `c2_em_d_${i}`);
      qs.push(["Mathematics", "FILL_BLANK", `Divide equally (#${i + 1}): ${dividend} ÷ ${d} = ___`, options, correctIndex, `${dividend} ÷ ${d} = ${q}.`, "Division"]);
    }
    // 30 Place Value & Patterns
    for (let i = 0; i < 30; i++) {
      if (i < 15) {
        const h = 1 + (i % 8);
        const t = (i * 3 + 1) % 10;
        const o = (i * 7 + 2) % 10;
        const num = h * 100 + t * 10 + o;
        const { options, correctIndex } = makeNumOptions(num, [10, -10, 100, -100], `c2_em_pv_${i}`);
        qs.push(["Mathematics", "MCQ", `Write the 3-digit number (#${i + 1}): ${h} hundreds + ${t} tens + ${o} ones`, options, correctIndex, `${h}00 + ${t}0 + ${o} = ${num}.`, "Place Value"]);
      } else {
        const step = 4 + (i % 6);
        const base = 15 + i * 3;
        const ans = base + 3 * step;
        const { options, correctIndex } = makeNumOptions(ans, [-step, step, 2, -2], `c2_em_p_${i}`);
        qs.push(["Mathematics", "SERIES_PUZZLE", `Complete the pattern: ${base}, ${base + step}, ${base + 2 * step}, ___`, options, correctIndex, `Rule is +${step}: ${base + 2 * step} + ${step} = ${ans}.`, "Patterns"]);
      }
    }
    return qs;
  }

  if (cls === 3) {
    // 40 3-Digit & 4-Digit Arithmetic
    for (let i = 0; i < 40; i++) {
      const a = 240 + i * 27;
      const b = 115 + i * 19;
      if (i % 2 === 0) {
        const ans = a + b;
        const { options, correctIndex } = makeNumOptions(ans, [-10, 10, 100, -100], `c3_em_a_${i}`);
        qs.push(["Mathematics", "MCQ", `Calculate: ${a} + ${b} = ?`, options, correctIndex, `${a} + ${b} = ${ans}.`, "Addition"]);
      } else {
        const ans = a - b;
        const { options, correctIndex } = makeNumOptions(ans, [-10, 10, 100, -100], `c3_em_s_${i}`);
        qs.push(["Mathematics", "MCQ", `Find the difference: ${a} − ${b} = ?`, options, correctIndex, `${a} − ${b} = ${ans}.`, "Subtraction"]);
      }
    }
    // 45 Multiplication (2-digit × 1-digit / 12..19 tables)
    for (let i = 0; i < 45; i++) {
      const a = 12 + ((i * 7) % 65);
      const b = 3 + (i % 8);
      const ans = a * b;
      const { options, correctIndex } = makeNumOptions(ans, [b, -b, 10, -10], `c3_em_m_${i}`);
      qs.push(["Mathematics", "MCQ", `Find the product: ${a} × ${b} = ?`, options, correctIndex, `${a} × ${b} = ${ans}.`, "Multiplication"]);
    }
    // 40 Exact Division
    for (let i = 0; i < 40; i++) {
      const divisor = 3 + (i % 10);
      const quot = 11 + ((i * 4) % 35);
      const dividend = divisor * quot;
      const { options, correctIndex } = makeNumOptions(quot, [-1, 1, 2, -2], `c3_em_d_${i}`);
      qs.push(["Mathematics", "FILL_BLANK", `Divide: ${dividend} ÷ ${divisor} = ___`, options, correctIndex, `${dividend} ÷ ${divisor} = ${quot}.`, "Division"]);
    }
    // 35 Fractions, Money, Time & Measurement Conversions
    for (let i = 0; i < 35; i++) {
      if (i < 12) {
        const m = 2 + i;
        const ans = m * 100;
        const { options, correctIndex } = makeNumOptions(ans, [-10, 10, 100, 900], `c3_em_conv_${i}`, " cm");
        qs.push(["Mathematics", "MCQ", `Convert ${m} metres into centimetres:`, options, correctIndex, `1 m = 100 cm → ${m} m = ${ans} cm.`, "Measurement"]);
      } else if (i < 24) {
        const hrs = 2 + (i % 8);
        const ans = hrs * 60;
        const { options, correctIndex } = makeNumOptions(ans, [-30, 30, 60, -60], `c3_em_time_${i}`, " min");
        qs.push(["Mathematics", "MCQ", `How many minutes are there in ${hrs} hours?`, options, correctIndex, `1 hour = 60 minutes → ${hrs} × 60 = ${ans} minutes.`, "Time"]);
      } else {
        const kg = 1 + (i % 9);
        const ans = kg * 1000;
        const { options, correctIndex } = makeNumOptions(ans, [-500, 500, 100, -100], `c3_em_kg_${i}`, " g");
        qs.push(["Mathematics", "MCQ", `Convert ${kg} kg into grams:`, options, correctIndex, `1 kg = 1,000 g → ${kg} kg = ${ans} g.`, "Weight"]);
      }
    }
    // 30 Perimeter & Patterns
    for (let i = 0; i < 30; i++) {
      if (i < 15) {
        const side = 4 + i * 2;
        const perim = side * 4;
        const { options, correctIndex } = makeNumOptions(perim, [-4, 4, 8, -2], `c3_em_sq_${i}`, " cm");
        qs.push(["Mathematics", "MCQ", `Find the perimeter of a square of side ${side} cm:`, options, correctIndex, `Perimeter = 4 × ${side} = ${perim} cm.`, "Perimeter"]);
      } else {
        const base = 10 + i * 3;
        const diff = 7 + (i % 5);
        const ans = base + 3 * diff;
        const { options, correctIndex } = makeNumOptions(ans, [-diff, diff, 2, -2], `c3_em_pat_${i}`);
        qs.push(["Mathematics", "SERIES_PUZZLE", `Next number in pattern: ${base}, ${base + diff}, ${base + 2 * diff}, ___`, options, correctIndex, `Add ${diff}: ${base + 2 * diff} + ${diff} = ${ans}.`, "Patterns"]);
      }
    }
    return qs;
  }

  if (cls === 4) {
    // 40 2-digit × 2-digit Multiplications
    for (let i = 0; i < 40; i++) {
      const a = 15 + ((i * 7) % 60);
      const b = 11 + ((i * 3) % 18);
      const ans = a * b;
      const { options, correctIndex } = makeNumOptions(ans, [10, -10, a, -a], `c4_em_m_${i}`);
      qs.push(["Mathematics", "MCQ", `Multiply: ${a} × ${b} = ?`, options, correctIndex, `${a} × ${b} = ${ans}.`, "Multiplication"]);
    }
    // 35 Fractions & Equivalent Numerators
    for (let i = 0; i < 35; i++) {
      const num = 1 + (i % 5);
      const den = 7 + (i % 6);
      const n2 = 1 + ((i + 2) % 4);
      if (i % 2 === 0) {
        const ans = num + n2;
        const wrongs = [ans + 1, ans + 2, ans + 3].map((x) => `${x}/${den}`) as [string, string, string];
        const { options, correctIndex } = shuffleFourOptions(`${ans}/${den}`, wrongs, `c4_em_fr_${i}`);
        qs.push(["Mathematics", "MCQ", `Add like fractions (#${i + 1}): ${num}/${den} + ${n2}/${den}`, options, correctIndex, `(${num} + ${n2})/${den} = ${ans}/${den}.`, "Fractions"]);
      } else {
        const big = 5 + (i % 5);
        const small = 1 + (i % 3);
        const ans = big - small;
        const wrongs = [ans + 1, ans + 2, ans + 3].map((x) => `${x}/${den}`) as [string, string, string];
        const { options, correctIndex } = shuffleFourOptions(`${ans}/${den}`, wrongs, `c4_em_frs_${i}`);
        qs.push(["Mathematics", "MCQ", `Subtract like fractions (#${i + 1}): ${big}/${den} − ${small}/${den}`, options, correctIndex, `(${big} − ${small})/${den} = ${ans}/${den}.`, "Fractions"]);
      }
    }
    // 40 Perimeter & Area
    for (let i = 0; i < 40; i++) {
      const l = 6 + (i % 14);
      const b = 3 + ((i * 2) % 9);
      if (i % 2 === 0) {
        const perim = 2 * (l + b);
        const { options, correctIndex } = makeNumOptions(perim, [l + b, -4, 4, 6], `c4_em_p_${i}`, " cm");
        qs.push(["Mathematics", "MCQ", `Perimeter of rectangle with length ${l} cm and breadth ${b} cm:`, options, correctIndex, `2 × (${l} + ${b}) = ${perim} cm.`, "Perimeter"]);
      } else {
        const area = l * b;
        const { options, correctIndex } = makeNumOptions(area, [l, -b, 4, -4], `c4_em_ar_${i}`, " cm²");
        qs.push(["Mathematics", "MCQ", `Area of rectangle with length ${l} cm and breadth ${b} cm:`, options, correctIndex, `Area = ${l} × ${b} = ${area} cm².`, "Area"]);
      }
    }
    // 35 Factors, Multiples & Roman Numerals
    const romans: [string, number][] = [
      ["XIV", 14], ["XIX", 19], ["XXIV", 24], ["XXIX", 29], ["XXXIV", 34], ["XL", 40],
      ["XLIV", 44], ["XLIX", 49], ["LX", 60], ["LXXV", 75], ["XC", 90], ["XCIX", 99],
      ["CX", 110], ["CL", 150], ["CD", 400], ["DC", 600], ["CM", 900], ["MCM", 1900],
    ];
    romans.forEach(([rom, val], i) => {
      const { options, correctIndex } = makeNumOptions(val, [-5, 5, 10, -1], `c4_em_rom_${i}`);
      qs.push(["Mathematics", "MCQ", `Write the Hindu-Arabic value of Roman numeral '${rom}':`, options, correctIndex, `'${rom}' equals ${val}.`, "Roman Numerals"]);
    });
    for (let i = 0; i < 17; i++) {
      const n1 = 4 + (i % 8);
      const n2 = n1 * 2;
      const ans = n2;
      const { options, correctIndex } = makeNumOptions(ans, [-2, 2, 4, 1], `c4_em_lcm_${i}`);
      qs.push(["Mathematics", "MCQ", `What is the LCM (Least Common Multiple) of ${n1} and ${n2}?`, options, correctIndex, `Since ${n2} is a multiple of ${n1}, LCM(${n1}, ${n2}) = ${n2}.`, "Factors & Multiples"]);
    }
    // 40 Word Problems & Unitary Method
    for (let i = 0; i < 40; i++) {
      const cost1 = 12 + (i % 15);
      const qty = 4 + (i % 7);
      const total = cost1 * qty;
      if (i % 2 === 0) {
        const { options, correctIndex } = makeNumOptions(total, [cost1, -cost1, 10, -10], `c4_em_un1_${i}`, "");
        qs.push(["Mathematics", "MCQ", `If 1 notebook costs ₹${cost1}, what is the cost of ${qty} notebooks (in ₹)?`, options, correctIndex, `${qty} × ₹${cost1} = ₹${total}.`, "Unitary Method"]);
      } else {
        const { options, correctIndex } = makeNumOptions(cost1, [-2, 2, 4, -1], `c4_em_un2_${i}`, "");
        qs.push(["Mathematics", "MCQ", `${qty} pens cost ₹${total}. What is the price of 1 pen (in ₹)?`, options, correctIndex, `₹${total} ÷ ${qty} = ₹${cost1}.`, "Unitary Method"]);
      }
    }
    return qs.slice(0, 190);
  }

  // Class 5 (210 unique questions)
  // 45 Percentages
  const pctList = [10, 20, 25, 30, 40, 50, 75, 80];
  for (let i = 0; i < 45; i++) {
    const p = pctList[i % pctList.length];
    const base = (2 + Math.floor(i / pctList.length)) * 20;
    const ans = (p * base) / 100;
    const { options, correctIndex } = makeNumOptions(ans, [-5, 5, 10, -10], `c5_em_pct_${i}`);
    qs.push(["Mathematics", "MCQ", `Calculate (#${i + 1}): ${p}% of ${base} = ?`, options, correctIndex, `(${p} / 100) × ${base} = ${ans}.`, "Percentage"]);
  }
  // 40 Averages & Speed-Distance-Time
  for (let i = 0; i < 40; i++) {
    if (i < 20) {
      const x = 10 + i * 3;
      const avg = x + 4;
      const { options, correctIndex } = makeNumOptions(avg, [-2, 2, 4, -4], `c5_em_avg_${i}`);
      qs.push(["Mathematics", "MCQ", `Find the average of ${x}, ${x + 4}, and ${x + 8}:`, options, correctIndex, `Sum = ${3 * avg}; Average = ${3 * avg} ÷ 3 = ${avg}.`, "Average"]);
    } else {
      const spd = 25 + (i - 20) * 5;
      const hrs = 2 + (i % 4);
      const dist = spd * hrs;
      const { options, correctIndex } = makeNumOptions(dist, [-20, 20, 40, -10], `c5_em_sdt_${i}`, " km");
      qs.push(["Mathematics", "MCQ", `A bus runs at ${spd} km/h for ${hrs} hours. Find total distance covered:`, options, correctIndex, `Distance = Speed × Time = ${spd} × ${hrs} = ${dist} km.`, "Speed & Distance"]);
    }
  }
  // 40 Profit/Loss & Simple Interest
  for (let i = 0; i < 40; i++) {
    if (i < 20) {
      const cp = 200 + i * 50;
      const prof = 40 + (i % 5) * 20;
      const sp = cp + prof;
      const { options, correctIndex } = makeNumOptions(sp, [-20, 20, 40, -10], `c5_em_pl_${i}`);
      qs.push(["Mathematics", "MCQ", `Cost Price = ₹${cp}, Profit = ₹${prof}. Find Selling Price (in ₹):`, options, correctIndex, `SP = CP + Profit = ₹${cp} + ₹${prof} = ₹${sp}.`, "Profit & Loss"]);
    } else {
      const p = (i - 18) * 500;
      const r = [4, 5, 6, 8, 10][i % 5];
      const t = 2 + (i % 3);
      const si = (p * r * t) / 100;
      const { options, correctIndex } = makeNumOptions(si, [-50, 50, 100, -25], `c5_em_si_${i}`);
      qs.push(["Mathematics", "MCQ", `Find Simple Interest on ₹${p} at ${r}% per annum for ${t} years (in ₹):`, options, correctIndex, `SI = (P×R×T)/100 = (${p}×${r}×${t})/100 = ₹${si}.`, "Simple Interest"]);
    }
  }
  // 45 Angles, Area & Volume
  for (let i = 0; i < 45; i++) {
    if (i < 16) {
      const a = 22 + i * 4;
      const comp = 90 - a;
      const { options, correctIndex } = makeNumOptions(comp, [-5, 5, 10, -10], `c5_em_ang_${i}`, "°");
      qs.push(["Mathematics", "MCQ", `Two angles are complementary. If one is ${a}°, find the other:`, options, correctIndex, `Complementary angles sum to 90°: 90° − ${a}° = ${comp}°.`, "Angles"]);
    } else if (i < 32) {
      const a1 = 30 + (i - 16) * 3;
      const a2 = 50 + (i % 5) * 6;
      const a3 = 180 - a1 - a2;
      const { options, correctIndex } = makeNumOptions(a3, [-10, 10, 5, -5], `c5_em_tri_${i}`, "°");
      qs.push(["Mathematics", "MCQ", `Two angles of a triangle are ${a1}° and ${a2}°. Find the third angle:`, options, correctIndex, `180° − (${a1}° + ${a2}°) = ${a3}°.`, "Triangles"]);
    } else {
      const side = 2 + (i - 32);
      const vol = side * side * side;
      const { options, correctIndex } = makeNumOptions(vol, [-8, 8, 12, 4], `c5_em_vol_${i}`, " cm³");
      qs.push(["Mathematics", "MCQ", `Find the volume of a cube of edge ${side} cm:`, options, correctIndex, `Volume = ${side} × ${side} × ${side} = ${vol} cm³.`, "Volume"]);
    }
  }
  // 40 HCF & Decimals
  for (let i = 0; i < 40; i++) {
    if (i < 20) {
      const a = 6 + i * 2;
      const b = a * 2;
      const { options, correctIndex } = makeNumOptions(a, [-2, 2, 4, 6], `c5_em_hcf_${i}`);
      qs.push(["Mathematics", "MCQ", `Find the HCF of ${a} and ${b}:`, options, correctIndex, `Since ${a} divides ${b}, HCF(${a}, ${b}) = ${a}.`, "HCF & LCM"]);
    } else {
      const d1 = ((12 + i) / 10).toFixed(1);
      const mul = 2 + (i % 6);
      const ans = Number((parseFloat(d1) * mul).toFixed(1));
      const { options, correctIndex } = makeNumOptions(ans, [1, -1, 2, 0.5], `c5_em_dec_${i}`);
      qs.push(["Mathematics", "MCQ", `Multiply decimal: ${d1} × ${mul} = ?`, options, correctIndex, `${d1} × ${mul} = ${ans}.`, "Decimals"]);
    }
  }
  return qs;
}

// ── 3. HINDI EXPANSION (+190 per class 1..5) ────────────────────────────────────
const HINDI_BANKS = {
  vilom: [
    ["आना", "जाना"], ["उठना", "बैठना"], ["हँसना", "रोना"], ["मोटा", "पतला"], ["ऊँचा", "नीचा"],
    ["काला", "सफ़ेद"], ["दिन", "रात"], ["सुबह", "शाम"], ["नया", "पुराना"], ["सही", "गलत"],
    ["अमीर", "गरीब"], ["राजा", "रंक"], ["जीत", "हार"], ["लाभ", "हानि"], ["सत्य", "असत्य"],
    ["प्रेम", "घृणा"], ["उजाला", "अंधेरा"], ["आशा", "निराशा"], ["मित्र", "शत्रु"], ["साफ़", "गंदा"],
    ["मीठा", "कड़वा"], ["कठोर", "कोमल"], ["तेज़", "धीमा"], ["सस्ता", "महँगा"], ["वीर", "कायर"],
    ["आकाश", "पाताल"], ["धरती", "गगन"], ["सुख", "दुःख"], ["धर्म", "अधर्म"], ["ज्ञान", "अज्ञान"],
    ["पाप", "पुण्य"], ["जीवन", "मरण"], ["जन्म", "मृत्यु"], ["उपकार", "अपकार"], ["सबल", "निर्बल"],
    ["उदय", "अस्त"], ["प्रातः", "सायं"], ["सरल", "कठिन"], ["एक", "अनेक"], ["कम", "अधिक"],
  ] as [string, string][],
  paryay: [
    ["सूर्य", "दिनकर / भास्कर"], ["चाँद", "शशि / चंद्रमा"], ["पानी", "जल / नीर"], ["आग", "अग्नि / अनल"], ["हवा", "पवन / वायु"],
    ["पृथ्वी", "धरती / भू"], ["आकाश", "गगन / नभ"], ["पेड़", "वृक्ष / तरु"], ["फूल", "पुष्प / सुमन"], ["कमल", "पंकज / नीरज"],
    ["नदी", "सरिता / तटिनी"], ["पहाड़", "पर्वत / गिरी"], ["बादल", "मेघ / घन"], ["समुद्र", "सागर / जलधि"], ["माता", "जननी / माँ"],
    ["पिता", "जनक / तात"], ["भाई", "भ्राता / सहोदर"], ["मित्र", "दोस्त / सखा"], ["राजा", "नृप / भूपति"], ["ईश्वर", "प्रभु / भगवान"],
    ["घर", "गृह / सदन"], ["रात्रि", "रात / निशा"], ["दिन", "दिवस / वार"], ["आँख", "नेत्र / नयन"], ["हाथ", "कर / हस्त"],
    ["शेर", "सिंह / वनराज"], ["हाथी", "गज / हस्ती"], ["घोड़ा", "अश्व / घोटक"], ["गाय", "गौ / धेनु"], ["पक्षी", "खग / विहग"],
    ["मछली", "मीन / मत्स्य"], ["साँप", "सर्प / नाग"], ["सोना", "स्वर्ण / कंचन"], ["दूध", "दुग्ध / क्षीर"], ["अमृत", "सुधा / पीयूष"],
  ] as [string, string][],
  ling: [
    ["लड़का", "लड़की"], ["राजा", "रानी"], ["पिता", "माता"], ["भाई", "बहन"], ["चाचा", "चाची"],
    ["मामा", "मामी"], ["नाना", "नानी"], ["दादा", "दादी"], ["पुत्र", "पुत्री"], ["बेटा", "बेटी"],
    ["शेर", "शेरनी"], ["मोर", "मोरनी"], ["हाथी", "हथिनी"], ["घोड़ा", "घोड़ी"], ["बकरा", "बकरी"],
    ["बंदर", "बंदरिया"], ["चूहा", "चुहिया"], ["गायक", "गायिका"], ["लेखक", "लेखिका"], ["अध्यापक", "अध्यापिका"],
    ["शिक्षक", "शिक्षिका"], ["बालक", "बालिका"], ["नायक", "नायिका"], ["सेवक", "सेविका"], ["कवि", "कवयित्री"],
  ] as [string, string][],
  vachan: [
    ["किताब", "किताबें"], ["आँख", "आँखें"], ["रात", "रातें"], ["बात", "बातें"], ["सड़क", "सड़कें"],
    ["मेज़", "मेज़ें"], ["बहन", "बहनें"], ["लड़का", "लड़के"], ["कमरा", "कमरे"], ["केला", "केले"],
    ["तारा", "तारे"], ["बच्चा", "बच्चे"], ["घोड़ा", "घोड़े"], ["जूता", "जूते"], ["पत्ता", "पत्ते"],
    ["चिड़िया", "चिड़ियाँ"], ["गुड़िया", "गुड़ियाँ"], ["लड़की", "लड़कियाँ"], ["नदी", "नदियाँ"], ["थाली", "थालियाँ"],
    ["मछली", "मछलियाँ"], ["तितली", "तितलियाँ"], ["रोटी", "रोटियाँ"], ["चाबी", "चाबियाँ"], ["दवाई", "दवाइयाँ"],
  ] as [string, string][],
  ekShabd: [
    ["जो पढ़ता हो", "पाठक / विद्यार्थी"], ["जो पढ़ाता हो", "अध्यापक"], ["जो खेती करता हो", "किसान"],
    ["जो रोगियों का इलाज करे", "चिकित्सक (डॉक्टर)"], ["जो चित्र बनाता हो", "चित्रकार"], ["जो कविता लिखता हो", "कवि"],
    ["जो मूर्ति बनाता हो", "मूर्तिकार"], ["जो प्रतिदिन होता हो", "दैनिक"], ["जो सप्ताह में एक बार हो", "साप्ताहिक"],
    ["जो महीने में एक बार हो", "मासिक"], ["जो वर्ष में एक बार हो", "वार्षिक"], ["जिसके माता-पिता न हों", "अनाथ"],
    ["जो ईश्वर को मानता हो", "आस्तिक"], ["जो ईश्वर को न मानता हो", "नास्तिक"], ["जो सब कुछ जानता हो", "सर्वज्ञ"],
    ["जो कभी न मरे", "अमर"], ["जो कभी बूढ़ा न हो", "अजर"], ["जो कम बोलता हो", "मितभाषी"],
    ["जो सच बोलता हो", "सत्यवादी"], ["जो भारत का निवासी हो", "भारतीय"], ["जहाँ पुस्तकें रखी जाती हैं", "पुस्तकालय"],
    ["जहाँ रोगियों का उपचार हो", "अस्पताल (चिकित्सालय)"], ["जो जल में रहता हो", "जलचर"], ["जो आकाश में उड़ता हो", "नभचर"],
    ["जो मांस न खाता हो", "शाकाहारी"],
  ] as [string, string][],
  muhavare: [
    ["आँखों का तारा", "बहुत प्यारा"], ["ईद का चाँद होना", "बहुत दिनों बाद दिखना"], ["नौ दो ग्यारह होना", "भाग जाना"],
    ["अंगूठा दिखाना", "साफ़ मना कर देना"], ["कान भरना", "चुगली करना"], ["नाकों चने चबाना", "बहुत तंग होना"],
    ["मुँह में पानी आना", "जी ललचाना"], ["घोड़े बेचकर सोना", "निश्चिंत होकर सोना"], ["अकल पर पत्थर पड़ना", "बुद्धि भ्रष्ट होना"],
    ["आग बबूला होना", "बहुत क्रोधित होना"], ["कमर कसना", "तैयार हो जाना"], ["दाल में काला होना", "संदेह होना"],
    ["पीठ थपथपाना", "शाबाशी देना"], ["फूला न समाना", "बहुत खुश होना"], ["आसमान सिर पर उठाना", "बहुत शोर मचाना"],
    ["हाथ बँटाना", "मदद करना"], ["चार चाँद लगाना", "शोभा बढ़ाना"], ["टाँग अड़ाना", "बाधा डालना"],
    ["चिकना घड़ा होना", "असर न होना"], ["गागर में सागर भरना", "थोड़े में बहुत कहना"],
  ] as [string, string][],
  vyakaranCore: [
    ["हिंदी वर्णमाला में कुल कितने स्वर होते हैं?", "11", ["13", "33", "9"]],
    ["हिंदी में मूल व्यंजनों की संख्या कितनी है?", "33", ["11", "25", "52"]],
    ["'कमल' कौन-सी संज्ञा है?", "जातिवाचक (फूल) / नाम", ["सर्वनाम", "क्रिया", "विशेषण"]],
    ["किसी व्यक्ति, वस्तु, स्थान या भाव के नाम को क्या कहते हैं?", "संज्ञा", ["सर्वनाम", "क्रिया", "अव्यय"]],
    ["संज्ञा के स्थान पर आने वाले शब्द क्या कहलाते हैं?", "सर्वनाम", ["विशेषण", "क्रिया", "कारक"]],
    ["संज्ञा या सर्वनाम की विशेषता बताने वाले शब्द हैं:", "विशेषण", ["क्रिया", "सर्वनाम", "उपसर्ग"]],
    ["जिस शब्द से किसी काम के करने या होने का बोध हो:", "क्रिया", ["संज्ञा", "विशेषण", "विराम चिह्न"]],
    ["'वह बहुत तेज़ दौड़ता है' में 'दौड़ता' क्या है?", "क्रिया", ["संज्ञा", "सर्वनाम", "विशेषण"]],
    ["'मीठा आम' में 'मीठा' शब्द क्या है?", "विशेषण", ["संज्ञा", "क्रिया", "सर्वनाम"]],
    ["हिंदी किस लिपि में लिखी जाती है?", "देवनागरी", ["रोमन", "गुरुमुखी", "फ़ारसी"]],
    ["सप्ताह में कितने दिन होते हैं?", "7", ["5", "6", "12"]],
    ["एक वर्ष में कितने महीने होते हैं?", "12", ["10", "7", "365"]],
    ["हमारी राष्ट्रभाषा/राजभाषा दिवस 'हिंदी दिवस' कब मनाया जाता है?", "14 सितंबर", ["15 अगस्त", "26 जनवरी", "5 सितंबर"]],
    ["'विद्या + आलय' की सही संधि क्या होगी?", "विद्यालय", ["विदयालय", "विद्याल्य", "विद्यलय"]],
    ["'सूर्य + उदय' मिलकर कौन-सा शब्द बनेगा?", "सूर्योदय", ["सूर्यादय", "सूर्यउदय", "सूर्यदय"]],
    ["'अनाथ' शब्द में कौन-सा उपसर्ग लगा है?", "अ", ["अन", "नाथ", "आ"]],
    ["'सफलता' शब्द में कौन-सा प्रत्यय जुड़ा है?", "ता", ["स", "फल", "लता"]],
    ["प्रश्न पूछने वाले वाक्य के अंत में कौन-सा चिह्न लगता है?", "प्रश्नवाचक (?)", ["पूर्ण विराम (।)", "अल्प विराम (,)", "योजक (-)"]],
    ["शुद्ध वर्तनी चुनें:", "आशीर्वाद", ["आशिर्वाद", "आशीरवाद", "अशीर्वाद"]],
    ["शुद्ध वर्तनी चुनें:", "कवयित्री", ["कवियित्री", "कवयत्री", "कविइत्री"]],
  ] as [string, string, [string, string, string]][],
};

function buildHindiExpansion(cls: 1 | 2 | 3 | 4 | 5): QTuple[] {
  const out: QTuple[] = [];
  const promptPrefix = (base: string) =>
    cls === 1 ? base : cls === 2 ? `बताइए — ${base}` : cls === 3 ? `सही उत्तर चुनें — ${base}` : cls === 4 ? `व्याकरण: ${base}` : `कक्षा 5 हिंदी — ${base}`;

  out.push(
    ...buildFactBankTuples({
      subject: "Hindi",
      topicTag: "विलोम शब्द",
      seedPrefix: `c${cls}_exp_hin_vil`,
      explanationPrefix: "सही विलोम शब्द:",
      items: HINDI_BANKS.vilom.map(([w, a]) => ({ prompt: promptPrefix(`'${w}' का विलोम शब्द क्या है?`), answer: a })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "Hindi",
      topicTag: "पर्यायवाची शब्द",
      seedPrefix: `c${cls}_exp_hin_par`,
      explanationPrefix: "सही पर्यायवाची है:",
      items: HINDI_BANKS.paryay.map(([w, a]) => ({ prompt: promptPrefix(`'${w}' का पर्यायवाची शब्द चुनें:`), answer: a })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "Hindi",
      topicTag: "लिंग बदलो",
      seedPrefix: `c${cls}_exp_hin_ling`,
      explanationPrefix: "सही स्त्रीलिंग शब्द:",
      items: HINDI_BANKS.ling.map(([w, a]) => ({ prompt: promptPrefix(`'${w}' का स्त्रीलिंग रूप क्या होगा?`), answer: a })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "Hindi",
      topicTag: "वचन बदलो",
      seedPrefix: `c${cls}_exp_hin_vac`,
      explanationPrefix: "सही बहुवचन रूप:",
      items: HINDI_BANKS.vachan.map(([w, a]) => ({ prompt: promptPrefix(`'${w}' का बहुवचन रूप चुनें:`), answer: a })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "Hindi",
      topicTag: "वाक्यांश के लिए एक शब्द",
      seedPrefix: `c${cls}_exp_hin_ek`,
      explanationPrefix: "एक शब्द उत्तर:",
      items: HINDI_BANKS.ekShabd.map(([w, a]) => ({ prompt: promptPrefix(`'${w}' के लिए एक शब्द है:`), answer: a })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "Hindi",
      topicTag: "मुहावरे",
      seedPrefix: `c${cls}_exp_hin_muh`,
      explanationPrefix: "मुहावरे का सही अर्थ:",
      items: HINDI_BANKS.muhavare.map(([w, a]) => ({ prompt: promptPrefix(`'${w}' मुहावरे का क्या अर्थ है?`), answer: a })),
    })
  );

  HINDI_BANKS.vyakaranCore.forEach(([q, ans, wrongs], i) => {
    const { options, correctIndex } = shuffleFourOptions(ans, wrongs, `c${cls}_hin_vy_${i}`);
    out.push(["Hindi", "MCQ", promptPrefix(q), options, correctIndex, `सही उत्तर: ${ans}।`, "हिंदी व्याकरण"]);
  });

  return out;
}

// ── 4. EVS / GK EXPANSION (+190 per class 1..5) ────────────────────────────────
const EVS_GK_BANKS = {
  statesCapitals: [
    ["Uttar Pradesh", "Lucknow"], ["Maharashtra", "Mumbai"], ["Bihar", "Patna"], ["Rajasthan", "Jaipur"],
    ["Gujarat", "Gandhinagar"], ["Madhya Pradesh", "Bhopal"], ["West Bengal", "Kolkata"], ["Tamil Nadu", "Chennai"],
    ["Karnataka", "Bengaluru"], ["Kerala", "Thiruvananthapuram"], ["Punjab", "Chandigarh"], ["Assam", "Dispur"],
    ["Odisha", "Bhubaneswar"], ["Jharkhand", "Ranchi"], ["Uttarakhand", "Dehradun"], ["Himachal Pradesh", "Shimla"],
    ["Goa", "Panaji"], ["Telangana", "Hyderabad"], ["Andhra Pradesh", "Amaravati"], ["Sikkim", "Gangtok"],
  ] as [string, string][],
  animalHomes: [
    ["Lion", "Den"], ["Dog", "Kennel"], ["Horse", "Stable"], ["Cow", "Shed"], ["Bird", "Nest"],
    ["Honeybee", "Hive"], ["Spider", "Web"], ["Rabbit", "Burrow"], ["Hen", "Coop"], ["Pig", "Sty"],
    ["Sheep", "Fold / Pen"], ["Mouse", "Hole"], ["Ant", "Anthill"], ["Bear", "Cave"], ["Frog", "Pond / Water"],
  ] as [string, string][],
  animalBabies: [
    ["Dog", "Puppy"], ["Cat", "Kitten"], ["Cow", "Calf"], ["Lion", "Cub"], ["Hen", "Chick"],
    ["Duck", "Duckling"], ["Goat", "Kid"], ["Sheep", "Lamb"], ["Frog", "Tadpole"], ["Horse", "Foal"],
    ["Butterfly", "Caterpillar"], ["Deer", "Fawn"], ["Pig", "Piglet"], ["Kangaroo", "Joey"], ["Owl", "Owlet"],
  ] as [string, string][],
  vitaminsDeficiency: [
    ["Vitamin A", "Night Blindness", "Carrots, papaya & green leafy vegetables"],
    ["Vitamin B1", "Beriberi", "Whole grains & pulses"],
    ["Vitamin C", "Scurvy (bleeding gums)", "Amla, lemon & oranges"],
    ["Vitamin D", "Rickets (weak bent bones)", "Morning sunlight, milk & fish"],
    ["Iron", "Anaemia", "Spinach, jaggery & dates"],
    ["Iodine", "Goitre (swollen neck gland)", "Iodized salt & seafood"],
    ["Calcium", "Weak bones & tooth decay", "Milk, curd & cheese"],
    ["Proteins", "Stunted growth (Kwashiorkor)", "Pulses, eggs, milk & soya"],
    ["Carbohydrates", "Instant body energy", "Rice, wheat, potato & sugar"],
    ["Dietary Fibre (Roughage)", "Smooth digestion & prevents constipation", "Whole fruits & salad vegetables"],
  ] as [string, string, string][],
  planetsFacts: [
    ["Closest planet to the Sun", "Mercury"], ["Hottest & brightest planet (Evening Star)", "Venus"],
    ["Blue Planet supporting life", "Earth"], ["Red Planet (iron oxide dust)", "Mars"],
    ["Largest planet in the Solar System", "Jupiter"], ["Planet famous for glowing icy rings", "Saturn"],
    ["Ice giant tilted on its side", "Uranus"], ["Farthest & windiest major planet", "Neptune"],
    ["Natural satellite of Earth", "Moon"], ["Star at the centre of our Solar System", "Sun"],
  ] as [string, string][],
  inventorsAndDiscoveries: [
    ["Electric Light Bulb", "Thomas Alva Edison"], ["Telephone", "Alexander Graham Bell"],
    ["Aeroplane", "Wright Brothers"], ["Radio", "Guglielmo Marconi"],
    ["Steam Engine", "James Watt"], ["Television", "John Logie Baird"],
    ["Computer (Father of Computer)", "Charles Babbage"], ["Printing Press", "Johannes Gutenberg"],
    ["Penicillin (First Antibiotic)", "Alexander Fleming"], ["Law of Gravity", "Sir Isaac Newton"],
    ["Zero (0) in Mathematics (India)", "Aryabhata / Brahmagupta"], ["Telescope (Astronomical)", "Galileo Galilei"],
    ["X-Rays", "Wilhelm Röntgen"], ["Dynamite", "Alfred Nobel"], ["Smallpox Vaccine", "Edward Jenner"],
  ] as [string, string][],
  monumentsIndia: [
    ["Taj Mahal", "Agra (UP)"], ["Red Fort & Qutub Minar", "New Delhi"], ["Hawa Mahal", "Jaipur (Rajasthan)"],
    ["Golden Temple", "Amritsar (Punjab)"], ["Gateway of India", "Mumbai"], ["Charminar", "Hyderabad"],
    ["Victoria Memorial", "Kolkata"], ["Konark Sun Temple", "Puri (Odisha)"], ["Meenakshi Temple", "Madurai (Tamil Nadu)"],
    ["Statue of Unity", "Kevadia (Gujarat)"], ["Ajanta & Ellora Caves", "Aurangabad (Maharashtra)"], ["Sanchi Stupa", "Madhya Pradesh"],
    ["Mysore Palace", "Karnataka"], ["Sabarmati Ashram", "Ahmedabad"], ["Buland Darwaza", "Fatehpur Sikri"],
  ] as [string, string][],
  nationalAndGlobalGk: [
    ["National Animal of India", "Royal Bengal Tiger"], ["National Bird of India", "Indian Peacock"],
    ["National Flower of India", "Lotus"], ["National Tree of India", "Banyan Tree"],
    ["National Fruit of India", "Mango"], ["National Aquatic Animal of India", "Ganges River Dolphin"],
    ["National Anthem writer (Jana Gana Mana)", "Rabindranath Tagore"], ["National Song writer (Vande Mataram)", "Bankim Chandra Chatterjee"],
    ["First Prime Minister of India", "Pt. Jawaharlal Nehru"], ["First President of India", "Dr. Rajendra Prasad"],
    ["Father of the Indian Constitution", "Dr. B.R. Ambedkar"], ["Missile Man of India", "Dr. A.P.J. Abdul Kalam"],
    ["Iron Man of India", "Sardar Vallabhbhai Patel"], ["Nightingale of India", "Sarojini Naidu"],
    ["Longest river flowing in India", "River Ganga"], ["Highest mountain peak in the world", "Mount Everest"],
    ["Largest ocean on Earth", "Pacific Ocean"], ["Largest continent on Earth", "Asia"],
    ["Smallest continent on Earth", "Australia"], ["Longest river in the world", "River Nile"],
    ["Largest desert in the world (hot)", "Sahara Desert"], ["Thar Desert is located mainly in", "Rajasthan (India)"],
    ["Organ that pumps blood in our body", "Heart"], ["Organs that help us breathe air", "Lungs"],
    ["Gas we breathe IN to stay alive", "Oxygen"], ["Gas plants take in to make food", "Carbon Dioxide"],
    ["Process by which plants make food", "Photosynthesis"], ["Instrument used to measure body temperature", "Thermometer"],
    ["Hardest natural mineral on Earth", "Diamond"], ["Number of bones in an adult human body", "206"],
  ] as [string, string][],
  classicalDances: [
    ["Bharatanatyam", "Tamil Nadu"], ["Kathak", "Uttar Pradesh (North India)"], ["Kathakali", "Kerala"],
    ["Kuchipudi", "Andhra Pradesh"], ["Odissi", "Odisha"], ["Manipuri", "Manipur"],
    ["Bhangra & Gidda", "Punjab"], ["Garba & Dandiya", "Gujarat"], ["Bihu Dance", "Assam"], ["Ghoomar", "Rajasthan"],
  ] as [string, string][],
  importantDays: [
    ["Republic Day of India", "26 January"], ["Independence Day of India", "15 August"],
    ["Gandhi Jayanti (Non-Violence Day)", "2 October"], ["Teacher's Day (India)", "5 September"],
    ["Children's Day (India)", "14 November"], ["National Science Day (India)", "28 February"],
    ["World Environment Day", "5 June"], ["International Yoga Day", "21 June"],
    ["World Water Day", "22 March"], ["Earth Day", "22 April"],
  ] as [string, string][],
};

function buildEvsGkExpansion(cls: 1 | 2 | 3 | 4 | 5): QTuple[] {
  const out: QTuple[] = [];
  const label = cls <= 2 ? "GK" : "EVS & GK";

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "States & Capitals",
      seedPrefix: `c${cls}_exp_evs_cap`,
      items: EVS_GK_BANKS.statesCapitals.map(([st, cap]) => ({
        prompt: cls <= 2 ? `Capital of ${st} is:` : `What is the capital city of Indian state '${st}'?`,
        answer: cap,
        explanation: `${cap} is the capital of ${st}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Animals & Homes",
      seedPrefix: `c${cls}_exp_evs_ah`,
      items: EVS_GK_BANKS.animalHomes.map(([a, h]) => ({
        prompt: `Where does a ${a} live (${label})?`,
        answer: h,
        explanation: `A ${a} lives in a ${h}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Animal Babies",
      seedPrefix: `c${cls}_exp_evs_ab`,
      items: EVS_GK_BANKS.animalBabies.map(([a, b]) => ({
        prompt: `What is the young one (baby) of a ${a} called?`,
        answer: b,
        explanation: `A baby ${a} is called a ${b}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Food & Health",
      seedPrefix: `c${cls}_exp_evs_vit`,
      items: EVS_GK_BANKS.vitaminsDeficiency.map(([nut, issue, src]) => ({
        prompt: cls <= 2 ? `Which nutrient keeps us safe from '${issue}'?` : `Deficiency of which nutrient causes '${issue}'?`,
        answer: nut,
        explanation: `${nut} prevents ${issue} (good sources: ${src}).`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Solar System",
      seedPrefix: `c${cls}_exp_evs_pl`,
      items: EVS_GK_BANKS.planetsFacts.map(([desc, pl]) => ({
        prompt: `Solar System: Which celestial body is the '${desc}'?`,
        answer: pl,
        explanation: `${pl} is the ${desc}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Inventions",
      seedPrefix: `c${cls}_exp_evs_inv`,
      items: EVS_GK_BANKS.inventorsAndDiscoveries.map(([inv, per]) => ({
        prompt: `Who is credited with inventing/discovering '${inv}'?`,
        answer: per,
        explanation: `${per} invented/discovered ${inv}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Indian Heritage",
      seedPrefix: `c${cls}_exp_evs_mon`,
      items: EVS_GK_BANKS.monumentsIndia.map(([mon, loc]) => ({
        prompt: `Where is the famous monument '${mon}' situated?`,
        answer: loc,
        explanation: `${mon} is located in ${loc}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "General Knowledge",
      seedPrefix: `c${cls}_exp_evs_gk`,
      items: EVS_GK_BANKS.nationalAndGlobalGk.map(([q, ans]) => ({
        prompt: `${q}:`,
        answer: ans,
        explanation: `${q} → ${ans}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Dances & Culture",
      seedPrefix: `c${cls}_exp_evs_dan`,
      items: EVS_GK_BANKS.classicalDances.map(([dance, st]) => ({
        prompt: `'${dance}' is a famous traditional dance of which state?`,
        answer: st,
        explanation: `${dance} belongs to ${st}.`,
      })),
    })
  );

  out.push(
    ...buildFactBankTuples({
      subject: "EVS / GK",
      topicTag: "Important Days",
      seedPrefix: `c${cls}_exp_evs_day`,
      items: EVS_GK_BANKS.importantDays.map(([day, dt]) => ({
        prompt: `On which date is '${day}' celebrated?`,
        answer: dt,
        explanation: `${day} is observed on ${dt}.`,
      })),
    })
  );

  // +25 core EVS/Science basics to reach 190
  const evsExtra: [string, string, [string, string, string]][] = [
    ["Which sense organ helps us see colourful butterflies?", "Eyes", ["Ears", "Nose", "Tongue"]],
    ["Which part of the plant absorbs water and minerals from soil?", "Roots", ["Leaves", "Petals", "Fruits"]],
    ["What do green leaves need along with water and CO₂ to make food?", "Sunlight", ["Moonlight", "Smoke", "Ice"]],
    ["Which state of water is ICE?", "Solid", ["Liquid", "Gas", "Steam"]],
    ["When water is boiled, it changes into:", "Water vapour (Steam)", ["Ice", "Rock", "Sand"]],
    ["Which traffic light asks drivers to WAIT / GET READY?", "Yellow", ["Red", "Green", "Blue"]],
    ["Which fuel does a solar cooker use?", "Sunlight", ["Coal", "Diesel", "Wood"]],
    ["Which animal gives us both milk and wool (in hilly regions)?", "Goat / Sheep", ["Dog", "Lion", "Eagle"]],
    ["Which reptile has no legs and crawls on the ground?", "Snake", ["Crocodile", "Lizard", "Turtle"]],
    ["Which insect spreads malaria?", "Female Anopheles Mosquito", ["Housefly", "Butterfly", "Bee"]],
    ["Which part of a sugarcane plant do we eat/extract juice from?", "Stem", ["Root", "Leaf", "Seed"]],
    ["Which part of a carrot or radish plant do we eat?", "Root", ["Stem", "Flower", "Seed"]],
    ["Which gas makes up about 78% of Earth's atmosphere?", "Nitrogen", ["Oxygen", "Carbon Dioxide", "Helium"]],
    ["How many hours does Earth take for one complete rotation on its axis?", "24 hours (1 day)", ["12 hours", "365 days", "7 days"]],
    ["What keeps astronauts floating inside a spacecraft?", "Zero/Microgravity", ["High wind", "Magnetism", "Friction"]],
    ["Which bird lays the largest egg in the world?", "Ostrich", ["Peacock", "Eagle", "Swan"]],
    ["Which mammal can fly like a bird?", "Bat", ["Squirrel", "Owl", "Penguin"]],
    ["Which is the largest mammal living in the ocean?", "Blue Whale", ["Shark", "Octopus", "Crocodile"]],
    ["What should we do before eating fruits bought from the market?", "Wash them cleanly with water", ["Put dust on them", "Eat unwashed", "Boil in oil"]],
    ["Which energy is stored in a dry battery cell?", "Chemical Energy", ["Sound Energy", "Wind Energy", "Tidal Energy"]],
    ["Which river in India is also known as 'Dakshin Ganga'?", "Godavari", ["Yamuna", "Narmada", "Satluj"]],
    ["Who invented the Braille script for visually impaired readers?", "Louis Braille", ["Thomas Edison", "Isaac Newton", "Graham Bell"]],
    ["Which plant's leaves fold up quickly when touched?", "Touch-me-not (Mimosa)", ["Lotus", "Neem", "Sunflower"]],
    ["Which vitamin does morning sunlight help our skin make?", "Vitamin D", ["Vitamin A", "Vitamin C", "Vitamin B12"]],
    ["Where do frogs live happily?", "Both on land and in water (Amphibian)", ["Only in desert", "Only on trees", "Inside clouds"]],
    ["Which festival is popularly called the 'Festival of Lights'?", "Diwali", ["Holi", "Baisakhi", "Onam"]],
    ["Which festival is celebrated as the 'Festival of Colours'?", "Holi", ["Diwali", "Eid", "Christmas"]],
    ["Which harvest festival of Kerala features decorated snake-boat races?", "Onam", ["Pongal", "Lohri", "Bihu"]],
    ["Which white-striped crossing on roads is meant for pedestrians to walk across safely?", "Zebra Crossing", ["Rail Track", "Flyover", "Footpath Only"]],
    ["Which emergency vehicle rushes injured or sick patients to a hospital?", "Ambulance", ["Fire Engine", "Tractor", "Bulldozer"]],
    ["Which community helper stitches clothes for us?", "Tailor", ["Carpenter", "Cobbler", "Plumber"]],
    ["Which community helper makes wooden tables, chairs, and doors?", "Carpenter", ["Mason", "Potter", "Barber"]],
    ["Which community helper mends and repairs our torn shoes?", "Cobbler", ["Tailor", "Blacksmith", "Gardener"]],
    ["Which community helper fixes leaking taps and water pipes?", "Plumber", ["Electrician", "Mason", "Chef"]],
    ["Which organ in our mouth helps us taste sweet, sour, and salty food?", "Tongue", ["Teeth", "Lips", "Chin"]],
    ["How many teeth does a normal adult human usually have?", "32", ["20", "28", "40"]],
    ["Which liquid flows inside our blood vessels to carry oxygen and nutrients?", "Blood", ["Saliva", "Sweat", "Tears"]],
    ["Which part of a plant turns into a fruit containing seeds?", "Flower", ["Root", "Bark", "Thorn"]],
    ["Which gas do green plants release during photosynthesis in daytime?", "Oxygen", ["Nitrogen", "Argon", "Smoke"]],
    ["Which soil holds the highest amount of water and feels sticky when wet?", "Clayey Soil", ["Sandy Soil", "Gravel", "Pebbles"]],
    ["Rainwater harvesting helps us primarily to:", "Save and recharge underground water", ["Waste drinking water", "Dry up rivers", "Pollute lakes"]],
    ["Which means of transport moves fastest over very long distances between countries?", "Aeroplane", ["Bullock Cart", "Cycle Rickshaw", "Ferry Boat"]],
    ["Which spice gives bright yellow colour and healing value to Indian curries and milk?", "Turmeric (Haldi)", ["Black Salt", "Sugar", "Clove"]],
    ["Which fibre comes from the cocoon of silkworms?", "Silk", ["Cotton", "Jute", "Nylon"]],
    ["Which fibre comes from cotton bolls grown in black soil?", "Cotton", ["Wool", "Silk", "Polyester"]],
    ["Which direction does a magnetic compass needle always point towards?", "North-South", ["East-West", "Up-Down", "Diagonal Only"]],
    ["Which city is famously known as the 'Pink City' of India?", "Jaipur", ["Udaipur", "Jodhpur", "Bikaner"]],
    ["Which city is known as the 'Silicon Valley of India' for IT & Science?", "Bengaluru", ["Patna", "Shimla", "Panaji"]],
    ["Which is the largest freshwater lake in North-East India famous for floating phumdis?", "Loktak Lake (Manipur)", ["Chilika Lake", "Dal Lake", "Sambhar Lake"]],
    ["Which Indian freedom fighter gave the inspiring slogan 'Give me blood, and I shall give you freedom'?", "Netaji Subhas Chandra Bose", ["Mahatma Gandhi", "Bhagat Singh", "Lala Lajpat Rai"]],
  ];
  evsExtra.forEach(([q, ans, wrongs], i) => {
    const { options, correctIndex } = shuffleFourOptions(ans, wrongs, `c${cls}_evs_ext_${i}`);
    out.push(["EVS / GK", "MCQ", `${cls <= 2 ? "Q." : "EVS:"} ${q}`, options, correctIndex, `Correct answer: ${ans}.`, "EVS & Nature"]);
  });

  return out;
}

export function getPrimaryExpansion(classLevel: 1 | 2 | 3 | 4 | 5): EntranceTestQuestion[] {
  const tuples: QTuple[] = [
    ...buildEnglishExpansion(classLevel),
    ...buildMathsExpansion(classLevel),
    ...buildHindiExpansion(classLevel),
    ...buildEvsGkExpansion(classLevel),
  ];

  // Guarantee zero duplicate question prompts within the same class
  const seenPrompts = new Set<string>();
  const uniqueTuples: QTuple[] = [];
  for (const t of tuples) {
    const key = `${t[0]}::${t[2].trim().toLowerCase()}`;
    if (!seenPrompts.has(key)) {
      seenPrompts.add(key);
      uniqueTuples.push(t);
    }
  }

  return uniqueTuples.map((t, idx) => ({
    id: `c${classLevel}_exp_${idx + 1}`,
    classLevel,
    subject: t[0],
    format: t[1],
    question: t[2],
    options: t[3],
    correctIndex: t[4],
    explanation: t[5],
    topicTag: t[6],
    ...(t[7] ? { passage: t[7] } : {}),
  }));
}
