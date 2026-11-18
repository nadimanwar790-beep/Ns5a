import type { EntranceTestQuestion } from "../../school-types";
import {
  buildFactBankTuples,
  expandClassQuestions,
  makeNumOptions,
  type QTuple,
} from "./helpers";

// ── CLASS 2 EXTRA (466 top questions: Eng 116 + Math 117 + Hindi 117 + EVS/GK 116) ──

// 1. ENGLISH (116)
const c2EngSynonyms = buildFactBankTuples({
  subject: "English",
  topicTag: "Synonyms",
  seedPrefix: "c2_eng_syn",
  explanationPrefix: "The word with the same meaning is",
  items: [
    { prompt: "Which word means the SAME as 'HAPPY'?", answer: "Glad" },
    { prompt: "Which word means the SAME as 'BIG'?", answer: "Large" },
    { prompt: "Which word means the SAME as 'SMALL'?", answer: "Tiny" },
    { prompt: "Which word means the SAME as 'FAST'?", answer: "Quick" },
    { prompt: "Which word means the SAME as 'SMART'?", answer: "Clever" },
    { prompt: "Which word means the SAME as 'BEGIN'?", answer: "Start" },
    { prompt: "Which word means the SAME as 'END'?", answer: "Finish" },
    { prompt: "Which word means the SAME as 'SILENT'?", answer: "Quiet" },
    { prompt: "Which word means the SAME as 'BEAUTIFUL'?", answer: "Pretty" },
    { prompt: "Which word means the SAME as 'BRAVE'?", answer: "Bold" },
    { prompt: "Which word means the SAME as 'GIFT'?", answer: "Present" },
    { prompt: "Which word means the SAME as 'ANGRY'?", answer: "Mad" },
    { prompt: "Which word means the SAME as 'WEALTHY'?", answer: "Rich" },
    { prompt: "Which word means the SAME as 'LOOK'?", answer: "See" },
    { prompt: "Which word means the SAME as 'SPEAK'?", answer: "Talk" },
    { prompt: "Which word means the SAME as 'NEAT'?", answer: "Tidy" },
  ],
});

const c2EngOpposites = buildFactBankTuples({
  subject: "English",
  topicTag: "Antonyms",
  seedPrefix: "c2_eng_ant",
  explanationPrefix: "The opposite word is",
  items: [
    { prompt: "What is the opposite of 'STRONG'?", answer: "Weak" },
    { prompt: "What is the opposite of 'SHARP'?", answer: "Blunt" },
    { prompt: "What is the opposite of 'TRUE'?", answer: "False" },
    { prompt: "What is the opposite of 'BRIGHT'?", answer: "Dull" },
    { prompt: "What is the opposite of 'EARLY'?", answer: "Late" },
    { prompt: "What is the opposite of 'DEEP'?", answer: "Shallow" },
    { prompt: "What is the opposite of 'WIDE'?", answer: "Narrow" },
    { prompt: "What is the opposite of 'FIRST'?", answer: "Last" },
    { prompt: "What is the opposite of 'SWEET'?", answer: "Bitter" },
    { prompt: "What is the opposite of 'FRIEND'?", answer: "Enemy" },
    { prompt: "What is the opposite of 'RIGHT'?", answer: "Wrong" },
    { prompt: "What is the opposite of 'SAFE'?", answer: "Unsafe" },
    { prompt: "What is the opposite of 'HARD'?", answer: "Soft" },
    { prompt: "What is the opposite of 'BUSY'?", answer: "Free" },
    { prompt: "What is the opposite of 'LOVE'?", answer: "Hate" },
    { prompt: "What is the opposite of 'HIGH'?", answer: "Low" },
  ],
});

const c2EngPlurals = buildFactBankTuples({
  subject: "English",
  topicTag: "Irregular Plurals",
  seedPrefix: "c2_eng_ipl",
  explanationPrefix: "Correct plural form:",
  items: [
    { prompt: "What is the plural of 'Child'?", answer: "Children" },
    { prompt: "What is the plural of 'Tooth'?", answer: "Teeth" },
    { prompt: "What is the plural of 'Foot'?", answer: "Feet" },
    { prompt: "What is the plural of 'Mouse'?", answer: "Mice" },
    { prompt: "What is the plural of 'Man'?", answer: "Men" },
    { prompt: "What is the plural of 'Woman'?", answer: "Women" },
    { prompt: "What is the plural of 'Leaf'?", answer: "Leaves" },
    { prompt: "What is the plural of 'Knife'?", answer: "Knives" },
    { prompt: "What is the plural of 'Baby'?", answer: "Babies" },
    { prompt: "What is the plural of 'City'?", answer: "Cities" },
    { prompt: "What is the plural of 'Cherry'?", answer: "Cherries" },
    { prompt: "What is the plural of 'Story'?", answer: "Stories" },
    { prompt: "What is the plural of 'Brush'?", answer: "Brushes" },
    { prompt: "What is the plural of 'Watch'?", answer: "Watches" },
    { prompt: "What is the plural of 'Tomato'?", answer: "Tomatoes" },
    { prompt: "What is the plural of 'Goose'?", answer: "Geese" },
  ],
});

const c2EngGrammar: QTuple[] = [
  // Articles & Nouns & Adjectives & Verbs & Prepositions & Passages (68)
  ["English", "FILL_BLANK", "___ Sun shines brightly in the sky.", ["A", "An", "The", "Two"], 2, "We use 'The' before unique things like the Sun.", "Articles"],
  ["English", "FILL_BLANK", "He bought ___ honest watchman for the gate.", ["a", "an", "the", "are"], 1, "'Honest' begins with a vowel sound 'o' (silent h), so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "Wait for me for ___ hour.", ["a", "an", "the", "my"], 1, "'Hour' starts with a vowel sound 'au', so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "___ Ganga is a sacred river.", ["A", "An", "The", "In"], 2, "River names take 'The'.", "Articles"],
  ["English", "FILL_BLANK", "She wants to eat ___ ice cream cone.", ["a", "an", "is", "are"], 1, "'Ice' starts with a vowel sound, so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "Raju is ___ tallest boy in the row.", ["a", "an", "the", "is"], 2, "Superlatives like 'tallest' take 'the'.", "Articles"],
  ["English", "MCQ", "Identify the PROPER NOUN in: 'Rohan lives in Jaipur.'", ["lives", "in", "Jaipur", "the"], 2, "Jaipur (and Rohan) are special names of a place/person—Proper Nouns.", "Nouns"],
  ["English", "MCQ", "Which of these is a COMMON NOUN?", ["Sunday", "Delhi", "River", "Ganga"], 2, "'River' is a general name, whereas Ganga, Delhi, Sunday are proper nouns.", "Nouns"],
  ["English", "MCQ", "Choose the Collective Noun: A ___ of keys.", ["flock", "bunch", "herd", "pack"], 1, "A group of keys is called a bunch.", "Collective Nouns"],
  ["English", "MCQ", "Choose the Collective Noun: A ___ of sheep.", ["flock", "bunch", "team", "pride"], 0, "A group of sheep is called a flock.", "Collective Nouns"],
  ["English", "MCQ", "Choose the Collective Noun: A ___ of lions.", ["herd", "pride", "swarm", "school"], 1, "A group of lions is called a pride.", "Collective Nouns"],
  ["English", "MCQ", "Choose the Collective Noun: A ___ of bees.", ["swarm", "pack", "bunch", "fleet"], 0, "A group of bees is called a swarm.", "Collective Nouns"],
  ["English", "MCQ", "Choose the Collective Noun: A ___ of players.", ["team", "flock", "bunch", "bundle"], 0, "Players together form a team.", "Collective Nouns"],
  ["English", "MCQ", "Which word is an ADJECTIVE (Describing Word) in: 'The clever fox jumped.'?", ["fox", "clever", "jumped", "the"], 1, "'Clever' describes the noun 'fox'.", "Adjectives"],
  ["English", "MCQ", "Find the Adjective: 'Meena has a sweet voice.'", ["Meena", "has", "sweet", "voice"], 2, "'Sweet' describes the voice.", "Adjectives"],
  ["English", "MCQ", "Find the Adjective: 'There are dark clouds in the sky.'", ["clouds", "dark", "sky", "are"], 1, "'Dark' describes the clouds.", "Adjectives"],
  ["English", "MCQ", "Which word is a VERB (Action Word)?", ["Table", "Dance", "Yellow", "Soft"], 1, "'Dance' shows an action.", "Verbs"],
  ["English", "MCQ", "Find the Verb in: 'Birds fly high in the sky.'", ["Birds", "fly", "high", "sky"], 1, "'Fly' is the action word (verb).", "Verbs"],
  ["English", "FILL_BLANK", "Yesterday, Amit ___ a letter to his friend.", ["write", "writes", "wrote", "writing"], 2, "'Yesterday' shows past tense, so 'wrote' is correct.", "Past Tense"],
  ["English", "FILL_BLANK", "Every morning, Priya ___ milk.", ["drink", "drinks", "drank", "drinking"], 1, "Singular subject 'Priya' in simple present takes 'drinks'.", "Present Tense"],
  ["English", "FILL_BLANK", "We ___ our homework right now.", ["is doing", "are doing", "am doing", "was doing"], 1, "'We' takes 'are doing'.", "Continuous Tense"],
  ["English", "FILL_BLANK", "My mother ___ delicious food yesterday.", ["cook", "cooks", "cooked", "cooking"], 2, "Past tense of cook is 'cooked'.", "Past Tense"],
  ["English", "FILL_BLANK", "What is the past tense of 'GO'?", ["Goed", "Going", "Went", "Gone"], 2, "Past tense of 'go' is 'went'.", "Past Tense"],
  ["English", "FILL_BLANK", "What is the past tense of 'EAT'?", ["Eated", "Ate", "Eating", "Eats"], 1, "Past tense of 'eat' is 'ate'.", "Past Tense"],
  ["English", "FILL_BLANK", "What is the past tense of 'SEE'?", ["Seed", "Saw", "Sees", "Seeing"], 1, "Past tense of 'see' is 'saw'.", "Past Tense"],
  ["English", "FILL_BLANK", "The frog jumped ___ the pond.", ["into", "at", "between", "under"], 0, "'Into' shows movement from outside to inside.", "Prepositions"],
  ["English", "FILL_BLANK", "A ball is lying ___ the two boxes.", ["between", "among", "in", "on"], 0, "For two things, we use 'between'.", "Prepositions"],
  ["English", "FILL_BLANK", "My birthday is ___ 15th July.", ["in", "on", "at", "to"], 1, "Specific dates take 'on'.", "Prepositions"],
  ["English", "FILL_BLANK", "The train arrives ___ 6 o'clock.", ["on", "in", "at", "by"], 2, "Exact clock time takes 'at'.", "Prepositions"],
  ["English", "FILL_BLANK", "Join using a conjunction: I like tea ___ my brother likes coffee.", ["but", "or", "because", "so"], 0, "'But' joins two contrasting ideas.", "Conjunctions"],
  ["English", "FILL_BLANK", "Join correctly: Do you want an apple ___ a banana?", ["and", "or", "but", "so"], 1, "'Or' is used to show a choice.", "Conjunctions"],
  ["English", "FILL_BLANK", "He stayed at home ___ he was unwell.", ["because", "but", "or", "and"], 0, "'Because' gives the reason.", "Conjunctions"],
  ["English", "MCQ", "Choose the correct sentence:", ["She are my sister.", "She is my sister.", "She am my sister.", "She be my sister."], 1, "'She' takes 'is'.", "Sentence Structure"],
  ["English", "MCQ", "Choose the correctly spelled word (Beauty):", ["Beautifull", "Beautiful", "Beutiful", "Beatiful"], 1, "Correct spelling is BEAUTIFUL.", "Spelling"],
  ["English", "MCQ", "Choose the correctly spelled word (Month 2):", ["Febuary", "February", "Febraury", "Februery"], 1, "Correct spelling is FEBRUARY.", "Spelling"],
  ["English", "MCQ", "Choose the correctly spelled word (Mid-week day):", ["Wenesday", "Wednesday", "Wednsday", "Wensday"], 1, "Correct spelling is WEDNESDAY.", "Spelling"],
  ["English", "MCQ", "Choose the correctly spelled word (Next day):", ["Tomorow", "Tomorrow", "Tommorrow", "Tommorow"], 1, "Correct spelling is TOMORROW (one m, two r's).", "Spelling"],
  ["English", "MCQ", "Choose the correctly spelled word (Companion):", ["Frend", "Friend", "Freind", "Frind"], 1, "Correct spelling is FRIEND.", "Spelling"],
  ["English", "MCQ", "What do we call a person who writes poems?", ["Author", "Poet", "Painter", "Singer"], 1, "A person who writes poems is a Poet.", "One Word"],
  ["English", "MCQ", "What do we call a place where books are kept for reading?", ["Bakery", "Library", "Pharmacy", "Garage"], 1, "A Library holds books for reading.", "One Word"],
  ["English", "MCQ", "What is a baby goat called?", ["Lamb", "Kid", "Calf", "Foal"], 1, "A young goat is called a Kid.", "Animal Babies"],
  ["English", "MCQ", "Which sound does a horse make?", ["Roar", "Neigh", "Bark", "Bleat"], 1, "A horse neighs.", "Animal Sounds"],
  ["English", "MCQ", "Which sound does a snake make?", ["Hiss", "Buzz", "Chirp", "Quack"], 0, "A snake hisses.", "Animal Sounds"],
  ["English", "MCQ", "Which sound does an elephant make?", ["Trumpet", "Meow", "Bray", "Caw"], 0, "An elephant trumpets.", "Animal Sounds"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Action Verbs vs Noun):", ["Run", "Walk", "Jump", "Chair"], 3, "Run, Walk, Jump are verbs; Chair is a noun.", "Odd One Out"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Weekdays vs Month):", ["Monday", "Friday", "March", "Sunday"], 2, "March is a month; Monday, Friday, Sunday are days.", "Odd One Out"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Tastes vs Weight):", ["Sweet", "Sour", "Bitter", "Heavy"], 3, "Sweet, Sour, Bitter are tastes; Heavy is weight.", "Odd One Out"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Hospital Terms):", ["Doctor", "Hospital", "Medicine", "Aeroplane"], 3, "Doctor, Hospital, Medicine are related to healthcare.", "Odd One Out"],
  ["English", "MCQ", "Rearrange to make a meaningful word: R - A - T - I - N", ["ARTIN", "TRAIN", "RIANT", "TRANI"], 1, "The letters rearrange to TRAIN.", "Jumbled Words"],
  ["English", "MCQ", "Rearrange to make a meaningful word: L - O - C - K - C", ["CLOCK", "LCOCK", "KLOCE", "COKLC"], 0, "The letters form CLOCK.", "Jumbled Words"],
  ["English", "MCQ", "Rearrange to make a meaningful word: G - A - R - T - E", ["GREAT", "GERAT", "RATEG", "TARGE"], 0, "The letters rearrange to GREAT.", "Jumbled Words"],
  ["English", "MCQ", "Which word comes FIRST in alphabetical (dictionary) order?", ["Zebra", "Mango", "Apple", "Grapes"], 2, "Apple starts with A, which is first.", "Alphabetical Order"],
  ["English", "MCQ", "Which word comes LAST in dictionary order?", ["Ball", "Cat", "Dog", "Ant"], 2, "D comes after A, B, C, so Dog comes last.", "Alphabetical Order"],
  ["English", "MCQ", "Which word is a homophone (same sound) for 'SUN'?", ["Moon", "Son", "Star", "Sin"], 1, "Sun and Son sound the same.", "Homophones"],
  ["English", "MCQ", "Which word is a homophone for 'TWO'?", ["Three", "Too", "Tow", "Ten"], 1, "Two and Too sound the same.", "Homophones"],
  ["English", "MCQ", "Which word is a homophone for 'SEA'?", ["Ocean", "See", "Saw", "Say"], 1, "Sea and See sound alike.", "Homophones"],
  ["English", "MCQ", "Which punctuation mark goes at the end: 'What is your name___'", [".", "?", "!", ","], 1, "Questions end with '?'.", "Punctuation"],
  ["English", "MCQ", "Which punctuation mark shows excitement: 'Hurray___ We won!'", [".", "?", "!", ","], 2, "Exclamatory words like Hurray take '!'.", "Punctuation"],
  ["English", "TRUE_FALSE", "True or False: 'We' is a singular pronoun.", ["True", "False", "It is a noun", "It is a verb"], 1, "False! 'We' is a plural pronoun.", "Pronouns"],
  ["English", "TRUE_FALSE", "True or False: 'Honest' starts with a consonant letter 'h', yet takes 'an'.", ["True", "False", "Takes 'a'", "No article"], 0, "True! 'h' is silent, so it starts with a vowel sound.", "Articles"],
  ["English", "TRUE_FALSE", "True or False: 'Children' is already plural, so 'childrens' is wrong.", ["True", "False", "Both valid", "Singular"], 0, "True! 'Children' is the plural of 'child'.", "Plurals"],
  ["English", "MINI_PASSAGE", "When does Kabir wake up every day?", ["At 7 AM", "At 6 AM", "At 8 AM", "At 9 AM"], 1, "The passage says Kabir wakes up at 6 AM.", "Comprehension", "Kabir is a disciplined boy. He wakes up at 6 AM, waters the plants in his balcony, and eats a healthy breakfast before school."],
  ["English", "MINI_PASSAGE", "What does Kabir do in his balcony?", ["Plays cricket", "Waters the plants", "Sleeps", "Reads comics"], 1, "He waters the plants in his balcony.", "Comprehension", "Kabir is a disciplined boy. He wakes up at 6 AM, waters the plants in his balcony, and eats a healthy breakfast before school."],
  ["English", "MINI_PASSAGE", "What happened to the thirsty crow?", ["It fell asleep", "It found a pitcher with little water", "It flew to the ocean", "It drank milk"], 1, "The crow found a pitcher with very little water at the bottom.", "Comprehension", "A thirsty crow found a pitcher with very little water. It dropped small pebbles into the pitcher one by one until the water rose up."],
  ["English", "MINI_PASSAGE", "How did the crow make the water rise?", ["By breaking the pitcher", "By dropping small pebbles into it", "By calling other crows", "By shaking it"], 1, "The clever crow dropped small pebbles into the pitcher.", "Comprehension", "A thirsty crow found a pitcher with very little water. It dropped small pebbles into the pitcher one by one until the water rose up."],
  ["English", "MCQ", "Which of these is a compound word (made of two words)?", ["Sunshine", "Happy", "Table", "Water"], 0, "Sun + shine = Sunshine.", "Vocabulary"],
  ["English", "MCQ", "Add a prefix to make the opposite of 'KIND':", ["Unkind", "Diskind", "Inkind", "Miskind"], 0, "'Un-' + kind = Unkind.", "Prefixes"],
  ["English", "MCQ", "Choose the correct possessive pronoun: This book belongs to me. It is ___.", ["my", "mine", "me", "I"], 1, "'Mine' is used at the end without a noun after it.", "Pronouns"],
];

// 2. MATHEMATICS (117)
function buildClass2Maths(): QTuple[] {
  const qs: QTuple[] = [];
  // 2 & 3 digit addition (15)
  const adds: [number, number][] = [
    [35, 28], [47, 36], [58, 25], [64, 29], [75, 18], [120, 45], [234, 115], [312, 146], [425, 134], [510, 240],
    [189, 11], [299, 1], [345, 55], [408, 192], [650, 150],
  ];
  adds.forEach(([a, b], i) => {
    const ans = a + b;
    const { options, correctIndex } = makeNumOptions(ans, [-10, 10, 1, -1, 2], `c2m_add_${i}`);
    qs.push(["Mathematics", "MCQ", `Add: ${a} + ${b} = ?`, options, correctIndex, `${a} + ${b} = ${ans}.`, "Addition"]);
  });

  // Subtraction (15)
  const subs: [number, number][] = [
    [72, 28], [84, 37], [91, 45], [100, 36], [150, 45], [248, 125], [365, 142], [480, 160], [500, 125], [642, 218],
    [730, 310], [825, 415], [900, 450], [412, 108], [305, 105],
  ];
  subs.forEach(([a, b], i) => {
    const ans = a - b;
    const { options, correctIndex } = makeNumOptions(ans, [-10, 10, 2, -2, 5], `c2m_sub_${i}`);
    qs.push(["Mathematics", "MCQ", `Subtract: ${a} − ${b} = ?`, options, correctIndex, `${a} − ${b} = ${ans}.`, "Subtraction"]);
  });

  // Multiplication tables (20)
  const muls: [number, number][] = [
    [3, 7], [4, 8], [5, 9], [6, 6], [6, 8], [7, 7], [7, 9], [8, 4], [8, 9], [9, 6],
    [9, 9], [11, 5], [12, 4], [12, 6], [12, 8], [10, 15], [15, 2], [20, 4], [25, 3], [0, 48],
  ];
  muls.forEach(([a, b], i) => {
    const ans = a * b;
    const { options, correctIndex } = makeNumOptions(ans, [a || 4, -(a || 4), 2, -2, 10], `c2m_mul_${i}`);
    qs.push(["Mathematics", "FILL_BLANK", `Find the product: ${a} × ${b} = ___`, options, correctIndex, `${a} × ${b} = ${ans}.`, "Multiplication"]);
  });

  // Division equal sharing (12)
  const divs: [number, number][] = [
    [12, 3], [16, 4], [20, 5], [24, 6], [28, 4], [32, 8], [36, 9], [40, 5], [45, 9], [48, 6], [56, 7], [72, 8],
  ];
  divs.forEach(([a, b], i) => {
    const ans = a / b;
    const { options, correctIndex } = makeNumOptions(ans, [-1, 1, 2, -2], `c2m_div_${i}`);
    qs.push(["Mathematics", "MCQ", `Divide: ${a} ÷ ${b} = ?`, options, correctIndex, `${a} divided equally by ${b} gives ${ans}.`, "Division"]);
  });

  // Place value, expanded form, even/odd, shapes, fractions, measurement, time, money, word problems (55)
  const extraMaths: QTuple[] = [
    ["Mathematics", "MCQ", "What is the place value of 6 in 648?", ["6", "60", "600", "6000"], 2, "6 is in the Hundreds place, so its place value is 600.", "Place Value"],
    ["Mathematics", "MCQ", "What is the face value of 7 in 472?", ["7", "70", "700", "2"], 0, "The face value of any digit is the digit itself: 7.", "Face Value"],
    ["Mathematics", "MCQ", "Write the number for: 400 + 50 + 9", ["495", "459", "549", "954"], 1, "400 + 50 + 9 = 459.", "Expanded Form"],
    ["Mathematics", "MCQ", "Which is the expanded form of 708?", ["700 + 80", "700 + 8", "70 + 8", "7 + 8"], 1, "708 = 7 hundreds + 0 tens + 8 ones = 700 + 8.", "Expanded Form"],
    ["Mathematics", "MCQ", "Which of the following is an EVEN number?", ["23", "45", "68", "91"], 2, "Numbers ending in 0, 2, 4, 6, 8 are even. 68 ends in 8.", "Even & Odd"],
    ["Mathematics", "MCQ", "Which of the following is an ODD number?", ["14", "32", "57", "80"], 2, "57 ends in 7, so it is odd.", "Even & Odd"],
    ["Mathematics", "MCQ", "What is the smallest 3-digit number?", ["99", "100", "101", "111"], 1, "100 is the smallest 3-digit number.", "Number Sense"],
    ["Mathematics", "MCQ", "What is the greatest 3-digit number?", ["900", "990", "999", "1000"], 2, "999 is the greatest 3-digit number.", "Number Sense"],
    ["Mathematics", "MCQ", "In a race, Aarav came 1st, Meera 2nd, and Kabir came after Meera. What is Kabir's ordinal position?", ["2nd", "3rd", "4th", "5th"], 1, "After 2nd comes 3rd (Third).", "Ordinal Numbers"],
    ["Mathematics", "MCQ", "In the word 'SCHOOL', which letter is at the 4th place from left?", ["C", "H", "O", "L"], 2, "1:S, 2:C, 3:H, 4:O.", "Ordinal Numbers"],
    ["Mathematics", "MCQ", "How many faces does a Cube have?", ["4", "6", "8", "12"], 1, "A cube has 6 flat square faces.", "3D Shapes"],
    ["Mathematics", "MCQ", "How many edges does a Cuboid have?", ["6", "8", "10", "12"], 3, "A cuboid has 12 edges and 8 corners.", "3D Shapes"],
    ["Mathematics", "MCQ", "How many corners (vertices) does a Sphere have?", ["0", "1", "2", "4"], 0, "A sphere is curved all around and has 0 corners.", "3D Shapes"],
    ["Mathematics", "MCQ", "A cylinder has how many flat circular faces?", ["1", "2", "3", "4"], 1, "A cylinder has 2 flat circular faces (top and bottom).", "3D Shapes"],
    ["Mathematics", "MCQ", "How many centimetres are there in 1 metre?", ["10 cm", "50 cm", "100 cm", "1000 cm"], 2, "1 metre = 100 centimetres.", "Measurement"],
    ["Mathematics", "MCQ", "How many grams are there in 1 kilogram?", ["100 g", "500 g", "1000 g", "200 g"], 2, "1 kg = 1000 g.", "Measurement"],
    ["Mathematics", "MCQ", "What do we use to measure the length of a pencil?", ["Litre jar", "Ruler (cm)", "Weighing balance", "Thermometer"], 1, "A ruler in centimetres measures small lengths.", "Measurement"],
    ["Mathematics", "MCQ", "Which unit is best for measuring milk in a packet?", ["Kilogram", "Metre", "Litre / Millilitre", "Hour"], 2, "Liquids like milk are measured in litres or millilitres.", "Measurement"],
    ["Mathematics", "MCQ", "How many seconds are there in 1 minute?", ["30", "45", "60", "100"], 2, "1 minute = 60 seconds.", "Time"],
    ["Mathematics", "MCQ", "How many hours are there in 1 full day?", ["12", "24", "36", "48"], 1, "1 day = 24 hours.", "Time"],
    ["Mathematics", "MCQ", "When the minute hand is at 6 and hour hand is between 2 and 3, the time is:", ["2:00", "2:30", "3:30", "6:00"], 1, "Minute hand at 6 means 30 minutes past the hour (2:30).", "Time"],
    ["Mathematics", "MCQ", "How many days does February have in a normal (non-leap) year?", ["28", "29", "30", "31"], 0, "February has 28 days in a normal year and 29 in a leap year.", "Calendar"],
    ["Mathematics", "MCQ", "Which month has 31 days?", ["April", "June", "July", "September"], 2, "July has 31 days.", "Calendar"],
    ["Mathematics", "MCQ", "How many paise make 1 Rupee?", ["10 paise", "50 paise", "100 paise", "1000 paise"], 2, "1 Rupee = 100 Paise.", "Money"],
    ["Mathematics", "MCQ", "How many ₹10 notes make ₹100?", ["5", "10", "20", "50"], 1, "10 × ₹10 = ₹100.", "Money"],
    ["Mathematics", "MCQ", "Sita has ₹50. She buys a notebook for ₹28. How much money is left?", ["₹22", "₹24", "₹32", "₹18"], 0, "50 − 28 = ₹22.", "Money"],
    ["Mathematics", "MCQ", "What is HALF (1/2) of 16?", ["4", "6", "8", "10"], 2, "16 ÷ 2 = 8.", "Fractions"],
    ["Mathematics", "MCQ", "What is ONE-QUARTER (1/4) of 20?", ["4", "5", "10", "15"], 1, "20 ÷ 4 = 5.", "Fractions"],
    ["Mathematics", "MCQ", "A pizza is cut into 4 equal slices. Riya eats 1 slice. What fraction did she eat?", ["1/2", "1/3", "1/4", "3/4"], 2, "1 out of 4 equal parts = 1/4.", "Fractions"],
    ["Mathematics", "SERIES_PUZZLE", "Find the missing number: 15, 22, 29, 36, ___", ["41", "43", "45", "42"], 1, "Add 7 each time: 36 + 7 = 43.", "Patterns"],
    ["Mathematics", "SERIES_PUZZLE", "Find the missing number: 90, 81, 72, 63, ___", ["54", "55", "52", "56"], 0, "Subtract 9 each time: 63 − 9 = 54.", "Patterns"],
    ["Mathematics", "SERIES_PUZZLE", "Complete: 100, 150, 200, 250, ___", ["275", "300", "350", "400"], 1, "Add 50 each time: 250 + 50 = 300.", "Patterns"],
    ["Mathematics", "SERIES_PUZZLE", "What comes next: A1, B2, C3, D4, ___", ["E4", "E5", "F5", "D5"], 1, "Letters advance +1 and numbers +1: E5.", "Patterns"],
    ["Mathematics", "MCQ", "Repeated addition: 7 + 7 + 7 + 7 + 7 = ?", ["7 × 4", "7 × 5", "7 × 6", "7 + 5"], 1, "Adding 7 five times equals 7 × 5 = 35.", "Multiplication"],
    ["Mathematics", "MCQ", "There are 8 packets with 6 crayons in each. Total crayons?", ["42", "46", "48", "54"], 2, "8 × 6 = 48 crayons.", "Word Problems"],
    ["Mathematics", "MCQ", "36 mangoes are shared equally among 6 children. How many does each get?", ["5", "6", "7", "8"], 1, "36 ÷ 6 = 6 mangoes each.", "Word Problems"],
    ["Mathematics", "MCQ", "A book has 120 pages. Aman read 45 pages. How many pages are unread?", ["65", "75", "85", "95"], 1, "120 − 45 = 75 pages left.", "Word Problems"],
    ["Mathematics", "MCQ", "In a garden there are 35 red roses, 25 yellow roses, and 40 white roses. Total roses?", ["90", "100", "110", "85"], 1, "35 + 25 + 40 = 100 roses.", "Word Problems"],
    ["Mathematics", "MCQ", "Which number is 10 MORE than 389?", ["379", "399", "409", "390"], 1, "389 + 10 = 399.", "Mental Maths"],
    ["Mathematics", "MCQ", "Which number is 100 LESS than 542?", ["442", "642", "532", "552"], 0, "542 − 100 = 442.", "Mental Maths"],
    ["Mathematics", "MCQ", "Double of 25 is:", ["40", "50", "60", "75"], 1, "25 + 25 = 50.", "Mental Maths"],
    ["Mathematics", "MCQ", "Which is GREATER: 345 or 354?", ["345", "354", "Both equal", "Cannot compare"], 1, "In tens place, 5 > 4, so 354 > 345.", "Comparison"],
    ["Mathematics", "MCQ", "Arrange in ascending (small to big) order: 89, 102, 76", ["102, 89, 76", "76, 89, 102", "89, 76, 102", "76, 102, 89"], 1, "76 < 89 < 102.", "Ordering"],
    ["Mathematics", "MCQ", "What is the sum of the smallest 2-digit number and greatest 1-digit number?", ["18", "19", "20", "109"], 1, "10 + 9 = 19.", "Number Sense"],
    ["Mathematics", "MCQ", "Any number multiplied by 0 equals:", ["The same number", "1", "0", "10"], 2, "Zero property: N × 0 = 0.", "Multiplication Properties"],
    ["Mathematics", "MCQ", "Any number multiplied by 1 equals:", ["0", "1", "The same number", "Double"], 2, "Identity property: N × 1 = N.", "Multiplication Properties"],
    ["Mathematics", "MCQ", "How many sides does a Pentagon have?", ["4", "5", "6", "8"], 1, "Penta means five; a pentagon has 5 sides.", "Shapes"],
    ["Mathematics", "MCQ", "How many sides does a Hexagon have?", ["5", "6", "7", "8"], 1, "Hexa means six; a hexagon has 6 sides.", "Shapes"],
    ["Mathematics", "TRUE_FALSE", "True or False: 5 × 6 gives the same answer as 6 × 5.", ["True", "False", "Only for even numbers", "Equals 11"], 0, "True! Order of multiplication does not change the product (30).", "Multiplication"],
    ["Mathematics", "TRUE_FALSE", "True or False: All 4 sides of a rectangle are always equal.", ["True", "False", "Only opposite sides are equal", "Has 3 sides"], 1, "False! In a rectangle, only opposite sides are equal (in a square all 4 are equal).", "Shapes"],
    ["Mathematics", "TRUE_FALSE", "True or False: 499 + 1 = 500.", ["True", "False", "490", "501"], 0, "True! 499 + 1 equals 500.", "Addition"],
    ["Mathematics", "MCQ", "Which 2-digit number can be formed using digits 3 and 8 that is the LARGEST?", ["38", "83", "88", "33"], 1, "Using 3 and 8 once, 83 is larger than 38.", "Number Formation"],
    ["Mathematics", "MCQ", "How many tens make 100?", ["5", "10", "20", "100"], 1, "10 × 10 = 100, so 10 tens make 100.", "Place Value"],
    ["Mathematics", "MCQ", "A clock shows 9:00. After 2 hours, what time will it show?", ["10:00", "11:00", "12:00", "7:00"], 1, "9 + 2 = 11:00.", "Time"],
    ["Mathematics", "MCQ", "If 4 bananas cost ₹20, what is the cost of 1 banana?", ["₹4", "₹5", "₹6", "₹10"], 1, "20 ÷ 4 = ₹5 per banana.", "Money & Division"],
  ];
  qs.push(...extraMaths);
  return qs;
}

// 3. HINDI (117)
const c2HindiParyay = buildFactBankTuples({
  subject: "Hindi",
  topicTag: "पर्यायवाची शब्द",
  seedPrefix: "c2_hin_par",
  explanationPrefix: "समान अर्थ वाला शब्द है:",
  items: [
    { prompt: "'सूर्य' का पर्यायवाची शब्द क्या है?", answer: "सूरज" },
    { prompt: "'पानी' का पर्यायवाची शब्द क्या है?", answer: "जल" },
    { prompt: "'फूल' का पर्यायवाची शब्द क्या है?", answer: "पुष्प" },
    { prompt: "'हवा' का पर्यायवाची शब्द क्या है?", answer: "पवन" },
    { prompt: "'आग' का पर्यायवाची शब्द क्या है?", answer: "अग्नि" },
    { prompt: "'चाँद' का पर्यायवाची शब्द क्या है?", answer: "चंद्रमा" },
    { prompt: "'धरती' का पर्यायवाची शब्द क्या है?", answer: "पृथ्वी" },
    { prompt: "'आकाश' का पर्यायवाची शब्द क्या है?", answer: "गगन" },
    { prompt: "'पेड़' का पर्यायवाची शब्द क्या है?", answer: "वृक्ष" },
    { prompt: "'घर' का पर्यायवाची शब्द क्या है?", answer: "भवन" },
    { prompt: "'आँख' का पर्यायवाची शब्द क्या है?", answer: "नयन" },
    { prompt: "'हाथ' का पर्यायवाची शब्द क्या है?", answer: "कर" },
    { prompt: "'मित्र' का पर्यायवाची शब्द क्या है?", answer: "दोस्त" },
    { prompt: "'पहाड़' का पर्यायवाची शब्द क्या है?", answer: "पर्वत" },
    { prompt: "'राजा' का पर्यायवाची शब्द क्या है?", answer: "नृप" },
    { prompt: "'बादल' का पर्यायवाची शब्द क्या है?", answer: "मेघ" },
    { prompt: "'नदी' का पर्यायवाची शब्द क्या है?", answer: "सरिता" },
    { prompt: "'पक्षी' का पर्यायवाची शब्द क्या है?", answer: "खग" },
  ],
});

const c2HindiVilom = buildFactBankTuples({
  subject: "Hindi",
  topicTag: "विलोम शब्द",
  seedPrefix: "c2_hin_vil",
  explanationPrefix: "सही विलोम शब्द है:",
  items: [
    { prompt: "'सत्य' का विलोम शब्द क्या है?", answer: "असत्य" },
    { prompt: "'हार' का विलोम शब्द क्या है?", answer: "जीत" },
    { prompt: "'लाभ' का विलोम शब्द क्या है?", answer: "हानि" },
    { prompt: "'मेहनती' का विलोम शब्द क्या है?", answer: "आलसी" },
    { prompt: "'सच्चा' का विलोम शब्द क्या है?", answer: "झूठा" },
    { prompt: "'कठोर' का विलोम शब्द क्या है?", answer: "कोमल" },
    { prompt: "'मित्र' का विलोम शब्द क्या है?", answer: "शत्रु" },
    { prompt: "'वीर' का विलोम शब्द क्या है?", answer: "कायर" },
    { prompt: "'अंधेरा' का विलोम शब्द क्या है?", answer: "उजाला" },
    { prompt: "'स्वतंत्र' का विलोम शब्द क्या है?", answer: "परतंत्र" },
    { prompt: "'सस्ता' का विलोम शब्द क्या है?", answer: "महँगा" },
    { prompt: "'जन्म' का विलोम शब्द क्या है?", answer: "मृत्यु" },
    { prompt: "'अमीर' का विलोम शब्द क्या है?", answer: "गरीब" },
    { prompt: "'तेज़' का विलोम शब्द क्या है?", answer: "धीमा" },
    { prompt: "'साफ़' का विलोम शब्द क्या है?", answer: "गंदा" },
    { prompt: "'प्रातः' का विलोम शब्द क्या है?", answer: "सायं" },
  ],
});

const c2HindiOneWord = buildFactBankTuples({
  subject: "Hindi",
  topicTag: "अनेक शब्दों के लिए एक शब्द",
  seedPrefix: "c2_hin_one",
  explanationPrefix: "सही एक शब्द है:",
  items: [
    { prompt: "जो चित्र बनाता हो:", answer: "चित्रकार" },
    { prompt: "जो खेतों में अनाज उगाता हो:", answer: "किसान" },
    { prompt: "जो मिट्टी के बर्तन बनाता हो:", answer: "कुम्हार" },
    { prompt: "जो कपड़े सिलता हो:", answer: "दर्जी" },
    { prompt: "जो लोहे का काम करता हो:", answer: "लोहार" },
    { prompt: "जो सोने के गहने बनाता हो:", answer: "सुनार" },
    { prompt: "जो बच्चों को पढ़ाता हो:", answer: "अध्यापक" },
    { prompt: "जो रोगियों का इलाज करता हो:", answer: "चिकित्सक" },
    { prompt: "जो कविता लिखता हो:", answer: "कवि" },
    { prompt: "जो प्रतिदिन होता हो:", answer: "दैनिक" },
    { prompt: "जो सप्ताह में एक बार होता हो:", answer: "साप्ताहिक" },
    { prompt: "जो कभी न मरे:", answer: "अमर" },
    { prompt: "जिसका कोई आकार न हो:", answer: "निराकार" },
    { prompt: "जहाँ पढ़ने के लिए किताबें रखी हों:", answer: "पुस्तकालय" },
    { prompt: "जो भारत में रहता हो:", answer: "भारतीय" },
  ],
});

const c2HindiCore: QTuple[] = [
  ["Hindi", "MCQ", "'क्ष, त्र, ज्ञ, श्र' को हिंदी में क्या कहते हैं?", ["स्वर", "संयुक्त व्यंजन", "अयोगवाह", "मात्रा"], 1, "ये चारों दो व्यंजनों के मेल से बने संयुक्त व्यंजन हैं।", "वर्ण विचार"],
  ["Hindi", "MCQ", "'क्ष' किसके मेल से बनता है?", ["क् + ष", "क् + श", "च् + छ", "त् + र"], 0, "क् + ष = क्ष।", "संयुक्त व्यंजन"],
  ["Hindi", "MCQ", "'त्र' किसके मेल से बनता है?", ["त् + र", "ट् + र", "थ् + र", "द् + र"], 0, "त् + र = त्र।", "संयुक्त व्यंजन"],
  ["Hindi", "MCQ", "इनमें से कौन-सा शब्द 'व्यक्तिवाचक संज्ञा' (Proper Noun) है?", ["नदी", "पहाड़", "हिमालय", "शहर"], 2, "हिमालय एक विशेष पर्वत का नाम है।", "संज्ञा"],
  ["Hindi", "MCQ", "इनमें से 'सर्वनाम' (Pronoun) शब्द कौन-सा है?", ["राम", "वह", "सुंदर", "लिखना"], 1, "'वह' संज्ञा के स्थान पर प्रयुक्त होने वाला सर्वनाम है।", "सर्वनाम"],
  ["Hindi", "MCQ", "'मीठा आम' में विशेषण शब्द कौन-सा है?", ["आम", "मीठा", "दोनों", "कोई नहीं"], 1, "'मीठा' आम के स्वाद की विशेषता बता रहा है।", "विशेषण"],
  ["Hindi", "MCQ", "'नीला आकाश' में विशेष्य (जिसकी विशेषता बताई जाए) क्या है?", ["नीला", "आकाश", "दोनों", "कोई नहीं"], 1, "आकाश की विशेषता बताई जा रही है, अतः आकाश विशेष्य है।", "विशेषण"],
  ["Hindi", "MCQ", "वाक्य में क्रिया शब्द चुनिए: 'राधा मधुर गीत गाती है।'", ["राधा", "मधुर", "गीत", "गाती है"], 3, "'गाती है' काम (क्रिया) है।", "क्रिया"],
  ["Hindi", "MCQ", "शुद्ध वर्तनी वाला शब्द चुनिए (खुश होना):", ["प्रसन्न", "प्रसन", "परसन्न", "प्रषण"], 0, "सही शब्द 'प्रसन्न' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "शुद्ध वर्तनी वाला शब्द चुनिए (पाठशाला):", ["विध्यालय", "विद्यालय", "विधालय", "विदयालय"], 1, "सही शब्द 'विद्यालय' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "शुद्ध वर्तनी वाला शब्द चुनिए (बड़ों की दुआ):", ["आशीर्वाद", "आशिर्वाद", "आशीरवाद", "अशीर्वाद"], 0, "सही वर्तनी 'आशीर्वाद' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "शुद्ध वर्तनी वाला शब्द चुनिए (पीला फूल):", ["सूरजमुखी", "सुरजमुखी", "सूरजमुकी", "सूराजमुखी"], 0, "सही शब्द 'सूरजमुखी' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "शुद्ध वर्तनी वाला शब्द चुनिए (उत्सव):", ["त्योहार", "त्यौहार", "तेवहार", "तियोहार"], 0, "मानक हिंदी में 'त्योहार' (एक मात्रा) शुद्ध है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "शुद्ध वर्तनी वाला शब्द चुनिए (कविता लिखने वाला):", ["कवि", "कवी", "कावि", "कबी"], 0, "सही वर्तनी 'कवि' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "मुहावरे का अर्थ बताइए: 'आँखों का तारा होना'", ["बहुत दुखी होना", "बहुत प्यारा होना", "आँख में दर्द", "भाग जाना"], 1, "'आँखों का तारा' का अर्थ है बहुत प्यारा होना।", "मुहावरे"],
  ["Hindi", "MCQ", "मुहावरे का अर्थ बताइए: 'नौ दो ग्यारह होना'", ["गिनती सीखना", "भाग जाना", "जोड़ करना", "सो जाना"], 1, "'नौ दो ग्यारह होना' मतलब चुपचाप भाग जाना।", "मुहावरे"],
  ["Hindi", "MCQ", "मुहावरे का अर्थ बताइए: 'पेट में चूहे कूदना'", ["बीमार होना", "बहुत ज़ोर की भूख लगना", "हँसी आना", "डर जाना"], 1, "बहुत तेज भूख लगने पर ऐसा कहते हैं।", "मुहावरे"],
  ["Hindi", "MCQ", "मुहावरे का अर्थ बताइए: 'अंगूठा दिखाना'", ["मदद के लिए मना कर देना", "इशारा करना", "जीत जाना", "आशीर्वाद देना"], 0, "'अंगूठा दिखाना' का अर्थ है साफ़ मना कर देना।", "मुहावरे"],
  ["Hindi", "MCQ", "'हाथ बँटाना' मुहावरे का क्या अर्थ है?", ["लड़ाई करना", "काम में मदद करना", "हाथ धोना", "ताली बजाना"], 1, "'हाथ बँटाना' यानी किसी की सहायता करना।", "मुहावरे"],
  ["Hindi", "MCQ", "वर्ष में कुल कितने महीने होते हैं?", ["10", "11", "12", "13"], 2, "एक साल में 12 महीने होते हैं।", "महीने"],
  ["Hindi", "MCQ", "अप्रैल के बाद कौन-सा महीना आता है?", ["मार्च", "मई", "जून", "जुलाई"], 1, "अप्रैल के बाद मई आता है।", "महीने"],
  ["Hindi", "MCQ", "हिंदी महीनों में पहला महीना कौन-सा है?", ["वैशाख", "चैत्र", "फागुन", "सावन"], 1, "हिंदी पंचांग का पहला महीना चैत्र होता है।", "हिंदी महीने"],
  ["Hindi", "MCQ", "संख्या '49' को हिंदी में क्या कहते हैं?", ["उनतालिस", "उनचास", "उनसठ", "चवालीस"], 1, "49 को उनचास कहते हैं।", "हिंदी गिनती"],
  ["Hindi", "MCQ", "संख्या '75' को हिंदी में क्या कहते हैं?", ["पचहत्तर", "पचासी", "पैंसठ", "सत्तासी"], 0, "75 को पचहत्तर कहते हैं।", "हिंदी गिनती"],
  ["Hindi", "MCQ", "संख्या '39' को हिंदी शब्दों में क्या कहते हैं?", ["उन्तीस", "उनतालीस", "सैंतीस", "चालीस"], 1, "39 को उनतालीस कहते हैं।", "हिंदी गिनती"],
  ["Hindi", "FILL_BLANK", "सही कारक चिह्न चुनें: मेज़ ___ पुस्तक रखी है।", ["ने", "पर", "को", "से"], 1, "ऊपर रखने के लिए 'पर' का प्रयोग होता है।", "कारक"],
  ["Hindi", "FILL_BLANK", "सही शब्द चुनें: राम ___ रावण को मारा।", ["को", "ने", "से", "में"], 1, "कर्ता कारक के साथ भूतकाल में 'ने' आता है।", "कारक"],
  ["Hindi", "FILL_BLANK", "सही वचन चुनें: बगीचे में बहुत सारे ___ खिले हैं।", ["फूल", "फूलें", "फूलों", "फूला"], 0, "'फूल' शब्द एकवचन व बहुवचन में समान रहता है ('फूल खिले हैं')।", "वचन प्रयोग"],
  ["Hindi", "FILL_BLANK", "सही सर्वनाम चुनें: ___ आज स्कूल नहीं जाऊँगा।", ["तुम", "मैं", "वे", "आप"], 1, "'जाऊँगा' क्रिया के साथ उत्तम पुरुष 'मैं' सही है।", "सर्वनाम"],
  ["Hindi", "MCQ", "वाक्य के अंत में प्रश्न पूछने पर कौन-सा चिह्न लगता है?", ["पूर्ण विराम (।)", "प्रश्नवाचक चिह्न (?)", "अल्पविराम (,)", "विस्मयादिबोधक (!)"], 1, "प्रश्न पूछने पर '?' लगता है।", "विराम चिह्न"],
  ["Hindi", "MCQ", "वाक्य पूरा होने पर हिंदी में कौन-सा चिह्न लगता है?", ["पूर्ण विराम (।)", "अल्पविराम (,)", "योजक चिह्न (-)", "प्रश्न चिह्न (?)"], 0, "हिंदी वाक्य के अंत में पूर्ण विराम (।) लगाते हैं।", "विराम चिह्न"],
  ["Hindi", "MCQ", "'चिड़िया' शब्द का लिंग क्या है?", ["पुल्लिंग", "स्त्रीलिंग", "नपुंसकलिंग", "दोनों"], 1, "चिड़िया उड़ती है — अतः स्त्रीलिंग है।", "लिंग"],
  ["Hindi", "MCQ", "'पेड़' शब्द का लिंग क्या है?", ["पुल्लिंग", "स्त्रीलिंग", "उभयलिंग", "कोई नहीं"], 0, "पेड़ बड़ा होता है — अतः पुल्लिंग है।", "लिंग"],
  ["Hindi", "MCQ", "'सच्चाई' किस प्रकार की संज्ञा है?", ["व्यक्तिवाचक", "जातिवाचक", "भाववाचक", "समूहवाचक"], 2, "सच्चाई एक गुण/भाव है, अतः भाववाचक संज्ञा है।", "संज्ञा"],
  ["Hindi", "MCQ", "'बचपन' कौन-सी संज्ञा है?", ["भाववाचक", "व्यक्तिवाचक", "द्रव्यवाचक", "जातिवाचक"], 0, "बचपन एक अवस्था का भाव है।", "संज्ञा"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (सर्वनाम और संज्ञा):", ["मैं", "तुम", "हम", "आगरा"], 3, "मैं, तुम, हम सर्वनाम हैं; आगरा संज्ञा है।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (क्रिया और वस्तु):", ["दौड़ना", "कूदना", "पढ़ना", "मेज़"], 3, "दौड़ना, कूदना, पढ़ना क्रिया हैं; मेज़ संज्ञा है।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (रंग और स्वाद):", ["लाल", "नीला", "मीठा", "हरा"], 2, "लाल, नीला, हरा रंग हैं; मीठा स्वाद है।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (नदी और स्मारक):", ["गंगा", "ताजमहल", "लालकिला", "कुतुबमीनार"], 0, "गंगा नदी है, बाकी इमारतें हैं।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (नदी और पर्वत):", ["सरस्वती", "हिमालय", "विंध्याचल", "अरावली"], 0, "सरस्वती नदी है, बाकी पर्वत हैं।", "वर्गीकरण"],
  ["Hindi", "MCQ", "'महात्मा गांधी' को हम प्यार से क्या कहते हैं?", ["चाचा", "बापू", "नेताजी", "गुरुदेव"], 1, "महात्मा गांधी को बापू या राष्ट्रपिता कहते हैं।", "महापुरुष"],
  ["Hindi", "MCQ", "'जन-गण-मन' किसने लिखा है?", ["बंकिमचंद्र चटर्जी", "रवींद्रनाथ टैगोर", "मुंशी प्रेमचंद", "कबीरदास"], 1, "राष्ट्रगान 'जन-गण-मन' गुरुदेव रवींद्रनाथ टैगोर ने लिखा।", "राष्ट्रगान"],
  ["Hindi", "MCQ", "'पञ्चतंत्र' की कहानियाँ किसके लिए प्रसिद्ध हैं?", ["नैतिक शिक्षा (Moral)", "गणित के सूत्र", "भूगोल", "विज्ञान प्रयोग"], 0, "पंचतंत्र की कहानियाँ अच्छी सीख और नैतिक मूल्य सिखाती हैं।", "साहित्य"],
  ["Hindi", "MCQ", "'उप-' उपसर्ग लगाकर 'कार' से कौन-सा नया शब्द बनेगा?", ["उपकार", "सुकार", "अकार", "निकार"], 0, "उप + कार = उपकार।", "उपसर्ग"],
  ["Hindi", "MCQ", "'सु-' उपसर्ग लगाकर 'पुत्र' से कौन-सा शब्द बनेगा?", ["कुपुत्र", "सुपुत्र", "अपुत्र", "निपुत्र"], 1, "सु + पुत्र = सुपुत्र (अच्छा पुत्र)।", "उपसर्ग"],
  ["Hindi", "MCQ", "दो शब्दों को जोड़ने पर 'पाठ + शाला' क्या बनेगा?", ["पाठशाल", "पाठशाला", "पठशाला", "पाठीशाला"], 1, "पाठ + शाला = पाठशाला।", "शब्द रचना"],
  ["Hindi", "MCQ", "दो शब्दों को जोड़ने पर 'विद्या + आलय' क्या बनेगा?", ["विद्याआलय", "विद्यालय", "विध्यालय", "विद्यलय"], 1, "विद्या + आलय = विद्यालय।", "संधि परिचय"],
  ["Hindi", "MCQ", "'रसोई + घर' से बना शब्द कौन-सा है?", ["रसोईघर", "रसोयाघर", "रसोईदार", "घररसोई"], 0, "रसोई + घर = रसोईघर।", "शब्द रचना"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: 'सूर्य' एक तारा है जो हमें प्रकाश देता है।", ["सही", "गलत", "ग्रह है", "उपग्रह है"], 0, "सूर्य पृथ्वी के सबसे निकट का तारा है।", "तथ्य"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: 'हम' एकवचन सर्वनाम है।", ["सही", "गलत", "संज्ञा है", "विशेषण है"], 1, "गलत! 'हम' बहुवचन सर्वनाम है।", "सर्वनाम"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: 'अतः' और 'किन्तु' संज्ञा शब्द हैं।", ["सही", "गलत", "विशेषण हैं", "क्रिया हैं"], 1, "गलत! ये योजक / अव्यय शब्द हैं।", "व्याकरण"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: किसी व्यक्ति, वस्तु, स्थान या भाव के नाम को संज्ञा कहते हैं।", ["सही", "गलत", "सर्वनाम कहते हैं", "क्रिया कहते हैं"], 0, "सही! यही संज्ञा की परिभाषा है।", "संज्ञा"],
  ["Hindi", "MINI_PASSAGE", "राजू को रास्ते में क्या मिला?", ["एक सोने का सिक्का", "एक घायल कबूतर", "एक नई घड़ी", "एक बस्ता"], 1, "गद्यांश में राजू को एक घायल कबूतर मिला।", "अपठित गद्यांश", "एक दिन राजू स्कूल जा रहा था। रास्ते में उसे एक घायल कबूतर मिला। राजू ने उसे घर लाकर पानी पिलाया और उसके पंख पर पट्टी बाँधी। कुछ दिनों में कबूतर ठीक होकर उड़ गया।"],
  ["Hindi", "MINI_PASSAGE", "राजू ने कबूतर की मदद कैसे की?", ["उसे भगा दिया", "पानी पिलाया और पट्टी बाँधी", "पिंजरे में बंद कर दिया", "जंगल में छोड़ दिया"], 1, "राजू ने कबूतर को पानी पिलाया और पट्टी बाँधी।", "अपठित गद्यांश", "एक दिन राजू स्कूल जा रहा था। रास्ते में उसे एक घायल कबूतर मिला। राजू ने उसे घर लाकर पानी पिलाया और उसके पंख पर पट्टी बाँधी। कुछ दिनों में कबूतर ठीक होकर उड़ गया।"],
  ["Hindi", "MINI_PASSAGE", "गर्मी की छुट्टियों में सोनू कहाँ गया?", ["मामा के गाँव", "शिमला", "मुंबई", "दिल्ली"], 0, "सोनू अपने मामा के गाँव गया।", "अपठित गद्यांश", "गर्मी की छुट्टियों में सोनू अपने मामा के गाँव गया। वहाँ हरे-भरे खेत और आम के बाग़ थे। उसने ताज़े मीठे आम खाए और खूब आनंद लिया।"],
  ["Hindi", "MINI_PASSAGE", "गाँव में सोनू ने क्या खाए?", ["सेब", "ताज़े मीठे आम", "अंगूर", "संतरे"], 1, "उसने बाग़ के ताज़े मीठे आम खाए।", "अपठित गद्यांश", "गर्मी की छुट्टियों में सोनू अपने मामा के गाँव गया। वहाँ हरे-भरे खेत और आम के बाग़ थे। उसने ताज़े मीठे आम खाए और खूब आनंद लिया।"],
  ["Hindi", "MCQ", "'जो मीठा गाती है' — कोयल की आवाज़ कैसी होती है?", ["कड़वी", "मधुर", "कर्कश", "तेज़"], 1, "कोयल अपनी मधुर (मीठी) कूक के लिए प्रसिद्ध है।", "भाषा ज्ञान"],
  ["Hindi", "MCQ", "तिरंगे में सबसे ऊपर कौन-सा रंग होता है?", ["हरा", "सफ़ेद", "केसरिया", "नीला"], 2, "राष्ट्रीय ध्वज में सबसे ऊपर केसरिया रंग होता है।", "राष्ट्रीय प्रतीक"],
  ["Hindi", "MCQ", "तिरंगे के बीच में स्थित अशोक चक्र में कितनी तीलियाँ होती हैं?", ["12", "20", "24", "32"], 2, "अशोक चक्र में 24 तीलियाँ होती हैं।", "राष्ट्रीय प्रतीक"],
  ["Hindi", "MCQ", "'जिसका अंत न हो' उसके लिए एक शब्द:", ["अनंत", "अल्प", "आदि", "अजेय"], 0, "जिसका अंत न हो उसे अनंत कहते हैं।", "शब्द ज्ञान"],
  ["Hindi", "MCQ", "नीचे दिए शब्दों को सही वर्णमाला क्रम में पहला कौन आएगा?", ["कमल", "अमर", "गगन", "जल"], 1, "स्वर 'अ' से शुरू होने वाला 'अमर' सबसे पहले आएगा।", "शब्दकोश क्रम"],
  ["Hindi", "MCQ", "'दयालु' शब्द का अर्थ क्या है?", ["कठोर", "दया करने वाला", "लालची", "घमंडी"], 1, "दयालु मतलब दूसरों पर दया करने वाला।", "शब्दार्थ"],
  ["Hindi", "MCQ", "'प्रशंसा' शब्द का अर्थ है:", ["बुराई", "तारीफ़", "सज़ा", "नाराज़गी"], 1, "प्रशंसा का अर्थ तारीफ़ या बड़ाई करना है।", "शब्दार्थ"],
  ["Hindi", "MCQ", "'अवकाश' शब्द का क्या अर्थ है?", ["छुट्टी", "परीक्षा", "मेहनत", "शोर"], 0, "अवकाश का अर्थ छुट्टी होता है।", "शब्दार्थ"],
  ["Hindi", "MCQ", "'सदैव' शब्द का अर्थ है:", ["कभी-कभी", "हमेशा", "कल", "शायद"], 1, "सदैव का अर्थ हमेशा होता है।", "शब्दार्थ"],
  ["Hindi", "MCQ", "'परिश्रम' शब्द का अर्थ क्या है?", ["आराम", "मेहनत", "खेल", "नींद"], 1, "परिश्रम का अर्थ मेहनत करना है।", "शब्दार्थ"],
  ["Hindi", "MCQ", "'सहायता' का अर्थ है:", ["मदद", "रोकना", "तोड़ना", "भूलना"], 0, "सहायता का अर्थ मदद होता है।", "शब्दार्थ"],
  ["Hindi", "MCQ", "'गौरव' शब्द का अर्थ है:", ["शर्म", "सम्मान / गर्व", "डर", "दुख"], 1, "गौरव का अर्थ सम्मान या गर्व है।", "शब्दार्थ"],
];

// 4. EVS / GK (116)
const c2EvsStates = buildFactBankTuples({
  subject: "EVS / GK",
  topicTag: "States & Capitals",
  seedPrefix: "c2_evs_cap",
  explanationPrefix: "Capital city is",
  items: [
    { prompt: "What is the capital of Maharashtra?", answer: "Mumbai" },
    { prompt: "What is the capital of West Bengal?", answer: "Kolkata" },
    { prompt: "What is the capital of Tamil Nadu?", answer: "Chennai" },
    { prompt: "What is the capital of Rajasthan?", answer: "Jaipur" },
    { prompt: "What is the capital of Uttar Pradesh?", answer: "Lucknow" },
    { prompt: "What is the capital of Bihar?", answer: "Patna" },
    { prompt: "What is the capital of Gujarat?", answer: "Gandhinagar" },
    { prompt: "What is the capital of Karnataka?", answer: "Bengaluru" },
    { prompt: "What is the capital of Punjab?", answer: "Chandigarh" },
    { prompt: "What is the capital of Kerala?", answer: "Thiruvananthapuram" },
    { prompt: "What is the capital of Assam?", answer: "Dispur" },
    { prompt: "What is the capital of Madhya Pradesh?", answer: "Bhopal" },
  ],
});

const c2EvsFestivals = buildFactBankTuples({
  subject: "EVS / GK",
  topicTag: "Indian Festivals",
  seedPrefix: "c2_evs_fest",
  explanationPrefix: "Correct match:",
  items: [
    { prompt: "Pongal is the famous harvest festival of which state?", answer: "Tamil Nadu" },
    { prompt: "Onam is celebrated with snake boat races in which state?", answer: "Kerala" },
    { prompt: "Bihu is the famous folk festival of which state?", answer: "Assam" },
    { prompt: "Durga Puja is the grandest festival of which state?", answer: "West Bengal" },
    { prompt: "Ganesh Chaturthi is celebrated grandly in which state?", answer: "Maharashtra" },
    { prompt: "Garba dance is famous during Navratri in which state?", answer: "Gujarat" },
    { prompt: "Lohri is celebrated with bonfires in which state?", answer: "Punjab" },
    { prompt: "Chhath Puja is a major Sun-worship festival of which state?", answer: "Bihar" },
  ],
});

const c2EvsCore: QTuple[] = [
  // Human Body, Food, Houses, Plants, Animals, Space, India GK, Safety, Science Basics (96)
  ["EVS / GK", "MCQ", "Which internal organ pumps blood to the whole body?", ["Brain", "Heart", "Lungs", "Stomach"], 1, "The heart pumps blood continuously through our body.", "Human Body"],
  ["EVS / GK", "MCQ", "Which internal organ helps us think and remember?", ["Heart", "Brain", "Kidney", "Liver"], 1, "The brain controls thinking, memory, and body movements.", "Human Body"],
  ["EVS / GK", "MCQ", "Which organs help us BREATHE air?", ["Lungs", "Heart", "Stomach", "Bones"], 0, "Our two lungs help us breathe in oxygen.", "Human Body"],
  ["EVS / GK", "MCQ", "Where does our eaten food go to get digested first after swallowing?", ["Lungs", "Stomach", "Brain", "Heart"], 1, "Food reaches the stomach for digestion.", "Human Body"],
  ["EVS / GK", "MCQ", "How many bones are there in an adult human body?", ["106", "206", "306", "406"], 1, "An adult human skeleton has 206 bones.", "Human Body"],
  ["EVS / GK", "MCQ", "What gives shape and support to our body?", ["Muscles", "Skeleton (Bones)", "Blood", "Skin"], 1, "The bony skeleton gives shape and support.", "Human Body"],
  ["EVS / GK", "MCQ", "Which food group gives us instant ENERGY to play and work?", ["Energy-giving food (Rice, Wheat, Sugar)", "Only water", "Only salt", "Spices"], 0, "Carbohydrates like rice, roti, and potatoes give energy.", "Food & Nutrition"],
  ["EVS / GK", "MCQ", "Which foods are called 'Body-building foods'?", ["Chips and candy", "Pulses, Milk, Eggs", "Soda", "Pickles"], 1, "Proteins (dal, milk, eggs, paneer) help us grow.", "Food & Nutrition"],
  ["EVS / GK", "MCQ", "Fruits and vegetables are called:", ["Junk food", "Protective food", "Fast food", "Dry food"], 1, "Fruits and vegetables protect us from diseases.", "Food & Nutrition"],
  ["EVS / GK", "MCQ", "Which vitamin do we get from early morning sunlight?", ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"], 2, "Sunlight helps our skin make Vitamin D for strong bones.", "Health"],
  ["EVS / GK", "MCQ", "A house made of snow blocks in very cold places is called an:", ["Tent", "Igloo", "Hut", "Caravan"], 1, "Inuit people in snowy regions build Igloos.", "Types of Houses"],
  ["EVS / GK", "MCQ", "A house that floats on water (like in Kashmir's Dal Lake) is called a:", ["Bungalow", "Houseboat", "Igloo", "Stilt house"], 1, "A houseboat floats on lakes and rivers.", "Types of Houses"],
  ["EVS / GK", "MCQ", "A movable house made of canvas cloth used by campers is called a:", ["Tent", "Flat", "Palace", "Hut"], 0, "A tent is easy to carry and pitch anywhere.", "Types of Houses"],
  ["EVS / GK", "MCQ", "Why do houses in heavy-rain areas have SLOPING roofs?", ["To look pretty", "So rainwater slides off easily", "To store snow", "To catch birds"], 1, "Sloping roofs let rainwater and snow slide off.", "Types of Houses"],
  ["EVS / GK", "MCQ", "Houses built on wooden poles in flood-prone areas (like Assam) are called:", ["Igloos", "Stilt houses", "Tents", "Huts"], 1, "Stilt houses stand above water on poles.", "Types of Houses"],
  ["EVS / GK", "MCQ", "What are big and strong plants with thick woody trunks called?", ["Herbs", "Shrubs", "Trees", "Creepers"], 2, "Trees like Mango and Banyan have thick trunks.", "Plants"],
  ["EVS / GK", "MCQ", "Plants with soft green stems like Mint and Spinach are called:", ["Trees", "Herbs", "Shrubs", "Climbers"], 1, "Herbs are small plants with soft green stems.", "Plants"],
  ["EVS / GK", "MCQ", "Which plant needs support to climb upwards, like Money Plant or Pea?", ["Climber", "Tree", "Herb", "Cactus"], 0, "Climbers have weak stems and climb with support.", "Plants"],
  ["EVS / GK", "MCQ", "Which plant grows well in deserts and has thorns instead of broad leaves?", ["Lotus", "Cactus", "Mango", "Banana"], 1, "Cactus grows in dry deserts and stores water in its stem.", "Plants"],
  ["EVS / GK", "MCQ", "Which flower always turns towards the Sun?", ["Rose", "Lotus", "Sunflower", "Jasmine"], 2, "A sunflower faces the direction of the Sun.", "Plants"],
  ["EVS / GK", "MCQ", "Animals that eat ONLY plants are called:", ["Carnivores", "Herbivores", "Omnivores", "Scavengers"], 1, "Cow, deer, and goat are herbivores (plant-eaters).", "Animals"],
  ["EVS / GK", "MCQ", "Animals that eat ONLY the flesh of other animals are called:", ["Herbivores", "Carnivores", "Omnivores", "Domestic"], 1, "Lion and tiger are carnivores.", "Animals"],
  ["EVS / GK", "MCQ", "Animals like Bear and Crow that eat BOTH plants and flesh are called:", ["Herbivores", "Carnivores", "Omnivores", "Reptiles"], 2, "Omnivores eat both plant and animal foods.", "Animals"],
  ["EVS / GK", "MCQ", "Which animal is an amphibian (can live both on land and in water)?", ["Fish", "Frog", "Cat", "Sparrow"], 1, "Frogs and toads live on land and in water.", "Animals"],
  ["EVS / GK", "MCQ", "Which is the largest water mammal in the world?", ["Shark", "Blue Whale", "Dolphin", "Octopus"], 1, "The Blue Whale is the largest animal on Earth.", "Animals"],
  ["EVS / GK", "MCQ", "Which mammal can fly?", ["Ostrich", "Bat", "Penguin", "Peacock"], 1, "A bat is the only mammal capable of true flight.", "Animals"],
  ["EVS / GK", "MCQ", "Which animal gives us silk threads?", ["Honeybee", "Silkworm", "Earthworm", "Spider"], 1, "Silkworms spin cocoons from which silk is obtained.", "Animals"],
  ["EVS / GK", "MCQ", "What do bees collect from flowers to make honey?", ["Water", "Nectar", "Seeds", "Leaves"], 1, "Bees collect sweet nectar from flowers.", "Insects"],
  ["EVS / GK", "MCQ", "How many legs does an insect (like an ant or housefly) have?", ["4", "6", "8", "10"], 1, "All insects have 6 legs.", "Insects"],
  ["EVS / GK", "MCQ", "How many legs does a spider have?", ["4", "6", "8", "10"], 2, "Spiders are arachnids and have 8 legs.", "Insects & Arachnids"],
  ["EVS / GK", "MCQ", "How many planets are there in our Solar System?", ["7", "8", "9", "10"], 1, "There are 8 planets orbiting the Sun.", "Solar System"],
  ["EVS / GK", "MCQ", "Which planet is closest to the Sun?", ["Venus", "Mercury", "Earth", "Mars"], 1, "Mercury is the closest planet to the Sun.", "Solar System"],
  ["EVS / GK", "MCQ", "Which planet is known as the 'Red Planet'?", ["Venus", "Mars", "Jupiter", "Saturn"], 1, "Mars looks red due to iron oxide dust.", "Solar System"],
  ["EVS / GK", "MCQ", "Which is the LARGEST planet in our Solar System?", ["Earth", "Saturn", "Jupiter", "Uranus"], 2, "Jupiter is the largest planet.", "Solar System"],
  ["EVS / GK", "MCQ", "Which planet has beautiful rings around it?", ["Mars", "Venus", "Saturn", "Mercury"], 2, "Saturn is famous for its icy rings.", "Solar System"],
  ["EVS / GK", "MCQ", "Which planet is called the 'Blue Planet' because 71% is water?", ["Earth", "Neptune", "Mars", "Venus"], 0, "Earth looks blue from space due to its oceans.", "Solar System"],
  ["EVS / GK", "MCQ", "What is the Earth's natural satellite?", ["Sun", "Moon", "Mars", "Pole Star"], 1, "The Moon revolves around the Earth.", "Solar System"],
  ["EVS / GK", "MCQ", "Which direction does the Sun SET in?", ["East", "West", "North", "South"], 1, "The Sun rises in the East and sets in the West.", "Directions"],
  ["EVS / GK", "MCQ", "How many main directions are there?", ["2", "4", "6", "8"], 1, "The 4 cardinal directions are North, South, East, West.", "Directions"],
  ["EVS / GK", "MCQ", "Which instrument shows direction using a magnetic needle?", ["Thermometer", "Compass", "Barometer", "Clock"], 1, "A magnetic compass always points North-South.", "Instruments"],
  ["EVS / GK", "MCQ", "Who was the first Prime Minister of India?", ["Mahatma Gandhi", "Pt. Jawaharlal Nehru", "Dr. Rajendra Prasad", "Sardar Patel"], 1, "Pandit Jawaharlal Nehru was India's first Prime Minister.", "India GK"],
  ["EVS / GK", "MCQ", "Who was the first President of India?", ["Dr. S. Radhakrishnan", "Dr. Rajendra Prasad", "Dr. APJ Abdul Kalam", "Mahatma Gandhi"], 1, "Dr. Rajendra Prasad was the first President of India.", "India GK"],
  ["EVS / GK", "MCQ", "Who is known as the 'Father of the Nation' in India?", ["Subhash Chandra Bose", "Mahatma Gandhi", "Bhagat Singh", "Bal Gangadhar Tilak"], 1, "Mahatma Gandhi is honoured as the Father of the Nation.", "India GK"],
  ["EVS / GK", "MCQ", "Who is called the 'Missile Man of India'?", ["C.V. Raman", "Dr. A.P.J. Abdul Kalam", "Homi Bhabha", "Vikram Sarabhai"], 1, "Dr. A.P.J. Abdul Kalam was India's Missile Man and 11th President.", "India GK"],
  ["EVS / GK", "MCQ", "Which is the longest river of India?", ["Yamuna", "Ganga", "Kaveri", "Narmada"], 1, "The Ganga (2525 km) is India's longest river.", "India Geography"],
  ["EVS / GK", "MCQ", "Which city is known as the 'Pink City' of India?", ["Udaipur", "Jaipur", "Jodhpur", "Agra"], 1, "Jaipur in Rajasthan is called the Pink City.", "India GK"],
  ["EVS / GK", "MCQ", "Which is the National Song of India?", ["Jana Gana Mana", "Vande Mataram", "Sare Jahan Se Achha", "Ae Mere Watan"], 1, "Vande Mataram is India's National Song.", "National Symbols"],
  ["EVS / GK", "MCQ", "Which is the National Aquatic Animal of India?", ["Blue Whale", "Ganga River Dolphin", "Crocodile", "Shark"], 1, "The Ganga River Dolphin is India's national aquatic animal.", "National Symbols"],
  ["EVS / GK", "MCQ", "What is the National Currency of India?", ["Dollar", "Euro", "Indian Rupee (₹)", "Pound"], 2, "The Indian Rupee (₹) is our national currency.", "National Symbols"],
  ["EVS / GK", "MCQ", "In which city is the Gateway of India located?", ["New Delhi", "Mumbai", "Chennai", "Hyderabad"], 1, "The Gateway of India is in Mumbai.", "Monuments"],
  ["EVS / GK", "MCQ", "In which city is the India Gate located?", ["Mumbai", "New Delhi", "Jaipur", "Lucknow"], 1, "India Gate is in New Delhi.", "Monuments"],
  ["EVS / GK", "MCQ", "Where is the Hawa Mahal located?", ["Agra", "Jaipur", "Bhopal", "Patna"], 1, "Hawa Mahal is in Jaipur, Rajasthan.", "Monuments"],
  ["EVS / GK", "MCQ", "Which monument in Delhi was built with red sandstone by Shah Jahan?", ["Taj Mahal", "Red Fort (Lal Qila)", "Charminar", "Sun Temple"], 1, "The Red Fort is in Delhi.", "Monuments"],
  ["EVS / GK", "MCQ", "Which Indian sportsperson is known as the 'God of Cricket'?", ["Virat Kohli", "Sachin Tendulkar", "MS Dhoni", "Kapil Dev"], 1, "Sachin Tendulkar is famously called the Master Blaster / God of Cricket.", "Sports"],
  ["EVS / GK", "MCQ", "Which is the National Game popularly associated with Major Dhyan Chand?", ["Cricket", "Hockey", "Football", "Kabaddi"], 1, "Major Dhyan Chand was the wizard of Indian Hockey.", "Sports"],
  ["EVS / GK", "MCQ", "How many players are in one Cricket team on the field?", ["9", "10", "11", "12"], 2, "A cricket team has 11 players.", "Sports"],
  ["EVS / GK", "MCQ", "What should we NEVER touch with wet hands?", ["Book", "Electric switch", "Ball", "Pillow"], 1, "Wet hands conduct electricity and can give a shock.", "Safety Rules"],
  ["EVS / GK", "MCQ", "While riding a two-wheeler, what should we wear to protect our head?", ["Cap", "Helmet", "Sunglasses", "Scarf"], 1, "A helmet protects our head from injury.", "Safety Rules"],
  ["EVS / GK", "MCQ", "What emergency number do we dial in India for Police?", ["100 / 112", "108", "101", "198"], 0, "100 (and 112 universal) is for Police.", "Safety"],
  ["EVS / GK", "MCQ", "What emergency number calls a Fire Brigade in India?", ["100", "101", "102", "109"], 1, "101 is the Fire Brigade emergency number.", "Safety"],
  ["EVS / GK", "MCQ", "What happens when water is cooled in a freezer?", ["It boils", "It turns into ice", "It becomes steam", "It disappears"], 1, "Cooling water freezes it into solid ice.", "States of Water"],
  ["EVS / GK", "MCQ", "What happens when water is heated strongly?", ["It freezes", "It turns into steam (water vapour)", "It becomes stone", "It turns blue"], 1, "Heating water evaporates it into steam.", "States of Water"],
  ["EVS / GK", "MCQ", "What do clouds bring to Earth?", ["Rocks", "Rain", "Fire", "Sand"], 1, "Clouds condense and bring rain.", "Weather"],
  ["EVS / GK", "MCQ", "Which season comes right after winter in India?", ["Monsoon", "Spring (Vasant)", "Autumn", "Heavy Frost"], 1, "Spring brings pleasant weather and blooming flowers after winter.", "Seasons"],
  ["EVS / GK", "MCQ", "Which part of the computer is called its 'Brain'?", ["Monitor", "Mouse", "CPU", "Keyboard"], 2, "CPU (Central Processing Unit) is the brain of a computer.", "Computer Basics"],
  ["EVS / GK", "MCQ", "Which device is used to type letters and numbers on a computer?", ["Mouse", "Keyboard", "Printer", "Speaker"], 1, "A keyboard is used for typing.", "Computer Basics"],
  ["EVS / GK", "MCQ", "Which device looks like a TV screen and shows output?", ["Keyboard", "Monitor", "Scanner", "Mouse"], 1, "A monitor displays visual output.", "Computer Basics"],
  ["EVS / GK", "MCQ", "Which fabric comes from plants?", ["Wool", "Silk", "Cotton", "Leather"], 2, "Cotton grows in cotton bolls on plants.", "Clothes"],
  ["EVS / GK", "MCQ", "Which clothes keep us cool in Summer?", ["Woollen", "Cotton", "Fur", "Nylon"], 1, "Light cotton clothes absorb sweat and keep us cool.", "Clothes"],
  ["EVS / GK", "MCQ", "Which gas do humans breathe IN to stay alive?", ["Carbon dioxide", "Oxygen", "Nitrogen", "Smoke"], 1, "Humans need Oxygen to breathe.", "Air"],
  ["EVS / GK", "MCQ", "Which gas do green plants take in during the day to make food?", ["Oxygen", "Carbon dioxide", "Helium", "Argon"], 1, "Plants absorb Carbon dioxide during photosynthesis.", "Plants"],
  ["EVS / GK", "MCQ", "Moving air is called:", ["Rain", "Wind", "Cloud", "Fog"], 1, "Moving air is known as wind.", "Weather & Air"],
  ["EVS / GK", "MCQ", "Which festival is celebrated by Muslims after the month of Ramadan?", ["Diwali", "Eid-ul-Fitr", "Holi", "Gurpurab"], 1, "Eid-ul-Fitr marks the end of Ramadan.", "Festivals"],
  ["EVS / GK", "MCQ", "Gurpurab is celebrated in honour of:", ["Sikh Gurus", "Christmas", "Independence Day", "Harvest"], 0, "Gurpurab celebrates the birth anniversaries of Sikh Gurus.", "Festivals"],
  ["EVS / GK", "MCQ", "Which of these is a means of MASS communication?", ["Letter", "Newspaper & Television", "Whispering", "Doorbell"], 1, "Newspapers and TV reach millions at once.", "Communication"],
  ["EVS / GK", "MCQ", "Which animal is known as 'Man's Best Friend'?", ["Cat", "Dog", "Horse", "Rabbit"], 1, "Dogs are loyal companions known as man's best friend.", "Animals"],
  ["EVS / GK", "MCQ", "Which bird lays the LARGEST egg in the world?", ["Hen", "Duck", "Ostrich", "Eagle"], 2, "Ostrich lays the largest bird egg.", "Birds"],
  ["EVS / GK", "MCQ", "How many continents are there on Earth?", ["5", "6", "7", "8"], 2, "There are 7 continents: Asia, Africa, Europe, North/South America, Australia, Antarctica.", "World GK"],
  ["EVS / GK", "MCQ", "Which is the LARGEST continent in the world (where India is located)?", ["Africa", "Asia", "Europe", "Australia"], 1, "Asia is the largest continent.", "World GK"],
  ["EVS / GK", "MCQ", "Which is the largest ocean in the world?", ["Indian Ocean", "Atlantic Ocean", "Pacific Ocean", "Arctic Ocean"], 2, "The Pacific Ocean is the largest and deepest ocean.", "World GK"],
  ["EVS / GK", "MCQ", "Which fruit is rich in Vitamin C and helps fight colds?", ["Orange / Amla", "Bread", "Rice", "Butter"], 0, "Citrus fruits like oranges and amla are rich in Vitamin C.", "Health"],
  ["EVS / GK", "MCQ", "What should we do before crossing a road if there is no traffic light?", ["Run fast", "Look right, left, and right again", "Close eyes", "Walk backwards"], 1, "Look right, then left, then right again before crossing.", "Safety Rules"],
  ["EVS / GK", "MCQ", "Where do trains stop for passengers to get on and off?", ["Airport", "Harbour", "Railway Station", "Bus Depot"], 2, "Trains stop at railway stations.", "Transport"],
  ["EVS / GK", "MCQ", "Where do aeroplanes land and take off?", ["Railway Station", "Airport", "Bus Stand", "Port"], 1, "Aeroplanes use an airport.", "Transport"],
  ["EVS / GK", "TRUE_FALSE", "True or False: Plants are non-living things.", ["True", "False", "Only trees live", "Only flowers live"], 1, "False! Plants grow, breathe, and make seeds—they are living things.", "Living Things"],
  ["EVS / GK", "TRUE_FALSE", "True or False: We should save water by closing taps when not in use.", ["True", "False", "Only in summer", "Never"], 0, "True! Every drop of water is precious.", "Conservation"],
  ["EVS / GK", "TRUE_FALSE", "True or False: Junk food every day keeps us healthy.", ["True", "False", "Always good", "Makes us taller"], 1, "False! Too much junk food harms health.", "Healthy Food"],
  ["EVS / GK", "TRUE_FALSE", "True or False: Earth revolves around the Sun.", ["True", "False", "Sun revolves around Earth", "Both are still"], 0, "True! Earth takes about 365 days to orbit the Sun.", "Solar System"],
  ["EVS / GK", "ODD_ONE_OUT", "Find the odd one out (External vs Internal Organs):", ["Eyes", "Ears", "Nose", "Kidney"], 3, "Eyes, Ears, Nose are external sense organs; Kidney is an internal organ.", "Human Body"],
  ["EVS / GK", "ODD_ONE_OUT", "Find the odd one out (Planets vs Satellite):", ["Mercury", "Mars", "Moon", "Jupiter"], 2, "Moon is Earth's satellite; the others are planets.", "Solar System"],
  ["EVS / GK", "ODD_ONE_OUT", "Find the odd one out (Shelters vs Vehicle):", ["Igloo", "Tent", "Caravan", "Aeroplane"], 3, "Igloo, Tent, Caravan are types of houses.", "Houses"],
  ["EVS / GK", "ODD_ONE_OUT", "Find the odd one out (Grains vs Dairy):", ["Rice", "Wheat", "Maize", "Milk"], 3, "Rice, Wheat, Maize are grains/cereals; Milk is dairy.", "Food"],
  ["EVS / GK", "MCQ", "What is the main source of salt we use in cooking?", ["Trees", "Sea water", "Rain", "Rocks in sky"], 1, "Common salt is mostly obtained by evaporating sea water.", "Daily Science"],
  ["EVS / GK", "MCQ", "Which insect spreads Malaria?", ["Housefly", "Female Anopheles Mosquito", "Butterfly", "Honeybee"], 1, "Mosquitoes spread malaria and dengue.", "Health & Hygiene"],
  ["EVS / GK", "MCQ", "How many days are there in a Leap Year?", ["364", "365", "366", "360"], 2, "A leap year has 366 days because February gets 29 days.", "Calendar"],
  ["EVS / GK", "MCQ", "Which musical instrument did Lord Krishna play?", ["Tabla", "Flute (Bansuri)", "Guitar", "Piano"], 1, "Lord Krishna is famous for playing the flute.", "Culture"],
];

const CLASS_2_TUPLES: QTuple[] = [
  ...c2EngSynonyms,  // 16
  ...c2EngOpposites, // 16
  ...c2EngPlurals,   // 16
  ...c2EngGrammar,   // 68 -> Eng total = 116
  ...buildClass2Maths(), // 117
  ...c2HindiParyay,  // 18
  ...c2HindiVilom,   // 16
  ...c2HindiOneWord, // 15
  ...c2HindiCore,    // 68 -> Hindi total = 117
  ...c2EvsStates,    // 12
  ...c2EvsFestivals, // 8
  ...c2EvsCore,      // 96 -> EVS total = 116
];

export const CLASS_2_EXTRA: EntranceTestQuestion[] = expandClassQuestions(2, CLASS_2_TUPLES);
