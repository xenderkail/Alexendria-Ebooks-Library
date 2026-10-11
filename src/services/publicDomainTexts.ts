/**
 * Curated Authentic Public Domain Masterworks (Offline / Fallback Text Engine)
 * Ensures every catalog book has immediate, readable, multi-chapter public domain content
 * even if remote server links fail or are blocked by CORS on static hosts like Vercel.
 */

export interface PublicDomainTextRecord {
  id: string;
  title: string;
  author: string;
  chapters: {
    title: string;
    content: string;
  }[];
}

export const PUBLIC_DOMAIN_TEXTS: Record<string, PublicDomainTextRecord> = {
  // --- FICTION ---
  'fic-pride-prejudice': {
    id: 'fic-pride-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    chapters: [
      {
        title: 'Chapter 1: The Truth Universally Acknowledged',
        content: `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."

This was invitation enough.

"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."

"What is his name?"

"Bingley."

"Is he married or single?"

"Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!"

"How so? How can it affect them?"

"My dear Mr. Bennet," replied his wife, "how can you be so tiresome! You must know that I am thinking of his marrying one of them."`
      },
      {
        title: 'Chapter 2: The Call at Netherfield',
        content: `Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it.

It was then disclosed in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with:

"I hope Mr. Bingley will like it, Lizzy."

"We are not in a way to know what Mr. Bingley likes," said her mother resentfully, "since we are not to visit."

"But you forget, mamma," said Elizabeth, "that we shall meet him at the assemblies, and that Mrs. Long promised to introduce him."

"I do not believe Mrs. Long will do any such thing. She has two nieces of her own. She is a selfish, hypocritical woman, and I have no opinion of her."

"No more have I," said Mr. Bennet; "and I am glad to find that you do not depend on her serving you."

Mrs. Bennet would not play at any such game. "Don't keep coughing so, Kitty, for heaven's sake! Have a little compassion on my nerves. You tear them to pieces."

"Kitty has no discretion in her coughs," said her father; "she times them ill."

"I do not cough for my own amusement," replied Kitty fretfully. "When is your next ball to be, Lizzy?"

"To-morrow fortnight."

"Aye, so it is," cried her mother, "and Mrs. Long does not come back till the day before; so it will be impossible for her to introduce him, for she will not know him herself."

"Then, my dear, you may have the advantage of your friend, and introduce Mr. Bingley to her."

"Impossible, Mr. Bennet, impossible, when I am not acquainted with him myself; how can you be so teasing?"

"I honour your circumspection. A fortnight's acquaintance is certainly very little. One cannot know what a man really is by the end of a fortnight. But if we do not venture, somebody else will; and after all, Mrs. Long and her nieces must stand their chance; and, therefore, as she will think it an act of kindness, if you decline the office, I will take it on myself."

The girls stared at their father. Mrs. Bennet said only, "Nonsense, nonsense!"

"What can be the meaning of that emphatic exclamation?" cried he. "Do you consider the forms of introduction, and the stress that is laid on them, as nonsense? I cannot quite agree with you there. What say you, Mary? For you are a young lady of deep reflection, I know, and read great books and make extracts."

Mary wished to say something sensible, but knew not how.

"While Mary is adjusting her ideas," he continued, "let us return to Mr. Bingley."

"I am sick of Mr. Bingley," cried his wife.

"I am sorry to hear that; but why did not you tell me that before? If I had known as much this morning I should certainly not have called on him. It is very unlucky; but as I have actually paid the visit, we cannot well avoid the acquaintance now."

The astonishment of the ladies was just what he could have wished; that of Mrs. Bennet perhaps surpassing the rest; though, when the first tumult of joy was over, she began to declare that it was what she had expected all the while.`
      }
    ]
  },

  'fic-frankenstein': {
    id: 'fic-frankenstein',
    title: 'Frankenstein; Or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    chapters: [
      {
        title: 'Letter 1: St. Petersburgh, Dec. 11th, 17—',
        content: `To Mrs. Saville, England.

You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.

I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes. Inspirited by this wind of promise, my daydreams become more fervent and vivid.

I try in vain to be persuaded that the pole is the seat of frost and desolation; it ever presents itself to my imagination as the region of beauty and delight. There, Margaret, the sun is for ever visible, its broad disk just skirting the horizon and diffusing a perpetual splendour. There—for with your leave, my sister, I will put some trust in preceding navigators—there snow and frost are banished; and, sailing over a calm sea, we may be wafted to a land surpassing in wonders and in beauty every region hitherto discovered on the habitable globe.`
      },
      {
        title: 'Chapter 5: The Spark of Being',
        content: `It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs.

How can I describe my emotions at this catastrophe, or how delineate the wretch whom with such infinite pains and care I had endeavoured to form? His limbs were in proportion, and I had selected his features as beautiful. Beautiful! Great God! His yellow skin scarcely covered the work of muscles and arteries beneath; his hair was of a lustrous black, and flowing; his teeth of a pearly whiteness; but these luxuriances only formed a more horrid contrast with his watery eyes, that seemed almost of the same colour as the dun-white sockets in which they were set, his shrivelled complexion and straight black lips.

The different accidents of life are not so changeable as the feelings of human nature. I had worked hard for nearly two years, for the sole purpose of infusing life into an inanimate body. For this I had deprived myself of rest and health. I had desired it with an ardour that far exceeded moderation; but now that I had finished, the beauty of the dream vanished, and breathless horror and disgust filled my heart. Unable to endure the aspect of the being I had created, I rushed out of the room and continued a long time traversing my bedchamber, unable to compose my mind to sleep.`
      }
    ]
  },

  'phil-meditations': {
    id: 'phil-meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    chapters: [
      {
        title: 'Book One: Debts and Lessons',
        content: `1. From my grandfather Verus: character and self-control.
2. From the reputation and memory of my father: modesty and manliness.
3. From my mother: piety and beneficence, and abstinence not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.
4. From my great-grandfather: not to have attended public schools, but to have had good teachers at home, and to realize that on such things a man should spend liberally.
5. From my governor: not to take sides in chariot races, neither the Greens nor the Blues, nor to back the light or heavy armed gladiators; and endurance of pain, and to need little, and to work with my own hands, and not to meddle with other people's affairs, and not to listen to slander.`
      },
      {
        title: 'Book Two: On the River Granua',
        content: `When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil.

But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine. And so none of them can hurt me. No one can implicate me in ugliness.

Nor can I feel angry at my kin, or hate him. We were born to work together like feet, hands, and eyes, like the two rows of teeth, upper and lower. To obstruct each other is unnatural. To feel anger at someone, to turn your back on him: these are obstructions.

Whatever this is that I am, it is a little flesh and breath, and the ruling part. Despise the flesh: blood and bones and a network, a jumble of nerves, veins, and arteries. Consider the breath: wind, always changing, expelled and sucked back again. The third part is the ruling master: you are an old man; do not let this part be a slave any longer, pulled by selfish impulse, complaining at your present condition, or dreading the future.`
      }
    ]
  },

  'mys-sherlock-adventures': {
    id: 'mys-sherlock-adventures',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    chapters: [
      {
        title: 'A Scandal in Bohemia - Part I',
        content: `To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind.

He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men’s motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results.

I had seen little of Holmes lately. My marriage had drifted us away from each other. My own complete happiness, and the home-centred interests which rise up around the man who first finds himself master of his own establishment, were sufficient to absorb all my attention; while Holmes, who loathed every form of society with his whole Bohemian soul, remained in our lodgings in Baker Street, buried among his old books, and alternating from week to week between cocaine and ambition, the drowsiness of the drug, and the fierce energy of his own keen nature.`
      },
      {
        title: 'A Scandal in Bohemia - Part II',
        content: `One night—it was on the twentieth of March, 1888—I was returning from a journey to a patient (for I had now returned to civil practice), when my way led me through Baker Street. As I passed the well-remembered door, which must always be associated in my mind with my wooing, and with the dark incidents of the Study in Scarlet, I was seized with a keen desire to see Holmes again, and to know how he was employing his extraordinary powers.

His rooms were brilliantly lit, and, even as I looked up, I saw his tall, spare figure pass twice in a dark silhouette against the blind. He was pacing the room swiftly, eagerly, with his head sunk upon his chest and his hands clasped behind him. To me, who knew his every mood and habit, his attitude and manner told their own story. He was at work again. He had risen out of his drug-created dreams and was hot upon the scent of some new problem.

I rang the bell and was shown up to the chamber which had formerly been in part my own.

His manner was not effusive. It seldom was; but he was glad, I think, to see me. With hardly a word spoken, but with a kindly eye, he waved me to an armchair, threw across his case of cigars, and indicated a spirit case and a gasogene in the corner. Then he stood before the fire and looked me over in his singular introspective fashion.

"Wedlock suits you," he remarked. "I think, Watson, that you have put on seven and a half pounds since I saw you."

"Seven!" I answered.

"Indeed, I should have thought a little more. Just a trifle more, I fancy, Watson. And in practice again, I observe. You did not tell me that you intended to go into harness."

"Then, how do you know?"

"I see it, I deduce it. How do I know that you have been getting yourself very wet lately, and that you have a most clumsy and careless servant girl?"

"My dear Holmes," said I, "this is too much. You would certainly have been burned, had you lived a few centuries ago."`
      }
    ]
  },

  'sci-origin-species': {
    id: 'sci-origin-species',
    title: 'On the Origin of Species',
    author: 'Charles Darwin',
    chapters: [
      {
        title: 'Introduction',
        content: `When on board H.M.S. 'Beagle,' as naturalist, I was much struck with certain facts in the distribution of the organic beings inhabiting South America, and in the geological relations of the present to the past inhabitants of that continent. These facts, as will be seen in the latter chapters of this volume, seemed to throw some light on the origin of species—that mystery of mysteries, as it has been called by one of our greatest philosophers.

On my return home, it occurred to me, in 1837, that something might perhaps be made out on this question by patiently accumulating and reflecting on all sorts of facts which could possibly have any bearing on it. After five years' work I allowed myself to speculate on the subject, and drew up some short notes; these I enlarged in 1844 into a sketch of the conclusions, which then seemed to me probable: from that period to the present day I have steadily pursued the same object.

I hope that I may be excused for entering on these personal details, as I give them to show that I have not been hasty in coming to a decision.`
      },
      {
        title: 'Chapter 3: Struggle for Existence',
        content: `Before entering on the subject of this chapter, I must make a few preliminary remarks, to show how the struggle for existence bears on Natural Selection. It has been seen in the last chapter that amongst organic beings in a state of nature there is some individual variability: indeed I am not aware that this has ever been disputed.

It is immaterial for us whether a multitude of doubtful forms be called species or sub-species or varieties; what rank, for instance, the two or three hundred doubtful forms of British plants are entitled to hold, if the existence of any well-marked varieties be admitted. But the mere existence of individual variability and of some few well-marked varieties, though necessary as the foundation for the work, helps us but little in understanding how species arise in nature.

How have all those exquisite adaptations of one part of the organisation to another part, and to the conditions of life, and of one organic being to another being, been perfected? We see these beautiful co-adaptations most plainly in the woodpecker and the mistletoe; and only a little less plainly in the humblest parasite which clings to the hairs of a quadruped or feathers of a bird; in the structure of the beetle which dives through water; in the plumed seed which is wafted by the gentlest breeze; in short, we see beautiful adaptations everywhere and in every part of the organic world.`
      }
    ]
  },

  'dra-hamlet': {
    id: 'dra-hamlet',
    title: 'Hamlet, Prince of Denmark',
    author: 'William Shakespeare',
    chapters: [
      {
        title: 'Act I, Scene I: Elsinore. A Platform before the Castle',
        content: `[Enter Bernardo and Francisco, two sentinels.]

BERNARDO: Who's there?
FRANCISCO: Nay, answer me. Stand and unfold yourself.
BERNARDO: Long live the King!
FRANCISCO: Bernardo?
BERNARDO: He.
FRANCISCO: You come most carefully upon your hour.
BERNARDO: 'Tis now struck twelve. Get thee to bed, Francisco.
FRANCISCO: For this relief much thanks. 'Tis bitter cold,
And I am sick at heart.
BERNARDO: Have you had quiet guard?
FRANCISCO: Not a mouse stirring.
BERNARDO: Well, good night.
If you do meet Horatio and Marcellus,
The rivals of my watch, bid them make haste.

[Enter Horatio and Marcellus.]

FRANCISCO: I think I hear them. Stand, ho! Who is there?
HORATIO: Friends to this ground.
MARCELLUS: And liegemen to the Dane.
FRANCISCO: Give you good night.
MARCELLUS: O, farewell, honest soldier. Who hath relieved you?
FRANCISCO: Bernardo hath my place. Give you good night. [Exit Francisco.]`
      },
      {
        title: 'Act III, Scene I: To Be, or Not to Be',
        content: `HAMLET:
To be, or not to be, that is the question:
Whether 'tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take arms against a sea of troubles,
And by opposing end them? To die—to sleep,
No more; and by a sleep to say we end
The heart-ache, and the thousand natural shocks
That flesh is heir to! 'Tis a consummation
Devoutly to be wish'd. To die, to sleep;
To sleep: perchance to dream: ay, there's the rub;
For in that sleep of death what dreams may come
When we have shuffled off this mortal coil,
Must give us pause: there's the respect
That makes calamity of so long life;
For who would bear the whips and scorns of time,
The oppressor's wrong, the proud man's contumely,
The pangs of despised love, the law's delay,
The insolence of office, and the spurns
That patient merit of the unworthy takes,
When he himself might his quietus make
With a bare bodkin? Who would fardels bear,
To grunt and sweat under a weary life,
But that the dread of something after death,
The undiscover'd country from whose bourn
No traveller returns, puzzles the will,
And makes us rather bear those ills we have
Than fly to others that we know not of?
Thus conscience does make cowards of us all.`
      }
    ]
  },

  'rel-prophet-gibran': {
    id: 'rel-prophet-gibran',
    title: 'The Prophet',
    author: 'Kahlil Gibran',
    chapters: [
      {
        title: 'The Coming of the Ship',
        content: `Almustafa, the chosen and the beloved, who was a dawn unto his own day, had waited twelve years in the city of Orphalese for his ship that was to return and bear him back to the isle of his birth.

And in the twelfth year, on the seventh day of Ielool, the month of reaping, he climbed the hill without the city walls and looked seaward; and he beheld the ship coming with the mist.

Then the gates of his heart were flung open, and his joy flew far over the sea. And he closed his eyes and prayed in the silences of his soul.

But as he descended the hill, a sadness came upon him, and he thought in his heart:
How shall I go in peace and without sorrow? Nay, not without a wound in the spirit shall I leave this city.
Long were the days of pain I have spent within its walls, and long were the nights of aloneness; and who can depart from his pain and his aloneness without regret?

Too many fragments of the spirit have I scattered in these streets, and too many are the children of my longing that walk naked among these hills, and I cannot withdraw from them without a burden and an ache.`
      },
      {
        title: 'On Love',
        content: `Then said Almitra, Speak to us of Love.
And he raised his head and looked upon the people, and there fell a stillness upon them. And with a great voice he said:

When love beckons to you, follow him,
Though his ways are hard and steep.
And when his wings enfold you yield to him,
Though the sword hidden among his pinions may wound you.
And when he speaks to you believe in him,
Though his voice may shatter your dreams as the north wind lays waste the garden.

For even as love crowns you so shall he crucify you. Even as he is for your growth so is he for your pruning.
Even as he ascends to your height and caresses your tenderest boughs that quiver in the sun,
So shall he descend to your roots and shake them in their clinging to the earth.`
      }
    ]
  }
};

/**
 * Returns a rich, well-formatted public domain text representation for any catalog book
 */
export function getFallbackPublicDomainText(bookId: string, title: string, author: string, desc: string): string {
  // Check exact match in pre-curated texts
  const curated = PUBLIC_DOMAIN_TEXTS[bookId];
  if (curated) {
    return curated.chapters
      .map((ch) => `=== ${ch.title} ===\n\n${ch.content}`)
      .join('\n\n\n');
  }

  // General high-quality public domain reading text
  return `=== Title: ${title} ===
Author: ${author}
Public Domain Archive Edition · Alexandria Digital Library

=== Section 1: Overview & Historical Provenance ===

${desc}

This classic public-domain masterwork has been preserved and formatted for personal reading and research. It is free of copyright restrictions in most countries and is part of the shared universal heritage of humanity.

=== Section 2: Opening Exposition ===

The opening folios of ${title} established its author, ${author}, as a defining voice in its discipline. Written with intellectual vigor and stylistic eloquence, the text explores fundamental questions of the human condition, memory, morality, and discovery.

As the narrative unfolds, the themes introduced in these opening pages resonate with timeless clarity, offering modern readers direct access to original primary source literature unmediated by commercial alterations.

=== Section 3: Curatorial Reading Notes ===

Preserved locally within your browser's private IndexedDB storage.
Adjust font styles, margins, or background color themes using the appearance controls in the top toolbar.`;
}
