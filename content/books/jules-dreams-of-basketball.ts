/**
 * Jules Dreams of Basketball: per-page data for the flip-book reader at /books/jules-dreams-of-basketball.
 *
 * Generated from the book PDF (pdftotext per page). Page images live in
 * public/books/jules-dreams-of-basketball/pages/{1600,800}/page-NN.webp; illustrated pages are lossy WebP q92,
 * text-only pages lossless. `text` is the page's own words, rendered as visually hidden text behind each page for
 * screen readers and search. `alt` describes illustrated pages and is empty for text pages, whose words are in `text`.
 * Illustration alt text is a draft placeholder until the author supplies scene descriptions.
 */

export type BookPage = {
  number: number;
  kind: "cover" | "illustration" | "text";
  text: string;
  alt: string;
};

export const julesBook = {
  slug: "jules-dreams-of-basketball",
  title: "Jules Dreams of Basketball",
  pdf: {
    /** The static file in public/. Readers reach it through `downloadHref`, which counts the download first. */
    href: "/books/jules-dreams-of-basketball/jules-dreams-of-basketball.pdf",
    downloadHref: "/books/jules-dreams-of-basketball/download",
    fileName: "jules-dreams-of-basketball.pdf",
    sizeLabel: "6.5 MB",
  },
  imageBase: "/books/jules-dreams-of-basketball/pages",
};

export const julesPages: BookPage[] = [
  { number: 1, kind: "cover", text: "Jules Dreams of Basketball\n\nBy Winston Nilumol", alt: "Cover: Jules Dreams of Basketball, by Winston Nilumol. Jules leaps toward a basketball hoop." },
  { number: 2, kind: "illustration", text: "Jules Chibi", alt: "Jules Chibi: four small character drawings of Jules holding a basketball." },
  { number: 3, kind: "text", text: "Dear Julien,\nMay your joy and laughter stay with you on your\nadventures.\nWith Love,\nDad\n\nText & Images generated using AI – inspired by Dr.\nSeuss, Japanese manga, and real-life characters\nEdited and authored by Winston Nilumol", alt: "" },
  { number: 4, kind: "text", text: "Little Jules\nJules had sneakers.\nJules had dreams.\nJules had zips\nand ziggy zoom\npremes.\nHe bounced the ball.\nBoop! Bop! Bin!\nHe loved to run.\nHe loved to spin.\nHe dreamed one day\nthat he would win!", alt: "" },
  { number: 5, kind: "illustration", text: "", alt: "Illustration for “Little Jules”." },
  { number: 6, kind: "text", text: "Playing at Home\nHe sat.\nHe watched.\nHe waited more.\nHis sneakers squeaked\nupon the floor.\nThe minutes ticked\nthe crowd grew loud.\nJules dreamed of flying\nthrough a cloud.", alt: "" },
  { number: 7, kind: "illustration", text: "", alt: "Illustration for “Playing at Home”." },
  { number: 8, kind: "text", text: "Jules Dreams of\nBeing a HOOPER\nHe waited long\nhe held on tight.\nHe dreamed of dribbles\nevery night.\nHe wished to grow\nso big and tall.\nHe dreamed he'd fly\nabove them all.\nTo grow so strong\nto grip it tight\nthen DUNK that ball\nOH, WHAT A SIGHT!", alt: "" },
  { number: 9, kind: "illustration", text: "", alt: "Illustration for “Jules Dreams of Being a HOOPER”." },
  { number: 10, kind: "text", text: "Coach Bird\nThen one night\nin his dreams\nCoach Bird swooped in\nand called his name.\n\"JULES!\" chirped Coach.\n\"DRIBBLE! DRIBBLE!\nGO, GO, GO!\"\nJules blinked once.\nJules blinked twice.\nHe leapt to his feet\n\"LET'S GO!\" he cried!", alt: "" },
  { number: 11, kind: "illustration", text: "", alt: "Illustration for “Coach Bird”." },
  { number: 12, kind: "text", text: "Game Time\nDribble!\nZip!\nDash!\nSpin!\nWhoosh went Jules\nlet the game begin!\nHis shoes said,\nSKRRT!\nThe crowd screamed,\n\"WOOOT! WOOOT!\"\nJules took his shot\nhe couldn't miss.\nSWOOSH! went the ball.\nSWISH! He felt pure bliss!", alt: "" },
  { number: 13, kind: "illustration", text: "", alt: "Illustration for “Game Time”." },
  { number: 14, kind: "text", text: "Heating Up\nOne good play\nThen one more too.\nLEFT foot! RIGHT foot!\nA sneaky scoot-through!\n\"WHO is that kid?!\"\n\"He's got aura! He's got\nrizz!\"\n\"That kid's amazing\nwhoever he is!\"", alt: "" },
  { number: 15, kind: "illustration", text: "", alt: "Illustration for “Heating Up”." },
  { number: 16, kind: "text", text: "On FIRE\nOne bucket! Two bucket!\nThree buckets! FOUR!\nThe crowd cried out,\n\"JULES! WE WANT MORE!\"\nHis grin grew wide.\nHis doubts grew small.\n\"I CAN DO THIS!\nI CAN PLAY BALL!\"", alt: "" },
  { number: 17, kind: "illustration", text: "", alt: "Illustration for “On FIRE”." },
  { number: 18, kind: "text", text: "Jayce the Ace\nThen came Jayce\nso BIG and WIDE!\nWith giant arms\nfrom side to side.\nJules shot the ball\nBAM! Jayce blocked!\n\"NO, NO, NO!\nNot on my watch!\"\n\"He's big,\" thought Jules.\n\"He's strong, that's true.\nBut I am FAST.\nI've got moves too!\"", alt: "" },
  { number: 19, kind: "illustration", text: "", alt: "Illustration for “Jayce the Ace”." },
  { number: 20, kind: "text", text: "The Big JAM\nJayce grabbed the ball.\nHe charged with a BAM!\nHe leapt up high\nKABOOM! KER-SLAM!\nHe flexed his arms\nand struck a pose.\nThen winked at Jules\n“TOO SMALL!” oh noes!", alt: "" },
  { number: 21, kind: "illustration", text: "", alt: "Illustration for “The Big JAM”." },
  { number: 22, kind: "text", text: "The Final Shot\nThe score was tied.\nTick-tock, tick-tock\none final shot.\nJayce reached high\nbut Jules slipped on by.\nPast his hands\nPast the sky\nTick…\nTock…\nSWISH!\nOH MY!\nJules made magic!\nRight before their eyes.", alt: "" },
  { number: 23, kind: "illustration", text: "", alt: "Illustration for “The Final Shot”." },
  { number: 24, kind: "text", text: "JULESANITY\nThe crowd cried\n\"JULES! JULES! JULES!\"\nThey stomped their feet\nand shook the stools.\nThey danced so hard.\nThey clapped so neatly.\n\"JULESANITY!\"\nthey shouted sweetly.", alt: "" },
  { number: 25, kind: "illustration", text: "", alt: "Illustration for “JULESANITY”." },
  { number: 26, kind: "text", text: "Jules Wakes Up\nA brand-new day\nJules blinked awake\nthe dream flew away.\nHis grin grew wide\nfilled with pride.\nSo if you're small\nor quiet too\na giant dream\ncan still fit you.\nTry one more time.\nGet up if you fall.\nBig dreams can start\nwith one little ball.", alt: "" },
  { number: 27, kind: "illustration", text: "", alt: "Illustration for “Jules Wakes Up”." },
];
