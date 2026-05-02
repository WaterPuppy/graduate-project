export const ARTICLE_CATEGORY_ALL = 'all'
export const ARTICLE_CATEGORY_SHORT = '英文短文'
export const ARTICLE_CATEGORY_MOVIE = '电影名句'

export const articleCategories = [
  { key: ARTICLE_CATEGORY_ALL, label: '所有分类' },
  { key: ARTICLE_CATEGORY_SHORT, label: ARTICLE_CATEGORY_SHORT },
  { key: ARTICLE_CATEGORY_MOVIE, label: ARTICLE_CATEGORY_MOVIE }
]

export const readingArticles = [
  {
    id: 1,
    title: 'The City Mouse and the Country Mouse',
    date: '2026-4-12',
    category: ARTICLE_CATEGORY_SHORT,
    summary: 'A classic short story about different lifestyles and choices.',
    english:
      'Once there were two mice. One lived in the city and the other lived in the country. The city mouse visited the country mouse and found the food simple but peaceful. Later, they went to the city. The table was full, but loud noises and danger appeared again and again. The country mouse said, I would rather have plain food in peace than rich food in fear.',
    chinese:
      '从前有两只老鼠，一只住在城市，一只住在乡下。城里老鼠拜访乡下老鼠，觉得食物简单却安宁。后来它们去了城市，餐桌很丰盛，但噪音和危险反复出现。乡下老鼠说：我宁愿在安宁中吃朴素食物，也不愿在恐惧中吃丰盛大餐。'
  },
  {
    id: 2,
    title: 'Forrest Gump: Life Is Like a Box of Chocolates',
    date: '2026-4-12',
    category: ARTICLE_CATEGORY_MOVIE,
    summary: 'A famous quote about uncertainty and courage.',
    english:
      'Life is like a box of chocolates. You never know what you are going to get. Keep moving forward, stay kind, and do your best with what is in front of you.',
    chinese:
      '生活就像一盒巧克力，你永远不知道下一颗是什么味道。继续向前，保持善良，并且把眼前的事做到最好。'
  },
  {
    id: 3,
    title: 'A Small Habit, A Big Change',
    date: '2026-4-12',
    category: ARTICLE_CATEGORY_SHORT,
    summary: 'How tiny daily habits can reshape learning efficiency.',
    english:
      'Read ten minutes every day. Write down one useful phrase and use it in a sentence. Small actions, repeated with patience, become powerful habits that change your learning path.',
    chinese:
      '每天阅读十分钟，记下一条有用短语并造句。耐心重复的小行动，会变成强大的习惯，逐步改变你的学习路径。'
  },
  {
    id: 4,
    title: 'The Pursuit of Happyness: Never Give Up',
    date: '2026-4-12',
    category: ARTICLE_CATEGORY_MOVIE,
    summary: 'A movie line about persistence and self-belief.',
    english:
      'Do not ever let somebody tell you you cannot do something. If you have a dream, protect it. People cannot do something themselves, they want to tell you that you cannot do it.',
    chinese:
      '不要让任何人告诉你做不到。如果你有梦想，就要去守护它。很多人自己做不到，就会告诉你也不行。'
  }
]
