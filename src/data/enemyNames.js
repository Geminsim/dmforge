const CHINESE_SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗',
  '郑', '梁', '谢', '宋', '唐', '许', '邓', '冯', '韩', '曹', '曾', '彭', '萧', '蔡', '潘', '田', '董', '袁', '于', '余'
];

const CHINESE_GIVEN_NAMES = [
  '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞',
  '平', '刚', '桂英', '鹏', '华', '红', '玉兰', '飞', '玲', '桂兰', '英', '梅', '鑫', '波', '斌', '宇', '浩', '凯', '丹', '宁',
  '婷', '慧', '俊', '晨', '健', '瑞', '雪', '琳', '倩', '佳', '欣', '璐', '瑶', '萌', '阳', '博', '文', '嘉', '诚', '峰',
  '亮', '龙', '建国', '建军', '志强', '志伟', '国强', '国庆', '海燕', '海涛', '晓明', '晓华', '晓燕', '春梅', '春兰', '秋霞', '冬梅', '子涵', '雨欣', '一诺',
  '浩然', '梓轩', '宇航', '思远', '思雨', '可欣', '雅婷', '诗涵', '嘉豪', '俊杰', '天宇', '子墨', '安然', '依依', '若曦', '梦瑶', '清扬', '致远', '泽宇', '承宇',
  '昊天', '亦凡', '云飞', '雨桐', '欣怡', '佳怡', '婉婷', '明轩', '博文', '启航', '景行', '知夏', '星河', '念安', '嘉宁', '语嫣', '清越', '书航', '予安', '逸辰'
];

const ENGLISH_FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Melissa', 'George', 'Deborah', 'Timothy', 'Stephanie', 'Ronald', 'Rebecca', 'Edward', 'Sharon', 'Jason', 'Laura', 'Jeffrey', 'Cynthia', 'Ryan', 'Kathleen',
  'Jacob', 'Amy', 'Gary', 'Angela', 'Nicholas', 'Shirley', 'Eric', 'Anna', 'Jonathan', 'Brenda', 'Stephen', 'Pamela', 'Larry', 'Emma', 'Justin', 'Nicole', 'Scott', 'Helen', 'Brandon', 'Samantha',
  'Benjamin', 'Katherine', 'Samuel', 'Christine', 'Gregory', 'Debra', 'Alexander', 'Rachel', 'Patrick', 'Carolyn', 'Frank', 'Janet', 'Raymond', 'Catherine', 'Jack', 'Maria', 'Dennis', 'Heather', 'Jerry', 'Diane',
  'Tyler', 'Julie', 'Aaron', 'Joyce', 'Jose', 'Victoria', 'Adam', 'Kelly', 'Nathan', 'Christina', 'Henry', 'Joan', 'Zachary', 'Evelyn', 'Douglas', 'Lauren', 'Peter', 'Judith', 'Kyle', 'Megan'
];

const ENGLISH_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

const JAPANESE_SURNAMES = [
  '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水',
  '山崎', '森', '阿部', '池田', '橋本', '山下', '石川', '中島', '前田', '藤田', '小川', '後藤', '岡田', '長谷川', '村上', '近藤', '石井', '坂本', '遠藤', '青木'
];

const JAPANESE_GIVEN_NAMES = [
  '蓮', '陽翔', '湊', '樹', '悠真', '大翔', '颯太', '朝陽', '結翔', '悠人', '陸', '蒼', '律', '新', '大和', '暖', '悠斗', '颯', '碧', '旭',
  '葵', '陽葵', '凛', '芽依', '結菜', '紬', '咲良', '莉子', '結衣', '美桜', '澪', '杏', '楓', '琴音', '七海', '美月', '花', '遥', '彩乃', '千尋',
  '健', '翔太', '大輔', '拓也', '直樹', '和也', '雄太', '達也', '亮', '誠', '聡', '隆', '浩二', '慎一', '雅人', '裕介', '圭介', '俊介', '一樹', '隼人',
  '愛', '美咲', '由美', '恵', '真由美', '麻衣', '香織', '奈緒', '明日香', '里奈', '優子', '綾', '沙織', '瞳', '玲奈', '桃子', '瑞希', '早紀', '舞', '京子'
];

const KOREAN_SURNAMES = [
  'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Jeon', 'Hong',
  'Yoo', 'Ko', 'Moon', 'Yang', 'Son', 'Bae', 'Baek', 'Heo', 'Nam', 'Shim'
];

const KOREAN_GIVEN_NAMES = [
  'Min-jun', 'Seo-jun', 'Do-yoon', 'Ye-jun', 'Si-woo', 'Ha-jun', 'Joo-won', 'Ji-ho', 'Ji-hoo', 'Jun-woo', 'Hyun-woo', 'Do-hyun', 'Ji-hoon', 'Gun-woo', 'Woo-jin', 'Sun-woo', 'Seo-jin', 'Min-jae', 'Hyun-jun', 'Yeon-woo',
  'Seo-yeon', 'Seo-yoon', 'Ji-woo', 'Seo-hyun', 'Min-seo', 'Ha-eun', 'Ha-yoon', 'Yoon-seo', 'Ji-yoo', 'Ji-min', 'Chae-won', 'Soo-ah', 'Ji-ah', 'Ye-eun', 'Da-eun', 'Soo-bin', 'Ye-rin', 'So-yul', 'Yoo-na', 'Ye-won',
  'Sung-min', 'Dong-hyun', 'Tae-hyun', 'Jae-hyun', 'Seung-hyun', 'Jung-woo', 'Young-min', 'Sang-hyun', 'Jin-woo', 'Tae-min', 'Gyu-min', 'Jae-min', 'Sung-hoon', 'Dong-wook', 'Jun-ho', 'Min-soo', 'Chul-soo', 'Young-soo', 'Tae-woo', 'Kyung-min',
  'Eun-ji', 'Soo-jin', 'Hye-jin', 'Ji-hyun', 'Yoo-jin', 'Mi-young', 'So-young', 'Hyun-jung', 'Min-ji', 'Da-young', 'Na-yeon', 'Bo-ra', 'Ga-young', 'Ye-ji', 'Se-young', 'Joo-hee', 'Ah-reum', 'Eun-seo', 'Hye-won', 'Jung-eun'
];

const FRENCH_FIRST_NAMES = [
  'Jean', 'Marie', 'Pierre', 'Nathalie', 'Michel', 'Isabelle', 'Philippe', 'Catherine', 'Alain', 'Sylvie', 'Laurent', 'Christine', 'Nicolas', 'Sophie', 'Julien', 'Émilie', 'Thomas', 'Camille', 'Alexandre', 'Julie',
  'Antoine', 'Claire', 'François', 'Élodie', 'Sébastien', 'Aurélie', 'Guillaume', 'Manon', 'Maxime', 'Charlotte', 'Olivier', 'Pauline', 'Romain', 'Mathilde', 'Benjamin', 'Chloé', 'Lucas', 'Anaïs', 'Hugo', 'Léa',
  'Louis', 'Margaux', 'Gabriel', 'Océane', 'Arthur', 'Inès', 'Raphaël', 'Clémence', 'Jules', 'Maëlle', 'Victor', 'Amélie', 'Théo', 'Noémie', 'Baptiste', 'Mélanie', 'Adrien', 'Amandine', 'Rémi', 'Élodie',
  'Étienne', 'Joséphine', 'Gaspard', 'Céline', 'Benoît', 'Sandrine', 'Xavier', 'Valérie', 'Damien', 'Laure', 'Matthieu', 'Coralie', 'Fabien', 'Éva', 'Loïc', 'Romane', 'Arnaud', 'Élise', 'Florian', 'Lucie'
];

const FRENCH_LAST_NAMES = [
  'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard',
  'Bonnet', 'Dupont', 'Lambert', 'Fontaine', 'Rousseau', 'Vincent', 'Muller', 'Lefèvre', 'Faure', 'André', 'Mercier', 'Blanc', 'Guérin', 'Boyer', 'Garnier', 'Chevalier', 'François', 'Legrand', 'Gauthier', 'Garcia'
];

export const CHINESE_ENEMY_NAMES = CHINESE_GIVEN_NAMES.map((givenName, index) => `${CHINESE_SURNAMES[index % CHINESE_SURNAMES.length]}${givenName}`);
export const ENGLISH_ENEMY_NAMES = ENGLISH_FIRST_NAMES.map((firstName, index) => `${firstName} ${ENGLISH_LAST_NAMES[index % ENGLISH_LAST_NAMES.length]}`);
export const JAPANESE_ENEMY_NAMES = JAPANESE_GIVEN_NAMES.map((givenName, index) => `${JAPANESE_SURNAMES[index % JAPANESE_SURNAMES.length]}${givenName}`);
export const KOREAN_ENEMY_NAMES = KOREAN_GIVEN_NAMES.map((givenName, index) => `${givenName} ${KOREAN_SURNAMES[index % KOREAN_SURNAMES.length]}`);
export const FRENCH_ENEMY_NAMES = FRENCH_FIRST_NAMES.map((firstName, index) => `${firstName} ${FRENCH_LAST_NAMES[index % FRENCH_LAST_NAMES.length]}`);
export const COMMON_ENEMY_NAMES = [
  ...CHINESE_ENEMY_NAMES,
  ...ENGLISH_ENEMY_NAMES,
  ...JAPANESE_ENEMY_NAMES,
  ...KOREAN_ENEMY_NAMES,
  ...FRENCH_ENEMY_NAMES
];
