import type { EntranceTestQuestion } from "../../school-types";
import {
  buildFactBankTuples,
  expandClassQuestions,
  makeNumOptions,
  shuffleFourOptions,
  type QTuple,
} from "./helpers";

// ── CLASS 1 EXTRA (465 top questions: Eng 115 + Math 117 + Hindi 117 + EVS/GK 116) ──

// 1. ENGLISH (115)
const c1EngOpposites = buildFactBankTuples({
  subject: "English",
  topicTag: "Opposites",
  seedPrefix: "c1_eng_opp",
  explanationPrefix: "The opposite word is",
  items: [
    { prompt: "What is the opposite of 'BIG'?", answer: "Small" },
    { prompt: "What is the opposite of 'TALL'?", answer: "Short" },
    { prompt: "What is the opposite of 'DAY'?", answer: "Night" },
    { prompt: "What is the opposite of 'HAPPY'?", answer: "Sad" },
    { prompt: "What is the opposite of 'FAST'?", answer: "Slow" },
    { prompt: "What is the opposite of 'UP'?", answer: "Down" },
    { prompt: "What is the opposite of 'OPEN'?", answer: "Close" },
    { prompt: "What is the opposite of 'NEW'?", answer: "Old" },
    { prompt: "What is the opposite of 'CLEAN'?", answer: "Dirty" },
    { prompt: "What is the opposite of 'IN'?", answer: "Out" },
    { prompt: "What is the opposite of 'HEAVY'?", answer: "Light" },
    { prompt: "What is the opposite of 'SOFT'?", answer: "Hard" },
    { prompt: "What is the opposite of 'WET'?", answer: "Dry" },
    { prompt: "What is the opposite of 'FULL'?", answer: "Empty" },
    { prompt: "What is the opposite of 'GOOD'?", answer: "Bad" },
    { prompt: "What is the opposite of 'FAR'?", answer: "Near" },
    { prompt: "What is the opposite of 'COME'?", answer: "Go" },
    { prompt: "What is the opposite of 'LAUGH'?", answer: "Cry" },
    { prompt: "What is the opposite of 'BLACK'?", answer: "White" },
    { prompt: "What is the opposite of 'FAT'?", answer: "Thin" },
  ],
});

const c1EngPlurals = buildFactBankTuples({
  subject: "English",
  topicTag: "Singular-Plural",
  seedPrefix: "c1_eng_pl",
  explanationPrefix: "The plural form is",
  items: [
    { prompt: "What is the plural of 'Dog'?", answer: "Dogs" },
    { prompt: "What is the plural of 'Book'?", answer: "Books" },
    { prompt: "What is the plural of 'Pen'?", answer: "Pens" },
    { prompt: "What is the plural of 'Tree'?", answer: "Trees" },
    { prompt: "What is the plural of 'Star'?", answer: "Stars" },
    { prompt: "What is the plural of 'Bird'?", answer: "Birds" },
    { prompt: "What is the plural of 'Bus'?", answer: "Buses" },
    { prompt: "What is the plural of 'Box'?", answer: "Boxes" },
    { prompt: "What is the plural of 'Cup'?", answer: "Cups" },
    { prompt: "What is the plural of 'Toy'?", answer: "Toys" },
    { prompt: "What is the plural of 'Mango'?", answer: "Mangoes" },
    { prompt: "What is the plural of 'Potato'?", answer: "Potatoes" },
    { prompt: "What is the plural of 'Glass'?", answer: "Glasses" },
    { prompt: "What is the plural of 'Flower'?", answer: "Flowers" },
    { prompt: "What is the plural of 'Boy'?", answer: "Boys" },
    { prompt: "What is the plural of 'Girl'?", answer: "Girls" },
    { prompt: "What is the plural of 'Chair'?", answer: "Chairs" },
    { prompt: "What is the plural of 'Apple'?", answer: "Apples" },
    { prompt: "What is the plural of 'Kite'?", answer: "Kites" },
    { prompt: "What is the plural of 'Ball'?", answer: "Balls" },
  ],
});

const c1EngGenders = buildFactBankTuples({
  subject: "English",
  topicTag: "Gender (He/She)",
  seedPrefix: "c1_eng_gen",
  explanationPrefix: "The feminine/matching pair is",
  items: [
    { prompt: "What is the female word for 'King'?", answer: "Queen" },
    { prompt: "What is the female word for 'Boy'?", answer: "Girl" },
    { prompt: "What is the female word for 'Father'?", answer: "Mother" },
    { prompt: "What is the female word for 'Brother'?", answer: "Sister" },
    { prompt: "What is the female word for 'Uncle'?", answer: "Aunt" },
    { prompt: "What is the female word for 'Bull'?", answer: "Cow" },
    { prompt: "What is the female word for 'Lion'?", answer: "Lioness" },
    { prompt: "What is the female word for 'Cock'?", answer: "Hen" },
    { prompt: "What is the female word for 'Prince'?", answer: "Princess" },
    { prompt: "What is the female word for 'Son'?", answer: "Daughter" },
    { prompt: "What is the female word for 'Horse'?", answer: "Mare" },
    { prompt: "What is the female word for 'Tiger'?", answer: "Tigress" },
    { prompt: "What is the female word for 'Peacock'?", answer: "Peahen" },
    { prompt: "What is the female word for 'Grandfather'?", answer: "Grandmother" },
    { prompt: "What is the female word for 'Man'?", answer: "Woman" },
  ],
});

const c1EngSpellings: QTuple[] = [
  ["English", "FILL_BLANK", "Fill in the missing letter: B A _ A N A", ["N", "M", "L", "R"], 0, "The correct spelling is BANANA.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: M A _ G O", ["N", "T", "P", "S"], 0, "The correct spelling is MANGO.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: S C H _ O L", ["O", "A", "E", "U"], 0, "The correct spelling is SCHOOL.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: T I _ E R", ["G", "J", "K", "P"], 0, "The correct spelling is TIGER.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: E L E _ H A N T", ["P", "B", "D", "F"], 0, "The correct spelling is ELEPHANT.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: W A T _ R", ["E", "A", "I", "O"], 0, "The correct spelling is WATER.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: F L O _ E R", ["W", "V", "U", "M"], 0, "The correct spelling is FLOWER.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: M O T _ E R", ["H", "N", "T", "R"], 0, "The correct spelling is MOTHER.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: R A B _ I T", ["B", "D", "P", "T"], 0, "The correct spelling is RABBIT.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: P E N _ I L", ["C", "S", "K", "Z"], 0, "The correct spelling is PENCIL.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: O R A _ G E", ["N", "M", "L", "P"], 0, "The correct spelling is ORANGE.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: H O U _ E", ["S", "Z", "C", "T"], 0, "The correct spelling is HOUSE.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: T A _ L E", ["B", "D", "P", "G"], 0, "The correct spelling is TABLE.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: S U _ D A Y", ["N", "M", "R", "T"], 0, "The correct spelling is SUNDAY.", "Missing Letters"],
  ["English", "FILL_BLANK", "Fill in the missing letter: G A R _ E N", ["D", "B", "P", "T"], 0, "The correct spelling is GARDEN.", "Missing Letters"],
  // Articles a / an (10)
  ["English", "FILL_BLANK", "Choose 'a' or 'an': She is eating ___ apple.", ["a", "an", "two", "are"], 1, "'Apple' starts with a vowel sound 'a', so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': That is ___ elephant.", ["a", "an", "the", "my"], 1, "'Elephant' starts with a vowel sound 'e', so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': I have ___ new bat.", ["a", "an", "is", "are"], 0, "'New' begins with consonant sound 'n', so use 'a'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': Look at ___ orange!", ["a", "an", "in", "on"], 1, "'Orange' begins with vowel sound 'o', so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': He saw ___ owl on the tree.", ["a", "an", "is", "at"], 1, "'Owl' begins with vowel sound, so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': Rita has ___ red doll.", ["a", "an", "on", "to"], 0, "'Red' begins with consonant sound 'r', so use 'a'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': Put ___ ice cube in the glass.", ["a", "an", "of", "by"], 1, "'Ice' begins with vowel sound 'i', so use 'an'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': My father bought ___ car.", ["a", "an", "am", "it"], 0, "'Car' begins with consonant sound 'c', so use 'a'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': An ant is ___ tiny insect.", ["a", "an", "is", "are"], 0, "'Tiny' starts with consonant sound 't', so use 'a'.", "Articles"],
  ["English", "FILL_BLANK", "Choose 'a' or 'an': He gave me ___ egg.", ["a", "an", "at", "in"], 1, "'Egg' begins with vowel sound 'e', so use 'an'.", "Articles"],
  // Grammar is / am / are / has / have / pronouns (15)
  ["English", "FILL_BLANK", "I ___ a student of Class 1.", ["is", "am", "are", "was"], 1, "We always use 'am' with 'I'.", "Is/Am/Are"],
  ["English", "FILL_BLANK", "They ___ playing in the park.", ["is", "am", "are", "has"], 2, "We use 'are' with plural subject 'They'.", "Is/Am/Are"],
  ["English", "FILL_BLANK", "She ___ a good singer.", ["is", "am", "are", "were"], 0, "We use 'is' with singular 'She'.", "Is/Am/Are"],
  ["English", "FILL_BLANK", "We ___ going to school.", ["is", "am", "are", "was"], 2, "We use 'are' with 'We'.", "Is/Am/Are"],
  ["English", "FILL_BLANK", "The dog ___ barking loudly.", ["is", "am", "are", "have"], 0, "Singular subject 'The dog' takes 'is'.", "Is/Am/Are"],
  ["English", "FILL_BLANK", "You ___ my best friend.", ["is", "am", "are", "has"], 2, "'You' always takes 'are'.", "Is/Am/Are"],
  ["English", "FILL_BLANK", "Rohan ___ two pencils.", ["has", "have", "am", "are"], 0, "Singular name 'Rohan' takes 'has'.", "Has/Have"],
  ["English", "FILL_BLANK", "I ___ a blue school bag.", ["has", "have", "is", "was"], 1, "'I' takes 'have'.", "Has/Have"],
  ["English", "FILL_BLANK", "Birds ___ wings to fly.", ["has", "have", "is", "am"], 1, "Plural 'Birds' takes 'have'.", "Has/Have"],
  ["English", "FILL_BLANK", "Use a pronoun for 'Meera': ___ is reading a book.", ["He", "She", "It", "They"], 1, "Meera is a girl, so we use 'She'.", "Pronouns"],
  ["English", "FILL_BLANK", "Use a pronoun for 'The chair': ___ is made of wood.", ["He", "She", "It", "We"], 2, "For non-living things like a chair, we use 'It'.", "Pronouns"],
  ["English", "FILL_BLANK", "The cat is sitting ___ the table (ऊपर).", ["under", "on", "in", "between"], 1, "'On' means upon/above touching the surface.", "Prepositions"],
  ["English", "FILL_BLANK", "Fish live ___ water.", ["in", "on", "under", "over"], 0, "Fish live inside ('in') water.", "Prepositions"],
  ["English", "FILL_BLANK", "My shoes are ___ the bed (नीचे).", ["on", "under", "in", "behind"], 1, "'Under' means beneath or below.", "Prepositions"],
  ["English", "MCQ", "Which word is a Noun (Naming Word)?", ["Run", "Jump", "School", "Happy"], 2, "School is the name of a place, so it is a noun.", "Nouns"],
  // Rhyming, Odd One Out, Alphabet, Mini Passages (20)
  ["English", "MCQ", "Which word rhymes with 'CAT'?", ["Dog", "Hat", "Pen", "Cup"], 1, "Cat and Hat end with the '-at' sound.", "Rhyming Words"],
  ["English", "MCQ", "Which word rhymes with 'SUN'?", ["Run", "Moon", "Star", "Sky"], 0, "Sun and Run share the '-un' rhyme.", "Rhyming Words"],
  ["English", "MCQ", "Which word rhymes with 'CAKE'?", ["Milk", "Make", "Bread", "Cup"], 1, "Cake and Make share the '-ake' rhyme.", "Rhyming Words"],
  ["English", "MCQ", "Which word rhymes with 'KING'?", ["Queen", "Ring", "Crown", "Gold"], 1, "King and Ring share the '-ing' sound.", "Rhyming Words"],
  ["English", "MCQ", "Which word rhymes with 'TREE'?", ["Leaf", "Bee", "Root", "Wood"], 1, "Tree and Bee end with the same '-ee' sound.", "Rhyming Words"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Colours vs Furniture):", ["Red", "Blue", "Green", "Table"], 3, "Red, Blue, Green are colours; Table is furniture.", "Odd One Out"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Farm Animals vs Bird):", ["Cow", "Goat", "Sheep", "Sparrow"], 3, "Cow, Goat, Sheep are mammals; Sparrow is a bird.", "Odd One Out"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (School Stationery):", ["Pen", "Pencil", "Eraser", "Banana"], 3, "Pen, Pencil, Eraser are stationery; Banana is a fruit.", "Odd One Out"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Body Parts):", ["Eye", "Nose", "Ear", "Shoe"], 3, "Eye, Nose, Ear are body parts; Shoe is worn on feet.", "Odd One Out"],
  ["English", "ODD_ONE_OUT", "Find the odd one out (Transport vs Animal):", ["Car", "Train", "Bus", "Lion"], 3, "Car, Train, Bus are vehicles; Lion is an animal.", "Odd One Out"],
  ["English", "MCQ", "How many letters are there in the English Alphabet?", ["24", "25", "26", "28"], 2, "The English alphabet has 26 letters (A to Z).", "Alphabet"],
  ["English", "MCQ", "Which letter comes just BEFORE 'G'?", ["E", "F", "H", "I"], 1, "In A-B-C-D-E-F-G, F comes right before G.", "Alphabet"],
  ["English", "MCQ", "Which of these is a VOWEL?", ["B", "D", "E", "K"], 2, "A, E, I, O, U are the 5 vowels.", "Vowels"],
  ["English", "MCQ", "Which of these is a CONSONANT?", ["A", "I", "O", "T"], 3, "T is a consonant; A, I, O are vowels.", "Consonants"],
  ["English", "TRUE_FALSE", "True or False: Every sentence starts with a Capital letter.", ["True", "False", "Only on Monday", "Never"], 0, "A sentence always begins with a capital letter.", "Punctuation"],
  ["English", "TRUE_FALSE", "True or False: A question ends with a Question Mark (?).", ["True", "False", "Full stop", "Comma"], 0, "Asking sentences end with '?'.", "Punctuation"],
  ["English", "MINI_PASSAGE", "Where did Maya go with her mother?", ["To the zoo", "To the market", "To the school", "To the park"], 1, "The passage says Maya went to the market.", "Reading Comprehension", "Maya went to the market with her mother. She bought three sweet mangoes and a toy car."],
  ["English", "MINI_PASSAGE", "How many mangoes did Maya buy?", ["Two", "Three", "Four", "Five"], 1, "Maya bought three sweet mangoes.", "Reading Comprehension", "Maya went to the market with her mother. She bought three sweet mangoes and a toy car."],
  ["English", "MINI_PASSAGE", "What animal does Aman have?", ["A parrot", "A white rabbit", "A brown cat", "A fish"], 1, "Aman has a cute white rabbit named Snowy.", "Reading Comprehension", "Aman has a cute white rabbit named Snowy. Snowy loves to eat fresh carrots every morning."],
  ["English", "MINI_PASSAGE", "What does Snowy love to eat?", ["Apples", "Carrots", "Bread", "Rice"], 1, "The story says Snowy loves to eat fresh carrots.", "Reading Comprehension", "Aman has a cute white rabbit named Snowy. Snowy loves to eat fresh carrots every morning."],
];

// 2. MATHEMATICS (117)
function buildClass1Maths(): QTuple[] {
  const qs: QTuple[] = [];
  // Addition (22)
  const addPairs: [number, number][] = [
    [4, 5], [7, 6], [9, 8], [12, 5], [15, 4], [11, 8], [20, 7], [23, 6], [31, 8], [42, 5],
    [14, 12], [22, 15], [30, 20], [40, 30], [25, 14], [18, 11], [33, 24], [52, 16], [61, 27], [45, 34],
    [10, 9], [28, 11],
  ];
  addPairs.forEach(([a, b], i) => {
    const ans = a + b;
    const { options, correctIndex } = makeNumOptions(ans, [-1, 1, 2, -2, 10], `c1m_add_${i}`);
    qs.push(["Mathematics", i % 3 === 0 ? "FILL_BLANK" : "MCQ", `Add: ${a} + ${b} = ?`, options, correctIndex, `${a} + ${b} = ${ans}.`, "Addition"]);
  });

  // Subtraction (22)
  const subPairs: [number, number][] = [
    [9, 4], [12, 5], [15, 7], [18, 9], [20, 6], [25, 5], [34, 12], [48, 15], [56, 23], [67, 34],
    [79, 25], [85, 42], [90, 30], [60, 20], [45, 13], [38, 16], [54, 21], [72, 41], [88, 53], [99, 44],
    [19, 8], [27, 14],
  ];
  subPairs.forEach(([a, b], i) => {
    const ans = a - b;
    const { options, correctIndex } = makeNumOptions(ans, [-1, 1, 2, -2, 10], `c1m_sub_${i}`);
    qs.push(["Mathematics", i % 3 === 1 ? "FILL_BLANK" : "MCQ", `Subtract: ${a} − ${b} = ?`, options, correctIndex, `${a} − ${b} = ${ans}.`, "Subtraction"]);
  });

  // Number after / before / between (18)
  const afterNums = [19, 29, 39, 49, 59, 69, 79, 89, 99, 44, 67, 82];
  afterNums.forEach((n, i) => {
    const { options, correctIndex } = makeNumOptions(n + 1, [-1, 2, -2, 10], `c1m_aft_${i}`);
    qs.push(["Mathematics", "FILL_BLANK", `What number comes just AFTER ${n}?`, options, correctIndex, `${n + 1} comes right after ${n}.`, "Before & After"]);
  });
  const beforeNums = [10, 20, 30, 50, 70, 100];
  beforeNums.forEach((n, i) => {
    const { options, correctIndex } = makeNumOptions(n - 1, [1, -2, 2, -10], `c1m_bef_${i}`);
    qs.push(["Mathematics", "FILL_BLANK", `What number comes just BEFORE ${n}?`, options, correctIndex, `${n - 1} comes right before ${n}.`, "Before & After"]);
  });

  // Tens & Ones / Place Value (12)
  const placeNums = [24, 37, 45, 58, 62, 71, 83, 94, 16, 50, 39, 87];
  placeNums.forEach((n, i) => {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (i % 2 === 0) {
      const { options, correctIndex } = makeNumOptions(n, [10, -10, 1, -1], `c1m_pv_${i}`);
      qs.push(["Mathematics", "MCQ", `${tens} tens and ${ones} ones make which number?`, options, correctIndex, `${tens} tens = ${tens * 10}, plus ${ones} ones = ${n}.`, "Tens & Ones"]);
    } else {
      const { options, correctIndex } = makeNumOptions(tens, [1, -1, 2, ones === tens ? 3 : ones - tens], `c1m_pv2_${i}`);
      qs.push(["Mathematics", "MCQ", `How many TENS are there in the number ${n}?`, options, correctIndex, `In ${n}, the tens digit is ${tens} (${tens} tens and ${ones} ones).`, "Tens & Ones"]);
    }
  });

  // Skip Counting & Patterns (12)
  const patterns: [string, number, string][] = [
    ["2, 4, 6, 8, ___", 10, "Skip counting by 2s: 8 + 2 = 10."],
    ["5, 10, 15, 20, ___", 25, "Skip counting by 5s: 20 + 5 = 25."],
    ["10, 20, 30, 40, ___", 50, "Skip counting by 10s: 40 + 10 = 50."],
    ["3, 6, 9, 12, ___", 15, "Add 3 each time: 12 + 3 = 15."],
    ["11, 13, 15, 17, ___", 19, "Add 2 each time: 17 + 2 = 19."],
    ["50, 40, 30, 20, ___", 10, "Count backwards by 10: 20 − 10 = 10."],
    ["20, 18, 16, 14, ___", 12, "Subtract 2 each time: 14 − 2 = 12."],
    ["1, 3, 5, 7, ___", 9, "Odd numbers increasing by 2: 7 + 2 = 9."],
    ["25, 30, 35, 40, ___", 45, "Add 5 each time: 40 + 5 = 45."],
    ["12, 14, 16, 18, ___", 20, "Add 2 each time: 18 + 2 = 20."],
    ["100, 90, 80, 70, ___", 60, "Subtract 10 each time: 70 − 10 = 60."],
    ["4, 8, 12, 16, ___", 20, "Add 4 each time: 16 + 4 = 20."],
  ];
  patterns.forEach(([seq, ans, exp], i) => {
    const { options, correctIndex } = makeNumOptions(ans, [-2, 2, 5, -5], `c1m_pat_${i}`);
    qs.push(["Mathematics", "SERIES_PUZZLE", `Complete the pattern: ${seq}`, options, correctIndex, exp, "Patterns"]);
  });

  // Word Problems, Shapes, Money, Time, Greatest/Smallest (31)
  const staticMaths: QTuple[] = [
    ["Mathematics", "MCQ", "Which shape has NO corners and NO straight sides?", ["Square", "Triangle", "Circle", "Rectangle"], 2, "A circle is completely round with 0 corners.", "Shapes"],
    ["Mathematics", "MCQ", "How many corners does a Square have?", ["2", "3", "4", "6"], 2, "A square has 4 equal sides and 4 corners.", "Shapes"],
    ["Mathematics", "MCQ", "Which shape looks like an egg?", ["Circle", "Oval", "Triangle", "Cube"], 1, "An oval has an egg-like curved shape.", "Shapes"],
    ["Mathematics", "MCQ", "A dice looks like which 3D shape?", ["Sphere", "Cone", "Cube", "Cylinder"], 2, "A dice has 6 square faces, so it is a cube.", "3D Shapes"],
    ["Mathematics", "MCQ", "A birthday cap looks like a:", ["Cone", "Cube", "Sphere", "Cylinder"], 0, "A birthday cap has a circular base and pointed top like a cone.", "3D Shapes"],
    ["Mathematics", "MCQ", "A football is shaped like a:", ["Cube", "Sphere", "Cone", "Rectangle"], 1, "A football is round in 3D like a sphere.", "3D Shapes"],
    ["Mathematics", "MCQ", "How many days are there in 1 week?", ["5", "6", "7", "10"], 2, "There are 7 days in a week (Monday to Sunday).", "Calendar"],
    ["Mathematics", "MCQ", "Which is the twelfth (last) month of the year?", ["October", "November", "December", "January"], 2, "December is the 12th and last month of the year.", "Calendar"],
    ["Mathematics", "MCQ", "Which day comes just after Wednesday?", ["Tuesday", "Thursday", "Friday", "Monday"], 1, "Thursday comes right after Wednesday.", "Calendar"],
    ["Mathematics", "MCQ", "Which day comes before Sunday?", ["Monday", "Friday", "Saturday", "Tuesday"], 2, "Saturday comes right before Sunday.", "Calendar"],
    ["Mathematics", "MCQ", "If you have two ₹5 coins, how much money do you have?", ["₹5", "₹10", "₹15", "₹20"], 1, "₹5 + ₹5 = ₹10.", "Money"],
    ["Mathematics", "MCQ", "One ₹10 note and one ₹2 coin make:", ["₹10", "₹12", "₹20", "₹8"], 1, "₹10 + ₹2 = ₹12.", "Money"],
    ["Mathematics", "MCQ", "A pencil costs ₹5. How much will 3 pencils cost?", ["₹10", "₹12", "₹15", "₹20"], 2, "5 + 5 + 5 = ₹15.", "Money"],
    ["Mathematics", "MCQ", "You give ₹20 to buy a toy of ₹15. How much change will you get back?", ["₹3", "₹5", "₹10", "₹15"], 1, "₹20 − ₹15 = ₹5.", "Money"],
    ["Mathematics", "MCQ", "Which is the GREATEST 1-digit number?", ["0", "8", "9", "10"], 2, "9 is the largest 1-digit number; 10 has 2 digits.", "Number Sense"],
    ["Mathematics", "MCQ", "Which is the GREATEST 2-digit number?", ["90", "98", "99", "100"], 2, "99 is the largest 2-digit number; 100 has 3 digits.", "Number Sense"],
    ["Mathematics", "MCQ", "Which number is the SMALLEST among 45, 19, 63, 28?", ["45", "19", "63", "28"], 1, "19 is smaller than 28, 45, and 63.", "Comparison"],
    ["Mathematics", "MCQ", "Which number is the GREATEST among 72, 89, 54, 68?", ["72", "89", "54", "68"], 1, "89 is the largest among the four numbers.", "Comparison"],
    ["Mathematics", "MCQ", "What is the number name for 47?", ["Forty-six", "Forty-seven", "Seventy-four", "Fourteen"], 1, "47 is written as Forty-seven.", "Number Names"],
    ["Mathematics", "MCQ", "What is the numeral for 'Eighty-nine'?", ["98", "89", "80", "18"], 1, "Eighty-nine = 80 + 9 = 89.", "Number Names"],
    ["Mathematics", "MCQ", "Riya has 8 balloons. 3 fly away. How many balloons are left?", ["4", "5", "6", "11"], 1, "8 − 3 = 5 balloons left.", "Word Problems"],
    ["Mathematics", "MCQ", "There are 6 boys and 7 girls in a bus. How many children in total?", ["11", "12", "13", "14"], 2, "6 + 7 = 13 children.", "Word Problems"],
    ["Mathematics", "MCQ", "Ankit ate 4 sweets and Aman ate 5 sweets. How many sweets did they eat together?", ["8", "9", "10", "1"], 1, "4 + 5 = 9 sweets.", "Word Problems"],
    ["Mathematics", "MCQ", "A hen laid 12 eggs. 4 eggs broke. How many eggs are safe?", ["6", "8", "10", "16"], 1, "12 − 4 = 8 safe eggs.", "Word Problems"],
    ["Mathematics", "MCQ", "How many legs do 2 cows have in total?", ["4", "6", "8", "10"], 2, "Each cow has 4 legs. 4 + 4 = 8 legs.", "Word Problems"],
    ["Mathematics", "MCQ", "How many wheels do 3 bicycles have?", ["3", "4", "6", "8"], 2, "Each bicycle has 2 wheels. 2 + 2 + 2 = 6 wheels.", "Word Problems"],
    ["Mathematics", "MCQ", "Which sign goes in the box: 42 [ ? ] 29", ["<", ">", "=", "+"], 1, "42 is greater than 29, so 42 > 29.", "Comparison"],
    ["Mathematics", "MCQ", "Which sign goes in the box: 15 [ ? ] 51", ["<", ">", "=", "−"], 0, "15 is less than 51, so 15 < 51.", "Comparison"],
    ["Mathematics", "TRUE_FALSE", "True or False: 14 + 0 = 14.", ["True", "False", "Equals 0", "Equals 140"], 0, "Adding 0 to any number keeps the number same.", "Addition Properties"],
    ["Mathematics", "TRUE_FALSE", "True or False: A triangle has 4 sides.", ["True", "False", "Has 5 sides", "Has 6 sides"], 1, "False! A triangle has only 3 sides.", "Shapes"],
    ["Mathematics", "MCQ", "When the minute hand is at 12 and hour hand is at 4, the time is:", ["12 o'clock", "4 o'clock", "6 o'clock", "8 o'clock"], 1, "Hour hand on 4 and minute hand on 12 shows 4 o'clock.", "Time"],
  ];
  qs.push(...staticMaths);
  return qs;
}

// 3. HINDI (117)
const c1HindiVilom = buildFactBankTuples({
  subject: "Hindi",
  topicTag: "विलोम शब्द",
  seedPrefix: "c1_hin_vil",
  explanationPrefix: "सही विलोम (उल्टा) शब्द है:",
  items: [
    { prompt: "'दिन' का विलोम (उल्टा) शब्द क्या है?", answer: "रात" },
    { prompt: "'बड़ा' का विलोम (उल्टा) शब्द क्या है?", answer: "छोटा" },
    { prompt: "'ऊपर' का विलोम (उल्टा) शब्द क्या है?", answer: "नीचे" },
    { prompt: "'अंदर' का विलोम (उल्टा) शब्द क्या है?", answer: "बाहर" },
    { prompt: "'हँसना' का विलोम (उल्टा) शब्द क्या है?", answer: "रोना" },
    { prompt: "'काला' का विलोम (उल्टा) शब्द क्या है?", answer: "सफ़ेद" },
    { prompt: "'ठंडा' का विलोम (उल्टा) शब्द क्या है?", answer: "गर्म" },
    { prompt: "'मोटा' का विलोम (उल्टा) शब्द क्या है?", answer: "पतला" },
    { prompt: "'नया' का विलोम (उल्टा) शब्द क्या है?", answer: "पुराना" },
    { prompt: "'सुबह' का विलोम (उल्टा) शब्द क्या है?", answer: "शाम" },
    { prompt: "'मीठा' का विलोम (उल्टा) शब्द क्या है?", answer: "कड़वा" },
    { prompt: "'सही' का विलोम (उल्टा) शब्द क्या है?", answer: "गलत" },
    { prompt: "'पास' का विलोम (उल्टा) शब्द क्या है?", answer: "दूर" },
    { prompt: "'आगे' का विलोम (उल्टा) शब्द क्या है?", answer: "पीछे" },
    { prompt: "'कम' का विलोम (उल्टा) शब्द क्या है?", answer: "ज़्यादा" },
    { prompt: "'सुख' का विलोम (उल्टा) शब्द क्या है?", answer: "दुख" },
    { prompt: "'सोना' (नींद) का विलोम शब्द क्या है?", answer: "जागना" },
    { prompt: "'खुश' का विलोम (उल्टा) शब्द क्या है?", answer: "उदास" },
    { prompt: "'आना' का विलोम (उल्टा) शब्द क्या है?", answer: "जाना" },
    { prompt: "'गीला' का विलोम (उल्टा) शब्द क्या है?", answer: "सूखा" },
  ],
});

const c1HindiVachan = buildFactBankTuples({
  subject: "Hindi",
  topicTag: "एकवचन-बहुवचन",
  seedPrefix: "c1_hin_vac",
  explanationPrefix: "सही बहुवचन रूप है:",
  items: [
    { prompt: "'लड़का' का बहुवचन क्या होगा?", answer: "लड़के" },
    { prompt: "'किताब' का बहुवचन क्या होगा?", answer: "किताबें" },
    { prompt: "'तारा' का बहुवचन क्या होगा?", answer: "तारे" },
    { prompt: "'केला' का बहुवचन क्या होगा?", answer: "केले" },
    { prompt: "'गेंद' का बहुवचन क्या होगा?", answer: "गेंदें" },
    { prompt: "'आँख' का बहुवचन क्या होगा?", answer: "आँखें" },
    { prompt: "'घोड़ा' का बहुवचन क्या होगा?", answer: "घोड़े" },
    { prompt: "'चिड़िया' का बहुवचन क्या होगा?", answer: "चिड़ियाँ" },
    { prompt: "'बच्चा' का बहुवचन क्या होगा?", answer: "बच्चे" },
    { prompt: "'मेज़' का बहुवचन क्या होगा?", answer: "मेज़ें" },
    { prompt: "'पत्ता' का बहुवचन क्या होगा?", answer: "पत्ते" },
    { prompt: "'कमरा' का बहुवचन क्या होगा?", answer: "कमरे" },
    { prompt: "'सड़क' का बहुवचन क्या होगा?", answer: "सड़कें" },
    { prompt: "'कपड़ा' का बहुवचन क्या होगा?", answer: "कपड़े" },
    { prompt: "'लड़की' का बहुवचन क्या होगा?", answer: "लड़कियाँ" },
  ],
});

const c1HindiLing = buildFactBankTuples({
  subject: "Hindi",
  topicTag: "स्त्रीलिंग-पुल्लिंग",
  seedPrefix: "c1_hin_lin",
  explanationPrefix: "सही स्त्रीलिंग शब्द है:",
  items: [
    { prompt: "'माता' शब्द किसका जोड़ा है? 'पिता' का स्त्रीलिंग क्या होगा?", answer: "माता" },
    { prompt: "'भाई' का स्त्रीलिंग शब्द क्या है?", answer: "बहन" },
    { prompt: "'दादा' का स्त्रीलिंग शब्द क्या है?", answer: "दादी" },
    { prompt: "'नाना' का स्त्रीलिंग शब्द क्या है?", answer: "नानी" },
    { prompt: "'चाचा' का स्त्रीलिंग शब्द क्या है?", answer: "चाची" },
    { prompt: "'राजा' का स्त्रीलिंग शब्द क्या है?", answer: "रानी" },
    { prompt: "'शेर' का स्त्रीलिंग शब्द क्या है?", answer: "शेरनी" },
    { prompt: "'मोर' का स्त्रीलिंग शब्द क्या है?", answer: "मोरनी" },
    { prompt: "'मुर्गा' का स्त्रीलिंग शब्द क्या है?", answer: "मुर्गी" },
    { prompt: "'गाय' किसका स्त्रीलिंग है? 'बैल' का स्त्रीलिंग:", answer: "गाय" },
    { prompt: "'घोड़ा' का स्त्रीलिंग शब्द क्या है?", answer: "घोड़ी" },
    { prompt: "'मामा' का स्त्रीलिंग शब्द क्या है?", answer: "मामी" },
    { prompt: "'लड़का' का स्त्रीलिंग शब्द क्या है?", answer: "लड़की" },
    { prompt: "'हाथी' का स्त्रीलिंग शब्द क्या है?", answer: "हथिनी" },
    { prompt: "'बकरा' का स्त्रीलिंग शब्द क्या है?", answer: "बकरी" },
  ],
});

const c1HindiCore: QTuple[] = [
  // Varnamala & Matra (25)
  ["Hindi", "MCQ", "हिंदी में 'अ' से 'अः' तक कितने स्वर माने जाते हैं (सामान्य गिनती में 11 स्वर)?", ["9", "11", "15", "25"], 1, "हिंदी वर्णमाला में 11 मुख्य स्वर (अ से औ) होते हैं।", "वर्णमाला"],
  ["Hindi", "MCQ", "'क' वर्ग का पहला अक्षर कौन-सा है?", ["ख", "क", "ग", "घ"], 1, "क-वर्ग का पहला व्यंजन 'क' है।", "वर्णमाला"],
  ["Hindi", "MCQ", "'प, फ, ब, भ' के बाद कौन-सा अक्षर आता है?", ["य", "म", "र", "ल"], 1, "प-वर्ग में प, फ, ब, भ, म आता है।", "वर्णमाला"],
  ["Hindi", "MCQ", "'च, छ, ज, झ' के बाद क्या आता है?", ["ञ", "ट", "त", "न"], 0, "च-वर्ग का पाँचवाँ अक्षर 'ञ' है।", "वर्णमाला"],
  ["Hindi", "MCQ", "'ट, ठ, ड, ढ' के बाद क्या आता है?", ["ण", "न", "म", "र"], 0, "ट-वर्ग का अंतिम वर्ण 'ण' है।", "वर्णमाला"],
  ["Hindi", "MCQ", "'त, थ, द, ध' के बाद क्या आता है?", ["ण", "न", "प", "म"], 1, "त-वर्ग का अंतिम वर्ण 'न' है।", "वर्णमाला"],
  ["Hindi", "MCQ", "'य, र, ल' के बाद कौन-सा वर्ण आता है?", ["स", "व", "ह", "श"], 1, "य, र, ल, व अंतःस्थ व्यंजन हैं।", "वर्णमाला"],
  ["Hindi", "MCQ", "'श, ष, स' के बाद क्या आता है?", ["ह", "क्ष", "त्र", "ज्ञ"], 0, "श, ष, स, ह ऊष्म व्यंजन हैं।", "वर्णमाला"],
  ["Hindi", "FILL_BLANK", "'क + आ की मात्रा' मिलाकर क्या बनेगा?", ["कि", "का", "कु", "के"], 1, "क में आ (ा) की मात्रा लगाने से 'का' बनता है।", "मात्राएँ"],
  ["Hindi", "FILL_BLANK", "'म + इ (छोटी इ) की मात्रा' से क्या बनता है?", ["मी", "मि", "मु", "मे"], 1, "म में छोटी इ (ि) लगाने से 'मि' बनता है।", "मात्राएँ"],
  ["Hindi", "FILL_BLANK", "'क + उ (छोटा उ) की मात्रा' से क्या बनेगा?", ["कू", "कु", "के", "को"], 1, "क में छोटा उ (ु) लगाने से 'कु' बनता है।", "मात्राएँ"],
  ["Hindi", "FILL_BLANK", "'प + ओ की मात्रा' मिलाकर क्या बनेगा?", ["पा", "पो", "पौ", "पे"], 1, "प में ओ (ो) की मात्रा से 'पो' बनता है।", "मात्राएँ"],
  ["Hindi", "MCQ", "इनमें से किस शब्द में 'आ (ा)' की मात्रा लगी है?", ["कमल", "आम", "जल", "फल"], 1, "'आम' में आ स्वर की मात्रा है।", "मात्राएँ"],
  ["Hindi", "MCQ", "इनमें से किस शब्द में 'ई (ी)' की बड़ी मात्रा लगी है?", ["नदी", "दिन", "सिर", "किला"], 0, "'नदी' में द पर बड़ी ई (ी) की मात्रा है।", "मात्राएँ"],
  ["Hindi", "MCQ", "इनमें से किस शब्द में 'ऊ (ू)' की मात्रा है?", ["फूल", "पुल", "कुल", "गुड़"], 0, "'फूल' में फ पर बड़ा ऊ (ू) लगा है।", "मात्राएँ"],
  ["Hindi", "MCQ", "इनमें से किस शब्द में 'ए (े)' की मात्रा है?", ["सेब", "पैसा", "मोर", "कौआ"], 0, "'सेब' में स पर ए (े) की मात्रा है।", "मात्राएँ"],
  ["Hindi", "MCQ", "इनमें से किस शब्द में 'ऐ (ै)' की मात्रा है?", ["पेड़", "थैला", "तोता", "नौका"], 1, "'थैला' में थ पर ऐ (ै) की मात्रा है।", "मात्राएँ"],
  ["Hindi", "MCQ", "किस शब्द में 'ओ (ो)' की मात्रा लगी है?", ["मोर", "कौआ", "शेर", "भालू"], 0, "'मोर' में म पर ओ (ो) की मात्रा है।", "मात्राएँ"],
  ["Hindi", "MCQ", "किस शब्द में 'औ (ौ)' की मात्रा लगी है?", ["नौका", "तोता", "मेला", "चूहा"], 0, "'नौका' में न पर औ (ौ) की मात्रा है।", "मात्राएँ"],
  ["Hindi", "MCQ", "सही वर्तनी (Correct Spelling) वाला शब्द चुनिए:", ["सूरज", "सूरझ", "सुरज", "सूराज"], 0, "सही शब्द 'सूरज' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "सही वर्तनी वाला शब्द चुनिए (किताब):", ["किताब", "कीताब", "किताभ", "केताब"], 0, "सही शब्द 'किताब' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "सही वर्तनी वाला शब्द चुनिए (एक छोटा पक्षी):", ["चिड़िया", "चीड़िया", "चिड़ीया", "चड़िया"], 0, "सही वर्तनी 'चिड़िया' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "सही वर्तनी वाला शब्द चुनिए (पानी में रहने वाली):", ["मछली", "मछलि", "माछली", "मचली"], 0, "सही शब्द 'मछली' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "सही वर्तनी वाला शब्द चुनिए (रंग-बिरंगा कीट):", ["तितली", "तीतली", "तितलि", "तेतली"], 0, "सही शब्द 'तितली' है।", "शुद्ध वर्तनी"],
  ["Hindi", "MCQ", "तीन अक्षरों वाला बिना मात्रा का शब्द कौन-सा है?", ["कमल", "आम", "ताला", "केला"], 0, "'कमल' तीन अक्षरों (क+म+ल) से बना बिना मात्रा का शब्द है।", "शब्द निर्माण"],
  // Fruits, Vegetables, Animals, Birds, Days, Numbers in Hindi (42)
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (फल और सब्ज़ी):", ["सेब", "अंगूर", "संतरा", "आलू"], 3, "सेब, अंगूर और संतरा फल हैं, जबकि आलू सब्ज़ी है।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (जानवर और पक्षी):", ["शेर", "बाघ", "भालू", "तोता"], 3, "शेर, बाघ, भालू जानवर हैं; तोता पक्षी है।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (दिन व महीना):", ["सोमवार", "मंगलवार", "जनवरी", "बुधवार"], 2, "जनवरी महीने का नाम है, बाकी दिनों के नाम हैं।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (फूल और सब्ज़ी):", ["गुलाब", "कमल", "गेंदा", "गाजर"], 3, "गाजर सब्ज़ी है, बाकी सभी फूल हैं।", "वर्गीकरण"],
  ["Hindi", "ODD_ONE_OUT", "अलग शब्द चुनिए (नदियाँ और पर्वत):", ["गंगा", "यमुना", "कावेरी", "हिमालय"], 3, "हिमालय पर्वत है, बाकी नदियाँ हैं।", "वर्गीकरण"],
  ["Hindi", "MCQ", "संख्या '15' को हिंदी शब्दों में कैसे लिखते हैं?", ["पंद्रह", "सोलह", "पच्चीस", "पाँच"], 0, "15 को हिंदी में 'पंद्रह' कहते हैं।", "हिंदी गिनती"],
  ["Hindi", "MCQ", "संख्या '25' को हिंदी में क्या कहते हैं?", ["पैंतीस", "पच्चीस", "बत्तीस", "पंद्रह"], 1, "25 को हिंदी में 'पच्चीस' कहते हैं।", "हिंदी गिनती"],
  ["Hindi", "MCQ", "संख्या '19' को हिंदी में क्या कहते हैं?", ["उन्नीस", "उनतीस", "इककीस", "अठारह"], 0, "19 को हिंदी में 'उन्नीस' लिखते हैं।", "हिंदी गिनती"],
  ["Hindi", "MCQ", "'छब्बीस' किस संख्या का हिंदी नाम है?", ["24", "26", "36", "16"], 1, "26 को छब्बीस कहते हैं।", "हिंदी गिनती"],
  ["Hindi", "MCQ", "'सप्ताह' में कितने दिन होते हैं?", ["पाँच", "छह", "सात", "आठ"], 2, "एक सप्ताह में सात दिन होते हैं।", "दिन व महीने"],
  ["Hindi", "MCQ", "सोमवार के ठीक बाद कौन-सा दिन आता है?", ["रविवार", "मंगलवार", "बुधवार", "शुक्रवार"], 1, "सोमवार के बाद मंगलवार आता है।", "दिन व महीने"],
  ["Hindi", "MCQ", "किस फूल को 'फूलों का राजा' कहा जाता है?", ["गेंदा", "गुलाब", "चमेली", "सूरजमुखी"], 1, "गुलाब को फूलों का राजा कहा जाता है।", "सामान्य हिंदी"],
  ["Hindi", "MCQ", "इनमें से कौन-सा फल 'फलों का राजा' कहलाता है?", ["केला", "सेब", "आम", "पपीता"], 2, "आम फलों का राजा कहलाता है।", "सामान्य हिंदी"],
  ["Hindi", "MCQ", "कौन-सा पक्षी रात में जागता है?", ["कबूतर", "उल्लू", "तोता", "चिड़िया"], 1, "उल्लू रात में जागने वाला पक्षी है।", "सामान्य हिंदी"],
  ["Hindi", "MCQ", "हमारा राष्ट्रीय पक्षी कौन-सा है?", ["तोता", "कौआ", "मोर", "हंस"], 2, "मोर भारत का राष्ट्रीय पक्षी है।", "सामान्य हिंदी"],
  ["Hindi", "MCQ", "आसमान का रंग दिन में कैसा दिखता है?", ["हरा", "नीला", "पीला", "लाल"], 1, "साफ़ आसमान नीले रंग का दिखता है।", "रंग पहचान"],
  ["Hindi", "MCQ", "पत्ते किस रंग के होते हैं?", ["हरे", "लाल", "काले", "नीले"], 0, "पौधों के पत्ते हरे रंग के होते हैं।", "रंग पहचान"],
  ["Hindi", "MCQ", "दूध का रंग कैसा होता है?", ["पीला", "सफ़ेद", "नीला", "हरा"], 1, "दूध सफ़ेद रंग का होता है।", "रंग पहचान"],
  ["Hindi", "MCQ", "तालाब में कौन तैरती है?", ["बकरी", "मछली", "गिलहरी", "हिरण"], 1, "मछली पानी में तैरती है।", "परिवेश"],
  ["Hindi", "MCQ", "बिल्ली कैसी आवाज़ निकालती है?", ["भौं-भौं", "म्याऊँ-म्याऊँ", "काँव-काँव", "टर्र-टर्र"], 1, "बिल्ली म्याऊँ-म्याऊँ बोलती है।", "पशु-पक्षी बोली"],
  ["Hindi", "MCQ", "मेंढक की आवाज़ कैसी होती है?", ["टर्र-टर्र", "चूँ-चूँ", "हिनहिनाना", "दहाड़ना"], 0, "मेंढक टर्र-टर्र की आवाज़ करता है।", "पशु-पक्षी बोली"],
  ["Hindi", "MCQ", "गाय हमें क्या देती है?", ["अंडा", "दूध", "ऊन", "शहद"], 1, "गाय हमें पौष्टिक दूध देती है।", "सामान्य ज्ञान"],
  ["Hindi", "MCQ", "मधुमक्खी से हमें क्या मिलता है?", ["दूध", "शहद", "तेल", "चीनी"], 1, "मधुमक्खी फूलों के रस से शहद बनाती है।", "सामान्य ज्ञान"],
  ["Hindi", "MCQ", "भेड़ से हमें क्या प्राप्त होता है?", ["रेशम", "ऊन", "कपास", "दूध"], 1, "भेड़ के बालों से गर्म ऊन बनती है।", "सामान्य ज्ञान"],
  ["Hindi", "FILL_BLANK", "वाक्य पूरा करें: सूर्य ___ में निकलता है।", ["पश्चिम", "पूर्व", "उत्तर", "दक्षिण"], 1, "सूर्य हमेशा पूर्व दिशा में निकलता है।", "वाक्य पूर्ति"],
  ["Hindi", "FILL_BLANK", "वाक्य पूरा करें: हम आँखों से ___ हैं।", ["सुनते", "देखते", "सूँघते", "चखते"], 1, "आँखों से हम देखते हैं।", "वाक्य पूर्ति"],
  ["Hindi", "FILL_BLANK", "वाक्य पूरा करें: हम कानों से ___ हैं।", ["देखते", "सुनते", "लिखते", "बोलते"], 1, "कानों से सुनने का काम होता है।", "वाक्य पूर्ति"],
  ["Hindi", "FILL_BLANK", "वाक्य पूरा करें: बच्चे मैदान में ___ रहे हैं।", ["खेल", "सो", "उड़", "तैर"], 0, "बच्चे मैदान में खेल रहे हैं।", "वाक्य पूर्ति"],
  ["Hindi", "FILL_BLANK", "वाक्य पूरा करें: माली बगीचे में ___ लगा रहा है।", ["पत्थर", "पौधे", "मेज़", "किताब"], 1, "माली बगीचे में पौधे लगाता है।", "वाक्य पूर्ति"],
  ["Hindi", "MCQ", "इनमें से संज्ञा (नाम) शब्द चुनिए:", ["दौड़ना", "मोटा", "दिल्ली", "खाना"], 2, "दिल्ली एक शहर का नाम है, अतः संज्ञा है।", "संज्ञा"],
  ["Hindi", "MCQ", "इनमें से क्रिया (काम) शब्द चुनिए:", ["मेज़", "पढ़ना", "पीला", "किताब"], 1, "'पढ़ना' एक काम (क्रिया) है।", "क्रिया"],
  ["Hindi", "MCQ", "'छोटा बच्चा' में 'छोटा' क्या बता रहा है?", ["नाम", "गुण/विशेषता", "काम", "स्थान"], 1, "'छोटा' बच्चे की विशेषता बता रहा है।", "विशेषण"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: हिंदी हमारी राजभाषा है।", ["सही", "गलत", "केवल अंग्रेजी", "पता नहीं"], 0, "हिंदी भारत की राजभाषा है।", "हिंदी ज्ञान"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: 'कमल' पानी में खिलता है।", ["सही", "गलत", "आसमान में", "रेत में"], 0, "कमल पानी में खिलने वाला राष्ट्रीय फूल है।", "हिंदी ज्ञान"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: आम एक सब्ज़ी है।", ["सही", "गलत", "अनाज है", "फूल है"], 1, "गलत! आम एक मीठा फल है।", "हिंदी ज्ञान"],
  ["Hindi", "TRUE_FALSE", "सही या गलत: हमें रोज़ दाँत साफ़ करने चाहिए।", ["सही", "गलत", "सप्ताह में एक बार", "कभी नहीं"], 0, "स्वस्थ रहने के लिए रोज़ ब्रश करना ज़रूरी है।", "अच्छी आदतें"],
  ["Hindi", "MINI_PASSAGE", "बाग़ में कौन से फूल खिले थे?", ["चमेली के", "गुलाब और गेंदे के", "सूरजमुखी के", "कमल के"], 1, "गद्यांश में लिखा है कि बाग़ में लाल गुलाब और पीले गेंदे के फूल खिले थे।", "अपठित गद्यांश", "रवि के घर के पास एक सुंदर बाग़ है। उसमें लाल गुलाब और पीले गेंदे के फूल खिले हैं। सुबह तितलियाँ फूलों पर आती हैं।"],
  ["Hindi", "MINI_PASSAGE", "सुबह फूलों पर कौन आती हैं?", ["तितलियाँ", "मछलियाँ", "बिल्लियाँ", "गायें"], 0, "सुबह तितलियाँ फूलों पर आती हैं।", "अपठित गद्यांश", "रवि के घर के पास एक सुंदर बाग़ है। उसमें लाल गुलाब और पीले गेंदे के फूल खिले हैं। सुबह तितलियाँ फूलों पर आती हैं।"],
  ["Hindi", "MINI_PASSAGE", "नेहा ने अपने जन्मदिन पर किसको बुलाया?", ["केवल शिक्षकों को", "सहेलियों को", "पड़ोस के जानवरों को", "किसी को नहीं"], 1, "नेहा ने अपने जन्मदिन पर सहेलियों को बुलाया।", "अपठित गद्यांश", "आज नेहा का जन्मदिन है। उसने अपनी सहेलियों को घर बुलाया। सबने मिलकर केक खाया और गीत गाए।"],
  ["Hindi", "MINI_PASSAGE", "जन्मदिन पर सबने मिलकर क्या खाया?", ["समोसा", "केक", "खीर", "रोटी"], 1, "सबने मिलकर केक खाया।", "अपठित गद्यांश", "आज नेहा का जन्मदिन है। उसने अपनी सहेलियों को घर बुलाया। सबने मिलकर केक खाया और गीत गाए।"],
  ["Hindi", "MCQ", "'जो मीठा बोले' उसे क्या कहते हैं?", ["मृदुभाषी", "क्रोधित", "आलसी", "डरपोक"], 0, "मीठा बोलने वाले को मृदुभाषी कहते हैं।", "शब्द ज्ञान"],
  ["Hindi", "MCQ", "'छोटे से बड़ा' क्रम कौन-सा सही है?", ["चींटी, बिल्ली, हाथी", "हाथी, चींटी, बिल्ली", "बिल्ली, हाथी, चींटी", "हाथी, बिल्ली, चींटी"], 0, "आकार में चींटी सबसे छोटी, फिर बिल्ली और हाथी सबसे बड़ा।", "तार्किक हिंदी"],
];

// 4. EVS / GK (116)
const c1EvsAnimals = buildFactBankTuples({
  subject: "EVS / GK",
  topicTag: "Animals & Homes",
  seedPrefix: "c1_evs_ani",
  explanationPrefix: "Correct match:",
  items: [
    { prompt: "What is the baby of a Dog called?", answer: "Puppy" },
    { prompt: "What is the baby of a Cat called?", answer: "Kitten" },
    { prompt: "What is the baby of a Cow called?", answer: "Calf" },
    { prompt: "What is the baby of a Lion called?", answer: "Cub" },
    { prompt: "What is the baby of a Hen called?", answer: "Chick" },
    { prompt: "What is the baby of a Duck called?", answer: "Duckling" },
    { prompt: "What is the baby of a Goat called?", answer: "Kid" },
    { prompt: "What is the baby of a Sheep called?", answer: "Lamb" },
    { prompt: "What is the baby of a Frog called?", answer: "Tadpole" },
    { prompt: "Where does a Lion live?", answer: "Den" },
    { prompt: "Where does a Dog live?", answer: "Kennel" },
    { prompt: "Where does a Horse live?", answer: "Stable" },
    { prompt: "Where does a Cow live?", answer: "Shed" },
    { prompt: "Where does a Bird live?", answer: "Nest" },
    { prompt: "Where does a Bee live?", answer: "Hive" },
    { prompt: "Where does a Spider live?", answer: "Web" },
    { prompt: "Where does a Rabbit live?", answer: "Burrow" },
    { prompt: "Which animal is called the 'Ship of the Desert'?", answer: "Camel" },
    { prompt: "Which is the largest land animal?", answer: "Elephant" },
    { prompt: "Which is the tallest animal in the world?", answer: "Giraffe" },
  ],
});

const c1EvsHelpers = buildFactBankTuples({
  subject: "EVS / GK",
  topicTag: "Our Helpers",
  seedPrefix: "c1_evs_help",
  explanationPrefix: "Our community helper is",
  items: [
    { prompt: "Who treats us when we fall sick?", answer: "Doctor" },
    { prompt: "Who teaches us in school?", answer: "Teacher" },
    { prompt: "Who delivers letters to our home?", answer: "Postman" },
    { prompt: "Who catches thieves and keeps us safe?", answer: "Policeman" },
    { prompt: "Who puts out fires?", answer: "Firefighter" },
    { prompt: "Who grows crops and food for us?", answer: "Farmer" },
    { prompt: "Who makes wooden tables and chairs?", answer: "Carpenter" },
    { prompt: "Who stitches our clothes?", answer: "Tailor" },
    { prompt: "Who mends our broken shoes?", answer: "Cobbler" },
    { prompt: "Who cuts and trims our hair?", answer: "Barber" },
    { prompt: "Who bakes bread and cakes?", answer: "Baker" },
    { prompt: "Who drives the school bus?", answer: "Driver" },
    { prompt: "Who fixes leaking water taps and pipes?", answer: "Plumber" },
    { prompt: "Who repairs electric fans and lights?", answer: "Electrician" },
    { prompt: "Who builds brick walls of houses?", answer: "Mason" },
  ],
});

const c1EvsCore: QTuple[] = [
  // Body & Senses (15)
  ["EVS / GK", "MCQ", "How many sense organs do we have?", ["3", "4", "5", "6"], 2, "We have 5 sense organs: eyes, ears, nose, tongue, and skin.", "Body Parts"],
  ["EVS / GK", "MCQ", "Which organ helps us SMELL a rose?", ["Eyes", "Nose", "Ears", "Skin"], 1, "Our nose helps us smell things.", "Sense Organs"],
  ["EVS / GK", "MCQ", "Which sense organ helps us TASTE ice cream?", ["Tongue", "Nose", "Ears", "Eyes"], 0, "The tongue helps us taste sweet, sour, salty, and bitter.", "Sense Organs"],
  ["EVS / GK", "MCQ", "Which sense organ helps us FEEL hot or cold?", ["Eyes", "Tongue", "Skin", "Ears"], 2, "Skin lets us feel hot, cold, soft, or hard.", "Sense Organs"],
  ["EVS / GK", "MCQ", "How many fingers do we have on BOTH hands together (including thumbs)?", ["5", "8", "10", "12"], 2, "5 on the left hand + 5 on the right hand = 10.", "Body Parts"],
  ["EVS / GK", "MCQ", "Which body part helps us chew food?", ["Tongue", "Teeth", "Lips", "Nose"], 1, "Teeth help us bite and chew food properly.", "Body Parts"],
  ["EVS / GK", "MCQ", "How many times should we brush our teeth every day?", ["Once a week", "Twice a day", "Once a month", "Never"], 1, "We should brush twice daily—morning and night.", "Good Habits"],
  ["EVS / GK", "MCQ", "What should we do BEFORE and AFTER eating meals?", ["Sleep", "Wash hands", "Run fast", "Watch TV"], 1, "Always wash hands with soap before and after eating.", "Good Habits"],
  ["EVS / GK", "MCQ", "Which food gives us strong bones and teeth?", ["Cold drink", "Milk", "Chips", "Candy"], 1, "Milk is rich in calcium for strong bones and teeth.", "Healthy Food"],
  ["EVS / GK", "MCQ", "Which of these is a healthy green vegetable?", ["Burger", "Spinach (पालक)", "Pizza", "Toffee"], 1, "Spinach is a nutritious green leafy vegetable.", "Healthy Food"],
  ["EVS / GK", "MCQ", "We should throw waste paper into a:", ["Floor", "Dustbin", "Desk", "Garden"], 1, "Always put garbage in a dustbin to stay clean.", "Cleanliness"],
  ["EVS / GK", "MCQ", "What do we wear in the RAINY season to stay dry?", ["Sweater", "Raincoat", "Woollen cap", "Muffler"], 1, "A raincoat and umbrella protect us from rain.", "Seasons"],
  ["EVS / GK", "MCQ", "In which season do we wear woollen sweaters?", ["Summer", "Winter", "Rainy", "Spring"], 1, "We wear woollen clothes in winter to keep warm.", "Seasons"],
  ["EVS / GK", "MCQ", "In which season do we love eating ice cream and drinking cold water?", ["Winter", "Summer", "Monsoon", "Autumn"], 1, "Summer is hot, so we enjoy cool drinks.", "Seasons"],
  ["EVS / GK", "MCQ", "When should we cross the road?", ["At the Zebra Crossing", "Anywhere", "While running", "When red light is off for cars"], 0, "Always cross carefully at the Zebra Crossing.", "Safety Rules"],
  // Traffic Lights, India GK, Transport, Plants, Sky (46)
  ["EVS / GK", "MCQ", "What does the RED traffic light mean?", ["Go", "Wait", "Stop", "Run"], 2, "Red light tells vehicles to STOP.", "Traffic Rules"],
  ["EVS / GK", "MCQ", "What does the GREEN traffic light mean?", ["Stop", "Go", "Get ready", "Park"], 1, "Green light means GO.", "Traffic Rules"],
  ["EVS / GK", "MCQ", "What does the YELLOW traffic light mean?", ["Stop completely", "Slow down / Get ready", "Turn back", "Honk"], 1, "Yellow light warns you to slow down and wait/get ready.", "Traffic Rules"],
  ["EVS / GK", "MCQ", "How many colours are there in the Indian National Flag (Tiranga)?", ["2", "3", "4", "5"], 1, "Tiranga has 3 main colours: Saffron, White, and Green (with navy blue Chakra).", "National Symbols"],
  ["EVS / GK", "MCQ", "What is the National Flower of India?", ["Rose", "Lotus", "Marigold", "Lily"], 1, "Lotus (कमल) is India's national flower.", "National Symbols"],
  ["EVS / GK", "MCQ", "What is the National Animal of India?", ["Lion", "Elephant", "Royal Bengal Tiger", "Deer"], 2, "The Tiger is the national animal of India.", "National Symbols"],
  ["EVS / GK", "MCQ", "What is the National Fruit of India?", ["Apple", "Banana", "Mango", "Guava"], 2, "Mango (आम) is the national fruit of India.", "National Symbols"],
  ["EVS / GK", "MCQ", "What is the National Tree of India?", ["Neem", "Banyan Tree", "Peepal", "Mango Tree"], 1, "The Banyan Tree (बरगद) is India's national tree.", "National Symbols"],
  ["EVS / GK", "MCQ", "What is the capital city of India?", ["Mumbai", "Kolkata", "New Delhi", "Chennai"], 2, "New Delhi is the capital of India.", "India GK"],
  ["EVS / GK", "MCQ", "On which date do we celebrate Independence Day in India?", ["26 January", "15 August", "2 October", "14 November"], 1, "India celebrates Independence Day on 15 August.", "National Festivals"],
  ["EVS / GK", "MCQ", "On which date do we celebrate Republic Day in India?", ["15 August", "26 January", "5 September", "25 December"], 1, "Republic Day is celebrated on 26 January.", "National Festivals"],
  ["EVS / GK", "MCQ", "Whose birthday is celebrated as Children's Day (14 November)?", ["Mahatma Gandhi", "Pt. Jawaharlal Nehru", "Dr. APJ Abdul Kalam", "Subhash Chandra Bose"], 1, "14 November is Chacha Nehru's birthday.", "Festivals & Leaders"],
  ["EVS / GK", "MCQ", "Whose birthday is celebrated as Gandhi Jayanti (2 October)?", ["Mahatma Gandhi", "Bhagat Singh", "Sardar Patel", "Dr. Rajendra Prasad"], 0, "2 October is Mahatma Gandhi's birthday.", "Festivals & Leaders"],
  ["EVS / GK", "MCQ", "Which festival is called the 'Festival of Lights'?", ["Holi", "Diwali", "Eid", "Baisakhi"], 1, "Diwali is known as the Festival of Lights.", "Festivals"],
  ["EVS / GK", "MCQ", "Which festival is called the 'Festival of Colours'?", ["Diwali", "Holi", "Christmas", "Pongal"], 1, "Holi is celebrated with bright colours.", "Festivals"],
  ["EVS / GK", "MCQ", "When is Christmas celebrated?", ["15 August", "2 October", "25 December", "1 January"], 2, "Christmas is celebrated on 25 December every year.", "Festivals"],
  ["EVS / GK", "MCQ", "Which part of a plant grows UNDER the soil?", ["Leaf", "Flower", "Root", "Fruit"], 2, "Roots grow underground and hold the plant firmly.", "Plants"],
  ["EVS / GK", "MCQ", "Which part of a plant is called its 'Kitchen' because it makes food?", ["Root", "Leaf", "Stem", "Seed"], 1, "Green leaves make food for the plant using sunlight.", "Plants"],
  ["EVS / GK", "MCQ", "What do plants need to grow well?", ["Sunlight, water & air", "Darkness only", "Plastic", "Smoke"], 0, "Plants need sunlight, water, air, and soil.", "Plants"],
  ["EVS / GK", "MCQ", "Which is the fastest mode of transport?", ["Bullock cart", "Bicycle", "Aeroplane", "Boat"], 2, "An aeroplane flies in the sky and is fastest.", "Transport"],
  ["EVS / GK", "MCQ", "Which vehicle runs on railway tracks?", ["Bus", "Train", "Ship", "Auto"], 1, "Trains run on iron railway tracks.", "Transport"],
  ["EVS / GK", "MCQ", "Which transport sails on water?", ["Ship", "Helicopter", "Truck", "Scooter"], 0, "Ships and boats travel on water.", "Transport"],
  ["EVS / GK", "MCQ", "Which vehicle has NO engine and needs pedalling?", ["Car", "Motorcycle", "Bicycle", "Bus"], 2, "A bicycle moves when we pedal.", "Transport"],
  ["EVS / GK", "MCQ", "What gives us light and heat during the day?", ["Moon", "Sun", "Stars", "Lamp"], 1, "The Sun gives us light and warmth during daytime.", "Sky & Space"],
  ["EVS / GK", "MCQ", "What shines in the sky at night and changes shape?", ["Sun", "Moon", "Rainbow", "Cloud"], 1, "The Moon shines at night and appears to change shape.", "Sky & Space"],
  ["EVS / GK", "MCQ", "How many colours are there in a Rainbow?", ["5", "6", "7", "8"], 2, "A rainbow has 7 colours (VIBGYOR).", "Nature"],
  ["EVS / GK", "MCQ", "What is the main natural source of water on Earth?", ["Tap", "Rain", "Bottle", "Bucket"], 1, "Rain is the primary natural source of fresh water.", "Water"],
  ["EVS / GK", "MCQ", "Which animal gives us wool for winter clothes?", ["Dog", "Sheep", "Horse", "Cat"], 1, "Sheep give us wool.", "Animals"],
  ["EVS / GK", "MCQ", "Which bird CANNOT fly?", ["Crow", "Pigeon", "Ostrich", "Eagle"], 2, "Ostrich is a large flightless bird (runs fast).", "Birds"],
  ["EVS / GK", "MCQ", "Which bird can copy human speech?", ["Crow", "Parrot", "Duck", "Owl"], 1, "Parrots can mimic words spoken by humans.", "Birds"],
  ["EVS / GK", "MCQ", "What is a baby plant inside a fruit called?", ["Leaf", "Seed", "Stem", "Thorn"], 1, "A seed grows into a new plant.", "Plants"],
  ["EVS / GK", "MCQ", "Which room in a house is used for cooking food?", ["Bedroom", "Kitchen", "Bathroom", "Study room"], 1, "Food is cooked in the kitchen.", "My Home"],
  ["EVS / GK", "MCQ", "Where do we go to study and learn with friends?", ["Hospital", "Market", "School", "Bank"], 2, "Children go to school to study and play.", "My Neighbourhood"],
  ["EVS / GK", "MCQ", "Where do sick people go to get treated?", ["Post Office", "Hospital", "Police Station", "Park"], 1, "Hospitals have doctors and nurses for sick people.", "My Neighbourhood"],
  ["EVS / GK", "MCQ", "Which fruit has NO seeds inside?", ["Mango", "Watermelon", "Banana", "Orange"], 2, "Bananas do not have hard seeds inside.", "Fruits"],
  ["EVS / GK", "MCQ", "Which vegetable grows UNDER the ground?", ["Tomato", "Potato", "Brinjal", "Ladyfinger"], 1, "Potato grows underground.", "Vegetables"],
  ["EVS / GK", "MCQ", "Which vegetable is orange in colour and good for our eyes?", ["Carrot", "Cabbage", "Cauliflower", "Peas"], 0, "Carrots are rich in Vitamin A for healthy eyes.", "Vegetables"],
  ["EVS / GK", "MCQ", "What do we use to see the time?", ["Scale", "Clock", "Spoon", "Comb"], 1, "A clock or watch tells us the time.", "Daily Objects"],
  ["EVS / GK", "MCQ", "Which planet do we live on?", ["Mars", "Earth", "Moon", "Sun"], 1, "We live on planet Earth.", "Our Earth"],
  ["EVS / GK", "MCQ", "How many wheels does an auto-rickshaw have?", ["2", "3", "4", "6"], 1, "An auto-rickshaw has 3 wheels.", "Transport"],
  ["EVS / GK", "MCQ", "Which animal has a long trunk?", ["Giraffe", "Elephant", "Zebra", "Bear"], 1, "An elephant uses its long trunk to drink water and pick food.", "Animals"],
  ["EVS / GK", "MCQ", "Which animal has black and white stripes on its body?", ["Tiger", "Zebra", "Leopard", "Deer"], 1, "A zebra has black and white stripes.", "Animals"],
  ["EVS / GK", "MCQ", "Which animal has a pouch to carry its baby?", ["Kangaroo", "Monkey", "Fox", "Wolf"], 0, "A kangaroo carries its joey in its pouch.", "Animals"],
  ["EVS / GK", "MCQ", "Which insect has colourful wings and sits on flowers?", ["Ant", "Butterfly", "Mosquito", "Cockroach"], 1, "Butterflies have bright colourful wings.", "Insects"],
  ["EVS / GK", "TRUE_FALSE", "True or False: We should play with matchsticks and fire.", ["True", "False", "Only at night", "Always"], 1, "False! Fire and matchsticks are dangerous for children.", "Safety Rules"],
  ["EVS / GK", "TRUE_FALSE", "True or False: Trees give us fresh oxygen to breathe.", ["True", "False", "Only in winter", "Never"], 0, "True! Trees give us oxygen, shade, and fruits.", "Nature"],
  ["EVS / GK", "TRUE_FALSE", "True or False: Drinking dirty water can make us sick.", ["True", "False", "Makes us strong", "No effect"], 0, "True! We should always drink clean filtered water.", "Health"],
  ["EVS / GK", "TRUE_FALSE", "True or False: Fish can live out of water for many days.", ["True", "False", "On trees", "In desert"], 1, "False! Fish breathe in water through gills.", "Animals"],
  ["EVS / GK", "ODD_ONE_OUT", "Find the odd one out (Vegetables vs Milk):", ["Potato", "Tomato", "Onion", "Milk"], 3, "Milk is a dairy drink; the others are vegetables.", "Odd One Out"],
  ["EVS / GK", "ODD_ONE_OUT", "Find the odd one out (Land vs Water Transport):", ["Car", "Boat", "Ship", "Yacht"], 0, "Car moves on road; Boat, Ship, Yacht move on water.", "Odd One Out"],
  ["EVS / GK", "ODD_ONE_OUT", "Find the odd one out (Hospital vs Fruit):", ["Doctor", "Nurse", "Patient", "Mango"], 3, "Doctor, Nurse, Patient belong to a hospital; Mango is a fruit.", "Odd One Out"],
  ["EVS / GK", "MCQ", "Which festival marks the harvest of crops in Punjab?", ["Baisakhi", "Onam", "Pongal", "Bihu"], 0, "Baisakhi is the famous harvest festival of Punjab.", "Festivals"],
  ["EVS / GK", "MCQ", "Which is the smallest bird?", ["Crow", "Hummingbird", "Peacock", "Eagle"], 1, "The bee hummingbird is the smallest bird in the world.", "Birds"],
  ["EVS / GK", "MCQ", "What do we call the meal we eat in the morning?", ["Lunch", "Dinner", "Breakfast", "Supper"], 2, "Morning meal is called Breakfast.", "Food"],
  ["EVS / GK", "MCQ", "What do we call the meal we eat at night?", ["Breakfast", "Lunch", "Dinner", "Brunch"], 2, "The night meal is called Dinner.", "Food"],
  ["EVS / GK", "MCQ", "Which Indian monument is white and built in Agra?", ["Red Fort", "Taj Mahal", "Qutub Minar", "India Gate"], 1, "The Taj Mahal is a white marble monument in Agra.", "India GK"],
  ["EVS / GK", "MCQ", "How many colours are in the Traffic signal light?", ["2", "3", "4", "5"], 1, "Traffic signal has 3 lights: Red, Yellow, Green.", "Safety Rules"],
  ["EVS / GK", "MCQ", "Which animal guards our house and wags its tail?", ["Cat", "Dog", "Cow", "Rat"], 1, "Dogs are loyal pets that guard our homes.", "Animals"],
  ["EVS / GK", "MCQ", "Which shape is the Earth?", ["Flat like paper", "Square", "Round like a ball", "Triangle"], 2, "Earth is round (spherical) like a ball.", "Our Earth"],
  ["EVS / GK", "MCQ", "Which day is celebrated as Teacher's Day in India?", ["15 August", "5 September", "2 October", "14 November"], 1, "Teacher's Day is celebrated on 5 September.", "Festivals & Leaders"],
  ["EVS / GK", "MCQ", "Which living thing can make its own food using sunlight?", ["Dog", "Boy", "Green Plant", "Fish"], 2, "Green plants make their own food via photosynthesis.", "Plants"],
  ["EVS / GK", "MCQ", "Which organ helps us HEAR sweet music?", ["Eyes", "Ears", "Nose", "Tongue"], 1, "Our ears help us hear sounds.", "Sense Organs"],
  ["EVS / GK", "MCQ", "Which season has cold chilly mornings and foggy nights?", ["Summer", "Winter", "Monsoon", "Spring"], 1, "Winter is the coldest season of the year.", "Seasons"],
  ["EVS / GK", "MCQ", "What should we drink plenty of every day to stay hydrated and healthy?", ["Soda", "Clean drinking water", "Tea", "Cold drinks"], 1, "Drinking clean water keeps our body healthy.", "Good Habits"],
  ["EVS / GK", "MCQ", "Who makes clay pots on a potter's wheel?", ["Tailor", "Potter", "Carpenter", "Driver"], 1, "A potter shapes clay into pots and diyas.", "Our Helpers"],
  ["EVS / GK", "MCQ", "Which fruit is red outside and has many small seeds on it (sweet berry)?", ["Banana", "Strawberry", "Coconut", "Mango"], 1, "Strawberries are bright red sweet fruits.", "Fruits"],
];

const CLASS_1_TUPLES: QTuple[] = [
  ...c1EngOpposites,   // 20
  ...c1EngPlurals,     // 20
  ...c1EngGenders,     // 15
  ...c1EngSpellings,   // 60 -> Eng total = 115
  ...buildClass1Maths(), // 117
  ...c1HindiVilom,     // 20
  ...c1HindiVachan,    // 15
  ...c1HindiLing,      // 15
  ...c1HindiCore,      // 67 -> Hindi total = 117
  ...c1EvsAnimals,     // 20
  ...c1EvsHelpers,     // 15
  ...c1EvsCore,        // 81 -> EVS total = 116
];

export const CLASS_1_EXTRA: EntranceTestQuestion[] = expandClassQuestions(1, CLASS_1_TUPLES);
