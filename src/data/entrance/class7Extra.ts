import type { EntranceTestQuestion } from "../../school-types";
import {
  buildFactBankTuples,
  expandClassQuestions,
  makeNumOptions,
  shuffleFourOptions,
  type QTuple,
} from "./helpers";

// ── CLASS 7 EXTRA (466 top questions: Eng 92 + Math 102 + Sci 101 + SST 84 + Reas/GK 87) ──

// 1. ENGLISH (92)
const c7EngSyn = buildFactBankTuples({
  subject: "English",
  topicTag: "Synonyms",
  seedPrefix: "c7_eng_syn",
  explanationPrefix: "Synonym:",
  items: [
    { prompt: "Synonym of 'ABANDON':", answer: "Forsake" },
    { prompt: "Synonym of 'BENEVOLENT':", answer: "Kind-hearted" },
    { prompt: "Synonym of 'CANDID':", answer: "Frank and honest" },
    { prompt: "Synonym of 'DILIGENT':", answer: "Hardworking" },
    { prompt: "Synonym of 'ELIGIBLE':", answer: "Qualified" },
    { prompt: "Synonym of 'FRUGAL':", answer: "Economical" },
    { prompt: "Synonym of 'HAZARDOUS':", answer: "Dangerous" },
    { prompt: "Synonym of 'IMPECCABLE':", answer: "Faultless" },
    { prompt: "Synonym of 'LAMENT':", answer: "Mourn" },
    { prompt: "Synonym of 'MAGNIFICENT':", answer: "Splendid" },
    { prompt: "Synonym of 'OBSTINATE':", answer: "Stubborn" },
    { prompt: "Synonym of 'VIGILANT':", answer: "Watchful" },
  ],
});

const c7EngAnt = buildFactBankTuples({
  subject: "English",
  topicTag: "Antonyms",
  seedPrefix: "c7_eng_ant",
  explanationPrefix: "Antonym:",
  items: [
    { prompt: "Antonym of 'ARROGANT':", answer: "Humble" },
    { prompt: "Antonym of 'BRUTAL':", answer: "Humane" },
    { prompt: "Antonym of 'CONFESS':", answer: "Deny" },
    { prompt: "Antonym of 'DESPAIR':", answer: "Hope" },
    { prompt: "Antonym of 'EXAGGERATE':", answer: "Understate" },
    { prompt: "Antonym of 'FERTILE':", answer: "Barren" },
    { prompt: "Antonym of 'GLOOMY':", answer: "Cheerful" },
    { prompt: "Antonym of 'HARMONY':", answer: "Discord" },
    { prompt: "Antonym of 'INNOCENT':", answer: "Guilty" },
    { prompt: "Antonym of 'MANDATORY':", answer: "Optional" },
    { prompt: "Antonym of 'OPTIMIST':", answer: "Pessimist" },
    { prompt: "Antonym of 'WISDOM':", answer: "Folly" },
  ],
});

const c7EngOneWord = buildFactBankTuples({
  subject: "English",
  topicTag: "One Word Substitution",
  seedPrefix: "c7_eng_one",
  explanationPrefix: "One-word term:",
  items: [
    { prompt: "Life story of a person written by himself/herself:", answer: "Autobiography" },
    { prompt: "Life story of a person written by someone else:", answer: "Biography" },
    { prompt: "A person who looks at the bright side of things:", answer: "Optimist" },
    { prompt: "A person who looks at the dark side of things:", answer: "Pessimist" },
    { prompt: "One who knows everything:", answer: "Omniscient" },
    { prompt: "One who is present everywhere:", answer: "Omnipresent" },
    { prompt: "A medicine that counteracts poison:", answer: "Antidote" },
    { prompt: "A government by the people, for the people:", answer: "Democracy" },
    { prompt: "A speech delivered without prior preparation:", answer: "Extempore" },
    { prompt: "Handwriting that cannot be read:", answer: "Illegible" },
    { prompt: "One who does not believe in the existence of God:", answer: "Atheist" },
    { prompt: "A place where dead bodies are kept temporarily:", answer: "Mortuary" },
  ],
});

const c7EngGrammar: QTuple[] = [
  // Active & Passive Voice (8)
  ["English", "MCQ", "Change to Passive Voice: 'Did the police catch the thief?'", ["Was the thief caught by the police?", "Were the thief caught by the police?", "Is the thief caught by the police?", "Had the thief caught by the police?"], 0, "Interrogative simple past active ('Did + V1') becomes 'Was/Were + Object + V3'.", "Voice"],
  ["English", "MCQ", "Change to Passive Voice: 'Please open the window.'", ["The window is opened.", "You are requested to open the window.", "Let window opened.", "You are ordered open window."], 1, "Imperative sentences starting with 'Please' become 'You are requested to + V1'.", "Voice"],
  ["English", "MCQ", "Change to Passive Voice: 'Who broke this glass?'", ["Who was broken this glass?", "By whom was this glass broken?", "By who was this glass broke?", "Whom broke this glass?"], 1, "'Who' changes to 'By whom' in passive voice.", "Voice"],
  ["English", "MCQ", "Change to Passive Voice: 'She will complete the project tomorrow.'", ["The project will complete by her tomorrow.", "The project will be completed by her tomorrow.", "The project would completed by her.", "The project is completed by her."], 1, "Simple future passive: will + be + V3.", "Voice"],
  ["English", "MCQ", "Change to Passive Voice: 'They were painting the bridge.'", ["The bridge was painted by them.", "The bridge was being painted by them.", "The bridge is being painted by them.", "The bridge were painted by them."], 1, "Past continuous passive: was/were + being + V3.", "Voice"],
  ["English", "MCQ", "Change to Active Voice: 'A letter has been written by Riya.'", ["Riya wrote a letter.", "Riya has written a letter.", "Riya had written a letter.", "Riya is writing a letter."], 1, "Present perfect passive 'has been + V3' reverts to 'has/have + V3'.", "Voice"],
  // Direct & Indirect Speech (6)
  ["English", "MCQ", "Direct to Indirect: Rahul said, 'I am reading a novel now.'", ["Rahul said that he was reading a novel then.", "Rahul said that I am reading a novel now.", "Rahul told that he is reading a novel then.", "Rahul asked if he read a novel."], 0, "Present continuous shifts to past continuous and 'now' changes to 'then'.", "Reported Speech"],
  ["English", "MCQ", "Direct to Indirect: She said to him, 'Do you play chess?'", ["She asked him did he play chess.", "She asked him if he played chess.", "She told him whether you play chess.", "She asked him if he plays chess."], 1, "Yes/No reported question uses 'if/whether' and past tense statement order.", "Reported Speech"],
  ["English", "MCQ", "Direct to Indirect: The captain said, 'Hurrah! We have won the match.'", ["The captain exclaimed with joy that they had won the match.", "The captain said hurrah they won the match.", "The captain asked with joy that we won.", "The captain exclaimed sorrowfully they won."], 0, "Exclamatory 'Hurrah!' changes to 'exclaimed with joy' and present perfect to past perfect.", "Reported Speech"],
  ["English", "MCQ", "Direct to Indirect: The doctor said to the patient, 'Take rest for three days.'", ["The doctor advised the patient to take rest for three days.", "The doctor said the patient took rest.", "The doctor asked that take rest.", "The doctor ordered to taking rest."], 0, "Imperative advice reports with 'advised + object + to + V1'.", "Reported Speech"],
  ["English", "MCQ", "Direct to Indirect: Father said, 'Honesty is the best policy.'", ["Father said that honesty was the best policy.", "Father said that honesty is the best policy.", "Father told honesty is best policy.", "Father asked if honesty was best."], 1, "Proverbs and universal truths keep their present tense in indirect speech.", "Reported Speech"],
  ["English", "MCQ", "Direct to Indirect: Meera said, 'I visited Jaipur yesterday.'", ["Meera said that she visited Jaipur yesterday.", "Meera said that she had visited Jaipur the previous day.", "Meera said she has visited Jaipur yesterday.", "Meera told she will visit Jaipur."], 1, "Simple past changes to past perfect ('had visited') and 'yesterday' to 'the previous day'.", "Reported Speech"],
  // Subject-Verb Concord & Tenses (10)
  ["English", "FILL_BLANK", "Each of the boys ___ given a certificate of merit.", ["were", "are", "was", "have"], 2, "'Each of + plural noun' takes a singular verb ('was').", "Subject-Verb"],
  ["English", "FILL_BLANK", "Slow and steady ___ the race.", ["win", "wins", "winning", "have won"], 1, "Two nouns expressing a single combined idea take singular 'wins'.", "Subject-Verb"],
  ["English", "FILL_BLANK", "Mathematics ___ my favourite subject since Class 5.", ["are", "were", "has been", "have been"], 2, "Subject names ending in -s (Mathematics, Physics) take singular verbs.", "Subject-Verb"],
  ["English", "FILL_BLANK", "Either Rohan or his friends ___ broken the vase.", ["has", "have", "is", "was"], 1, "With 'Either...or', verb agrees with the nearer noun ('friends' → 'have').", "Subject-Verb"],
  ["English", "FILL_BLANK", "The quality of these apples ___ remarkably good.", ["are", "were", "is", "have been"], 2, "The main subject is singular 'The quality', so use 'is'.", "Subject-Verb"],
  ["English", "FILL_BLANK", "Ten kilometres ___ a long distance to walk daily.", ["are", "were", "is", "have"], 2, "A single unit of distance, time, or money takes a singular verb.", "Subject-Verb"],
  ["English", "FILL_BLANK", "The train ___ before we reached the station.", ["left", "has left", "had left", "will leave"], 2, "The earlier of two past actions takes Past Perfect ('had left').", "Tenses"],
  ["English", "FILL_BLANK", "It ___ raining heavily since morning.", ["is", "was", "has been", "had"], 2, "Action starting in the past and continuing now with 'since' takes Present Perfect Continuous.", "Tenses"],
  ["English", "FILL_BLANK", "She usually ___ to school by bus, but today she walked.", ["go", "goes", "is going", "went"], 1, "Habitual action with 'usually' takes Simple Present ('goes').", "Tenses"],
  ["English", "FILL_BLANK", "Wait here until the Principal ___ back.", ["came", "will come", "comes", "had come"], 2, "Time clauses after 'until/when' use Simple Present for future meaning.", "Tenses"],
  // Modals, Conditionals, Determiners & Non-Finites (10)
  ["English", "FILL_BLANK", "If she invites me, I ___ definitely attend the function.", ["would", "will", "had", "was"], 1, "First conditional: If + Simple Present → will + V1.", "Conditionals"],
  ["English", "FILL_BLANK", "Had you informed me earlier, I ___ helped you.", ["would", "would have", "will have", "had"], 1, "Inverted third conditional ('Had you...' = 'If you had...') → 'would have + V3'.", "Conditionals"],
  ["English", "FILL_BLANK", "___ you please lend me your dictionary for a day?", ["Should", "Could", "Must", "Shall"], 1, "'Could' expresses polite request.", "Modals"],
  ["English", "FILL_BLANK", "Passengers ___ not cross the railway tracks; it is punishable by law.", ["may", "might", "must", "need"], 2, "'Must not' expresses strict prohibition.", "Modals"],
  ["English", "FILL_BLANK", "He is ___ honourable man known for his kindness.", ["a", "an", "the", "no article"], 1, "'Honourable' begins with a vowel sound ('o'), so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "___ Ganga is considered a sacred river in India.", ["A", "An", "The", "No article"], 2, "Names of rivers take definite article 'The'.", "Articles"],
  ["English", "FILL_BLANK", "There are ___ books on the shelf; you can borrow any two.", ["little", "much", "several", "any"], 2, "'Several' fits positive countable plural nouns.", "Determiners"],
  ["English", "FILL_BLANK", "I prefer reading novels ___ watching television.", ["than", "over", "to", "from"], 2, "'Prefer' takes the preposition 'to' (not 'than').", "Prepositions"],
  ["English", "FILL_BLANK", "She is senior ___ me by two years in service.", ["than", "from", "to", "over"], 2, "Adjectives ending in -ior (senior, junior, superior, inferior) take 'to'.", "Prepositions"],
  ["English", "FILL_BLANK", "He prevented the child ___ touching the hot iron.", ["to", "from", "by", "against"], 1, "'Prevent' takes 'from + gerund (-ing)'.", "Prepositions"],
  // Phrasal Verbs, Idioms, Error Spotting, Figures of Speech, Clauses, Spellings & Passages (24)
  ["English", "FILL_BLANK", "Phrasal Verb: Please ___ your shoes before entering the temple.", ["take on", "take off", "take up", "take in"], 1, "'Take off' means remove.", "Phrasal Verbs"],
  ["English", "FILL_BLANK", "Phrasal Verb: Don't ___ easily; keep trying until you succeed.", ["give up", "give in", "give out", "give away"], 0, "'Give up' means stop trying / quit.", "Phrasal Verbs"],
  ["English", "FILL_BLANK", "Phrasal Verb: The meeting was ___ till next Monday due to heavy rain.", ["called on", "called off", "put off", "set out"], 2, "'Put off' means postponed.", "Phrasal Verbs"],
  ["English", "MCQ", "What does the idiom 'To spill the beans' mean?", ["Waste food", "Reveal a secret accidentally", "Plant seeds", "Start a fight"], 1, "'Spill the beans' means reveal secret information.", "Idioms"],
  ["English", "MCQ", "What does 'A blessing in disguise' mean?", ["A hidden curse", "Something good that initially seemed bad", "A magic trick", "An expensive gift"], 1, "An apparent misfortune that unexpectedly results in something good.", "Idioms"],
  ["English", "MCQ", "What does 'To hit the nail on the head' mean?", ["Use a hammer", "Describe the exact truth or cause", "Hurt someone", "Miss the target"], 1, "Means being completely accurate about something.", "Idioms"],
  ["English", "MCQ", "What does 'Burn the midnight oil' mean?", ["Waste fuel", "Work or study late into the night", "Light a bonfire", "Wake up early"], 1, "Means studying or working late at night.", "Idioms"],
  ["English", "MCQ", "Spot the error: 'He is / one of the / best player / in our team.'", ["He is", "one of the", "best player (should be 'players')", "in our team"], 2, "'One of the + superlative + PLURAL noun' ('best players').", "Error Spotting"],
  ["English", "MCQ", "Spot the error: 'My brother / has bought / a new furnitures / yesterday.'", ["My brother", "has bought / yesterday", "a new furnitures", "Both 'has bought' and 'furnitures' are wrong"], 3, "'Furniture' is uncountable (no 'a', no '-s'), and 'yesterday' requires simple past 'bought'.", "Error Spotting"],
  ["English", "MCQ", "Spot the error: 'She resembles / with her / mother very / closely.'", ["She resembles", "with her (remove 'with')", "mother very", "closely"], 1, "'Resemble' does not take 'with' or 'to'; use 'resembles her mother'.", "Error Spotting"],
  ["English", "MCQ", "Spot the error: 'No sooner did / the teacher entered / the class than / students stood up.'", ["No sooner did", "the teacher entered (use 'enter')", "the class than", "students stood up"], 1, "After 'did', always use base verb V1 ('enter'), not V2.", "Error Spotting"],
  ["English", "MCQ", "Choose the correctly spelt word (to provide lodging or space):", ["Accommodate", "Acommodate", "Accomodate", "Acomodate"], 0, "Double c, double m: A-C-C-O-M-M-O-D-A-T-E.", "Spelling"],
  ["English", "MCQ", "Choose the correctly spelt word (feeling of awkwardness or shame):", ["Embarrassment", "Embarassment", "Embarrasment", "Embarasment"], 0, "Double r, double s: E-M-B-A-R-R-A-S-S-M-E-N-T.", "Spelling"],
  ["English", "MCQ", "Choose the correctly spelt word (a written survey form):", ["Questionnaire", "Questionaire", "Questionnare", "Questioneire"], 0, "Double n: Q-U-E-S-T-I-O-N-N-A-I-R-E.", "Spelling"],
  ["English", "MCQ", "Choose the correctly spelt word (steady effort despite obstacles):", ["Perseverance", "Perseverence", "Persiverance", "Perseveranse"], 0, "P-E-R-S-E-V-E-R-A-N-C-E.", "Spelling"],
  ["English", "MCQ", "Identify the figure of speech: 'Peter Piper picked a peck of pickled peppers.'", ["Metaphor", "Simile", "Alliteration", "Oxymoron"], 2, "Repetition of initial consonant sound 'p' is Alliteration.", "Figures of Speech"],
  ["English", "MCQ", "Identify the figure of speech: 'Parting is such sweet sorrow.'", ["Simile", "Oxymoron", "Onomatopoeia", "Hyperbole"], 1, "Two contradictory words placed side by side ('sweet sorrow') form an Oxymoron.", "Figures of Speech"],
  ["English", "MCQ", "Identify the figure of speech: 'The bees buzzed near the blooming roses.'", ["Onomatopoeia", "Metaphor", "Irony", "Hyperbole"], 0, "Words imitating natural sounds ('buzzed') are Onomatopoeia.", "Figures of Speech"],
  ["English", "MCQ", "Combine into a single Simple Sentence: 'He is very weak. He cannot walk.'", ["He is too weak to walk.", "He is weak and cannot walk.", "Because he is weak he walks.", "He cannot walk so weak."], 0, "Using 'too...to' combines both ideas into a simple sentence with one finite verb.", "Synthesis"],
  ["English", "MCQ", "Identify the Gerund in: 'Swimming is an excellent exercise for lungs.'", ["exercise", "excellent", "Swimming", "lungs"], 2, "'Swimming' ends in -ing and acts as a noun (subject), so it is a Gerund.", "Non-Finite Verbs"],
  ["English", "MINI_PASSAGE", "What does the term 'carbon footprint' refer to according to the passage?", ["Actual muddy footprints on roads", "Total greenhouse gases emitted by human activities", "Size of a forest reserve", "Number of cars in a village"], 1, "It measures total greenhouse gas emissions caused by our energy and lifestyle choices.", "Comprehension", "A carbon footprint measures the total amount of greenhouse gases released into the atmosphere by an individual, factory, or product. Choosing public transport, conserving electricity, and reducing single-use plastics can significantly shrink this footprint."],
  ["English", "MINI_PASSAGE", "Which action helps shrink a carbon footprint as mentioned?", ["Burning plastic waste", "Using public transport and saving electricity", "Driving solo everywhere", "Cutting down city parks"], 1, "Public transport and energy conservation reduce emissions.", "Comprehension", "A carbon footprint measures the total amount of greenhouse gases released into the atmosphere by an individual, factory, or product. Choosing public transport, conserving electricity, and reducing single-use plastics can significantly shrink this footprint."],
  ["English", "MINI_PASSAGE", "Why did Dr. Kalam encourage students to dream big?", ["To sleep longer in class", "Because thoughts turn into action when pursued with perseverance", "To avoid science experiments", "Because dreams need no effort"], 1, "Dreams combined with hard work and learning turn into real achievements.", "Comprehension", "Dr. A.P.J. Abdul Kalam often reminded young students that a real dream is not what you see in sleep, but what does not let you sleep. When curiosity is paired with discipline and continuous learning, ordinary classrooms produce extraordinary innovators."],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Noun vs Verb/Adjective):", ["Beauty", "Wisdom", "Honesty", "Brave"], 3, "'Brave' is an adjective; Beauty, Wisdom, and Honesty are abstract nouns.", "Odd One Out"],
];

// 2. MATHEMATICS (102)
function buildClass7Maths(): QTuple[] {
  const qs: QTuple[] = [];

  // A. Integers & BODMAS (12)
  const intSpecs: Array<[string, number, number[], string]> = [
    ["Evaluate: (−12) × 5 + (−12) × 3", -96, [96, -24, 24], "Using distributive property: (−12) × (5 + 3) = −12 × 8 = −96."],
    ["Evaluate: (−48) ÷ (−6) + (−5)", 3, [-3, 13, -13], "(−48)/(−6) = +8; 8 + (−5) = 3."],
    ["Evaluate: [36 ÷ (−9)] ÷ (−2)", 2, [-2, 4, -4], "36 ÷ (−9) = −4; (−4) ÷ (−2) = +2."],
    ["What is the additive inverse of −27?", 27, [-27, 0, 1], "Additive inverse of a is −a: −(−27) = +27."],
    ["In a quiz, +5 is given for right answers and −2 for wrong. If Priya got 8 right and 5 wrong, her score is:", 30, [40, 20, 35], "Score = (8 × 5) + (5 × −2) = 40 − 10 = 30."],
    ["Temperature at 6 AM was −4°C. By noon it rose by 11°C. What was the noon temperature (in °C)?", 7, [-7, 15, -15], "−4 + 11 = +7°C."],
    ["An elevator descends into a mine at 6 m/min. Starting from 10 m above ground, where is it after 20 min (m below ground)?", 110, [120, 130, 100], "Descends 6 × 20 = 120 m; 10 − 120 = −110 m → 110 m below ground."],
    ["Evaluate: (−1) × (−1) × (−1) × (−1) × (−1) × 9", -9, [9, -1, 1], "Odd number (5) of negative (−1)s gives −1; (−1) × 9 = −9."],
    ["Find the integer 'x' if (−9) × x = 72", -8, [8, -9, 9], "x = 72 ÷ (−9) = −8."],
    ["Evaluate using BODMAS: 25 − [20 − {10 − (7 − 5)}]", 13, [7, 15, 17], "7−5=2 → 10−2=8 → 20−8=12 → 25−12 = 13."],
    ["Find the product: (−25) × 37 × (−4)", 3700, [-3700, 370, 7400], "(−25) × (−4) = +100; 100 × 37 = 3700."],
    ["Difference between the smallest positive integer (1) and the greatest negative integer (−1) is:", 2, [0, -2, 1], "1 − (−1) = 1 + 1 = 2."],
  ];
  intSpecs.forEach(([q, ans, offs, exp], idx) => {
    const { options, correctIndex } = makeNumOptions(ans, offs, `c7_int_${idx}`, "", true);
    qs.push(["Mathematics", "MCQ", q, options, correctIndex, exp, "Integers"]);
  });

  // B. Fractions & Decimals (10)
  qs.push(
    ["Mathematics", "MCQ", "What is 3/4 of 36 kg?", ["24 kg", "27 kg", "28 kg", "30 kg"], 1, "(3/4) × 36 = 3 × 9 = 27 kg.", "Fractions"],
    ["Mathematics", "MCQ", "Divide: 7/8 ÷ 14/16", ["1/2", "1", "2", "7/4"], 1, "14/16 simplifies to 7/8, so (7/8) ÷ (7/8) = 1.", "Fractions"],
    ["Mathematics", "MCQ", "A car runs 18 km using 1 litre of petrol. How far will it go in 2⅔ litres?", ["36 km", "42 km", "48 km", "54 km"], 2, "2⅔ = 8/3; 18 × (8/3) = 6 × 8 = 48 km.", "Fractions"],
    ["Mathematics", "MCQ", "Find the value of 0.25 × 0.04:", ["0.1", "0.01", "0.001", "1.0"], 1, "25 × 4 = 100; 4 decimal places total → 0.0100 = 0.01.", "Decimals"],
    ["Mathematics", "MCQ", "Divide: 14.4 ÷ 0.12", ["1.2", "12", "120", "1200"], 2, "1440 ÷ 12 = 120.", "Decimals"],
    ["Mathematics", "MCQ", "Which of these fractions is the LARGEST: 2/3, 3/4, 4/5, 5/6?", ["2/3", "3/4", "4/5", "5/6"], 3, "When numerator = denominator − 1, the fraction with larger denominator is larger: 5/6 ≈ 0.833.", "Fractions"],
    ["Mathematics", "MCQ", "How many pieces of ribbon each 1.25 m long can be cut from a 15 m roll?", ["10", "12", "14", "15"], 1, "15 ÷ 1.25 = 1500 ÷ 125 = 12 pieces.", "Decimals"],
    ["Mathematics", "MCQ", "The reciprocal of mixed fraction 3⅕ is:", ["5/16", "16/5", "3/5", "5/3"], 0, "3⅕ = 16/5; its reciprocal is 5/16.", "Fractions"],
    ["Mathematics", "FILL_BLANK", "Express 45 paise in Rupees using decimals: ₹ ___", ["4.5", "0.45", "0.045", "45.0"], 1, "45 ÷ 100 = ₹0.45.", "Decimals"],
    ["Mathematics", "MCQ", "Simplify: 2½ + 3⅓", ["5⅚", "5⅖", "6⅚", "5½"], 0, "(2+3) + (1/2 + 1/3) = 5 + 5/6 = 5⅚.", "Fractions"]
  );

  // C. Simple Equations (10)
  const eqSpecs: Array<[string, number, number[], string]> = [
    ["Solve for x: 4x + 9 = 29", 5, [4, 6, 7], "4x = 20 → x = 5."],
    ["Solve for y: 5y − 13 = 2y + 8", 7, [5, 6, 9], "3y = 21 → y = 7."],
    ["Solve for m: (m / 3) + 4 = 10", 18, [12, 16, 20], "m/3 = 6 → m = 18."],
    ["Solve: 3(x − 2) = 21", 9, [7, 8, 11], "x − 2 = 7 → x = 9."],
    ["Three times a number added to 7 gives 34. Find the number:", 9, [7, 8, 11], "3n + 7 = 34 → 3n = 27 → n = 9."],
    ["Perimeter of an isosceles triangle is 42 cm. If its base is 12 cm, length of each equal side (cm) is:", 15, [12, 14, 16], "2s + 12 = 42 → 2s = 30 → s = 15 cm."],
    ["Sum of three consecutive integers is 51. Find the largest integer:", 18, [16, 17, 19], "n + (n+1) + (n+2) = 51 → 3n+3 = 51 → n = 16 → largest = 18."],
    ["Raju's father is 5 years older than 3 times Raju's age. If father is 44, Raju's age (years) is:", 13, [11, 12, 15], "3x + 5 = 44 → 3x = 39 → x = 13."],
    ["One-fourth of a number exceeds 2 by 5. Find the number:", 28, [20, 24, 32], "n/4 − 2 = 5 → n/4 = 7 → n = 28."],
    ["Solve: 2(p + 4) − 3p = 3", 5, [3, 4, 6], "2p + 8 − 3p = 3 → −p = −5 → p = 5."],
  ];
  eqSpecs.forEach(([q, ans, offs, exp], idx) => {
    const { options, correctIndex } = makeNumOptions(ans, offs, `c7_eq_${idx}`);
    qs.push(["Mathematics", "MCQ", q, options, correctIndex, exp, "Simple Equations"]);
  });

  // D. Lines, Angles & Triangles (12)
  qs.push(
    ["Mathematics", "MCQ", "What is the SUPPLEMENT of an angle measuring 65°?", ["25°", "115°", "125°", "95°"], 1, "Supplementary angles sum to 180°: 180° − 65° = 115°.", "Lines & Angles"],
    ["Mathematics", "MCQ", "Find the angle which is EQUAL to its own complement:", ["30°", "45°", "60°", "90°"], 1, "x + x = 90° → 2x = 90° → x = 45°.", "Lines & Angles"],
    ["Mathematics", "MCQ", "Find the angle which is DOUBLE its supplement:", ["60°", "90°", "120°", "135°"], 2, "x = 2(180° − x) → 3x = 360° → x = 120°.", "Lines & Angles"],
    ["Mathematics", "MCQ", "Two parallel lines are cut by a transversal. If one interior alternate angle is 72°, the other is:", ["18°", "72°", "108°", "144°"], 1, "Alternate interior angles between parallel lines are equal = 72°.", "Parallel Lines"],
    ["Mathematics", "MCQ", "Two co-interior angles on the same side of a transversal between parallel lines sum to:", ["90°", "180°", "270°", "360°"], 1, "Co-interior angles are supplementary (180°).", "Parallel Lines"],
    ["Mathematics", "MCQ", "Angles of a triangle are in ratio 2 : 3 : 4. Find the LARGEST angle:", ["40°", "60°", "80°", "100°"], 2, "2x+3x+4x = 180° → 9x = 180° → x = 20° → 4x = 80°.", "Triangles"],
    ["Mathematics", "MCQ", "An exterior angle of a triangle is 115° and one interior opposite angle is 45°. Find the other:", ["50°", "60°", "70°", "80°"], 2, "Exterior angle = sum of two interior opposite angles: 115° − 45° = 70°.", "Triangles"],
    ["Mathematics", "MCQ", "Which set of side lengths CANNOT form a triangle?", ["3 cm, 4 cm, 5 cm", "5 cm, 6 cm, 10 cm", "2 cm, 3 cm, 6 cm", "6 cm, 6 cm, 6 cm"], 2, "Sum of any two sides must exceed third side; here 2 + 3 = 5 < 6.", "Triangle Inequality"],
    ["Mathematics", "MCQ", "A ladder 13 m long reaches a window 12 m high on a wall. How far is its foot from the wall?", ["3 m", "4 m", "5 m", "6 m"], 2, "By Pythagoras: √(13² − 12²) = √(169 − 144) = √25 = 5 m.", "Pythagoras Theorem"],
    ["Mathematics", "MCQ", "A right triangle has legs 6 cm and 8 cm. What is the length of its hypotenuse?", ["10 cm", "12 cm", "14 cm", "9 cm"], 0, "√(6² + 8²) = √(36 + 64) = √100 = 10 cm.", "Pythagoras Theorem"],
    ["Mathematics", "TRUE_FALSE", "True or False: Vertically opposite angles formed by two intersecting lines are always equal.", ["True", "False", "Sum is 90°", "Only for right angles"], 0, "True! Vertically opposite angles are always congruent.", "Lines & Angles"],
    ["Mathematics", "MCQ", "In an isosceles triangle, the vertex angle is 70°. Each base angle measures:", ["45°", "55°", "65°", "70°"], 1, "(180° − 70°) ÷ 2 = 110° ÷ 2 = 55°.", "Triangles"]
  );

  // E. Comparing Quantities (14)
  qs.push(
    ["Mathematics", "MCQ", "Convert the ratio 3 : 4 into a percentage:", ["60%", "65%", "75%", "80%"], 2, "(3/4) × 100 = 75%.", "Percentages"],
    ["Mathematics", "MCQ", "If 25% of a number is 45, what is the number?", ["150", "160", "180", "200"], 2, "0.25 × N = 45 → N = 45 × 4 = 180.", "Percentages"],
    ["Mathematics", "MCQ", "A city's population grew from 20,000 to 23,000. What is the percentage increase?", ["10%", "12%", "15%", "20%"], 2, "(3000 / 20000) × 100 = 15%.", "Comparing Quantities"],
    ["Mathematics", "MCQ", "A cycle bought for ₹2,400 is sold for ₹2,760. Find the Profit Percentage:", ["10%", "12%", "15%", "18%"], 2, "Profit = ₹360; Profit% = (360/2400)×100 = 15%.", "Profit & Loss"],
    ["Mathematics", "MCQ", "A watch bought for ₹1,500 is sold at a loss of 12%. What is the Selling Price?", ["₹1,300", "₹1,320", "₹1,350", "₹1,380"], 1, "12% of 1500 = 180; SP = 1500 − 180 = ₹1,320.", "Profit & Loss"],
    ["Mathematics", "MCQ", "If Selling Price = ₹660 and Profit = 10%, find the Cost Price:", ["₹594", "₹600", "₹620", "₹650"], 1, "CP = (660 × 100) / 110 = ₹600.", "Profit & Loss"],
    ["Mathematics", "MCQ", "Find Simple Interest on ₹5,000 at 8% per annum for 3 years:", ["₹1,000", "₹1,200", "₹1,400", "₹1,500"], 1, "SI = (P × R × T)/100 = (5000 × 8 × 3)/100 = ₹1,200.", "Simple Interest"],
    ["Mathematics", "MCQ", "At what rate % per annum will ₹4,000 yield ₹960 as Simple Interest in 3 years?", ["6%", "7%", "8%", "9%"], 2, "R = (960 × 100) / (4000 × 3) = 8%.", "Simple Interest"],
    ["Mathematics", "MCQ", "Divide ₹1,200 between A and B in the ratio 5 : 7. What does B get?", ["₹500", "₹600", "₹700", "₹800"], 2, "B's share = (7/12) × 1200 = ₹700.", "Ratios"],
    ["Mathematics", "MCQ", "If A : B = 2 : 3 and B : C = 4 : 5, find A : C:", ["2 : 5", "8 : 15", "6 : 15", "4 : 5"], 1, "A/C = (2/3) × (4/5) = 8/15 → 8 : 15.", "Ratios"],
    ["Mathematics", "MCQ", "Price of petrol rose by 20%. If old price was ₹80/L, new price is:", ["₹92/L", "₹96/L", "₹100/L", "₹90/L"], 1, "80 + 20% of 80 = 80 + 16 = ₹96/L.", "Percentages"],
    ["Mathematics", "MCQ", "In a class of 50 students, 18 are girls. What percentage are boys?", ["36%", "54%", "64%", "72%"], 2, "Boys = 32; (32/50) × 100 = 64%.", "Percentages"],
    ["Mathematics", "MCQ", "In how many years will a sum of money DOUBLE itself at 10% p.a. simple interest?", ["5 years", "8 years", "10 years", "12 years"], 2, "SI = P → T = (100 × P)/(P × 10) = 10 years.", "Simple Interest"],
    ["Mathematics", "MCQ", "Out of 400 mangoes, 12% were rotten. How many good mangoes remained?", ["348", "352", "360", "388"], 1, "Rotten = 48; Good = 400 − 48 = 352.", "Percentages"]
  );

  // F. Rational Numbers (10)
  qs.push(
    ["Mathematics", "MCQ", "Write −36/48 in standard (simplest) form:", ["−3/4", "3/−4", "−9/12", "−6/8"], 0, "Divide numerator and denominator by HCF 12 → −3/4.", "Rational Numbers"],
    ["Mathematics", "MCQ", "Find the sum: (−5/6) + (3/4)", ["−1/12", "1/12", "−2/10", "−1/2"], 0, "(−10 + 9)/12 = −1/12.", "Rational Numbers"],
    ["Mathematics", "MCQ", "What should be added to −5/7 to get −2/7?", ["−3/7", "3/7", "7/7", "−7/7"], 1, "(−2/7) − (−5/7) = +3/7.", "Rational Numbers"],
    ["Mathematics", "MCQ", "Multiply: (−3/8) × (−16/9)", ["−2/3", "2/3", "3/2", "−3/2"], 1, "(−3 × −16)/(8 × 9) = 48/72 = +2/3.", "Rational Numbers"],
    ["Mathematics", "MCQ", "Which rational number is its own reciprocal (along with −1)?", ["0", "1", "2", "1/2"], 1, "Reciprocal of 1 is 1 (and reciprocal of −1 is −1).", "Rational Numbers"],
    ["Mathematics", "MCQ", "How many rational numbers exist between any two distinct rational numbers?", ["Only 1", "10", "100", "Infinitely many"], 3, "There are infinitely many rational numbers between any two rational numbers.", "Rational Numbers"],
    ["Mathematics", "MCQ", "Which of these is GREATER: −4/5 or −5/6?", ["−4/5", "−5/6", "Both equal", "Cannot compare"], 0, "−24/30 > −25/30, so −4/5 is greater.", "Rational Numbers"],
    ["Mathematics", "MCQ", "Evaluate: (−7/15) ÷ (−14/5)", ["1/6", "−1/6", "6", "2/3"], 0, "(−7/15) × (−5/14) = 1/6.", "Rational Numbers"],
    ["Mathematics", "FILL_BLANK", "Product of a non-zero rational number and its multiplicative inverse is always ___.", ["0", "1", "−1", "2"], 1, "a × (1/a) = 1.", "Rational Numbers"],
    ["Mathematics", "TRUE_FALSE", "True or False: Every integer is also a rational number.", ["True", "False", "Only positive integers", "Only zero"], 0, "Every integer n can be written as n/1 (p/q with q ≠ 0).", "Rational Numbers"]
  );

  // G. Perimeter & Area (14)
  qs.push(
    ["Mathematics", "MCQ", "Find the area of a parallelogram with base 14 cm and corresponding height 8 cm:", ["22 cm²", "56 cm²", "112 cm²", "44 cm²"], 2, "Area = base × height = 14 × 8 = 112 cm².", "Perimeter & Area"],
    ["Mathematics", "MCQ", "Area of a triangle with base 12 cm and height 9 cm is:", ["54 cm²", "108 cm²", "21 cm²", "42 cm²"], 0, "Area = ½ × base × height = ½ × 12 × 9 = 54 cm².", "Perimeter & Area"],
    ["Mathematics", "MCQ", "Find the circumference of a circle of radius 14 cm (take π = 22/7):", ["44 cm", "88 cm", "154 cm", "616 cm"], 1, "C = 2πr = 2 × (22/7) × 14 = 88 cm.", "Circles"],
    ["Mathematics", "MCQ", "Find the area of a circle of radius 7 cm (take π = 22/7):", ["44 cm²", "154 cm²", "308 cm²", "616 cm²"], 1, "Area = πr² = (22/7) × 7 × 7 = 154 cm².", "Circles"],
    ["Mathematics", "MCQ", "A wire in the shape of a square of side 11 cm is rebent into a circle. Find the circle's radius (π = 22/7):", ["3.5 cm", "7 cm", "11 cm", "14 cm"], 1, "Perimeter = 44 cm = 2πr → r = 7 cm.", "Perimeter & Area"],
    ["Mathematics", "MCQ", "A rectangular park 50 m × 30 m has a 2 m wide path all around OUTSIDE it. Find the outer length:", ["52 m", "54 m", "46 m", "48 m"], 1, "50 + 2 + 2 = 54 m.", "Perimeter & Area"],
    ["Mathematics", "MCQ", "1 hectare equals how many square metres?", ["100 m²", "1,000 m²", "10,000 m²", "1,00,000 m²"], 2, "1 hectare = 100 m × 100 m = 10,000 m².", "Unit Conversion"],
    ["Mathematics", "MCQ", "If the area of a parallelogram is 96 cm² and its base is 12 cm, find its height:", ["6 cm", "8 cm", "10 cm", "12 cm"], 1, "Height = Area ÷ base = 96 ÷ 12 = 8 cm.", "Perimeter & Area"],
    ["Mathematics", "MCQ", "Find the perimeter of a semicircle of diameter 14 cm (including diameter, π = 22/7):", ["22 cm", "36 cm", "44 cm", "58 cm"], 1, "πr + 2r = 22 + 14 = 36 cm.", "Circles"],
    ["Mathematics", "MCQ", "If radius of a circle is doubled, its area becomes how many times?", ["2 times", "3 times", "4 times", "8 times"], 2, "Area ∝ r² → (2r)² = 4r² (4 times).", "Circles"],
    ["Mathematics", "MCQ", "Area of a square park whose perimeter is 320 m is:", ["640 m²", "3200 m²", "6400 m²", "1280 m²"], 2, "Side = 320/4 = 80 m; Area = 80 × 80 = 6400 m².", "Perimeter & Area"],
    ["Mathematics", "MCQ", "If circumference of a circle is 132 cm, find its diameter (π = 22/7):", ["21 cm", "42 cm", "44 cm", "66 cm"], 1, "πd = 132 → d = 132 × 7 / 22 = 42 cm.", "Circles"],
    ["Mathematics", "MCQ", "A square garden has side 9 m. Find the cost of fencing it at ₹15 per metre:", ["₹405", "₹540", "₹270", "₹135"], 1, "Perimeter = 4 × 9 = 36 m; Cost = 36 × 15 = ₹540.", "Perimeter & Area"],
    ["Mathematics", "MCQ", "Area of a right triangle with sides 5 cm, 12 cm, 13 cm is:", ["30 cm²", "60 cm²", "65 cm²", "32.5 cm²"], 0, "Legs are 5 and 12 → Area = ½ × 5 × 12 = 30 cm².", "Perimeter & Area"]
  );

  // H. Algebraic Expressions (10)
  qs.push(
    ["Mathematics", "MCQ", "What is the coefficient of x² in 5x³ − 7x²y + 4x − 9?", ["−7", "−7y", "7y", "5"], 1, "Excluding x², the remaining factor in −7x²y is −7y.", "Algebra"],
    ["Mathematics", "MCQ", "Add: (3x − 5y + 2) and (7x + 2y − 9)", ["10x − 3y − 7", "10x + 7y − 7", "10x − 7y − 7", "4x − 3y − 7"], 0, "(3+7)x + (−5+2)y + (2−9) = 10x − 3y − 7.", "Algebra"],
    ["Mathematics", "MCQ", "Subtract (2a − 3b) from (5a + b):", ["3a + 4b", "3a − 2b", "−3a − 4b", "7a − 2b"], 0, "(5a + b) − (2a − 3b) = 5a + b − 2a + 3b = 3a + 4b.", "Algebra"],
    ["Mathematics", "MCQ", "Find the value of 3x² − 2x + 5 when x = −2:", ["13", "21", "17", "9"], 1, "3(4) − 2(−2) + 5 = 12 + 4 + 5 = 21.", "Algebra"],
    ["Mathematics", "MCQ", "Which pair are LIKE terms?", ["7xy and 7x²y", "4pq² and −9q²p", "3a and 3b", "5x² and 5x"], 1, "4pq² and −9q²p have identical literal factors pq².", "Algebra"],
    ["Mathematics", "MCQ", "What is an algebraic expression with exactly THREE unlike terms called?", ["Monomial", "Binomial", "Trinomial", "Constant"], 2, "3 unlike terms = Trinomial.", "Algebra"],
    ["Mathematics", "MCQ", "If x = 2 and y = −3, find the value of x³ + y²:", ["−1", "17", "1", "19"], 1, "2³ + (−3)² = 8 + 9 = 17.", "Algebra"],
    ["Mathematics", "MCQ", "Simplify: 4(2x − 1) + 3x + 11", ["11x + 7", "11x + 10", "5x + 7", "11x − 7"], 0, "8x − 4 + 3x + 11 = 11x + 7.", "Algebra"],
    ["Mathematics", "MCQ", "What should be added to x² + xy + y² to obtain 2x² + 3xy?", ["x² + 2xy − y²", "x² + 2xy + y²", "3x² + 4xy + y²", "x² − 2xy − y²"], 0, "(2x² + 3xy) − (x² + xy + y²) = x² + 2xy − y².", "Algebra"],
    ["Mathematics", "MCQ", "General rule for number of matchsticks required to make n squares in a connected row (4, 7, 10, ...):", ["4n", "3n + 1", "3n − 1", "2n + 2"], 1, "For n=1: 4, n=2: 7, n=3: 10 → 3n + 1.", "Patterns"]
  );

  // I. Exponents, Data Handling & Symmetry (10)
  qs.push(
    ["Mathematics", "MCQ", "Simplify using laws of exponents: 2³ × 2⁵ ÷ 2⁴", ["2²", "2⁴", "2⁸", "2¹²"], 1, "2^(3+5−4) = 2⁴ = 16.", "Exponents"],
    ["Mathematics", "MCQ", "Find the value of (3⁰ + 4⁰) × 5⁰:", ["0", "2", "12", "1"], 1, "(1 + 1) × 1 = 2.", "Exponents"],
    ["Mathematics", "MCQ", "Express 3,45,00,000 in standard (scientific) form:", ["3.45 × 10⁶", "3.45 × 10⁷", "34.5 × 10⁶", "3.45 × 10⁸"], 1, "3.45 × 10⁷.", "Standard Form"],
    ["Mathematics", "MCQ", "Express 72 × 108 as a product of prime powers:", ["2⁵ × 3⁵", "2⁴ × 3⁵", "2⁵ × 3⁴", "2³ × 3⁶"], 0, "72 = 2³×3², 108 = 2²×3³ → product = 2⁵ × 3⁵.", "Exponents"],
    ["Mathematics", "MCQ", "Find the MEDIAN of the data: 17, 25, 19, 32, 14, 21, 28", ["19", "21", "25", "28"], 1, "Sorted: 14, 17, 19, 21, 25, 28, 32. Middle (4th) value = 21.", "Data Handling"],
    ["Mathematics", "MCQ", "Find the MODE of: 4, 7, 4, 9, 7, 4, 8, 5, 4", ["7", "4", "5", "9"], 1, "4 occurs most frequently (4 times).", "Data Handling"],
    ["Mathematics", "MCQ", "Find the RANGE of marks: 42, 68, 91, 35, 77, 54", ["46", "56", "66", "49"], 1, "Range = Highest − Lowest = 91 − 35 = 56.", "Data Handling"],
    ["Mathematics", "MCQ", "A die is thrown once. What is the probability of getting an EVEN prime number?", ["1/6", "1/3", "1/2", "2/3"], 0, "Only 2 is an even prime on a die (1..6), so P = 1/6.", "Probability"],
    ["Mathematics", "MCQ", "What is the order of rotational symmetry of a Square?", ["2", "3", "4", "Infinite"], 2, "A square matches itself 4 times during a 360° turn (every 90°).", "Symmetry"],
    ["Mathematics", "MCQ", "How many lines of symmetry does an Equilateral Triangle have?", ["1", "2", "3", "6"], 2, "An equilateral triangle has 3 lines of symmetry.", "Symmetry"]
  );

  void shuffleFourOptions;
  return qs;
}

// 3. SCIENCE (101)
const c7SciAcidsBases = buildFactBankTuples({
  subject: "Science",
  topicTag: "Acids & Bases",
  seedPrefix: "c7_sci_acid",
  explanationPrefix: "Correct source/acid:",
  items: [
    { prompt: "Which acid is present in Vinegar?", answer: "Acetic acid" },
    { prompt: "Which acid is injected by an Ant's sting?", answer: "Formic acid" },
    { prompt: "Which acid is found in Citrus fruits (Oranges/Lemons)?", answer: "Citric acid" },
    { prompt: "Which acid is present in Spinach (पालक)?", answer: "Oxalic acid" },
    { prompt: "Which acid is found in Tamarind (इमली) and unripe grapes?", answer: "Tartaric acid" },
    { prompt: "Which Vitamin (acid) is abundant in Amla?", answer: "Ascorbic acid (Vitamin C)" },
    { prompt: "Which base is commonly found in Lime Water?", answer: "Calcium hydroxide" },
    { prompt: "Which mild base is used in Milk of Magnesia (antacid)?", answer: "Magnesium hydroxide" },
    { prompt: "Which base is present in Window Cleaner?", answer: "Ammonium hydroxide" },
    { prompt: "Which base is commonly used in making Soaps?", answer: "Sodium hydroxide" },
  ],
});

const c7SciCore: QTuple[] = [
  // Nutrition in Plants & Animals (16)
  ["Science", "MCQ", "Organisms that prepare their own food from CO₂ and water using sunlight are called:", ["Heterotrophs", "Autotrophs", "Saprotrophs", "Parasites"], 1, "Green plants are autotrophs via photosynthesis.", "Nutrition in Plants"],
  ["Science", "MCQ", "Tiny pores on the underside of leaves surrounded by guard cells are:", ["Stomata", "Xylem", "Chloroplasts", "Lenticels"], 0, "Stomata control gas exchange and transpiration.", "Nutrition in Plants"],
  ["Science", "MCQ", "Which bacteria live in roots of leguminous plants (peas, grams) to fix atmospheric nitrogen?", ["Lactobacillus", "Rhizobium", "E. coli", "Streptococcus"], 1, "Rhizobium converts N₂ gas into soluble nitrates for the plant.", "Symbiosis"],
  ["Science", "MCQ", "Mushrooms grow on dead and decaying organic matter. Their mode of nutrition is:", ["Autotrophic", "Parasitic", "Saprotrophic", "Holozoic"], 2, "Fungi like mushrooms absorb nutrients from decaying matter (saprotrophic).", "Nutrition in Plants"],
  ["Science", "MCQ", "Pitcher plant traps insects mainly to fulfil its requirement of:", ["Carbohydrates", "Nitrogen", "Water", "Oxygen"], 1, "Insectivorous plants grow in nitrogen-deficient soils.", "Nutrition in Plants"],
  ["Science", "MCQ", "Lichens represent a symbiotic association between an alga and a:", ["Bacteria", "Virus", "Fungus", "Protozoan"], 2, "Alga provides food (photosynthesis); fungus gives shelter, water & minerals.", "Symbiosis"],
  ["Science", "MCQ", "Which reagent tests for the presence of Starch in leaves (turns blue-black)?", ["Benedict's solution", "Iodine solution", "Lime water", "Copper sulphate"], 1, "Iodine turns blue-black in the presence of starch.", "Nutrition in Plants"],
  ["Science", "MCQ", "Digestion of carbohydrates (starch) in humans begins in the:", ["Stomach", "Buccal cavity (Mouth)", "Small intestine", "Large intestine"], 1, "Salivary amylase in mouth breaks starch into sugars.", "Human Digestion"],
  ["Science", "MCQ", "Which is the largest gland in the human body that secretes Bile juice?", ["Pancreas", "Liver", "Salivary gland", "Thyroid"], 1, "Liver secretes bile (stored in gall bladder) to digest fats.", "Human Digestion"],
  ["Science", "MCQ", "Finger-like projections in the small intestine that increase surface area for absorption are:", ["Cilia", "Villi", "Pseudopodia", "Alveoli"], 1, "Villi absorb digested nutrients into blood vessels.", "Human Digestion"],
  ["Science", "MCQ", "Amoeba captures food particles using temporary finger-like extensions called:", ["Flagella", "Villi", "Pseudopodia (false feet)", "Tentacles"], 2, "Amoeba engulfs food with pseudopodia inside a food vacuole.", "Nutrition in Animals"],
  ["Science", "MCQ", "Which acid in the human stomach kills harmful bacteria and activates pepsin?", ["Nitric acid", "Hydrochloric acid (HCl)", "Sulphuric acid", "Acetic acid"], 1, "Stomach lining secretes HCl.", "Human Digestion"],
  ["Science", "MCQ", "Grass-eating animals like cows quickly swallow food into a stomach chamber called:", ["Abomasum", "Rumen", "Oesophagus", "Caecum"], 1, "Ruminants store partially digested cud in the Rumen.", "Ruminants"],
  ["Science", "MCQ", "Ruminants can digest cellulose of grass with the help of special bacteria present in:", ["Stomach", "Caecum", "Liver", "Pancreas"], 1, "Cellulose-digesting bacteria reside in the sac-like Caecum.", "Ruminants"],
  ["Science", "MCQ", "Which part of the digestive tract absorbs excess water and salts from undigested food?", ["Small intestine", "Large intestine", "Oesophagus", "Liver"], 1, "Large intestine absorbs water before egestion.", "Human Digestion"],
  ["Science", "MCQ", "How many permanent teeth does an adult human normally have?", ["20", "28", "32", "36"], 2, "32 permanent teeth (4 types: incisors, canines, premolars, molars).", "Teeth"],
  // Heat & Physical/Chemical Changes (16)
  ["Science", "MCQ", "What is the normal temperature of a healthy human body on the Celsius scale?", ["35°C", "37°C", "98.6°C", "40°C"], 1, "37°C (or 98.6°F).", "Heat"],
  ["Science", "MCQ", "Which range of temperature is shown on a Clinical Thermometer?", ["0°C to 100°C", "35°C to 42°C", "−10°C to 110°C", "20°C to 50°C"], 1, "Clinical thermometers measure 35°C to 42°C.", "Thermometers"],
  ["Science", "MCQ", "Why does a clinical thermometer have a 'kink' (constriction) near the bulb?", ["To look shiny", "To prevent mercury level from falling on its own", "To heat faster", "To measure boiling water"], 1, "The kink holds the reading steady after removing from the mouth.", "Heat"],
  ["Science", "MCQ", "In solids, heat is transferred mainly by which mode?", ["Convection", "Conduction", "Radiation", "Evaporation"], 1, "Particles vibrate and pass heat energy to neighbours via Conduction.", "Heat Transfer"],
  ["Science", "MCQ", "Sea breeze blows during the daytime from:", ["Land to Sea", "Sea to Land", "North to South", "Mountains to Plains"], 1, "Land heats faster than water; warm air rises over land and cool sea air moves inward.", "Convection"],
  ["Science", "MCQ", "Dark-coloured clothes are preferred in winter because dark surfaces:", ["Reflect all heat", "Absorb more radiant heat", "Produce electricity", "Are heavier"], 1, "Dark colours absorb more heat radiation than light colours.", "Radiation"],
  ["Science", "MCQ", "Which metal is liquid at room temperature and used in thermometers?", ["Lead", "Mercury", "Zinc", "Aluminium"], 1, "Mercury is a liquid metal that expands uniformly with heat.", "Heat"],
  ["Science", "MCQ", "The process of coating a thin layer of Zinc over iron to prevent rusting is called:", ["Crystallisation", "Galvanisation", "Electrolysis", "Sublimation"], 1, "Galvanisation coats iron with zinc to stop moisture & oxygen contact.", "Chemical Changes"],
  ["Science", "MCQ", "When baking soda is mixed with vinegar, which gas bubbles out with a hissing sound?", ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"], 2, "Vinegar + Baking soda releases CO₂ gas, which turns lime water milky.", "Chemical Changes"],
  ["Science", "MCQ", "Which substance turns Lime Water [Ca(OH)₂] milky due to formation of Calcium Carbonate?", ["Oxygen", "Carbon dioxide", "Hydrogen", "Ammonia"], 1, "Ca(OH)₂ + CO₂ → CaCO₃ (white precipitate) + H₂O.", "Chemical Changes"],
  ["Science", "MCQ", "Obtaining large pure crystals of copper sulphate from a hot saturated solution is called:", ["Distillation", "Crystallisation", "Neutralisation", "Fermentation"], 1, "Crystallisation is a physical change producing pure crystals.", "Physical Changes"],
  ["Science", "MCQ", "An acid reacts with a base to form salt and water with evolution of heat. This reaction is:", ["Combustion", "Neutralisation", "Oxidation", "Reduction"], 1, "Acid + Base → Salt + Water + Heat (Neutralisation).", "Neutralisation"],
  ["Science", "MCQ", "Farmers add slaked lime (calcium hydroxide) to soil when the soil becomes too:", ["Basic", "Acidic", "Dry", "Sandy"], 1, "Basic slaked lime neutralises excess soil acidity.", "Acids & Bases"],
  ["Science", "MCQ", "Phenolphthalein indicator turns which colour in a BASIC solution?", ["Colourless", "Bright Pink", "Yellow", "Blue"], 1, "Phenolphthalein stays colourless in acids/neutral, turns pink in bases.", "Indicators"],
  ["Science", "MCQ", "Turmeric stain on a white shirt turns RED when washed with soap because soap is:", ["Acidic", "Basic", "Neutral", "Salty"], 1, "Turmeric is a natural indicator that turns reddish-brown in basic solutions.", "Indicators"],
  ["Science", "MCQ", "Burning of a magnesium ribbon in air produces white ash of:", ["Magnesium chloride", "Magnesium oxide", "Magnesium nitrate", "Carbon"], 1, "2Mg + O₂ → 2MgO (which dissolves in water to form basic Mg(OH)₂).", "Chemical Changes"],
  // Respiration, Circulation & Plant Reproduction (24)
  ["Science", "MCQ", "During heavy exercise, cramps occur in leg muscles due to accumulation of:", ["Alcohol", "Lactic acid", "Citric acid", "Hydrochloric acid"], 1, "Anaerobic respiration in muscle cells produces lactic acid.", "Respiration"],
  ["Science", "MCQ", "Yeast respires anaerobically to produce carbon dioxide and:", ["Lactic acid", "Ethanol (Alcohol)", "Glucose", "Oxygen"], 1, "Anaerobic fermentation in yeast produces alcohol + CO₂.", "Respiration"],
  ["Science", "MCQ", "Which insect breathes through tiny side openings called Spiracles and air tubes (Tracheae)?", ["Earthworm", "Cockroach", "Frog", "Fish"], 1, "Insects like cockroaches exchange gases via spiracles & tracheae.", "Respiration"],
  ["Science", "MCQ", "Earthworms breathe primarily through their:", ["Lungs", "Gills", "Moist skin", "Spiracles"], 2, "Gases diffuse easily across an earthworm's moist, slimy skin.", "Respiration"],
  ["Science", "MCQ", "Which muscular sheet below the chest cavity moves DOWN during inhalation?", ["Trachea", "Diaphragm", "Alveolus", "Bronchus"], 1, "Diaphragm flattens/moves down and ribs move up & outward during inhalation.", "Breathing"],
  ["Science", "MCQ", "Which blood component carries oxygen from lungs to all body cells?", ["Platelets", "White Blood Cells", "Red Blood Cells (Haemoglobin)", "Plasma only"], 2, "Haemoglobin in RBCs binds oxygen to form oxyhaemoglobin.", "Circulation"],
  ["Science", "MCQ", "Which blood cells help fight germs and infections entering our body?", ["Red Blood Cells", "White Blood Cells (WBCs)", "Platelets", "Plasma"], 1, "WBCs act as the immune system's soldiers.", "Circulation"],
  ["Science", "MCQ", "Which component of blood helps in CLOTTING at the site of a wound?", ["RBCs", "WBCs", "Platelets", "Urea"], 2, "Platelets form a clot to stop bleeding.", "Circulation"],
  ["Science", "MCQ", "Which instrument do doctors use to amplify and listen to heartbeats?", ["Thermometer", "Stethoscope", "Sphygmomanometer", "Barometer"], 1, "A stethoscope amplifies heart sounds.", "Circulation"],
  ["Science", "MCQ", "The main excretory product in human urine is:", ["Ammonia", "Urea", "Uric acid", "Glucose"], 1, "Kidneys filter Urea from blood to form urine.", "Excretion"],
  ["Science", "MCQ", "How many chambers does a human heart have?", ["2", "3", "4", "6"], 2, "Two upper atria and two lower ventricles (4 chambers).", "Circulation"],
  ["Science", "MCQ", "Which blood vessels have thick, elastic walls because blood flows under high pressure?", ["Veins", "Arteries", "Capillaries", "Lymph vessels"], 1, "Arteries carry blood pumped out directly from the heart under high pressure.", "Circulation"],
  ["Science", "MCQ", "Which plant tissue transports prepared food from leaves to all parts?", ["Xylem", "Phloem", "Stomata", "Cambium"], 1, "Phloem conducts food (sugars); Xylem conducts water.", "Plant Transport"],
  ["Science", "MCQ", "Evaporation of water from plant leaves through stomata creates suction pull and is called:", ["Photosynthesis", "Transpiration", "Respiration", "Germination"], 1, "Transpiration cools plants and pulls water upward.", "Plant Transport"],
  ["Science", "MCQ", "Yeast reproduces asexually by forming a small outgrowth called:", ["Spore formation", "Budding", "Fragmentation", "Binary fission"], 1, "Yeast forms buds that detach to grow into new yeast cells.", "Reproduction"],
  ["Science", "MCQ", "Spirogyra (green algae in ponds) multiplies rapidly by:", ["Budding", "Fragmentation", "Grafting", "Pollination"], 1, "Filaments break into fragments, each growing into a new alga.", "Reproduction"],
  ["Science", "MCQ", "Potato and Ginger reproduce vegetatively from underground:", ["Roots", "Stems (tubers/rhizomes)", "Leaves", "Flowers"], 1, "Potato has 'eyes' (buds) on its modified underground stem.", "Reproduction"],
  ["Science", "MCQ", "Which plant propagates vegetatively through buds along the margins of its LEAVES?", ["Rose", "Bryophyllum", "Potato", "Onion"], 1, "Bryophyllum leaves produce plantlets along leaf notches.", "Reproduction"],
  ["Science", "MCQ", "The male reproductive part of a flower is the:", ["Pistil", "Stamen", "Sepal", "Ovary"], 1, "Stamen consists of Anther (pollen) and Filament.", "Flowers"],
  ["Science", "MCQ", "After fertilisation, the ovary of a flower develops into the:", ["Seed", "Fruit", "Petal", "Pollen"], 1, "Ovary grows into Fruit; Ovules become Seeds.", "Flowers"],
  ["Science", "MCQ", "Transfer of pollen grains from anther to stigma of a flower is:", ["Fertilisation", "Pollination", "Germination", "Dispersal"], 1, "Pollination precedes fertilisation.", "Flowers"],
  ["Science", "MCQ", "Seeds of Coconut and Lotus are mainly dispersed by:", ["Wind", "Water", "Bursting", "Bats"], 1, "Fibrous/spongy coats help coconut and lotus float on water.", "Seed Dispersal"],
  ["Science", "MCQ", "Seeds of Drumstick and Maple have wing-like structures for dispersal by:", ["Water", "Wind", "Animals", "Insects"], 1, "Winged seeds glide in the wind.", "Seed Dispersal"],
  ["Science", "MCQ", "Which is a BISEXUAL (complete) flower having both stamens and pistil?", ["Papaya", "Watermelon", "Mustard / Rose", "Corn"], 2, "Mustard, Rose, and Hibiscus have both male and female parts.", "Flowers"],
  // Motion, Electricity, Light, Winds & Forests (35)
  ["Science", "MCQ", "What is the SI (basic) unit of speed?", ["km/h", "m/s", "cm/s", "m/min"], 1, "Basic SI unit of distance is metre and time is second → m/s.", "Motion & Time"],
  ["Science", "MCQ", "Which device on a car dashboard measures the TOTAL distance travelled by the vehicle?", ["Speedometer", "Odometer", "Anemometer", "Thermometer"], 1, "Odometer records distance; Speedometer displays instantaneous speed.", "Motion & Time"],
  ["Science", "MCQ", "A simple pendulum completes 40 oscillations in 80 seconds. What is its Time Period?", ["0.5 s", "2 s", "4 s", "40 s"], 1, "Time Period = Total Time / Oscillations = 80 / 40 = 2 seconds.", "Motion & Time"],
  ["Science", "MCQ", "A car travels at 54 km/h. What is its speed in m/s?", ["10 m/s", "15 m/s", "18 m/s", "20 m/s"], 1, "54 × (5/18) = 15 m/s.", "Motion & Time"],
  ["Science", "MCQ", "What shape is the distance-time graph for an object moving with CONSTANT (uniform) speed?", ["Curved parabola", "Straight inclined line", "Zig-zag line", "Vertical line"], 1, "Equal distances in equal intervals give a straight slanted line.", "Motion & Time"],
  ["Science", "MCQ", "Who discovered that the time period of a pendulum of given length is constant?", ["Isaac Newton", "Galileo Galilei", "Albert Einstein", "Thomas Edison"], 1, "Galileo Galilei discovered isochronism of a pendulum.", "Motion & Time"],
  ["Science", "MCQ", "In an electric circuit symbol for a cell, the LONGER vertical line represents the:", ["Negative terminal", "Positive terminal", "Switch", "Resistance"], 1, "Long thin line = Positive (+); thick short line = Negative (−).", "Electricity"],
  ["Science", "MCQ", "The heating coil inside an electric room heater or iron is usually made of:", ["Copper", "Nichrome", "Aluminium", "Silver"], 1, "Nichrome alloy has high resistance and does not oxidise easily at high heat.", "Electricity"],
  ["Science", "MCQ", "An Electric Fuse works on which effect of electric current?", ["Magnetic effect", "Heating effect", "Chemical effect", "Cooling effect"], 1, "Excess current heats and melts the low-melting-point fuse wire, breaking the circuit.", "Electricity"],
  ["Science", "MCQ", "Today, which automatic safety switch is widely used in homes instead of fuse wires?", ["LED", "MCB (Miniature Circuit Breaker)", "Rheostat", "Galvanometer"], 1, "MCBs trip/switch off automatically when current exceeds safe limits.", "Electricity"],
  ["Science", "MCQ", "Who discovered the Magnetic Effect of Electric Current (deflection of compass needle near a wire)?", ["Michael Faraday", "Hans Christian Oersted", "James Watt", "Ohm"], 1, "Oersted observed in 1820 that a current-carrying wire deflects a magnetic needle.", "Electricity"],
  ["Science", "MCQ", "An electric bell operates using an:", ["Electromagnet", "Electric heater", "Convex lens", "Fuse"], 0, "Electromagnet attracts an iron armature repeatedly to strike the gong.", "Electricity"],
  ["Science", "MCQ", "Which mark on electric appliances in India assures quality and safety?", ["AGMARK", "ISI Mark", "FPO", "Hallmark"], 1, "Bureau of Indian Standards (BIS) ISI mark certifies electrical safety.", "Electricity"],
  ["Science", "MCQ", "Which type of image CANNOT be obtained on a screen?", ["Real image", "Virtual image", "Inverted image", "Magnified real image"], 1, "Virtual images (like in plane mirrors) cannot be projected onto a screen.", "Light"],
  ["Science", "MCQ", "In a plane mirror, if you stand 3 m in front of the mirror, how far is your image from YOU?", ["1.5 m", "3 m", "6 m", "9 m"], 2, "Distance between object & mirror = 3 m, image behind mirror = 3 m → total 6 m.", "Light"],
  ["Science", "MCQ", "Which mirror do Dentists use to see an enlarged, erect image of teeth?", ["Plane mirror", "Convex mirror", "Concave mirror", "Cylindrical mirror"], 2, "Concave mirror held close produces a virtual, erect, magnified image.", "Light"],
  ["Science", "MCQ", "Which lens is THICKER in the middle and converges parallel light rays to a focus?", ["Concave lens", "Convex lens", "Plane glass", "Prism only"], 1, "Convex (converging) lens is thicker in the centre and used as a magnifying glass.", "Light"],
  ["Science", "MCQ", "Which lens ALWAYS forms a virtual, erect, and diminished (smaller) image?", ["Convex lens", "Concave lens", "Spherical mirror", "Glass slab"], 1, "A Concave (diverging) lens always forms a smaller, erect, virtual image.", "Light"],
  ["Science", "MCQ", "Splitting of white sunlight into 7 colours (VIBGYOR) through a glass prism is called:", ["Reflection", "Dispersion", "Refraction only", "Absorption"], 1, "Dispersion separates white light into its 7 constituent colours.", "Light"],
  ["Science", "MCQ", "A Newton's Disc painted with 7 rainbow colours appears ___ when spun rapidly.", ["Black", "White", "Brown", "Green"], 1, "Persistence of vision blends the 7 colours into White.", "Light"],
  ["Science", "MCQ", "Which instrument measures WIND SPEED?", ["Barometer", "Anemometer", "Hygrometer", "Rain gauge"], 1, "Anemometer measures wind speed.", "Winds & Storms"],
  ["Science", "MCQ", "High-speed winds accompanied by reduced air pressure: air always moves from:", ["Low pressure to High pressure", "High pressure to Low pressure", "Cold pole to Cold pole", "Vacuum to Space"], 1, "Air moves from high pressure areas to low pressure areas.", "Winds & Storms"],
  ["Science", "MCQ", "The calm, cloudless centre at the core of a tropical cyclone is called its:", ["Vertex", "Eye", "Funnel", "Core wall"], 1, "The 'Eye' of a cyclone is calm and 10–30 km wide.", "Cyclones"],
  ["Science", "MCQ", "In North America, a severe cyclonic storm is called a Hurricane; in Japan/Philippines it is called:", ["Tornado", "Typhoon", "Monsoon", "Willy-Willy"], 1, "Cyclones are called Typhoons in the Northwest Pacific (Japan/Philippines).", "Cyclones"],
  ["Science", "MCQ", "Which branch-like top layer of tall trees forms a roof over other plants in a forest?", ["Understorey", "Canopy", "Crown", "Humus"], 1, "The Canopy forms a green roof over the forest.", "Forests"],
  ["Science", "MCQ", "Dead plant and animal tissues converted into dark-coloured nutrient-rich soil matter by decomposers is:", ["Silt", "Humus", "Gravel", "Clay"], 1, "Microorganisms form dark organic Humus.", "Forests"],
  ["Science", "MCQ", "In a Wastewater Treatment Plant (WWTP), sludge is decomposed by anaerobic bacteria to produce:", ["Nitrogen gas", "Biogas (fuel)", "Oxygen", "Chlorine"], 1, "Biogas (methane) is produced and can generate electricity.", "Wastewater"],
  ["Science", "MCQ", "Which chemical is commonly added at the final stage of water treatment to disinfect water?", ["Iodine", "Chlorine / Ozone", "Vinegar", "Ammonia"], 1, "Chlorine or ozone kills harmful microbes.", "Wastewater"],
  ["Science", "MCQ", "Which tree helps absorb excess wastewater rapidly from the surroundings and release pure vapour?", ["Banyan", "Eucalyptus", "Cactus", "Pine"], 1, "Eucalyptus trees transpire large amounts of water.", "Wastewater"],
  ["Science", "TRUE_FALSE", "True or False: On heating, air expands and becomes lighter, so warm air rises up.", ["True", "False", "Warm air sinks", "Air never expands"], 0, "True! Expanding warm air has lower density and rises.", "Heat & Air"],
  ["Science", "TRUE_FALSE", "True or False: Concave mirrors are used as reflectors in car headlights and torches.", ["True", "False", "Plane mirror is used", "Convex mirror is used"], 0, "True! Placing the bulb at focus gives a strong parallel beam.", "Light"],
  ["Science", "TRUE_FALSE", "True or False: Veins carry oxygen-poor blood and have valves to prevent backflow.", ["True", "False", "Arteries have valves", "Veins have no blood"], 0, "True! One-way valves ensure blood flows only towards the heart.", "Circulation"],
  ["Science", "ODD_ONE_OUT", "Find the odd one out (Mode of Heat Transfer vs Light):", ["Conduction", "Convection", "Radiation", "Refraction"], 3, "Refraction is bending of light; first three are modes of heat transfer.", "Odd One Out"],
  ["Science", "ODD_ONE_OUT", "Find the odd one out (Natural vs Synthetic Indicators):", ["Litmus", "Turmeric", "China rose petals", "Phenolphthalein"], 3, "Phenolphthalein is a man-made (synthetic) indicator.", "Odd One Out"],
  ["Science", "ODD_ONE_OUT", "Find the odd one out (Digestive vs Respiratory Organ):", ["Oesophagus", "Stomach", "Small intestine", "Diaphragm"], 3, "Diaphragm belongs to the respiratory system.", "Odd One Out"],
];

// 4. SOCIAL SCIENCE (84)
const c7SstDynasties = buildFactBankTuples({
  subject: "Social Science",
  topicTag: "Medieval India",
  seedPrefix: "c7_sst_dyn",
  explanationPrefix: "Historical fact:",
  items: [
    { prompt: "Who founded the Mughal Empire in India after the First Battle of Panipat (1526)?", answer: "Babur" },
    { prompt: "Who built the Grand Trunk Road and introduced the silver 'Rupiya' coin?", answer: "Sher Shah Suri" },
    { prompt: "Who was the first and only woman ruler of the Delhi Sultanate?", answer: "Razia Sultan" },
    { prompt: "Which Delhi Sultan shifted his capital from Delhi to Daulatabad?", answer: "Muhammad bin Tughluq" },
    { prompt: "Who founded the Slave (Mamluk) Dynasty and began building Qutb Minar?", answer: "Qutb-ud-din Aibak" },
    { prompt: "Who was the famous Chola king who built the Brihadisvara Temple at Thanjavur?", answer: "Rajaraja Chola I" },
    { prompt: "Which Chola king led naval expeditions across the Bay of Bengal to Southeast Asia?", answer: "Rajendra Chola I" },
    { prompt: "Who wrote 'Akbarnama' and 'Ain-i-Akbari' in Akbar's court?", answer: "Abul Fazl" },
    { prompt: "Who was Akbar's brilliant Revenue Minister who designed the Zabti land system?", answer: "Raja Todar Mal" },
    { prompt: "Who was the great Maratha ruler crowned Chhatrapati at Raigad in 1674?", answer: "Shivaji Maharaj" },
    { prompt: "Who was the famous Vijayanagara Emperor who wrote 'Amuktamalyada'?", answer: "Krishnadevaraya" },
    { prompt: "Who wrote the 'Prithviraj Raso' / fought Muhammad Ghori at Tarain (1191–92)?", answer: "Prithviraj Chauhan" },
  ],
});

const c7SstCore: QTuple[] = [
  // History (24)
  ["Social Science", "MCQ", "In which year was the First Battle of Panipat fought between Babur and Ibrahim Lodi?", ["1526", "1556", "1761", "1191"], 0, "Babur defeated Ibrahim Lodi in 1526.", "Mughal History"],
  ["Social Science", "MCQ", "In which year was the Second Battle of Panipat fought (Akbar's forces vs Hemu)?", ["1526", "1556", "1576", "1605"], 1, "Fought in 1556.", "Mughal History"],
  ["Social Science", "MCQ", "The Battle of Haldighati (1576) was fought between Maharana Pratap and forces of:", ["Babur", "Akbar", "Jahangir", "Aurangzeb"], 1, "Akbar's army led by Raja Man Singh fought Maharana Pratap in 1576.", "Medieval History"],
  ["Social Science", "MCQ", "Which Mughal emperor is known as the 'Engineer King' who built Taj Mahal and Red Fort?", ["Akbar", "Jahangir", "Shah Jahan", "Aurangzeb"], 2, "Shah Jahan commissioned Taj Mahal, Red Fort, and Jama Masjid.", "Architecture"],
  ["Social Science", "MCQ", "What was a 'Mansab' in the Mughal administrative system?", ["A religious tax", "A rank/position determining salary & military responsibility", "A gold coin", "A fortress"], 1, "Mansabdari graded officers by rank (Zat) and cavalrymen (Sawar).", "Mughal Admin"],
  ["Social Science", "MCQ", "Who built the Adhai Din Ka Jhonpra and Qutb Minar completion was done by:", ["Iltutmish", "Balban", "Alauddin Khalji", "Firuz Shah"], 0, "Qutb-ud-din Aibak started Qutb Minar; Iltutmish completed it.", "Delhi Sultanate"],
  ["Social Science", "MCQ", "Which Moroccan traveller visited India during Muhammad bin Tughluq's reign and wrote 'Rihla'?", ["Marco Polo", "Ibn Battuta", "Al-Biruni", "Fa-Hien"], 1, "Ibn Battuta spent years in Delhi Sultanate service.", "Travellers"],
  ["Social Science", "MCQ", "Who wrote 'Kitab-ul-Hind' in Arabic studying Indian sciences and culture?", ["Al-Biruni", "Amir Khusrau", "Abul Fazl", "Kalhana"], 0, "Al-Biruni accompanied Mahmud of Ghazni and studied Sanskrit texts.", "Medieval Sources"],
  ["Social Science", "MCQ", "Which poet-musician was known as 'Tuti-e-Hind' (Parrot of India) in the Delhi Sultanate?", ["Tansen", "Amir Khusrau", "Kabir", "Surdas"], 1, "Amir Khusrau pioneered Hindavi poetry, sitar/tabla traditions, and qawwali.", "Culture"],
  ["Social Science", "MCQ", "Who was the famous musician among Akbar's Navratnas (Nine Jewels)?", ["Birbal", "Tansen", "Todar Mal", "Faizi"], 1, "Mian Tansen mastered Hindustani classical ragas.", "Culture"],
  ["Social Science", "MCQ", "What were 'Brahmadeya' grants during the Chola period?", ["Taxes on traders", "Land gifted to Brahmanas", "Palace guards", "Irrigation canals"], 1, "Chola inscriptions describe Brahmadeya (tax-free land grants).", "Cholas"],
  ["Social Science", "MCQ", "What was a 'Sabha' in Chola village administration (known from Uttaramerur inscriptions)?", ["An assembly of Brahmana landowners managing village committees", "A royal war council", "A marketplace", "A temple dance"], 0, "Uttaramerur inscriptions explain Sabhas elected by lottery (Kudavolai).", "Cholas"],
  ["Social Science", "MCQ", "Which Bhakti saint composed devotional dohas (couplets) teaching unity of God (Nirguna Bhakti)?", ["Kabir", "Tulsidas", "Mirabai", "Tukaram"], 0, "Sant Kabir preached harmony and rejected empty ritualism.", "Bhakti Movement"],
  ["Social Science", "MCQ", "Who founded Sikhism and started the community kitchen 'Langar'?", ["Guru Nanak Dev Ji", "Guru Gobind Singh Ji", "Guru Arjan Dev Ji", "Guru Tegh Bahadur Ji"], 0, "Guru Nanak Dev Ji (1469–1539) founded Sikhism.", "Bhakti Movement"],
  ["Social Science", "MCQ", "Who founded the Khalsa Panth in 1699 at Anandpur Sahib?", ["Guru Nanak", "Guru Angad", "Guru Gobind Singh", "Guru Ram Das"], 2, "The 10th Guru, Guru Gobind Singh Ji, founded the Khalsa in 1699.", "Sikh History"],
  ["Social Science", "MCQ", "Who was the 16th-century Rajput princess and Krishna devotee famous for her bhajans?", ["Mirabai", "Andal", "Lal Ded", "Akkamahadevi"], 0, "Mirabai composed soulful devotional bhajans to Lord Krishna.", "Bhakti Movement"],
  ["Social Science", "MCQ", "What were 'Hundis' used for by medieval Indian merchants?", ["Weighing spices", "Bills of exchange / promissory notes for safe money transfer", "Silk weaving", "Ship anchors"], 1, "Hundis let merchants deposit cash in one city and withdraw in another.", "Medieval Towns"],
  ["Social Science", "MCQ", "Which town in Gujarat was famous as the 'Gateway to Mecca' and a major Mughal port?", ["Hampi", "Surat", "Masulipatnam", "Thanjavur"], 1, "Surat on the Tapi river was a bustling international port.", "Medieval Towns"],
  ["Social Science", "MCQ", "Hampi, the ruined capital of the Vijayanagara Empire, stands on the banks of which river?", ["Kaveri", "Tungabhadra", "Godavari", "Narmada"], 1, "Hampi is located along the Tungabhadra river in Karnataka.", "Medieval Towns"],
  ["Social Science", "MCQ", "Which Assamese dynasty ruled the Brahmaputra valley for nearly 600 years?", ["Cholas", "Ahoms", "Gonds", "Marathas"], 1, "The Ahoms ruled Assam and defeated Mughal invasions (Lachit Borphukan).", "Tribes & Kingdoms"],
  ["Social Science", "MCQ", "Who wrote the epic 'Ramcharitmanas' in Awadhi language?", ["Valmiki", "Goswami Tulsidas", "Kalidasa", "Surdas"], 1, "Tulsidas composed Ramcharitmanas in Awadhi.", "Literature"],
  ["Social Science", "MCQ", "What was 'Chauth' collected by the Marathas?", ["One-half of crop", "25% (one-fourth) of land revenue claimed in neighbouring territories", "Temple donation", "Salt tax"], 1, "Chauth (25%) and Sardeshmukhi (10%) were Maratha levies.", "18th Century"],
  ["Social Science", "MCQ", "Who built the astronomical observatories known as Jantar Mantar in Delhi and Jaipur?", ["Sawai Jai Singh II", "Rana Sanga", "Tipu Sultan", "Ranjit Singh"], 0, "Maharaja Sawai Jai Singh II of Amber built 5 Jantar Mantars.", "18th Century"],
  ["Social Science", "MCQ", "Which architectural style uses two vertical columns supporting a horizontal beam?", ["Arcuate", "Trabeate (Corbelled)", "Gothic", "Baroque"], 1, "Trabeate style uses pillars and horizontal lintels; Arcuate uses true arches.", "Architecture"],
  // Geography (26)
  ["Social Science", "MCQ", "Which is the thinnest outermost solid layer of the Earth?", ["Mantle", "Crust", "Outer Core", "Inner Core"], 1, "Crust is ~35 km thick under continents and ~5 km under oceans.", "Inside Our Earth"],
  ["Social Science", "MCQ", "Oceanic crust is mainly composed of Silica and Magnesium, abbreviated as:", ["SiAl", "SiMa", "NiFe", "SiCa"], 1, "Continental crust = SiAl (Silica+Alumina); Oceanic crust = SiMa (Silica+Magnesium).", "Inside Our Earth"],
  ["Social Science", "MCQ", "Which type of rock is Sandstone (formed from compressed sand particles)?", ["Igneous", "Sedimentary", "Metamorphic", "Volcanic"], 1, "Layered sediments compacted over time form Sedimentary rocks, often containing fossils.", "Rocks"],
  ["Social Science", "MCQ", "Under intense heat and pressure, Limestone changes into which Metamorphic rock?", ["Slate", "Marble", "Basalt", "Granite"], 1, "Limestone → Marble; Clay → Slate.", "Rocks"],
  ["Social Science", "MCQ", "The point INSIDE the Earth's crust where an earthquake originates is called the:", ["Epicentre", "Focus (Hypocentre)", "Crater", "Fault line"], 1, "Origin underground = Focus; point directly above on surface = Epicentre.", "Our Changing Earth"],
  ["Social Science", "MCQ", "Which instrument measures the magnitude (intensity) of an earthquake?", ["Anemometer", "Seismograph (Richter scale)", "Barometer", "Hydrometer"], 1, "Seismographs record seismic waves; Richter scale measures magnitude.", "Earthquakes"],
  ["Social Science", "MCQ", "Which river landform is created when a winding river cuts off a loop to form a lake?", ["Delta", "Ox-bow lake", "Waterfall", "Moraine"], 1, "Cutoff river bends (meanders) form crescent-shaped Ox-bow lakes.", "Landforms"],
  ["Social Science", "MCQ", "Mushroom rocks and crescent-shaped Barchans (sand dunes) are landforms created by:", ["Glaciers", "Wind (in deserts)", "Sea waves", "Rivers"], 1, "Wind erosion shapes mushroom rocks and deposits sand dunes.", "Landforms"],
  ["Social Science", "MCQ", "What is the approximate percentage of Nitrogen and Oxygen in Earth's atmosphere?", ["50% N₂, 40% O₂", "78% N₂, 21% O₂", "60% N₂, 30% O₂", "85% N₂, 10% O₂"], 1, "78% Nitrogen, 21% Oxygen, ~0.93% Argon, 0.04% CO₂.", "Air"],
  ["Social Science", "MCQ", "In which atmospheric layer do almost all weather phenomena (clouds, rain, storms) occur?", ["Stratosphere", "Troposphere", "Mesosphere", "Thermosphere"], 1, "Troposphere (lowest layer, up to ~13 km) holds most air & water vapour.", "Atmosphere"],
  ["Social Science", "MCQ", "Which layer of atmosphere contains the protective Ozone layer and is ideal for flying jet planes?", ["Troposphere", "Stratosphere", "Mesosphere", "Exosphere"], 1, "Stratosphere is free of clouds/storms and houses the Ozone layer.", "Atmosphere"],
  ["Social Science", "MCQ", "Which layer of atmosphere burns up incoming meteors (shooting stars) from space?", ["Troposphere", "Stratosphere", "Mesosphere", "Exosphere"], 2, "Meteors burn up due to friction in the Mesosphere.", "Atmosphere"],
  ["Social Science", "MCQ", "Which atmospheric layer (Ionosphere part) reflects radio waves back to Earth?", ["Troposphere", "Thermosphere", "Stratosphere", "Lithosphere"], 1, "Thermosphere helps long-distance radio communication.", "Atmosphere"],
  ["Social Science", "MCQ", "What are Trade Winds, Westerlies, and Easterlies examples of?", ["Local winds", "Permanent (Planetary) winds", "Seasonal winds", "Monsoon breezes"], 1, "They blow constantly throughout the year in a particular direction.", "Winds"],
  ["Social Science", "MCQ", "What causes Ocean Tides (rhythmic rise and fall of sea level twice a day)?", ["Earthquakes", "Gravitational pull of the Moon and Sun", "Trade winds", "River flow"], 1, "Moon's strong gravity pulls ocean water into high and low tides.", "Water"],
  ["Social Science", "MCQ", "Which is the largest warm ocean current flowing along the east coast of North America?", ["Labrador Current", "Gulf Stream", "Humboldt Current", "Benguela Current"], 1, "The warm Gulf Stream warms Western Europe's climate.", "Ocean Currents"],
  ["Social Science", "MCQ", "Places where warm and cold ocean currents meet (e.g., near Japan) are famous for:", ["Severe droughts", "Rich fishing grounds (but dense fog)", "Volcanoes", "Deserts"], 1, "Plankton thrives where warm and cold currents mix, attracting fish.", "Ocean Currents"],
  ["Social Science", "MCQ", "What percentage of Earth's total water is freshwater (including ice caps & groundwater)?", ["About 50%", "About 25%", "About 2.7% (nearly 3%)", "About 71%"], 2, "Over 97% is salty ocean water; less than 3% is freshwater.", "Water"],
  ["Social Science", "MCQ", "The word 'Tsunami' comes from Japanese meaning:", ["Fire wave", "Harbour wave", "Cold wind", "Mountain quake"], 1, "Tsunami means 'harbour wave', triggered by underwater earthquakes/volcanoes.", "Water"],
  ["Social Science", "MCQ", "Which rainforests are called the 'Lungs of the Planet' due to massive oxygen production?", ["Congo Basin", "Amazon Rainforest (South America)", "Sundarbans", "Taiga"], 1, "Amazon Tropical Evergreen Forest produces vast oxygen and biodiversity.", "Human Environment"],
  ["Social Science", "MCQ", "Which is the largest river basin in the world (located in South America)?", ["Nile Basin", "Amazon Basin", "Ganga-Brahmaputra Basin", "Mississippi Basin"], 1, "Amazon River carries the largest volume of water and drains the biggest basin.", "Amazon Basin"],
  ["Social Science", "MCQ", "Which endangered freshwater dolphin lives in the Ganga and Brahmaputra rivers?", ["Blue whale", "Susu (Blind River Dolphin)", "Shark", "Piranha"], 1, "Susu (Gangetic Dolphin) is India's National Aquatic Animal.", "Ganga-Brahmaputra"],
  ["Social Science", "MCQ", "Velds (South Africa) and Prairies (North America) are types of:", ["Tropical deserts", "Temperate grasslands", "Tundra glaciers", "Mangrove swamps"], 1, "Prairies (USA/Canada) and Velds (South Africa) are temperate grasslands.", "Grasslands"],
  ["Social Science", "MCQ", "What is 'Chinook' in the Prairies of North America?", ["A cold glacier", "A warm local wind that melts snow rapidly", "A desert cactus", "A mountain goat"], 1, "Chinook ('snow-eater') blows down the Rockies warming winter air.", "Grasslands"],
  ["Social Science", "MCQ", "Which cold desert in India is known as 'Khapa-chan' (Land of Snow)?", ["Thar", "Ladakh", "Kutch", "Spiti"], 1, "Ladakh is a high-altitude cold desert in the Himalayas.", "Deserts"],
  ["Social Science", "MCQ", "Sahara (world's largest hot desert) is located in which continent?", ["Asia", "Australia", "Africa", "South America"], 2, "Sahara spans 11 countries across Northern Africa.", "Deserts"],
  // Civics (22)
  ["Social Science", "MCQ", "What does 'Universal Adult Franchise' guarantee in a democracy?", ["Free cars for all", "Every adult citizen (18+) has one vote of equal value", "Voting only for taxpayers", "Free college seats"], 1, "Political equality: every citizen aged 18+ gets 1 equal vote regardless of wealth/caste/gender.", "Equality"],
  ["Social Science", "MCQ", "Which Article of the Indian Constitution abolishes Untouchability in any form?", ["Article 14", "Article 17", "Article 21", "Article 32"], 1, "Article 17 makes practicing untouchability a punishable offence.", "Equality"],
  ["Social Science", "MCQ", "Whose 1955 refusal to give up her bus seat sparked the US Civil Rights Movement?", ["Rosa Parks", "Nelson Mandela", "Martin Luther King Jr.", "Abraham Lincoln"], 0, "Rosa Parks refused on 1 December 1955 in Montgomery, Alabama.", "Struggles for Equality"],
  ["Social Science", "MCQ", "What does 'MLA' stand for in Indian State Government?", ["Member of Local Authority", "Member of Legislative Assembly", "Minister of Law Affairs", "Mayor of Legislative Area"], 1, "MLAs are elected by voters of each constituency to the Vidhan Sabha.", "State Government"],
  ["Social Science", "MCQ", "Who becomes the Chief Minister of an Indian state?", ["Appointed directly by Army", "Leader of the majority party/coalition in the Legislative Assembly", "Oldest citizen of state", "Chief Justice of High Court"], 1, "The Governor appoints the leader enjoying majority support in the Vidhan Sabha.", "State Government"],
  ["Social Science", "MCQ", "In a State Legislature, what is a 'Constituency'?", ["A tax department", "A specific geographical area from which voters elect one representative", "A High Court bench", "A budget speech"], 1, "Each state is divided into assembly constituencies.", "State Government"],
  ["Social Science", "MCQ", "Who represents the ruling party inside the Assembly and answers questions on behalf of a department?", ["Cabinet/State Minister", "District Collector", "Opposition Leader", "Sarpanch"], 0, "Ministers lead government departments and answer MLA questions.", "State Government"],
  ["Social Science", "MCQ", "Which country famously abolished its military in 1948 to spend more on public health and education?", ["Costa Rica", "Brazil", "Japan", "Australia"], 0, "Costa Rica invested heavily in healthcare, clean water, and schools instead of an army.", "Role of Government"],
  ["Social Science", "MCQ", "What does 'OPD' stand for in hospitals and healthcare centres?", ["Open Public Door", "Out Patient Department", "Only Private Doctor", "Operation Duty"], 1, "OPD is where patients consult doctors without overnight admission.", "Healthcare"],
  ["Social Science", "MCQ", "What is the 'Double Burden of Women's Work'?", ["Working only on Sundays", "Handling both outside paid jobs and unpaid domestic/care work", "Having two offices", "Getting double salary"], 1, "Many women perform both full-time jobs and household chores.", "Gender & Work"],
  ["Social Science", "MCQ", "Who wrote the autobiography 'Amar Jiban' (1876), the first known autobiography by an Indian woman?", ["Pandita Ramabai", "Rashsundari Devi", "Rokeya Sakhawat Hossain", "Savitribai Phule"], 1, "Rashsundari Devi taught herself to read in secret and wrote Amar Jiban in Bengali.", "Women Change the World"],
  ["Social Science", "MCQ", "Who wrote the famous sci-fi short story 'Sultana's Dream' in 1905?", ["Sarojini Naidu", "Rokeya Sakhawat Hossain", "Mahadevi Verma", "Annie Besant"], 1, "Rokeya imagined a feminist utopia called Ladyland where women led science.", "Women Change the World"],
  ["Social Science", "MCQ", "Who founded a Mission in Kedgaon near Pune to help widows and poor women become self-reliant?", ["Pandita Ramabai", "Mirabai", "Laxmibai", "Indira Gandhi"], 0, "Pandita Ramabai championed women's education and Mukti Mission.", "Women Change the World"],
  ["Social Science", "MCQ", "When is International Women's Day celebrated globally?", ["8 March", "1 May", "14 November", "24 January"], 0, "8 March is International Women's Day.", "Civics"],
  ["Social Science", "MCQ", "What is 'Censorship' in relation to media?", ["Giving free ads", "Government power to block or forbid publication of certain news/films", "Printing newspapers", "Live sports broadcast"], 1, "Censorship restricts content from being published or broadcast.", "Understanding Media"],
  ["Social Science", "MCQ", "What does a 'Balanced Media Report' mean?", ["Showing only advertisements", "Discussing all points of view so readers can form their own opinion", "Supporting only one side", "Printing rumours"], 1, "Independent, fair journalism presents facts and multiple perspectives.", "Understanding Media"],
  ["Social Science", "MCQ", "Where do shopkeepers usually buy goods in bulk at lower prices before selling to consumers?", ["Weekly Haat retail stall", "Wholesale Market (Mandi)", "Shopping Mall", "Online ad"], 1, "Wholesalers sell large quantities to retailers.", "Markets Around Us"],
  ["Social Science", "MCQ", "Who generally earns the highest profit margin in the 'Shirt in the Market' supply chain?", ["Cotton farmer", "Weaver", "Multinational garment brand/exporter", "Spinning mill worker"], 2, "Big foreign/branded retailers capture the largest share compared to farmers and weavers.", "Market Equity"],
  ["Social Science", "MCQ", "What is a 'Putting-Out System' in cloth weaving?", ["Selling shirts abroad", "Merchant supplies raw yarn to weavers at home and collects finished cloth", "Growing organic cotton", "Importing sewing machines"], 1, "Weavers work at home on merchant-supplied yarn for low piece-rates.", "Markets"],
  ["Social Science", "MCQ", "Which cooperative movement in Madhya Pradesh fought for displaced fishers' rights in the 1990s?", ["Amul Cooperative", "Tawa Matsya Sangh (TMS)", "Chipko Movement", "Narmada Bachao"], 1, "Tawa Matsya Sangh won fishing rights on the Tawa reservoir.", "Struggles for Equality"],
  ["Social Science", "TRUE_FALSE", "True or False: Sedimentary rocks often contain fossils of ancient plants and animals.", ["True", "False", "Only Igneous rocks do", "Fossils never exist in rocks"], 0, "True! Layers of sediment trap and preserve organism remains.", "Rocks"],
  ["Social Science", "ODD_ONE_OUT", "Find the odd one out (Igneous vs Sedimentary/Metamorphic):", ["Granite", "Basalt", "Obsidian", "Limestone"], 3, "Limestone is a sedimentary rock; first three are igneous rocks.", "Odd One Out"],
];

// 5. REASONING & GK (87)
const c7ReasCore: QTuple[] = [
  // Logical Reasoning (45)
  ["Reasoning & GK", "SERIES_PUZZLE", "Number Series: 5, 11, 23, 47, 95, ___", ["180", "191", "190", "195"], 1, "Rule: ×2 + 1 → 95 × 2 + 1 = 191.", "Number Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Number Series: 3, 8, 15, 24, 35, ___", ["45", "48", "49", "50"], 1, "n² − 1: 2²−1=3, 3²−1=8, 4²−1=15, 5²−1=24, 6²−1=35, 7²−1 = 48.", "Number Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Number Series: 2, 5, 10, 17, 26, 37, ___", ["48", "50", "52", "49"], 1, "n² + 1: 1²+1=2, 2²+1=5 ... 7²+1 = 50.", "Number Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Number Series: 1, 1, 2, 3, 5, 8, 13, ___", ["18", "20", "21", "24"], 2, "Fibonacci series (sum of previous two): 8 + 13 = 21.", "Number Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Number Series: 64, 32, 48, 24, 36, ___", ["18", "72", "20", "12"], 0, "Alternate ÷2, ×1.5: 36 ÷ 2 = 18.", "Number Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Number Series: 7, 14, 28, 56, 112, ___", ["220", "224", "168", "216"], 1, "Double every term: 112 × 2 = 224.", "Number Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Letter Series: J, F, M, A, M, J, J, ___", ["O", "S", "A", "N"], 2, "First letters of months (Jan..Jul) → next is August (A).", "Letter Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Letter Series: O, T, T, F, F, S, S, ___", ["N", "E", "T", "D"], 1, "First letters of One, Two, Three, Four, Five, Six, Seven → Eight (E).", "Letter Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Letter Series: ACE, GIK, MOQ, ___", ["SUW", "STV", "TVX", "RTV"], 0, "Each letter advances by +6: M+6=S, O+6=U, Q+6=W → SUW.", "Letter Series"],
  ["Reasoning & GK", "SERIES_PUZZLE", "Letter Series: Z26, X24, V22, T20, ___", ["R18", "S19", "Q17", "R17"], 0, "Letters decrease by 2 with alphabetical positions: R18.", "Alphanumeric Series"],
  ["Reasoning & GK", "MCQ", "Coding: If 'MANGO' is coded as 'NBOHP' (+1 each letter), how is 'GRAPE' coded?", ["HSBQF", "HSBQE", "HTBQF", "FSBQF"], 0, "G→H, R→S, A→B, P→Q, E→F → HSBQF.", "Coding-Decoding"],
  ["Reasoning & GK", "MCQ", "Coding: If 'DELHI' is coded as 73541 and 'CALCUTTA' as 82589662, how is 'CALICUT' coded?", ["8251896", "8251986", "8521896", "8258196"], 0, "Direct substitution: C=8, A=2, L=5, I=1, C=8, U=9, T=6 → 8251896.", "Coding-Decoding"],
  ["Reasoning & GK", "MCQ", "Coding: If 'WATER' is called 'FOOD', 'FOOD' is called 'TREE', 'TREE' is called 'SKY', where do fruits grow?", ["WATER", "FOOD", "TREE", "SKY"], 3, "Fruits grow on TREE, and TREE is called SKY.", "Coding-Decoding"],
  ["Reasoning & GK", "MCQ", "Coding: In a code, '+' means '×', '−' means '÷', '×' means '−', '÷' means '+'. Evaluate: 12 − 4 + 5 ÷ 3", ["15", "18", "12", "20"], 1, "Convert symbols: 12 ÷ 4 × 5 + 3 = 3 × 5 + 3 = 18.", "Mathematical Operations"],
  ["Reasoning & GK", "MCQ", "Coding: If 'ROSE' = 6821, 'CHAIR' = 73456, 'PREACH' = 961473, find code for 'SEARCH':", ["214673", "241673", "216473", "214763"], 0, "S=2, E=1, A=4, R=6, C=7, H=3 → 214673.", "Coding-Decoding"],
  ["Reasoning & GK", "MCQ", "Analogy: 12 : 144 :: 15 : ___", ["196", "215", "225", "256"], 2, "Square relation: 15² = 225.", "Analogy"],
  ["Reasoning & GK", "MCQ", "Analogy: 6 : 216 :: 7 : ___", ["343", "294", "349", "512"], 0, "Cube relation: 6³ = 216, 7³ = 343.", "Analogy"],
  ["Reasoning & GK", "MCQ", "Analogy: 9 : 80 :: 10 : ___", ["99", "100", "90", "101"], 0, "n² − 1: 9²−1=80, 10²−1 = 99.", "Analogy"],
  ["Reasoning & GK", "MCQ", "Analogy: Heart : Cardiologist :: Brain : ___", ["Dermatologist", "Neurologist", "Nephrologist", "Ophthalmologist"], 1, "Neurologist treats brain & nervous system disorders.", "Analogy"],
  ["Reasoning & GK", "MCQ", "Analogy: Japan : Yen :: UK : ___", ["Euro", "Dollar", "Pound Sterling", "Franc"], 2, "Currency of the United Kingdom is Pound Sterling.", "Analogy"],
  ["Reasoning & GK", "MCQ", "Analogy: Seismograph : Earthquake :: Hygrometer : ___", ["Pressure", "Humidity", "Rainfall", "Wind Speed"], 1, "Hygrometer measures atmospheric humidity.", "Analogy"],
  ["Reasoning & GK", "MCQ", "Direction: Sunita walks 8 km South, turns RIGHT and walks 6 km, then turns RIGHT and walks 8 km. How far is she from start?", ["6 km West", "6 km East", "14 km South", "8 km North"], 0, "South 8, West 6, North 8 cancels South/North → 6 km West of start.", "Direction Sense"],
  ["Reasoning & GK", "MCQ", "Direction: If South-East becomes North, and North-East becomes West, what does West become?", ["North-East", "South-East", "South-West", "North-West"], 1, "Each direction rotates 135° anti-clockwise: SE(135°) → N(0°), NE(45°) → W(270°), so West(270°) → 135° (South-East).", "Direction Sense"],
  ["Reasoning & GK", "MCQ", "Direction: At sunrise, facing the Sun, if you turn 90° left, which direction are you facing?", ["East", "West", "North", "South"], 2, "Morning Sun is in East; turning 90° left faces North.", "Direction Sense"],
  ["Reasoning & GK", "MCQ", "Blood Relation: Introducing a man, a woman said, 'His wife is the only daughter of my father.' How is the woman related to the man?", ["Sister", "Mother", "Wife", "Aunt"], 2, "Only daughter of the woman's father = the woman herself → she is his Wife.", "Blood Relations"],
  ["Reasoning & GK", "MCQ", "Blood Relation: P is Q's brother. R is Q's mother. S is R's father. How is P related to S?", ["Son", "Grandson", "Nephew", "Uncle"], 1, "S is maternal grandfather of P & Q → P is S's grandson.", "Blood Relations"],
  ["Reasoning & GK", "MCQ", "Blood Relation: A and B are sisters. R and S are brothers. A's daughter is R's sister. How is B related to S?", ["Mother", "Aunt", "Grandmother", "Sister"], 1, "R & S are sons of A; B is A's sister → B is Aunt to S.", "Blood Relations"],
  ["Reasoning & GK", "MCQ", "Ranking: In a class of 40 students, Deepak ranks 12th from the top. What is his rank from the bottom?", ["28th", "29th", "30th", "27th"], 1, "(40 − 12) + 1 = 29th.", "Ranking"],
  ["Reasoning & GK", "MCQ", "Ranking: Five friends A, B, C, D, E sit in a line. A is taller than B but shorter than C. D is taller than C, and E is shortest. Who is the tallest?", ["C", "D", "A", "B"], 1, "Order: D > C > A > B > E → D is tallest.", "Order & Ranking"],
  ["Reasoning & GK", "MCQ", "Syllogism: Statements: All pens are pencils. All pencils are books. Conclusion:", ["All pens are books", "No pen is a book", "All books are pens", "Some books are not pencils"], 0, "Pens ⊂ Pencils ⊂ Books → All pens are definitely books.", "Syllogism"],
  ["Reasoning & GK", "MCQ", "Venn Diagram: Choose the correct relation for 'Doctors, Human Beings, Engineers':", ["Three disjoint circles", "One big circle (Human Beings) containing two separate (or slightly overlapping) circles", "Doctors inside Engineers", "Engineers inside Doctors"], 1, "All Doctors and Engineers are Human Beings.", "Venn Diagrams"],
  ["Reasoning & GK", "MCQ", "Mirror Image: A clock shows 8:20. What time will its mirror image show?", ["3:40", "4:40", "3:20", "4:20"], 0, "11:60 − 8:20 = 3:40.", "Mirror Image"],
  ["Reasoning & GK", "MCQ", "Water Image: Which capital letter looks IDENTICAL in a horizontal water reflection?", ["A", "E", "M", "W"], 1, "E (along with B, C, D, H, I, K, O, X) is horizontally symmetric.", "Water Image"],
  ["Reasoning & GK", "MCQ", "Dice Logic: Two numbers on opposite faces of a standard Ludo die always add up to:", ["6", "7", "8", "9"], 1, "Standard die rule: 1↔6, 2↔5, 3↔4 (opposite faces sum to 7).", "Dice & Cubes"],
  ["Reasoning & GK", "MCQ", "Cube Cutting: A painted cube of side 3 cm is cut into 1 cm small cubes. How many small cubes have ZERO faces painted?", ["1", "6", "8", "12"], 0, "(n − 2)³ = (3 − 2)³ = 1 central hidden cube.", "Cubes"],
  ["Reasoning & GK", "MCQ", "Clock Angle: What is the smaller angle between hour and minute hands at 4:00?", ["90°", "120°", "150°", "60°"], 1, "4 × 30° = 120°.", "Clocks"],
  ["Reasoning & GK", "MCQ", "Calendar: How many odd days are there in an ordinary year (365 days)?", ["0", "1", "2", "3"], 1, "365 = 52 × 7 + 1 → 1 odd day (2 in a leap year).", "Calendar"],
  ["Reasoning & GK", "MCQ", "Calendar: Which year among these is a LEAP year?", ["1900", "2100", "2024", "2023"], 2, "Century years must be divisible by 400; 2024 is divisible by 4 → leap year.", "Calendar"],
  ["Reasoning & GK", "MCQ", "Counting Squares: A 2×2 grid of squares contains how many total squares?", ["4", "5", "6", "8"], 1, "4 small (1×1) squares + 1 big (2×2) square = 5.", "Figure Counting"],
  ["Reasoning & GK", "MCQ", "Missing Number Puzzle: If 4*2 = 12, 5*3 = 20, 6*4 = 30, then 7*5 = ?", ["35", "40", "42", "45"], 2, "Pattern: a × (b + 1) → 7 × (5 + 1) = 42.", "Number Puzzle"],
  ["Reasoning & GK", "ODD_ONE_OUT", "Find the odd one out (Perfect Cubes vs Square):", ["27", "64", "125", "144"], 3, "27(3³), 64(4³), 125(5³) are cubes; 144 is 12² (not a cube).", "Odd One Out"],
  ["Reasoning & GK", "ODD_ONE_OUT", "Find the odd one out (Metals vs Insulator):", ["Copper", "Iron", "Aluminium", "Plastic"], 3, "Plastic is a non-metallic insulator; others are metals.", "Odd One Out"],
  ["Reasoning & GK", "ODD_ONE_OUT", "Find the odd one out (Planets vs Natural Satellite):", ["Mercury", "Venus", "Mars", "Moon"], 3, "Moon is Earth's natural satellite; others are planets.", "Odd One Out"],
  ["Reasoning & GK", "ODD_ONE_OUT", "Find the odd one out (Units of Length vs Mass):", ["Meter", "Kilometer", "Centimeter", "Kilogram"], 3, "Kilogram measures mass; others measure length.", "Odd One Out"],
  ["Reasoning & GK", "MCQ", "Word Formation: Which word can be formed from the letters of 'ENVIRONMENT'?", ["RIVER", "ENTER", "MOTOR", "STONE"], 1, "E-N-T-E-R uses letters available in ENVIRONMENT (only one S? STONE has S; MOTOR has two O's).", "Word Logic"],
  // General Knowledge (42)
  ["Reasoning & GK", "MCQ", "Who is known as the 'Missile Man of India'?", ["Dr. Vikram Sarabhai", "Dr. A.P.J. Abdul Kalam", "Dr. Homi Bhabha", "Satish Dhawan"], 1, "Dr. A.P.J. Abdul Kalam led India's missile programme and served as 11th President.", "Indian Scientists"],
  ["Reasoning & GK", "MCQ", "Who is regarded as the 'Father of the Indian Space Programme'?", ["Dr. C.V. Raman", "Dr. Vikram Sarabhai", "S. Chandrasekhar", "Meghnad Saha"], 1, "Dr. Vikram Sarabhai established INCOSPAR/ISRO.", "Indian Scientists"],
  ["Reasoning & GK", "MCQ", "Who won the 1930 Nobel Prize in Physics for discovering the scattering of light ('Raman Effect')?", ["Jagadish Chandra Bose", "Sir C.V. Raman", "S.N. Bose", "Har Gobind Khorana"], 1, "National Science Day (28 Feb) celebrates C.V. Raman's discovery.", "Science GK"],
  ["Reasoning & GK", "MCQ", "Which Indian astronaut was the first Indian citizen to travel to space (1984)?", ["Kalpana Chawla", "Rakesh Sharma", "Sunita Williams", "Shubhanshu Shukla"], 1, "Sqn Ldr Rakesh Sharma flew aboard Soyuz T-11 in April 1984.", "Space GK"],
  ["Reasoning & GK", "MCQ", "What was the name of India's first artificial satellite launched in 1975?", ["Bhaskara", "Aryabhata", "Rohini", "INSAT-1A"], 1, "Aryabhata was launched on 19 April 1975.", "Space GK"],
  ["Reasoning & GK", "MCQ", "What is the name of India's first solar mission launched by ISRO in September 2023?", ["Surya-1", "Aditya-L1", "Mangalyaan-2", "Gaganyaan"], 1, "Aditya-L1 studies the Sun from Lagrange Point L1.", "Space GK"],
  ["Reasoning & GK", "MCQ", "Which is the largest freshwater lake in India?", ["Chilika Lake", "Wular Lake (Jammu & Kashmir)", "Sambhar Lake", "Dal Lake"], 1, "Wular Lake is India's largest freshwater lake; Chilika is largest brackish lagoon.", "India Geography"],
  ["Reasoning & GK", "MCQ", "Which is the longest dam in India (built across the Mahanadi river in Odisha)?", ["Bhakra Nangal Dam", "Hirakud Dam", "Tehri Dam", "Sardar Sarovar"], 1, "Hirakud Dam is the longest major earthen dam in the world.", "India Geography"],
  ["Reasoning & GK", "MCQ", "Which is the highest dam in India (on the Bhagirathi river in Uttarakhand)?", ["Bhakra Dam", "Tehri Dam", "Nagarjuna Sagar", "Mettur Dam"], 1, "Tehri Dam (~260.5 m) is India's tallest dam.", "India Geography"],
  ["Reasoning & GK", "MCQ", "Which Indian state has the longest coastline?", ["Maharashtra", "Gujarat", "Tamil Nadu", "Andhra Pradesh"], 1, "Gujarat has the longest coastline (~1,600 km) among Indian states.", "India Geography"],
  ["Reasoning & GK", "MCQ", "Which strait separates India from Sri Lanka?", ["Bering Strait", "Palk Strait", "Strait of Gibraltar", "Malacca Strait"], 1, "Palk Strait and Gulf of Mannar separate India and Sri Lanka.", "India Geography"],
  ["Reasoning & GK", "MCQ", "Which river is called the 'Dakshin Ganga' (Ganga of the South)?", ["Kaveri", "Godavari", "Krishna", "Tungabhadra"], 1, "Godavari is the longest Peninsular river in India.", "India Geography"],
  ["Reasoning & GK", "MCQ", "In which Indian state is the Kaziranga National Park (famous for one-horned rhinos) located?", ["West Bengal", "Assam", "Uttarakhand", "Madhya Pradesh"], 1, "Kaziranga in Assam houses most of the world's Indian one-horned rhinoceroses.", "Wildlife GK"],
  ["Reasoning & GK", "MCQ", "Which was India's FIRST National Park established in 1936 (originally Hailey National Park)?", ["Gir National Park", "Jim Corbett National Park", "Kanha National Park", "Ranthambore"], 1, "Jim Corbett National Park in Uttarakhand.", "Wildlife GK"],
  ["Reasoning & GK", "MCQ", "Which is the only natural habitat of the Asiatic Lion in the world?", ["Sundarbans", "Gir Forest (Gujarat)", "Bandipur", "Periyar"], 1, "Gir National Park in Gujarat is home to Asiatic Lions.", "Wildlife GK"],
  ["Reasoning & GK", "MCQ", "Who is the ex-officio Chairman of the Rajya Sabha in India?", ["Prime Minister", "Vice-President of India", "Speaker of Lok Sabha", "Chief Justice"], 1, "The Vice-President of India is ex-officio Chairman of Rajya Sabha.", "Indian Polity"],
  ["Reasoning & GK", "MCQ", "Who was the first woman Prime Minister of India?", ["Sarojini Naidu", "Indira Gandhi", "Pratibha Patil", "Sucheta Kripalani"], 1, "Indira Gandhi served as India's first woman Prime Minister.", "Indian Polity"],
  ["Reasoning & GK", "MCQ", "Who was the first woman Governor of an Indian state (Uttar Pradesh)?", ["Vijaya Lakshmi Pandit", "Sarojini Naidu", "Annie Besant", "Indira Gandhi"], 1, "Sarojini Naidu ('Nightingale of India') was the first woman Governor.", "Indian Polity"],
  ["Reasoning & GK", "MCQ", "Who wrote the National Song of India 'Vande Mataram'?", ["Rabindranath Tagore", "Bankim Chandra Chattopadhyay", "Subramania Bharati", "Muhammad Iqbal"], 1, "From Bankim Chandra Chattopadhyay's novel Anandamath.", "National Symbols"],
  ["Reasoning & GK", "MCQ", "What is the minimum age required to become the President of India?", ["25 years", "30 years", "35 years", "40 years"], 2, "35 years (Lok Sabha MP: 25 years; Rajya Sabha MP: 30 years).", "Indian Polity"],
  ["Reasoning & GK", "MCQ", "Which gas is filled inside electric bulbs to prevent oxidation of the tungsten filament?", ["Oxygen", "Argon / Nitrogen", "Hydrogen", "Carbon monoxide"], 1, "Inert Argon and Nitrogen prevent the hot filament from burning.", "Science GK"],
  ["Reasoning & GK", "MCQ", "Which non-metal is a good conductor of electricity?", ["Sulphur", "Graphite (Carbon)", "Phosphorus", "Diamond"], 1, "Graphite conducts electricity due to free delocalised electrons.", "Science GK"],
  ["Reasoning & GK", "MCQ", "Which metal is the best conductor of electricity?", ["Copper", "Silver", "Gold", "Aluminium"], 1, "Silver has the highest electrical conductivity among metals.", "Science GK"],
  ["Reasoning & GK", "MCQ", "What is the chemical name of Common Table Salt?", ["Sodium carbonate", "Sodium chloride (NaCl)", "Calcium chloride", "Potassium nitrate"], 1, "Table salt is Sodium Chloride (NaCl).", "Science GK"],
  ["Reasoning & GK", "MCQ", "Which gas is mainly responsible for Global Warming (Greenhouse Effect)?", ["Nitrogen", "Carbon dioxide & Methane", "Argon", "Neon"], 1, "CO₂ and Methane trap outgoing infrared heat.", "Environment GK"],
  ["Reasoning & GK", "MCQ", "Which international day is celebrated on 5th June?", ["World Water Day", "World Environment Day", "Earth Day", "Ozone Day"], 1, "5 June is World Environment Day.", "Important Days"],
  ["Reasoning & GK", "MCQ", "When is 'National Sports Day' celebrated in India (birthday of Major Dhyan Chand)?", ["15 August", "29 August", "5 September", "14 November"], 1, "29 August honours hockey wizard Major Dhyan Chand.", "Important Days"],
  ["Reasoning & GK", "MCQ", "Which is the deepest oceanic trench on Earth (in the Pacific Ocean)?", ["Java Trench", "Mariana Trench", "Puerto Rico Trench", "Tonga Trench"], 1, "Challenger Deep in the Mariana Trench reaches nearly 11 km deep.", "World Geography"],
  ["Reasoning & GK", "MCQ", "Which river flows through Cairo, the capital of Egypt?", ["Amazon", "Nile", "Danube", "Tigris"], 1, "The Nile is the lifeblood of Egypt.", "World Geography"],
  ["Reasoning & GK", "MCQ", "Which mountain range separates Europe from Asia?", ["Alps", "Ural Mountains", "Andes", "Rockies"], 1, "The Ural Mountains run north-south through western Russia.", "World Geography"],
  ["Reasoning & GK", "MCQ", "Where are the headquarters of the United Nations (UN) located?", ["Geneva", "New York City (USA)", "Paris", "Vienna"], 1, "UN Headquarters is in New York City (founded 24 Oct 1945).", "International GK"],
  ["Reasoning & GK", "MCQ", "Where is the headquarters of WHO (World Health Organization) located?", ["London", "Geneva (Switzerland)", "Rome", "Washington D.C."], 1, "WHO is headquartered in Geneva.", "International GK"],
  ["Reasoning & GK", "MCQ", "What is the currency of Japan?", ["Yuan", "Yen", "Won", "Baht"], 1, "Japanese Yen (¥).", "Currencies"],
  ["Reasoning & GK", "MCQ", "Who is the first Indian individual Olympic Gold Medallist (Beijing 2008, 10m Air Rifle)?", ["Neeraj Chopra", "Abhinav Bindra", "Rajyavardhan Rathore", "Vijender Singh"], 1, "Abhinav Bindra won India's first individual Olympic gold in 2008.", "Sports GK"],
  ["Reasoning & GK", "MCQ", "In which sport did Neeraj Chopra win India's first Athletics Olympic Gold (Tokyo 2020)?", ["Shot Put", "Javelin Throw", "Long Jump", "Discus Throw"], 1, "Javelin Throw (87.58 m).", "Sports GK"],
  ["Reasoning & GK", "MCQ", "How many squares are there on a standard Chessboard?", ["32", "64", "48", "81"], 1, "An 8 × 8 grid has 64 alternating light and dark squares.", "Sports GK"],
  ["Reasoning & GK", "MCQ", "Who wrote the book 'Discovery of India' while imprisoned in Ahmednagar Fort?", ["Mahatma Gandhi", "Pandit Jawaharlal Nehru", "Sardar Patel", "Subhas Chandra Bose"], 1, "Jawaharlal Nehru wrote Discovery of India (1944).", "Books & Authors"],
  ["Reasoning & GK", "MCQ", "Who wrote the children's classic 'Malgudi Days'?", ["Ruskin Bond", "R.K. Narayan", "Vikram Seth", "Mulkh Raj Anand"], 1, "R.K. Narayan created the fictional South Indian town of Malgudi.", "Books & Authors"],
  ["Reasoning & GK", "MCQ", "What is the full form of 'CPU' in computers?", ["Central Power Unit", "Central Processing Unit", "Computer Personal Unit", "Core Program Utility"], 1, "CPU is the brain of a computer.", "Computer GK"],
  ["Reasoning & GK", "MCQ", "What is the shortcut key combination on Windows to COPY selected text?", ["Ctrl + X", "Ctrl + C", "Ctrl + V", "Ctrl + Z"], 1, "Ctrl+C copies, Ctrl+X cuts, Ctrl+V pastes, Ctrl+Z undoes.", "Computer GK"],
  ["Reasoning & GK", "MCQ", "1 Kilobyte (KB) in computer memory equals:", ["100 bytes", "512 bytes", "1024 bytes", "2048 bytes"], 2, "1 KB = 2¹⁰ = 1024 bytes.", "Computer GK"],
  ["Reasoning & GK", "MCQ", "Which vitamin deficiency causes 'Scurvy' (bleeding gums)?", ["Vitamin A", "Vitamin B1", "Vitamin C", "Vitamin D"], 2, "Vitamin C (ascorbic acid) deficiency causes scurvy.", "Health GK"],
];

const CLASS_7_TUPLES: QTuple[] = [
  ...c7EngSyn,          // 12
  ...c7EngAnt,          // 12
  ...c7EngOneWord,      // 12
  ...c7EngGrammar,      // 56 -> Eng = 92
  ...buildClass7Maths(),// 102
  ...c7SciAcidsBases,   // 10
  ...c7SciCore,         // 91 -> Sci = 101
  ...c7SstDynasties,    // 12
  ...c7SstCore,         // 72 -> SST = 84
  ...c7ReasCore,        // 87
];

export const CLASS_7_EXTRA: EntranceTestQuestion[] = expandClassQuestions(7, CLASS_7_TUPLES);
