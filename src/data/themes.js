// Thematic keyword-to-verse index for universal Bible keyword search.
// Keywords are lowercase; each entry has an array of KJV verse objects.

export const THEMES = [
  {
    keywords: ['promise', 'promises', 'covenant'],
    verses: [
      { ref: '2 Corinthians 1:20', text: 'For all the promises of God in him are yea, and in him Amen, unto the glory of God by us.' },
      { ref: 'Numbers 23:19',      text: 'God is not a man, that he should lie; neither the son of man, that he should repent: hath he said, and shall he not do it? or hath he spoken, and shall he not make it good?' },
      { ref: 'Hebrews 10:23',      text: 'Let us hold fast the profession of our faith without wavering; for he is faithful that promised.' },
      { ref: 'Genesis 9:13',       text: 'I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.' },
      { ref: 'Deuteronomy 7:9',    text: 'Know therefore that the LORD thy God, he is God, the faithful God, which keepeth covenant and mercy with them that love him and keep his commandments to a thousand generations.' },
      { ref: 'Jeremiah 29:11',     text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
      { ref: '2 Peter 1:4',        text: 'Whereby are given unto us exceeding great and precious promises: that by these ye might be partakers of the divine nature.' },
    ],
  },
  {
    keywords: ['faith', 'believe', 'belief'],
    verses: [
      { ref: 'Hebrews 11:1',       text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
      { ref: 'Romans 10:17',       text: 'So then faith cometh by hearing, and hearing by the word of God.' },
      { ref: 'Mark 11:24',         text: 'Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them.' },
      { ref: 'James 2:17',         text: 'Even so faith, if it hath not works, is dead, being alone.' },
      { ref: 'Matthew 17:20',      text: 'If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.' },
      { ref: 'John 3:16',          text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
      { ref: 'Ephesians 2:8',      text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.' },
    ],
  },
  {
    keywords: ['love', 'loved', 'loving'],
    verses: [
      { ref: '1 Corinthians 13:4', text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.' },
      { ref: '1 John 4:8',         text: 'He that loveth not knoweth not God; for God is love.' },
      { ref: 'John 15:13',         text: 'Greater love hath no man than this, that a man lay down his life for his friends.' },
      { ref: 'Romans 8:38',        text: 'For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, shall be able to separate us from the love of God.' },
      { ref: '1 John 4:19',        text: 'We love him, because he first loved us.' },
      { ref: 'John 13:34',         text: 'A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another.' },
      { ref: 'Song of Solomon 8:7',text: 'Many waters cannot quench love, neither can the floods drown it.' },
    ],
  },
  {
    keywords: ['grace', 'mercy', 'compassion'],
    verses: [
      { ref: 'Ephesians 2:8',      text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.' },
      { ref: 'Hebrews 4:16',       text: 'Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need.' },
      { ref: 'Psalm 103:8',        text: 'The LORD is merciful and gracious, slow to anger, and plenteous in mercy.' },
      { ref: 'Lamentations 3:22',  text: 'It is of the LORD\'s mercies that we are not consumed, because his compassions fail not.' },
      { ref: '2 Corinthians 12:9', text: 'And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness.' },
      { ref: 'Titus 2:11',         text: 'For the grace of God that bringeth salvation hath appeared to all men.' },
      { ref: 'Micah 7:18',         text: 'Who is a God like unto thee, that pardoneth iniquity, and passeth by the transgression of the remnant of his heritage? he retaineth not his anger for ever, because he delighteth in mercy.' },
    ],
  },
  {
    keywords: ['hope', 'hopeful'],
    verses: [
      { ref: 'Romans 15:13',       text: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.' },
      { ref: 'Jeremiah 29:11',     text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
      { ref: 'Psalm 31:24',        text: 'Be of good courage, and he shall strengthen your heart, all ye that hope in the LORD.' },
      { ref: 'Romans 8:24',        text: 'For we are saved by hope: but hope that is seen is not hope: for what a man seeth, why doth he yet hope for?' },
      { ref: 'Hebrews 6:19',       text: 'Which hope we have as an anchor of the soul, both sure and stedfast.' },
      { ref: 'Isaiah 40:31',       text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
    ],
  },
  {
    keywords: ['prayer', 'pray', 'praying'],
    verses: [
      { ref: 'Philippians 4:6',    text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
      { ref: 'Matthew 6:9',        text: 'After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name.' },
      { ref: '1 Thessalonians 5:17', text: 'Pray without ceasing.' },
      { ref: 'James 5:16',         text: 'The effectual fervent prayer of a righteous man availeth much.' },
      { ref: 'Matthew 7:7',        text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.' },
      { ref: 'John 15:7',          text: 'If ye abide in me, and my words abide in you, ye shall ask what ye will, and it shall be done unto you.' },
      { ref: 'Psalm 145:18',       text: 'The LORD is nigh unto all them that call upon him, to all that call upon him in truth.' },
    ],
  },
  {
    keywords: ['strength', 'strong', 'power', 'mighty'],
    verses: [
      { ref: 'Philippians 4:13',   text: 'I can do all things through Christ which strengtheneth me.' },
      { ref: 'Isaiah 41:10',       text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.' },
      { ref: 'Psalm 28:7',         text: 'The LORD is my strength and my shield; my heart trusted in him, and I am helped.' },
      { ref: 'Nehemiah 8:10',      text: 'The joy of the LORD is your strength.' },
      { ref: '2 Timothy 1:7',      text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
      { ref: 'Ephesians 6:10',     text: 'Finally, my brethren, be strong in the Lord, and in the power of his might.' },
      { ref: 'Isaiah 40:29',       text: 'He giveth power to the faint; and to them that have no might he increaseth strength.' },
    ],
  },
  {
    keywords: ['wisdom', 'wise', 'understanding', 'knowledge'],
    verses: [
      { ref: 'Proverbs 3:5',       text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
      { ref: 'James 1:5',          text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.' },
      { ref: 'Proverbs 9:10',      text: 'The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding.' },
      { ref: 'Proverbs 4:7',       text: 'Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.' },
      { ref: 'Ecclesiastes 7:12',  text: 'For wisdom is a defence, and money is a defence: but the excellency of knowledge is, that wisdom giveth life to them that have it.' },
      { ref: 'Colossians 2:3',     text: 'In whom are hid all the treasures of wisdom and knowledge.' },
      { ref: 'Proverbs 2:6',       text: 'For the LORD giveth wisdom: out of his mouth cometh knowledge and understanding.' },
    ],
  },
  {
    keywords: ['peace', 'peaceful', 'calm', 'rest'],
    verses: [
      { ref: 'John 14:27',         text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.' },
      { ref: 'Philippians 4:7',    text: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.' },
      { ref: 'Isaiah 26:3',        text: 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.' },
      { ref: 'Psalm 23:2',         text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.' },
      { ref: 'Matthew 11:28',      text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
      { ref: 'Colossians 3:15',    text: 'And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful.' },
    ],
  },
  {
    keywords: ['joy', 'joyful', 'rejoice', 'happy', 'happiness'],
    verses: [
      { ref: 'Psalm 16:11',        text: 'Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore.' },
      { ref: 'Nehemiah 8:10',      text: 'The joy of the LORD is your strength.' },
      { ref: 'John 15:11',         text: 'These things have I spoken unto you, that my joy might remain in you, and that your joy might be full.' },
      { ref: 'Psalm 30:5',         text: 'Weeping may endure for a night, but joy cometh in the morning.' },
      { ref: 'Romans 15:13',       text: 'Now the God of hope fill you with all joy and peace in believing.' },
      { ref: 'Philippians 4:4',    text: 'Rejoice in the Lord alway: and again I say, Rejoice.' },
      { ref: 'Zephaniah 3:17',     text: 'The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy.' },
    ],
  },
  {
    keywords: ['forgiveness', 'forgive', 'forgiven', 'sin', 'repent'],
    verses: [
      { ref: '1 John 1:9',         text: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.' },
      { ref: 'Psalm 103:12',       text: 'As far as the east is from the west, so far hath he removed our transgressions from us.' },
      { ref: 'Isaiah 43:25',       text: 'I, even I, am he that blotteth out thy transgressions for mine own sake, and will not remember thy sins.' },
      { ref: 'Ephesians 1:7',      text: 'In whom we have redemption through his blood, the forgiveness of sins, according to the riches of his grace.' },
      { ref: 'Acts 3:19',          text: 'Repent ye therefore, and be converted, that your sins may be blotted out, when the times of refreshing shall come from the presence of the Lord.' },
      { ref: 'Matthew 6:14',       text: 'For if ye forgive men their trespasses, your heavenly Father will also forgive you.' },
    ],
  },
  {
    keywords: ['salvation', 'saved', 'save', 'eternal life', 'heaven'],
    verses: [
      { ref: 'Romans 10:9',        text: 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.' },
      { ref: 'John 3:16',          text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
      { ref: 'Acts 4:12',          text: 'Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved.' },
      { ref: 'Ephesians 2:8',      text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.' },
      { ref: 'John 14:6',          text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
      { ref: 'Titus 3:5',          text: 'Not by works of righteousness which we have done, but according to his mercy he saved us.' },
    ],
  },
  {
    keywords: ['trust', 'trustworthy'],
    verses: [
      { ref: 'Proverbs 3:5',       text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
      { ref: 'Psalm 37:5',         text: 'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.' },
      { ref: 'Isaiah 26:4',        text: 'Trust ye in the LORD for ever: for in the LORD JEHOVAH is everlasting strength.' },
      { ref: 'Psalm 56:3',         text: 'What time I am afraid, I will trust in thee.' },
      { ref: 'Nahum 1:7',          text: 'The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him.' },
    ],
  },
  {
    keywords: ['praise', 'worship', 'glory', 'glorify'],
    verses: [
      { ref: 'Psalm 150:6',        text: 'Let every thing that hath breath praise the LORD. Praise ye the LORD.' },
      { ref: 'Psalm 100:4',        text: 'Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.' },
      { ref: 'John 4:24',          text: 'God is a Spirit: and they that worship him must worship him in spirit and in truth.' },
      { ref: 'Hebrews 13:15',      text: 'By him therefore let us offer the sacrifice of praise to God continually, that is, the fruit of our lips giving thanks to his name.' },
      { ref: 'Psalm 34:1',         text: 'I will bless the LORD at all times: his praise shall continually be in my mouth.' },
      { ref: '1 Chronicles 16:29', text: 'Give unto the LORD the glory due unto his name: bring an offering, and come before him: worship the LORD in the beauty of holiness.' },
    ],
  },
  {
    keywords: ['healing', 'heal', 'healed', 'sick', 'sickness', 'health'],
    verses: [
      { ref: 'Psalm 103:3',        text: 'Who forgiveth all thine iniquities; who healeth all thy diseases.' },
      { ref: 'Isaiah 53:5',        text: 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.' },
      { ref: 'Jeremiah 30:17',     text: 'For I will restore health unto thee, and I will heal thee of thy wounds, saith the LORD.' },
      { ref: 'James 5:14',         text: 'Is any sick among you? let him call for the elders of the church; and let them pray over him, anointing him with oil in the name of the Lord.' },
      { ref: 'Psalm 147:3',        text: 'He healeth the broken in heart, and bindeth up their wounds.' },
      { ref: 'Matthew 9:35',       text: 'And Jesus went about all the cities and villages, teaching in their synagogues, and preaching the gospel of the kingdom, and healing every sickness and every disease among the people.' },
    ],
  },
  {
    keywords: ['light', 'darkness', 'shine', 'lamp'],
    verses: [
      { ref: 'Psalm 119:105',      text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
      { ref: 'John 8:12',          text: 'Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.' },
      { ref: 'Matthew 5:14',       text: 'Ye are the light of the world. A city that is set on an hill cannot be hid.' },
      { ref: '1 John 1:5',         text: 'God is light, and in him is no darkness at all.' },
      { ref: 'Isaiah 9:2',         text: 'The people that walked in darkness have seen a great light: they that dwell in the land of the shadow of death, upon them hath the light shined.' },
      { ref: 'Proverbs 4:18',      text: 'But the path of the just is as the shining light, that shineth more and more unto the perfect day.' },
    ],
  },
  {
    keywords: ['truth', 'true', 'word', 'scripture'],
    verses: [
      { ref: 'John 8:32',          text: 'And ye shall know the truth, and the truth shall make you free.' },
      { ref: 'John 14:6',          text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
      { ref: 'Psalm 119:160',      text: 'Thy word is true from the beginning: and every one of thy righteous judgments endureth for ever.' },
      { ref: '2 Timothy 3:16',     text: 'All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness.' },
      { ref: 'John 17:17',         text: 'Sanctify them through thy truth: thy word is truth.' },
      { ref: 'Hebrews 4:12',       text: 'For the word of God is quick, and powerful, and sharper than any twoedged sword.' },
    ],
  },
  {
    keywords: ['fear', 'afraid', 'courage', 'courageous', 'brave'],
    verses: [
      { ref: 'Isaiah 41:10',       text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee.' },
      { ref: 'Joshua 1:9',         text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
      { ref: 'Psalm 23:4',         text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me.' },
      { ref: '2 Timothy 1:7',      text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
      { ref: 'Psalm 27:1',         text: 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?' },
      { ref: '1 John 4:18',        text: 'There is no fear in love; but perfect love casteth out fear.' },
    ],
  },
  {
    keywords: ['blessing', 'blessed', 'bless', 'favor'],
    verses: [
      { ref: 'Numbers 6:24',       text: 'The LORD bless thee, and keep thee.' },
      { ref: 'Psalm 1:1',          text: 'Blessed is the man that walketh not in the counsel of the ungodly, nor standeth in the way of sinners, nor sitteth in the seat of the scornful.' },
      { ref: 'Matthew 5:3',        text: 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.' },
      { ref: 'Ephesians 1:3',      text: 'Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ.' },
      { ref: 'Proverbs 10:22',     text: 'The blessing of the LORD, it maketh rich, and he addeth no sorrow with it.' },
      { ref: 'Deuteronomy 28:2',   text: 'And all these blessings shall come on thee, and overtake thee, if thou shalt hearken unto the voice of the LORD thy God.' },
    ],
  },
  {
    keywords: ['protection', 'protect', 'refuge', 'shelter', 'shield'],
    verses: [
      { ref: 'Psalm 91:1',         text: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.' },
      { ref: 'Psalm 46:1',         text: 'God is our refuge and strength, a very present help in trouble.' },
      { ref: 'Proverbs 18:10',     text: 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.' },
      { ref: 'Psalm 121:7',        text: 'The LORD shall preserve thee from all evil: he shall preserve thy soul.' },
      { ref: 'Deuteronomy 31:6',   text: 'Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you.' },
      { ref: 'Psalm 18:2',         text: 'The LORD is my rock, and my fortress, and my deliverer; my God, my strength, in whom I will trust.' },
    ],
  },
  {
    keywords: ['guidance', 'guide', 'direction', 'path', 'way'],
    verses: [
      { ref: 'Proverbs 3:6',       text: 'In all thy ways acknowledge him, and he shall direct thy paths.' },
      { ref: 'Psalm 32:8',         text: 'I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye.' },
      { ref: 'Isaiah 30:21',       text: 'And thine ears shall hear a word behind thee, saying, This is the way, walk ye in it, when ye turn to the right hand, and when ye turn to the left.' },
      { ref: 'John 14:6',          text: 'Jesus saith unto him, I am the way, the truth, and the life.' },
      { ref: 'Psalm 119:105',      text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
      { ref: 'Proverbs 16:9',      text: 'A man\'s heart deviseth his way: but the LORD directeth his steps.' },
    ],
  },
  {
    keywords: ['patience', 'patient', 'wait', 'endure', 'persevere'],
    verses: [
      { ref: 'Romans 8:25',        text: 'But if we hope for that we see not, then do we with patience wait for it.' },
      { ref: 'Isaiah 40:31',       text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles.' },
      { ref: 'Psalm 27:14',        text: 'Wait on the LORD: be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD.' },
      { ref: 'James 1:3',          text: 'Knowing this, that the trying of your faith worketh patience.' },
      { ref: 'Hebrews 12:1',       text: 'Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us run with patience the race that is set before us.' },
      { ref: 'Romans 5:3',         text: 'And not only so, but we glory in tribulations also: knowing that tribulation worketh patience.' },
    ],
  },
  {
    keywords: ['resurrection', 'risen', 'rise', 'eternal', 'life after death'],
    verses: [
      { ref: 'John 11:25',         text: 'Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live.' },
      { ref: '1 Corinthians 15:55',text: 'O death, where is thy sting? O grave, where is thy victory?' },
      { ref: 'Romans 6:4',         text: 'Therefore we are buried with him by baptism into death: that like as Christ was raised up from the dead by the glory of the Father, even so we also should walk in newness of life.' },
      { ref: 'Revelation 21:4',    text: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain.' },
      { ref: '1 Thessalonians 4:14', text: 'For if we believe that Jesus died and rose again, even so them also which sleep in Jesus will God bring with him.' },
    ],
  },
  {
    keywords: ['money', 'wealth', 'riches', 'prosperity', 'provision', 'provide'],
    verses: [
      { ref: 'Matthew 6:33',       text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
      { ref: 'Philippians 4:19',   text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.' },
      { ref: 'Proverbs 3:9',       text: 'Honour the LORD with thy substance, and with the firstfruits of all thine increase.' },
      { ref: '1 Timothy 6:10',     text: 'For the love of money is the root of all evil: which while some coveted after, they have erred from the faith, and pierced themselves through with many sorrows.' },
      { ref: 'Luke 12:15',         text: 'Take heed, and beware of covetousness: for a man\'s life consisteth not in the abundance of the things which he possesseth.' },
      { ref: 'Malachi 3:10',       text: 'Bring ye all the tithes into the storehouse, that there may be meat in mine house, and prove me now herewith, saith the LORD of hosts, if I will not open you the windows of heaven.' },
    ],
  },
  {
    keywords: ['purpose', 'calling', 'call', 'destiny'],
    verses: [
      { ref: 'Jeremiah 1:5',       text: 'Before I formed thee in the belly I knew thee; and before thou camest forth out of the womb I sanctified thee.' },
      { ref: 'Romans 8:28',        text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
      { ref: 'Ephesians 2:10',     text: 'For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.' },
      { ref: 'Proverbs 19:21',     text: 'There are many devices in a man\'s heart; nevertheless the counsel of the LORD, that shall stand.' },
      { ref: 'Psalm 138:8',        text: 'The LORD will perfect that which concerneth me: thy mercy, O LORD, endureth for ever.' },
    ],
  },
];

/**
 * Search themes for matching keywords.
 * Returns an array of verse objects (with `ref` and `text`) from all matching theme entries.
 */
export function searchThemes(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results = [];
  const seen = new Set();

  for (const theme of THEMES) {
    const matches = theme.keywords.some((kw) => kw.includes(q) || q.includes(kw));
    if (matches) {
      for (const verse of theme.verses) {
        if (!seen.has(verse.ref)) {
          seen.add(verse.ref);
          results.push(verse);
        }
      }
    }
  }

  // Also do a full-text search on verse text / ref if no keyword match
  if (results.length === 0) {
    for (const theme of THEMES) {
      for (const verse of theme.verses) {
        if ((verse.text.toLowerCase().includes(q) || verse.ref.toLowerCase().includes(q)) && !seen.has(verse.ref)) {
          seen.add(verse.ref);
          results.push(verse);
        }
      }
    }
  }

  return results;
}
