/* ==========================================================================
   Local demo data — one shared catalog used by the plaza, product details,
   wardrobe, fitting room, AI stylist, checkout and orders.
   Product imagery is cropped from the reference screens (see README).
   ========================================================================== */
(function () {
  const VT = (window.VT = window.VT || {});
  const A = 'assets/clothing/';

  const SIZES = ['XS', 'S', 'M', 'L'];
  const C = (id, name, hex, short) => ({ id, name, short: short || name.replace(/色.*$/, '色'), hex });

  /* ---------- catalog ---------- */
  const products = [
    // — the six products shown in the reference plaza (keep order) —
    {
      id: 'knit-cardigan', name: '针织开衫外套', cardName: '针织开衫外套', tags: '柔软亲肤 · 百搭基础款', coTags: '柔软亲肤  百搭基础款',
      price: 299, cat: 'outer', brand: 'ZARA', rating: 4.7, reviews: 268,
      desc: '细腻柔软的羊毛混纺针织，宽松落肩版型，单穿或叠穿都轻松自在。',
      colors: [C('cream', '奶油白', '#EFE7DC', '奶油白'), C('oat', '燕麦色', '#B9A99C', '燕麦色'), C('cocoa', '可可棕', '#7A5A48', '可可棕'), C('black', '黑色', '#222020', '黑色'), C('grey', '雾灰色', '#A7A29C', '雾灰色'), C('sage', '鼠尾草绿', '#A9AE97', '鼠尾草绿')],
      dots: ['#F0E9E1', '#B9AA9E', '#7A5A48', '#1F1D1C'], dotsMore: 2,
      img: { card: A + 'cards/knit-cardigan.webp', tile: A + 'tiles/knit-cardigan.webp', thumb: A + 'thumbs/knit-cardigan.webp', hd: A + 'hd/knit-cardigan.webp' },
      gallery: [A + 'hd/knit-cardigan.webp', A + 'hd/knit-cardigan-2.webp', A + 'thumbs/knit-cardigan.webp'],
    },
    {
      id: 'straight-jeans', name: '高腰直筒牛仔裤', cardName: '高腰直筒牛仔裤', tags: '显瘦版型 · 经典百搭', coTags: '显瘦版型  经典百搭',
      price: 259, cat: 'bottom', brand: 'ZARA', rating: 4.8, reviews: 512,
      desc: '高腰直筒剪裁，柔软微弹的水洗丹宁，拉长腿部比例，四季百搭。',
      colors: [C('light', '浅蓝色', '#9FB7D5', '浅蓝'), C('mid', '中蓝色', '#5E7FA6', '中蓝'), C('indigo', '靛蓝色', '#3E4E66', '靛蓝'), C('black', '黑色', '#222020', '黑色'), C('ecru', '米白色', '#EAE3D8', '米白')],
      dots: ['#9DB6D6', '#5D7DA3', '#3D4C63', '#1F1D1C'], dotsMore: 1,
      img: { card: A + 'cards/straight-jeans.webp', tile: A + 'tiles/straight-jeans.webp', thumb: A + 'tiles/straight-jeans.webp', hd: A + 'hd/straight-jeans.webp', item: A + 'items/straight-jeans.webp' },
      gallery: [A + 'hd/straight-jeans.webp', A + 'hd/straight-jeans-2.webp'],
    },
    {
      id: 'striped-shirt', name: '条纹亚麻衬衫', cardName: '条纹衬衫', tags: '通勤百搭 · 经典衬型', coTags: '通勤百搭  质感纯棉',
      price: 259, cat: 'top', brand: 'Reformation', rating: 4.8, reviews: 320,
      desc: '轻盈透气的亚麻混纺面料，经典条纹设计，\n适合日常通勤与休闲穿搭。',
      colors: [C('blue', '蓝色条纹', 'stripe', '蓝色'), C('beige', '米杏色', '#D9CBB8', '米杏'), C('ivory', '象牙白', '#ECE7E1', '象牙白'), C('taupe', '灰褐色', '#9C9087', '灰褐'), C('black', '黑色', '#262626', '黑色')],
      dots: ['#B5C6E1', '#F7F4EF', 'stripe-grey', '#1D2340'], dotsMore: 1,
      img: { card: A + 'cards/striped-shirt.webp', tile: A + 'tiles/striped-shirt.webp', thumb: A + 'thumbs/striped-shirt.webp', hd: A + 'details/striped-shirt-hero.webp', checkout: A + 'details/striped-shirt-checkout.webp', order: A + 'details/striped-shirt-order.webp' },
      gallery: [A + 'details/striped-shirt-hero.webp', A + 'details/striped-shirt-model-1.webp', A + 'details/striped-shirt-model-2.webp', A + 'details/striped-shirt-model-3.webp', A + 'details/striped-shirt-fabric.webp'],
      galleryThumbs: [A + 'details/striped-shirt-g1.webp', A + 'details/striped-shirt-g2.webp', A + 'details/striped-shirt-g3.webp', A + 'details/striped-shirt-g4.webp', A + 'details/striped-shirt-g5.webp'],
      orderThumbs: [A + 'details/striped-shirt-o1.webp', A + 'details/striped-shirt-o2.webp', A + 'details/striped-shirt-o3.webp', A + 'details/striped-shirt-o4.webp'],
    },
    {
      id: 'brown-blazer', name: '气质西装外套', cardName: '气质西装外套', tags: '职场通勤 · 高级质感', coTags: '职场通勤  高级质感',
      price: 399, cat: 'outer', brand: 'ZARA', rating: 4.7, reviews: 186,
      desc: '微廓形单排扣设计，挺括有型的精纺面料，通勤与周末都得体。',
      colors: [C('taupe', '灰褐色', '#A39283', '灰褐'), C('brown', '深棕色', '#3D2A20', '深棕'), C('black', '黑色', '#141414', '黑色'), C('grey', '中灰色', '#9C9C9C', '中灰'), C('camel', '驼色', '#B88B62', '驼色')],
      dots: ['#A39283', '#3D2A20', '#111111', '#9C9C9C'], dotsMore: 1,
      img: { card: A + 'cards/brown-blazer.webp', tile: A + 'cards/brown-blazer.webp', thumb: A + 'cards/brown-blazer.webp', hd: A + 'hd/brown-blazer.webp' },
      gallery: [A + 'hd/brown-blazer.webp'],
    },
    {
      id: 'basic-cami', name: '基础吊带背心', cardName: '基础吊带背心', tags: '修身显瘦 · 内搭必备', coTags: '修身显瘦  内搭必备',
      price: 129, cat: 'top', brand: 'Soft Archive', rating: 4.9, reviews: 1024,
      desc: '细肩带罗纹针织，贴身不紧绷，单穿清爽，叠穿是万能内搭。',
      colors: [C('ivory', '象牙白', '#F1ECE6', '象牙白'), C('beige', '浅杏色', '#CDBBAA', '浅杏'), C('cocoa', '可可棕', '#7B5947', '可可棕'), C('black', '黑色', '#1E1E1E', '黑色'), C('grey', '雾灰色', '#B9B5AF', '雾灰')],
      dots: ['#F2EDE7', '#CDBBAA', '#7B5947', '#1E1E1E'], dotsMore: 1,
      img: { card: A + 'cards/basic-cami.webp', tile: A + 'thumbs/basic-cami.webp', thumb: A + 'thumbs/basic-cami.webp', hd: A + 'hd/basic-cami.webp', item: A + 'items/basic-cami.webp' },
      gallery: [A + 'hd/basic-cami.webp', A + 'hd/basic-cami-2.webp'],
      cardFocus: 'top',
    },
    {
      id: 'pleated-skirt', name: '百褶半身裙', cardName: '百褶半身裙', tags: '优雅气质 · 显瘦百搭', coTags: '优雅气质  显瘦百搭',
      price: 259, cat: 'bottom', brand: 'Linea Studio', rating: 4.8, reviews: 233,
      desc: '垂坠细密的百褶设计，行走间轻盈灵动，高腰剪裁显瘦又显高。',
      colors: [C('brown', '咖啡色', '#6B4A38', '咖啡'), C('camel', '驼色', '#C7B19C', '驼色'), C('grey', '中灰色', '#7C7C7C', '中灰'), C('black', '黑色', '#1E1E1E', '黑色'), C('navy', '藏青色', '#283247', '藏青')],
      dots: ['#6B4A38', '#C7B19C', '#7C7C7C', '#1E1E1E'], dotsMore: 1,
      img: { card: A + 'cards/pleated-skirt.webp', tile: A + 'tiles/pleated-skirt.webp', thumb: A + 'tiles/pleated-skirt.webp', hd: A + 'hd/pleated-skirt.webp' },
      gallery: [A + 'hd/pleated-skirt.webp', A + 'hd/pleated-skirt-2.webp'],
      cardFocus: 'top',
    },

    // — wardrobe & fitting-room items —
    { id: 'black-blazer', name: '黑色西装外套', cardName: '黑色西装外套', tags: '利落廓形 · 气场全开', price: 459, cat: 'outer', brand: 'Mono Atelier', rating: 4.8, reviews: 402,
      desc: '经典黑色单排扣西装，利落肩线与恰到好处的廓形，叠穿背心与牛仔裤即是摩登通勤造型。',
      colors: [C('black', '黑色', '#161616', '黑色'), C('navy', '藏青色', '#232B3D', '藏青'), C('camel', '驼色', '#B88B62', '驼色')], dots: ['#161616', '#232B3D', '#B88B62'], dotsMore: 0,
      img: { card: A + 'tiles/black-blazer.webp', tile: A + 'tiles/black-blazer.webp', thumb: A + 'thumbs/black-blazer.webp', hd: A + 'hd/black-blazer.webp', item: A + 'items/black-blazer.webp' }, gallery: [A + 'hd/black-blazer.webp', A + 'hd/black-blazer-2.webp'] },
    { id: 'white-tee', name: '纯棉圆领T恤', cardName: '纯棉圆领T恤', tags: '重磅纯棉 · 日常百搭', price: 99, cat: 'top', brand: 'Soft Archive', rating: 4.8, reviews: 1290,
      desc: '230g 重磅精梳棉，挺括不透，圆领微落肩，一年四季的衣橱基础款。',
      colors: [C('white', '本白色', '#F4F1EC', '本白'), C('black', '黑色', '#1E1E1E', '黑色'), C('grey', '麻灰色', '#BDB8B1', '麻灰')], dots: ['#F4F1EC', '#1E1E1E', '#BDB8B1'], dotsMore: 0,
      img: { card: A + 'tiles/white-tee.webp', tile: A + 'tiles/white-tee.webp', thumb: A + 'tiles/white-tee.webp', hd: A + 'hd/white-tee.webp' }, gallery: [A + 'hd/white-tee.webp'] },
    { id: 'taupe-coat', name: '双排扣羊毛大衣', cardName: '双排扣羊毛大衣', tags: '保暖有型 · 秋冬必备', price: 699, cat: 'outer', brand: 'Mono Atelier', rating: 4.9, reviews: 158,
      desc: '双面羊毛呢面料，双排扣西装领设计，温暖而不臃肿。',
      colors: [C('taupe', '灰褐色', '#9C8573', '灰褐'), C('camel', '驼色', '#B88B62', '驼色'), C('black', '黑色', '#161616', '黑色')], dots: ['#9C8573', '#B88B62', '#161616'], dotsMore: 0,
      img: { card: A + 'tiles/taupe-coat.webp', tile: A + 'tiles/taupe-coat.webp', thumb: A + 'tiles/taupe-coat.webp', hd: A + 'hd/taupe-coat.webp' }, gallery: [A + 'hd/taupe-coat.webp'] },
    { id: 'white-sneakers', name: '小白板鞋', cardName: '小白板鞋', tags: '软底舒适 · 百搭不挑', price: 329, cat: 'shoes', brand: 'Forma', rating: 4.8, reviews: 876,
      desc: '头层牛皮鞋面，轻量软底，久走不累，搭配牛仔裤与裙装都清爽。',
      colors: [C('white', '米白色', '#F1ECE3', '米白'), C('black', '黑色', '#1E1E1E', '黑色')], dots: ['#F1ECE3', '#1E1E1E'], dotsMore: 0, sizes: ['35', '36', '37', '38', '39'], defaultSize: '37',
      img: { card: A + 'tiles/white-sneakers.webp', tile: A + 'tiles/white-sneakers.webp', thumb: A + 'tiles/white-sneakers.webp', hd: A + 'hd/white-sneakers.webp', item: A + 'items/white-sneakers.webp' }, gallery: [A + 'hd/white-sneakers.webp'] },
    { id: 'brown-tote', name: '棕色皮质托特包', cardName: '棕色皮质托特包', tags: '大容量 · 通勤优选', price: 599, cat: 'bag', brand: 'Forma', rating: 4.7, reviews: 344,
      desc: '柔软植鞣牛皮，简洁托特包型，可放下 13 英寸电脑与日常随身物。',
      colors: [C('brown', '焦糖棕', '#7B4A2C', '焦糖棕'), C('black', '黑色', '#1A1A1A', '黑色')], dots: ['#7B4A2C', '#1A1A1A'], dotsMore: 0, sizes: ['均码'], defaultSize: '均码',
      img: { card: A + 'tiles/brown-tote.webp', tile: A + 'tiles/brown-tote.webp', thumb: A + 'tiles/brown-tote.webp', hd: A + 'hd/brown-tote.webp', item: A + 'items/brown-tote.webp' }, gallery: [A + 'hd/brown-tote.webp'] },
    { id: 'black-cardigan', name: '黑色针织开衫', cardName: '黑色针织开衫', tags: '经典V领 · 温柔知性', price: 279, cat: 'outer', brand: 'Soft Archive', rating: 4.7, reviews: 219,
      desc: '细针羊毛混纺，V 领单排扣设计，可当外套也可扣起单穿。',
      colors: [C('black', '黑色', '#1A1A1A', '黑色'), C('cream', '奶油白', '#EFE7DC', '奶油白')], dots: ['#1A1A1A', '#EFE7DC'], dotsMore: 0,
      img: { card: A + 'tiles/black-cardigan.webp', tile: A + 'tiles/black-cardigan.webp', thumb: A + 'tiles/black-cardigan.webp', hd: A + 'hd/black-cardigan.webp' }, gallery: [A + 'hd/black-cardigan.webp'] },
    { id: 'white-shirt', name: '白色廓形衬衫', cardName: '白色廓形衬衫', tags: '挺括棉质 · 干净利落', price: 239, cat: 'top', brand: 'Linea Studio', rating: 4.8, reviews: 297,
      desc: '高支棉府绸面料，微廓形落肩，干净利落的通勤基础款。',
      colors: [C('white', '白色', '#F6F4F0', '白色'), C('blue', '浅蓝色', '#C9D6E8', '浅蓝')], dots: ['#F6F4F0', '#C9D6E8'], dotsMore: 0,
      img: { card: A + 'tiles/white-shirt.webp', tile: A + 'tiles/white-shirt.webp', thumb: A + 'tiles/white-shirt.webp', hd: A + 'hd/white-shirt.webp' }, gallery: [A + 'hd/white-shirt.webp'] },
    { id: 'brown-sweater', name: '焦糖色圆领毛衣', cardName: '焦糖色圆领毛衣', tags: '温暖柔糯 · 秋冬氛围', price: 329, cat: 'top', brand: 'Soft Archive', rating: 4.8, reviews: 175,
      desc: '羊毛与羊绒混纺，柔软亲肤，焦糖色自带温柔氛围感。',
      colors: [C('caramel', '焦糖色', '#6E4A31', '焦糖'), C('oat', '燕麦色', '#C9B8A4', '燕麦')], dots: ['#6E4A31', '#C9B8A4'], dotsMore: 0,
      img: { card: A + 'tiles/brown-sweater.webp', tile: A + 'tiles/brown-sweater.webp', thumb: A + 'tiles/brown-sweater.webp', hd: A + 'hd/brown-sweater.webp' }, gallery: [A + 'hd/brown-sweater.webp'] },
    { id: 'ribbed-tank', name: '罗纹针织背心', cardName: '罗纹针织背心', tags: '修身罗纹 · 叠穿必备', price: 119, cat: 'top', brand: 'Soft Archive', rating: 4.7, reviews: 388,
      desc: '弹力罗纹针织，宽肩带更显肩颈线条，单穿或叠穿皆宜。',
      colors: [C('cream', '奶油白', '#EFE6D8', '奶油白'), C('black', '黑色', '#1E1E1E', '黑色')], dots: ['#EFE6D8', '#1E1E1E'], dotsMore: 0,
      img: { card: A + 'tiles/ribbed-tank.webp', tile: A + 'tiles/ribbed-tank.webp', thumb: A + 'tiles/ribbed-tank.webp', hd: A + 'hd/ribbed-tank.webp' }, gallery: [A + 'hd/ribbed-tank.webp'] },
    { id: 'beige-trousers', name: '高腰阔腿西裤', cardName: '高腰阔腿西裤', tags: '垂坠顺滑 · 显高显瘦', price: 299, cat: 'bottom', brand: 'Linea Studio', rating: 4.8, reviews: 264,
      desc: '垂感西装面料，高腰双褶设计，阔腿版型修饰腿型。',
      colors: [C('beige', '燕麦色', '#D7C8B5', '燕麦'), C('black', '黑色', '#1E1E1E', '黑色')], dots: ['#D7C8B5', '#1E1E1E'], dotsMore: 0,
      img: { card: A + 'tiles/beige-trousers.webp', tile: A + 'tiles/beige-trousers.webp', thumb: A + 'tiles/beige-trousers.webp', hd: A + 'hd/beige-trousers.webp' }, gallery: [A + 'hd/beige-trousers.webp'] },
    { id: 'denim-jacket', name: '复古牛仔夹克', cardName: '复古牛仔夹克', tags: '水洗做旧 · 休闲随性', price: 369, cat: 'outer', brand: 'Linea Denim', rating: 4.7, reviews: 301,
      desc: '复古水洗丹宁，经典翻领双口袋设计，春秋叠穿的不二之选。',
      colors: [C('light', '浅蓝色', '#9FB7D5', '浅蓝')], dots: ['#9FB7D5'], dotsMore: 0,
      img: { card: A + 'tiles/denim-jacket.webp', tile: A + 'tiles/denim-jacket.webp', thumb: A + 'tiles/denim-jacket.webp', hd: A + 'hd/denim-jacket.webp' }, gallery: [A + 'hd/denim-jacket.webp'] },
    { id: 'beige-blazer', name: '燕麦色西装外套', cardName: '燕麦色西装外套', tags: '温柔通勤 · 轻盈廓形', price: 429, cat: 'outer', brand: 'Mono Atelier', rating: 4.8, reviews: 142,
      desc: '燕麦色羊毛混纺，单排双扣轻廓形，温柔又不失专业感。',
      colors: [C('oat', '燕麦色', '#D8CBB9', '燕麦'), C('black', '黑色', '#161616', '黑色')], dots: ['#D8CBB9', '#161616'], dotsMore: 0,
      img: { card: A + 'thumbs/beige-blazer.webp', tile: A + 'thumbs/beige-blazer.webp', thumb: A + 'thumbs/beige-blazer.webp', hd: A + 'hd/beige-blazer.webp' }, gallery: [A + 'hd/beige-blazer.webp'] },
    { id: 'oxford-shirt', name: '浅蓝牛津衬衫', cardName: '浅蓝牛津衬衫', tags: '透气牛津纺 · 学院风', price: 229, cat: 'top', brand: 'Linea Studio', rating: 4.7, reviews: 210,
      desc: '经典牛津纺面料，柔和浅蓝细条纹，休闲与通勤皆宜。',
      colors: [C('blue', '浅蓝色', '#B9CBE6', '浅蓝')], dots: ['#B9CBE6'], dotsMore: 0,
      img: { card: A + 'thumbs/oxford-shirt.webp', tile: A + 'thumbs/oxford-shirt.webp', thumb: A + 'thumbs/oxford-shirt.webp', hd: A + 'hd/oxford-shirt.webp' }, gallery: [A + 'hd/oxford-shirt.webp'] },
    { id: 'utility-jacket', name: '工装口袋夹克', cardName: '工装口袋夹克', tags: '多口袋 · 随性街头', price: 399, cat: 'outer', brand: 'Forma', rating: 4.6, reviews: 98,
      desc: '棉质斜纹工装面料，多口袋实用设计，随性又有型。',
      colors: [C('khaki', '卡其色', '#8E7458', '卡其')], dots: ['#8E7458'], dotsMore: 0,
      img: { card: A + 'thumbs/utility-jacket.webp', tile: A + 'thumbs/utility-jacket.webp', thumb: A + 'thumbs/utility-jacket.webp', hd: A + 'hd/utility-jacket.webp' }, gallery: [A + 'hd/utility-jacket.webp'] },
    { id: 'grey-hoodie', name: '灰色连帽卫衣', cardName: '灰色连帽卫衣', tags: '加绒保暖 · 慵懒舒适', price: 259, cat: 'top', brand: 'Forma', rating: 4.7, reviews: 433,
      desc: '毛圈棉质面料，宽松连帽版型，周末出街的舒适之选。',
      colors: [C('grey', '麻灰色', '#C9C5BF', '麻灰')], dots: ['#C9C5BF'], dotsMore: 0,
      img: { card: A + 'thumbs/grey-hoodie.webp', tile: A + 'thumbs/grey-hoodie.webp', thumb: A + 'thumbs/grey-hoodie.webp', hd: A + 'hd/grey-hoodie.webp' }, gallery: [A + 'hd/grey-hoodie.webp'] },
    { id: 'black-sweater', name: '黑色圆领针织衫', cardName: '黑色圆领针织衫', tags: '细腻针织 · 极简百搭', price: 219, cat: 'top', brand: 'Soft Archive', rating: 4.8, reviews: 189,
      desc: '细腻精纺针织，简洁圆领，极简风格的百搭单品。',
      colors: [C('black', '黑色', '#1A1A1A', '黑色')], dots: ['#1A1A1A'], dotsMore: 0,
      img: { card: A + 'thumbs/black-sweater.webp', tile: A + 'thumbs/black-sweater.webp', thumb: A + 'thumbs/black-sweater.webp', hd: A + 'hd/black-sweater.webp' }, gallery: [A + 'hd/black-sweater.webp'] },
    { id: 'bow-blouse', name: '系带蝴蝶结衬衫', cardName: '系带蝴蝶结衬衫', tags: '温柔法式 · 约会通勤', price: 289, cat: 'top', brand: 'Linea Studio', rating: 4.8, reviews: 156,
      desc: '柔滑垂坠面料，领口系带蝴蝶结设计，温柔法式风。',
      colors: [C('ivory', '象牙白', '#F1EBE1', '象牙白')], dots: ['#F1EBE1'], dotsMore: 0,
      img: { card: A + 'thumbs/bow-blouse.webp', tile: A + 'thumbs/bow-blouse.webp', thumb: A + 'thumbs/bow-blouse.webp', hd: A + 'hd/bow-blouse.webp' }, gallery: [A + 'hd/bow-blouse.webp'] },

    // — AI stylist look items —
    { id: 'satin-slip-dress', name: '缎面吊带连衣裙', cardName: '缎面吊带连衣裙', tags: '垂坠缎面 · 约会氛围', price: 529, cat: 'dress', brand: 'Linea Studio', rating: 4.9, reviews: 167,
      desc: '光泽感醋酸缎面，斜裁垂坠贴合身形，侧开衩设计优雅灵动。',
      colors: [C('cocoa', '可可棕', '#3E2A21', '可可棕'), C('black', '黑色', '#161616', '黑色')], dots: ['#3E2A21', '#161616'], dotsMore: 0,
      img: { card: A + 'items/satin-slip-dress.webp', tile: A + 'items/satin-slip-dress.webp', thumb: A + 'items/satin-slip-dress.webp', hd: A + 'items/satin-slip-dress.webp', item: A + 'items/satin-slip-dress.webp' }, gallery: [A + 'items/satin-slip-dress.webp'], small: true },
    { id: 'black-handbag', name: '黑色手提包', cardName: '黑色手提包', tags: '利落包型 · 优雅百搭', price: 699, cat: 'bag', brand: 'Forma', rating: 4.8, reviews: 121,
      desc: '光面牛皮，硬挺梯形包型，可手提可斜挎。', sizes: ['均码'], defaultSize: '均码',
      colors: [C('black', '黑色', '#161616', '黑色')], dots: ['#161616'], dotsMore: 0,
      img: { card: A + 'items/black-handbag.webp', tile: A + 'items/black-handbag.webp', thumb: A + 'items/black-handbag.webp', hd: A + 'items/black-handbag.webp', item: A + 'items/black-handbag.webp' }, gallery: [A + 'items/black-handbag.webp'], small: true },
    { id: 'black-pumps', name: '尖头细跟单鞋', cardName: '尖头细跟单鞋', tags: '修饰脚型 · 通勤约会', price: 459, cat: 'shoes', brand: 'Forma', rating: 4.7, reviews: 143,
      desc: '尖头设计拉长腿部线条，7cm 稳固细跟。', sizes: ['35', '36', '37', '38', '39'], defaultSize: '37',
      colors: [C('black', '黑色', '#161616', '黑色')], dots: ['#161616'], dotsMore: 0,
      img: { card: A + 'items/black-pumps.webp', tile: A + 'items/black-pumps.webp', thumb: A + 'items/black-pumps.webp', hd: A + 'items/black-pumps.webp', item: A + 'items/black-pumps.webp' }, gallery: [A + 'items/black-pumps.webp'], small: true },
    { id: 'strappy-heels', name: '一字带细跟凉鞋', cardName: '一字带细跟凉鞋', tags: '纤细绑带 · 优雅迷人', price: 399, cat: 'shoes', brand: 'Forma', rating: 4.7, reviews: 96,
      desc: '纤细一字带与踝带设计，衬托脚踝线条。', sizes: ['35', '36', '37', '38', '39'], defaultSize: '37',
      colors: [C('black', '黑色', '#161616', '黑色')], dots: ['#161616'], dotsMore: 0,
      img: { card: A + 'items/strappy-heels.webp', tile: A + 'items/strappy-heels.webp', thumb: A + 'items/strappy-heels.webp', hd: A + 'items/strappy-heels.webp', item: A + 'items/strappy-heels.webp' }, gallery: [A + 'items/strappy-heels.webp'], small: true },
    { id: 'gold-hoops', name: '金色圆环耳饰', cardName: '金色圆环耳饰', tags: '复古金属 · 点睛配饰', price: 159, cat: 'acc', brand: 'Forma', rating: 4.8, reviews: 412,
      desc: '18K 镀金黄铜，粗圆环造型，轻盈不坠耳。', sizes: ['均码'], defaultSize: '均码',
      colors: [C('gold', '金色', '#C9A25A', '金色')], dots: ['#C9A25A'], dotsMore: 0,
      img: { card: A + 'items/gold-hoops.webp', tile: A + 'items/gold-hoops.webp', thumb: A + 'items/gold-hoops.webp', hd: A + 'items/gold-hoops.webp', item: A + 'items/gold-hoops.webp' }, gallery: [A + 'items/gold-hoops.webp'], small: true },

    // — 购物广场 asset pack: the ZARA look's maxi skirt (model photo only) —
    { id: 'maxi-skirt', name: '垂坠半身长裙', cardName: '垂坠半身长裙', tags: '温柔垂坠 · 显高显瘦', price: 359, cat: 'bottom', brand: 'ZARA', rating: 4.8, reviews: 207,
      desc: '轻盈垂坠的醋酸混纺面料，高腰 A 字长裙摆，行走间灵动飘逸，搭配针织开衫温柔又有质感。',
      colors: [C('cream', '奶油白', '#EFE6D6', '奶油白'), C('oat', '燕麦色', '#CDBFAE', '燕麦'), C('black', '黑色', '#1E1E1E', '黑色')], dots: ['#EFE6D6', '#CDBFAE', '#1E1E1E'], dotsMore: 0,
      img: { card: 'assets/plaza/models/maxi-skirt.webp', tile: 'assets/plaza/models/maxi-skirt.webp', thumb: 'assets/plaza/models/maxi-skirt.webp', hd: 'assets/plaza/models/maxi-skirt.webp' }, gallery: ['assets/plaza/models/maxi-skirt.webp'] },
  ];

  const byId = {};
  products.forEach((p) => {
    p.sizes = p.sizes || SIZES;
    p.defaultSize = p.defaultSize || (p.sizes.includes('M') ? 'M' : p.sizes[0]);
    p.gallery = p.gallery || [p.img.hd];
    byId[p.id] = p;
  });

  /* 购物广场 card imagery from the plaza asset pack: model photos where the pack has
     one (also added to the product gallery), otherwise the cleaned-up flat shots */
  const P = 'assets/plaza/';
  ['knit-cardigan', 'straight-jeans', 'brown-blazer'].forEach((id) => {
    byId[id].img.plaza = P + 'models/' + id + '.webp';
    byId[id].gallery.splice(1, 0, byId[id].img.plaza);
  });
  ['striped-shirt', 'black-blazer', 'pleated-skirt', 'white-tee', 'taupe-coat', 'white-sneakers', 'brown-tote', 'black-cardigan', 'white-shirt']
    .forEach((id) => { byId[id].img.plaza = P + 'cards/' + id + '.webp'; });

  /* ---------- stores (商家): every product belongs to the store of its brand ----------
     One record feeds both merchant views: 购物广场 (bar, banner, search) and the store's own page.
     - campaign: the promotional banner. `img` is a text-free photo (the copy is live HTML);
       without one the banner is a collage of the store's own products. `line` is its title.
     - intro: the store's own description (demo copy; no company facts, no follower counts).
     - collections: 当季精选, only where the store has editorial imagery; the section hides otherwise. */
  const stores = [
    { id: 'zara', name: 'ZARA', full: 'ZARA 官方旗舰店', tagline: '简约与质感的日常时装', mono: 'ZARA', bg: '#1C1A18', fg: '#FFFFFF', rating: 4.9,
      campaign: { img: P + 'banners/zara-hero.webp', line: '2024 秋冬系列' },
      intro: 'ZARA 致力于将现代设计与日常穿着完美结合。我们相信时尚应来源于真实生活，为每个人提供兼具品质与设计感的当代衣橱。',
      collections: [
        { id: 'outer', name: '秋冬外套系列', sub: '质感廓形 从容日常', img: P + 'models/brown-blazer.webp', items: ['brown-blazer', 'knit-cardigan'] },
        { id: 'knit', name: '针织毛衣系列', sub: '柔软舒适 百搭实穿', img: P + 'models/knit-cardigan.webp', items: ['knit-cardigan'] },
        { id: 'denim', name: '牛仔系列', sub: '经典重塑 自在穿着', img: P + 'models/straight-jeans.webp', items: ['straight-jeans'] },
      ] },
    { id: 'soft-archive', name: 'Soft Archive', full: 'Soft Archive 官方店', tagline: '柔软针织 · 基础衣橱', mono: 'SA', bg: '#E6DACB', fg: '#5B4A3C', rating: 4.8,
      campaign: { line: '秋冬针织系列' },
      intro: 'Soft Archive 专注柔软针织与基础单品，用亲肤的面料和克制的设计，打造可以反复穿着的日常衣橱。' },
    { id: 'linea-studio', name: 'Linea Studio', full: 'Linea Studio 官方店', tagline: '法式温柔 · 日常优雅', mono: 'LS', bg: '#D5CABD', fg: '#3E3631', rating: 4.8,
      campaign: { line: '本季新品' },
      intro: 'Linea Studio 以法式的温柔与松弛为灵感，偏爱垂坠的面料与简洁的线条，让日常穿着多一分优雅。' },
    { id: 'mono-atelier', name: 'Mono Atelier', full: 'Mono Atelier 官方店', tagline: '利落剪裁 · 摩登通勤', mono: 'MA', bg: '#2F2B28', fg: '#F3EDE6', rating: 4.8,
      campaign: { line: '西装与大衣系列' },
      intro: 'Mono Atelier 专注利落剪裁的通勤外套，以中性色与挺括的廓形，陪你从容度过每一个工作日。' },
    { id: 'forma', name: 'Forma', full: 'Forma 官方旗舰店', tagline: '鞋包配饰 · 简约实用', mono: 'F', bg: '#B89B7E', fg: '#FFFFFF', rating: 4.7,
      campaign: { line: '秋冬鞋包上新' },
      intro: 'Forma 精选实用又耐看的鞋包与配饰，用简约的设计为日常穿搭补上点睛的一笔。' },
    { id: 'reformation', name: 'Reformation', full: 'Reformation 官方旗舰店', tagline: '轻盈面料 · 经典衬衫', mono: 'R', bg: '#F1ECE6', fg: '#1C1A18', rating: 4.8,
      campaign: { line: '亚麻衬衫系列' },
      intro: 'Reformation 以轻盈的面料和经典衬衫为核心，打造清爽自在、适合通勤的日常造型。' },
    { id: 'linea-denim', name: 'Linea Denim', full: 'Linea Denim 官方店', tagline: '经典丹宁 · 自在随性', mono: 'LD', bg: '#5E7FA6', fg: '#FFFFFF', rating: 4.7,
      campaign: { line: '复古牛仔系列' },
      intro: 'Linea Denim 专注经典丹宁，以耐穿的面料与随性的版型，陪伴每一天的自在穿搭。' },
  ];
  const storeById = Object.fromEntries(stores.map((st) => [st.id, st]));
  const storeByBrand = Object.fromEntries(stores.map((st) => [st.name, st]));
  const storeOf = (p) => storeByBrand[p.brand] || stores[0];
  /* stores the demo user has already favourited, in the order the 购物广场 bar shows them */
  const seedStoreFavs = ['zara', 'soft-archive', 'linea-studio', 'mono-atelier', 'forma'];
  /* chats with stores (商家消息); `at` orders the list, newest first */
  const storeChatSeed = {
    zara: { unread: 1, at: 3, msgs: [{ me: false, text: '您关注的店铺上新啦！2024 秋冬系列已上线，关注店铺的顾客可领取 ¥30 新品券～', t: '10:24' }] },
    'mono-atelier': { unread: 0, at: 2, msgs: [{ me: true, text: '黑色西装外套还有 S 码吗？', t: '昨天' }, { me: false, text: '亲，黑色 S 码有现货，下单后 48 小时内发货哦～', t: '昨天' }] },
    forma: { unread: 0, at: 1, msgs: [{ me: false, text: '您的小白板鞋已送达，穿着还合适吗？有任何问题随时联系我们～', t: '7月13日' }] },
  };
  /* the platform banners' 「探索」 picks */
  const seasonPicks = ['taupe-coat', 'knit-cardigan', 'maxi-skirt', 'brown-blazer', 'brown-sweater', 'black-cardigan', 'pleated-skirt'];

  /* ---------- category systems (each screen in the reference uses its own labels) ---------- */
  const plazaCats = [
    { id: 'all', label: '全部' }, { id: 'top', label: '上衣' }, { id: 'bottom', label: '下装' }, { id: 'outer', label: '外套' },
    { id: 'dress', label: '连衣裙' }, { id: 'shoesbag', label: '鞋包' }, { id: 'acc', label: '配饰' },
  ];
  const wardrobeCats = [
    { id: 'all', label: '全部' }, { id: 'top', label: '上衣' }, { id: 'bottom', label: '下装' }, { id: 'shoesbag', label: '鞋包' },
    { id: 'acc', label: '配饰' }, { id: 'outer', label: '外套' }, { id: 'dress', label: '连衣裙' },
  ];
  function inCat(p, cat) {
    if (cat === 'all') return true;
    if (cat === 'shoesbag') return p.cat === 'shoes' || p.cat === 'bag';
    return p.cat === cat;
  }

  /* fitting room: left menu categories and their garment lists (上装 = reference order).
     Only garments worn in at least one render are listed (filtered below, after `renders`). */
  const fitCatsAll = [
    { id: 'upper', label: '上装', icon: 'tshirt', items: ['knit-cardigan', 'striped-shirt', 'beige-blazer', 'black-blazer', 'basic-cami', 'oxford-shirt', 'utility-jacket', 'grey-hoodie', 'black-sweater', 'bow-blouse', 'white-tee', 'white-shirt', 'brown-sweater', 'ribbed-tank'] },
    { id: 'lower', label: '下装', icon: 'pants', items: ['straight-jeans', 'pleated-skirt', 'beige-trousers'] },
    { id: 'dress', label: '连衣裙', icon: 'dress', items: ['satin-slip-dress'] },
    { id: 'outer', label: '外套', icon: 'jacket', items: ['black-blazer', 'beige-blazer', 'knit-cardigan', 'brown-blazer', 'taupe-coat', 'black-cardigan', 'denim-jacket', 'utility-jacket'] },
    { id: 'shoes', label: '鞋履', icon: 'sneaker', items: ['white-sneakers', 'black-pumps', 'strappy-heels'] },
    { id: 'bag', label: '包包', icon: 'handbag', items: ['brown-tote', 'black-handbag'] },
    { id: 'acc', label: '配饰', icon: 'cap', items: ['gold-hoops'] },
  ];
  /* which outfit slot a garment occupies */
  const slotOf = (p) => ({ top: 'top', outer: 'outer', bottom: 'bottom', dress: 'dress', shoes: 'shoes', bag: 'bag', acc: 'acc' }[p.cat]);

  /* on-body imagery that actually exists (base avatar + the three stylist looks) */
  const renders = [
    { id: 'base', img: 'assets/people/avatar-base.webp', label: '数字分身 · 基础造型', wears: { top: 'basic-cami', bottom: 'straight-jeans', shoes: 'white-sneakers' } },
    { id: 'look1', img: 'assets/people/avatar-look1.webp', label: 'Look 1 · 休闲时髦', wears: { top: 'basic-cami', bottom: 'straight-jeans', shoes: 'white-sneakers', bag: 'brown-tote' } },
    { id: 'look2', img: 'assets/people/avatar-look2.webp', label: 'Look 2 · 摩登气质', wears: { top: 'basic-cami', bottom: 'straight-jeans', outer: 'black-blazer', bag: 'black-handbag', shoes: 'black-pumps' } },
    { id: 'look3', img: 'assets/people/avatar-look3.webp', label: 'Look 3 · 优雅迷人', wears: { dress: 'satin-slip-dress', bag: 'black-handbag', shoes: 'strappy-heels', acc: 'gold-hoops' } },
  ];

  /* 首页 shows only garments that some render actually wears; the rest stay in the
     catalog and reappear here as soon as a render that wears them is added above */
  const rendered = new Set(renders.flatMap((r) => Object.values(r.wears)));
  const fitCats = fitCatsAll.map((c) => ({ ...c, items: c.items.filter((pid) => rendered.has(pid)) }));

  /* AI stylist looks (reference screen 7) */
  const looks = [
    { id: 'look1', name: 'Look 1', sub: '休闲时髦 · 轻松有范', tags: ['聚会约会', '日常百搭', '显瘦显高'], card: 'assets/people/look1-card.webp', render: 'look1',
      items: [{ p: 'basic-cami', img: A + 'items/basic-cami.webp' }, { p: 'straight-jeans', img: A + 'items/straight-jeans.webp' }, { p: 'brown-tote', img: A + 'items/brown-tote.webp' }, { p: 'white-sneakers', img: A + 'items/white-sneakers.webp' }] },
    { id: 'look2', name: 'Look 2', sub: '摩登气质 · 高级氛围', tags: ['气质出众', '聚会晚餐', '时髦有型'], card: 'assets/people/look2-card.webp', render: 'look2',
      items: [{ p: 'black-blazer', img: A + 'items/black-blazer.webp' }, { p: 'basic-cami', img: A + 'items/basic-cami-2.webp' }, { p: 'straight-jeans', img: A + 'items/straight-jeans-2.webp' }, { p: 'black-handbag', img: A + 'items/black-handbag.webp' }, { p: 'black-pumps', img: A + 'items/black-pumps.webp' }] },
    { id: 'look3', name: 'Look 3', sub: '优雅迷人 · 约会聚会', tags: ['氛围感', '高级简约', '显瘦修身'], card: 'assets/people/look3-card.webp', render: 'look3',
      items: [{ p: 'satin-slip-dress', img: A + 'items/satin-slip-dress.webp' }, { p: 'black-handbag', img: A + 'items/black-handbag-2.webp' }, { p: 'strappy-heels', img: A + 'items/strappy-heels.webp' }, { p: 'gold-hoops', img: A + 'items/gold-hoops.webp' }] },
  ];
  const lookById = Object.fromEntries(looks.map((l) => [l.id, l]));

  /* 本人's wardrobe (reference screen 6 order, then the stylist looks' garments). `own`: garments she owns (✓);
     the others she added from 购物广场 (the striped shirt is still on its way, order VT20260715092418) */
  const seedWardrobe = [
    { p: 'knit-cardigan', fav: true, own: true }, { p: 'striped-shirt', fav: false }, { p: 'black-blazer', fav: false, own: true },
    { p: 'straight-jeans', fav: false }, { p: 'pleated-skirt', fav: true, own: true }, { p: 'white-tee', fav: false },
    { p: 'taupe-coat', fav: false }, { p: 'white-sneakers', fav: false, own: true }, { p: 'brown-tote', fav: true },
    { p: 'black-cardigan', fav: false, own: true }, { p: 'white-shirt', fav: true }, { p: 'brown-sweater', fav: false },
    { p: 'ribbed-tank', fav: false, own: true }, { p: 'beige-trousers', fav: false, own: true }, { p: 'denim-jacket', fav: false },
    { p: 'basic-cami', fav: false, own: true }, { p: 'satin-slip-dress', fav: false }, { p: 'black-handbag', fav: false },
    { p: 'black-pumps', fav: false }, { p: 'strappy-heels', fav: false }, { p: 'gold-hoops', fav: false },
  ];

  /* ---------- 个人衣橱 V2 (asset kit "Wardrobe Instagram Assets V2") ---------- */
  const W = 'assets/wardrobe/';
  /* the grid's square garment shots (1000×1000 kit exports, trimmed of the mockup tile frames) */
  ['knit-cardigan', 'striped-shirt', 'black-blazer', 'straight-jeans', 'pleated-skirt', 'white-tee', 'taupe-coat', 'white-sneakers',
    'brown-tote', 'black-cardigan', 'white-shirt', 'brown-sweater'].forEach((id) => { byId[id].img.square = W + 'clothing/' + id + '.webp'; });
  /* 搭配集 and 穿搭瞬间 of 本人 (items are product ids; the store links them to wardrobe entries) */
  const seedCollections = [
    { id: 'weekend', name: '周末最爱', cover: W + 'collections/weekend.webp', items: ['knit-cardigan', 'straight-jeans', 'white-sneakers', 'brown-tote'] },
    { id: 'office', name: '通勤搭配', cover: W + 'collections/office.webp', items: ['taupe-coat', 'striped-shirt', 'white-shirt', 'brown-tote'] },
    { id: 'date', name: '约会穿搭', cover: W + 'collections/date.webp', items: ['pleated-skirt', 'white-tee', 'black-blazer', 'brown-tote'] },
    { id: 'travel', name: '旅行穿搭', cover: W + 'collections/travel.webp', items: ['white-tee', 'straight-jeans', 'white-sneakers', 'black-cardigan'] },
  ];
  /* demo photos (crops of the mockup); `items` are the catalog garments closest to what each one shows */
  const seedMoments = [
    { id: 'weekend', src: W + 'moments/weekend.webp', at: new Date(2026, 9, 14, 18, 20).getTime(), items: ['knit-cardigan', 'straight-jeans'], fav: false },
    { id: 'office', src: W + 'moments/office.webp', at: new Date(2026, 9, 12, 8, 40).getTime(), items: ['black-blazer', 'black-handbag'], fav: false },
    { id: 'casual', src: W + 'moments/casual.webp', at: new Date(2026, 9, 8, 15, 5).getTime(), items: ['grey-hoodie'], fav: true },
    { id: 'evening', src: W + 'moments/evening.webp', at: new Date(2026, 9, 6, 20, 30).getTime(), items: ['satin-slip-dress', 'black-handbag'], fav: false },
  ];
  /* 切换角色: 本人 plus three demo people, each with their own wardrobe, 搭配集 and body data.
     They own their garments except `saved` (added from 购物广场): 本人 owns the white sneakers,
     伴侣 only saved them, 妈妈 doesn't have them. Portraits are demo images, not real relatives. */
  const mePortrait = W + 'avatars/me.webp';
  const seedRoles = [
    { id: 'partner', name: '伴侣', portrait: W + 'avatars/partner.webp', body: { height: 178, weight: 68, size: 'L', shoe: '42' },
      wardrobe: ['grey-hoodie', 'white-tee', 'denim-jacket', 'utility-jacket', 'black-sweater', 'straight-jeans', 'white-sneakers'], favs: ['denim-jacket', 'white-sneakers'],
      saved: ['utility-jacket', 'white-sneakers'],
      collections: [{ id: 'partner-weekend', name: '周末最爱', items: ['grey-hoodie', 'straight-jeans', 'white-sneakers'] },
        { id: 'partner-travel', name: '旅行穿搭', items: ['white-tee', 'denim-jacket', 'straight-jeans', 'white-sneakers'] }] },
    { id: 'father', name: '爸爸', portrait: W + 'avatars/father.webp', body: { height: 172, weight: 72, size: 'XL', shoe: '42' },
      wardrobe: ['brown-blazer', 'oxford-shirt', 'brown-sweater', 'beige-trousers', 'taupe-coat', 'white-shirt'], favs: ['brown-sweater'],
      saved: ['brown-blazer'],
      collections: [{ id: 'father-office', name: '通勤搭配', items: ['brown-blazer', 'oxford-shirt', 'beige-trousers'] }] },
    { id: 'mother', name: '妈妈', portrait: W + 'avatars/mother.webp', body: { height: 160, weight: 54, size: 'M', shoe: '37' },
      wardrobe: ['bow-blouse', 'beige-blazer', 'maxi-skirt', 'knit-cardigan', 'satin-slip-dress', 'black-handbag', 'black-pumps', 'gold-hoops'], favs: ['bow-blouse', 'gold-hoops'],
      saved: ['satin-slip-dress', 'black-handbag'],
      collections: [{ id: 'mother-date', name: '约会穿搭', items: ['satin-slip-dress', 'black-pumps', 'black-handbag', 'gold-hoops'] },
        { id: 'mother-office', name: '通勤搭配', items: ['bow-blouse', 'beige-blazer', 'maxi-skirt', 'black-handbag'] }] },
  ];

  /* the plaza feed order: reference six first, then the rest of the catalog */
  const plazaOrder = ['knit-cardigan', 'straight-jeans', 'striped-shirt', 'brown-blazer', 'basic-cami', 'pleated-skirt',
    'maxi-skirt', 'black-blazer', 'satin-slip-dress', 'white-shirt', 'beige-trousers', 'taupe-coat', 'brown-tote', 'beige-blazer', 'white-sneakers',
    'brown-sweater', 'denim-jacket', 'bow-blouse', 'black-handbag', 'black-cardigan', 'white-tee', 'oxford-shirt', 'black-pumps',
    'grey-hoodie', 'utility-jacket', 'black-sweater', 'ribbed-tank', 'strappy-heels', 'gold-hoops'];

  /* address book seed (editable copy lives in the store) */
  const addresses = [
    { id: 'a1', name: '李女士', phone: '138****8888', addr: '北京市朝阳区 望京街道望京SOHO 1号楼 1208室', tag: '公司', isDefault: true },
    { id: 'a2', name: '李女士', phone: '138****8888', addr: '北京市海淀区 中关村南大街 5号院 3单元 602', tag: '家' },
  ];
  const shippingOptions = [
    { id: 'standard', name: '标准快递', price: 0, note: '免费配送', eta: 3 },
    { id: 'express', name: '顺丰次日达', price: 12, note: '+¥12', eta: 1 },
  ];
  const payments = [
    { id: 'alipay', name: '支付宝', logo: 'assets/ui/pay-alipay.webp' },
    { id: 'wechat', name: '微信支付', logo: 'assets/ui/pay-wechat.webp' },
    { id: 'unionpay', name: '银联支付', logo: 'assets/ui/pay-unionpay.webp' },
    { id: 'card', name: '使用新银行卡支付', icon: 'card-bold' },
  ];

  /* demo order history.
     status: -1 待付款 · 0 待发货 · 1 已发货 · 2 运输中 · 3 待收货 (delivered) · 4 已完成
     progress: milestones completed on the 4-step tracker */
  const seedOrder = {
    // the order already in transit in the reference (order details screen)
    id: 'VT20260715092418', shop: 'Reformation 官方旗舰店',
    p: 'striped-shirt', title: '宽松棉麻衬衫', color: 'blue', colorLabel: '蓝色', size: 'M', qty: 1, price: 259,
    paid: 239, coupon: 20, shipping: 0, payment: 'alipay', address: 'a1',
    status: 2, progress: 2, eta: '7月18日',
    steps: [
      { label: '已下单', time: '7月15日 09:24' }, { label: '已发货', time: '7月16日 14:08' },
      { label: '运输中', time: '7月17日 08:32' }, { label: '预计送达', time: '7月18日' },
    ],
    logistics: [
      { t: '7月17日 08:32', s: '【北京市】快件已到达 北京望京营业部，正在派送准备中' },
      { t: '7月16日 22:15', s: '【廊坊市】快件已从 廊坊转运中心 发出，下一站 北京望京营业部' },
      { t: '7月16日 14:08', s: '【杭州市】商家已发货，顺丰速运 已揽收' },
      { t: '7月15日 09:24', s: '订单已提交，等待商家发货' },
    ],
    created: '2026-07-15 09:24:18',
    carrier: '顺丰速运 SF1428 6630 9921',
  };
  const seedOrders = [
    seedOrder,
    {
      id: 'VT20260717203305', shop: 'ZARA 官方旗舰店',
      p: 'brown-blazer', title: '灰褐气质西装外套', color: 'taupe', colorLabel: '灰褐', size: 'S', qty: 1, price: 399,
      paid: 379, coupon: 20, shipping: 0, payment: 'wechat', address: 'a1',
      status: -1, progress: 1, eta: '付款后 3 天内', payBy: '7月18日 20:33',
      steps: [{ label: '已下单', time: '7月17日 20:33' }, { label: '已发货', time: '待付款' }, { label: '运输中', time: '—' }, { label: '预计送达', time: '—' }],
      logistics: [{ t: '7月17日 20:33', s: '订单已提交，等待付款' }],
      created: '2026-07-17 20:33:05', carrier: '待分配',
    },
    {
      id: 'VT20260710151207', shop: 'Forma 官方旗舰店',
      p: 'white-sneakers', title: '米白小白板鞋', color: 'white', colorLabel: '米白', size: '37', qty: 1, price: 329,
      paid: 309, coupon: 20, shipping: 0, payment: 'alipay', address: 'a2',
      status: 3, progress: 4, eta: '7月13日',
      steps: [{ label: '已下单', time: '7月10日 15:12' }, { label: '已发货', time: '7月11日 10:40' }, { label: '运输中', time: '7月12日 07:55' }, { label: '已送达', time: '7月13日 14:20' }],
      logistics: [
        { t: '7月13日 14:20', s: '【北京市】快件已送达，放入 中关村南大街 5号院 快递柜，取件码 6062' },
        { t: '7月13日 08:05', s: '【北京市】快件正在派送中，派送员 王师傅 158****2210' },
        { t: '7月12日 07:55', s: '【天津市】快件已从 天津分拨中心 发出，下一站 北京海淀营业部' },
        { t: '7月11日 10:40', s: '【温州市】商家已发货，中通快递 已揽收' },
        { t: '7月10日 15:12', s: '订单已提交，等待商家发货' },
      ],
      created: '2026-07-10 15:12:07', carrier: '中通快递 7311 2048 5566',
    },
    {
      id: 'VT20260702110846', shop: 'Linea Studio 官方店',
      p: 'pleated-skirt', title: '咖啡百褶半身裙', color: 'brown', colorLabel: '咖啡', size: 'S', qty: 1, price: 259,
      paid: 239, coupon: 20, shipping: 0, payment: 'alipay', address: 'a1',
      status: 4, progress: 4, eta: '7月5日',
      steps: [{ label: '已下单', time: '7月2日 11:08' }, { label: '已发货', time: '7月3日 09:30' }, { label: '运输中', time: '7月4日 06:12' }, { label: '已签收', time: '7月5日 12:46' }],
      logistics: [
        { t: '7月5日 12:46', s: '【北京市】快件已签收，签收人：本人' },
        { t: '7月4日 06:12', s: '【廊坊市】快件已从 廊坊转运中心 发出' },
        { t: '7月3日 09:30', s: '【苏州市】商家已发货，顺丰速运 已揽收' },
        { t: '7月2日 11:08', s: '订单已提交，等待商家发货' },
      ],
      created: '2026-07-02 11:08:46', carrier: '顺丰速运 SF1427 0951 3307',
    },
  ];
  /* an exchange already in progress on the delivered skirt */
  const seedReturns = { VT20260702110846: { type: '换货', reason: '尺码不合适', note: '想换大一码（M）', time: '7月8日 19:42', stage: 1 } };
  const orderStatus = { '-1': '待付款', 0: '待发货', 1: '已发货', 2: '运输中', 3: '待收货', 4: '已完成' };
  /* the order filters on 我的 and 我的订单 */
  const orderFilters = [
    { id: 'all', label: '全部' }, { id: 'unpaid', label: '待付款', icon: 'wallet' }, { id: 'toship', label: '待发货', icon: 'box' },
    { id: 'shipping', label: '运输中', icon: 'truck' }, { id: 'toreceive', label: '待收货', icon: 'box-check' }, { id: 'aftersale', label: '售后', icon: 'aftersale' },
  ];

  /* products the demo user has favourited / viewed (shown on 我的) */
  const seedFavorites = ['black-blazer', 'satin-slip-dress', 'white-shirt', 'taupe-coat', 'brown-tote', 'beige-blazer', 'bow-blouse', 'black-handbag'];
  const seedHistory = [
    { p: 'striped-shirt', t: '今天 09:12' }, { p: 'knit-cardigan', t: '今天 09:05' }, { p: 'brown-blazer', t: '昨天 21:40' },
    { p: 'satin-slip-dress', t: '昨天 21:31' }, { p: 'basic-cami', t: '7月14日' }, { p: 'pleated-skirt', t: '7月14日' },
  ];

  const faqs = [
    ['多久可以发货？', '现货商品下单后 48 小时内发货，预售商品以商品页说明为准。'],
    ['怎么申请退换货？', '在「我的 → 我的订单」打开订单，点击「申请退换货」，选择原因并提交，商家会在 1–2 个工作日内处理。'],
    ['虚拟试衣的效果准确吗？', '数字分身根据你的身材生成，可作为合身度与搭配参考，最终请以实物为准。'],
    ['怎么重新生成数字分身？', '进入「我的 → 我的形象」，选择「更换照片」或「重新生成」即可。'],
    ['照片会被保存吗？', '演示原型中，照片只保存在你当前浏览器的本地存储中，可在「设置 → 隐私与安全」中清除。'],
  ];

  /* AI stylist scripted conversation */
  const chatSeed = [
    { role: 'user', text: '我今晚有个朋友聚会，\n可以推荐几套适合的穿搭吗？' },
    { role: 'ai', text: '当然可以！根据你的衣橱和近期的穿搭偏好，\n我为你准备了 3 套适合朋友聚会的造型。\n这些搭配既时髦又自在，兼顾氛围感和舒适度，\n让你轻松出彩 ✨' },
    { role: 'looks', looks: ['look1', 'look2', 'look3'] },
    { role: 'ai', text: '这 3 套造型分别呈现了不同的风格：\n第一套清新自然，第二套摩登精致，第三套优雅\n迷人。你更喜欢哪一种风格？或者想让我根据\n具体场景再做调整？' },
  ];
  const chatSuggestions = ['我想要更正式一些', '换成裙装搭配', '根据我已有的衣服来搭配'];
  /* keyword → scripted reply (no LLM; predetermined local responses). The first match wins.
     `plan` replies are put together from the active person's garments (07-stylist.js):
     upload = style a garment photo they took · focal = style a 购物广场 product · owned = only what they own */
  const chatReplies = [
    { k: ['拍了', '刚拍', '拍的', '上传了', '刚上传', '上传的'], plan: 'upload' },
    { k: ['购物广场', '这件'], plan: 'focal' },
    { k: ['已有', '衣橱', '我的衣服', '现有'], plan: 'owned' },
    { k: ['正式', '通勤', '上班', '会议', '面试'], text: '明白，想要更正式一些的话，推荐以西装外套为主角：\nLook 2 的黑色西装外套搭配基础吊带背心与直筒牛仔裤，\n利落又不会过于严肃。鞋子换成尖头细跟单鞋，气场更足。', looks: ['look2'] },
    { k: ['裙', '连衣裙', '约会', '优雅', '女人味'], text: '换成裙装的话，这套缎面吊带连衣裙很适合晚间聚会：\n垂坠缎面在灯光下有细腻光泽，搭配黑色手提包、\n一字带细跟凉鞋和金色圆环耳饰，优雅又有氛围感。', looks: ['look3'] },
    { k: ['休闲', '舒适', '轻松', '日常', '周末'], text: '轻松一点的话推荐 Look 1：基础吊带背心 + 高腰直筒牛仔裤，\n配棕色托特包和小白板鞋，舒适好走又很有型。', looks: ['look1'] },
    { k: ['冷', '降温', '保暖', '秋', '冬'], text: '天气转凉的话，可以在任一造型外加一件双排扣羊毛大衣\n或焦糖色圆领毛衣，大地色系叠穿会更有层次感。', wardrobeLook: ['taupe-coat', 'brown-sweater', 'straight-jeans', 'white-sneakers'] },
  ];
  const chatFallback = '收到！我已经记下你的需求。演示版的造型师使用预设回复，\n你可以试试上面的快捷问题，或者告诉我场合（如通勤、约会、\n周末出游），我会推荐对应的造型。';

  /* the five primary screens: persistent bottom navigation, in this order */
  const tabs = [
    { id: 'fitting', label: '首页', icon: 'home', iconOn: 'home-filled' },
    { id: 'plaza', label: '购物广场', icon: 'bag', iconOn: 'bag-filled' },
    { id: 'wardrobe', label: '个人衣橱', icon: 'wardrobe', iconOn: 'closet-filled' },
    { id: 'stylist', label: 'AI造型师', icon: 'sparkle', iconOn: 'sparkle-filled' },
    { id: 'profile', label: '我的', icon: 'person', iconOn: 'person-filled' },
  ];

  VT.data = {
    products, byId, plazaCats, wardrobeCats, inCat, fitCats, fitCatsAll, slotOf, renders, looks, lookById,
    stores, storeById, storeOf, seedStoreFavs, storeChatSeed, seasonPicks,
    seedWardrobe, seedCollections, seedMoments, mePortrait, seedRoles, plazaOrder, addresses, shippingOptions, payments, seedOrder, seedOrders, seedReturns,
    orderStatus, orderFilters, seedFavorites, seedHistory, faqs,
    chatSeed, chatSuggestions, chatReplies, chatFallback,
    tabs,
    /* showcase board: the five primary screens */
    screens: [
      { id: 'fitting', n: 1, title: '首页 · 虚拟试衣间', caption: '首页', desc: '虚拟试衣主界面，\n开启你的数字试穿体验。' },
      { id: 'plaza', n: 2, title: '购物广场', caption: '购物广场', desc: '浏览精选单品，\n发现你的风格。' },
      { id: 'wardrobe', n: 3, title: '个人衣橱', caption: '个人衣橱', desc: '统一管理衣物\n与搭配收藏。' },
      { id: 'stylist', n: 4, title: 'AI 造型师', caption: 'AI 造型师', desc: '获取智能穿搭建议\n与对话推荐。' },
      { id: 'profile', n: 5, title: '我的', caption: '我的', desc: '管理头像、设置、\n订单与个人信息。' },
    ],
    /* secondary screens, reached from the primary screens (listed in the simulator) */
    flows: [
      { id: 'onboarding', title: '启动页', from: '首次启动' },
      { id: 'avatar', title: '上传照片 · 创建数字分身', from: '首次启动 / 我的形象' },
      { id: 'product', title: '商品详情', from: '购物广场' },
      { id: 'messages', title: '商家消息', from: '购物广场' },
      { id: 'store', title: '商家店铺', from: '购物广场 / 商品详情' },
      { id: 'checkout', title: '结算下单', from: '商品详情' },
      { id: 'outfit', title: '搭配集详情', from: '个人衣橱' },
      { id: 'moment', title: '穿搭瞬间', from: '个人衣橱' },
      { id: 'orderlist', title: '我的订单', from: '我的' },
      { id: 'orders', title: '订单详情', from: '我的订单' },
      { id: 'tracking', title: '物流跟踪', from: '订单详情' },
      { id: 'returns', title: '申请退换货', from: '订单详情' },
      { id: 'avatarhub', title: '我的形象', from: '我的' },
      { id: 'editprofile', title: '编辑资料', from: '我的' },
      { id: 'settings', title: '设置', from: '我的' },
    ],
  };
})();
