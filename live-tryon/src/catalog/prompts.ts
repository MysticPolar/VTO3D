/**
 * One Lucy VTON prompt per try-on garment, written from its reference photo in public/catalog/,
 * following Decart's VTON prompting guide (docs: Models → Prompting Guide (Lucy VTON)):
 * - one action: "Substitute the <region> with …", or "Add … to the outfit" for accessories
 * - the region first: upper body garment, lower body garment, outfit (dresses), footwear
 * - only what the photo shows: colour, fabric, cut, collar, closures, pockets; no brand names
 * - front-opening garments say how they are worn; all are "buttoned closed" here, which needs
 *   no description of the layer underneath
 *
 * English on purpose: the prompts go to the model, not to the user. In the app they would come
 * from the back end's catalog with each try-on garment (PROPOSALS.md).
 */
export const PROMPTS: Record<string, string> = {
  // 上装
  'knit-cardigan':
    'Substitute the upper body garment with a cream chunky rib-knit cardigan with a V-neck, dropped shoulders, long sleeves with ribbed cuffs and four light brown buttons, buttoned closed.',
  'striped-shirt':
    'Substitute the upper body garment with a light blue and white fine vertical-striped long-sleeve shirt with a pointed collar, a chest pocket and buttoned cuffs, buttoned closed.',
  'beige-blazer':
    'Substitute the upper body garment with a light oatmeal beige single-breasted blazer with notch lapels, flap pockets and long sleeves, buttoned closed.',
  'black-blazer':
    'Substitute the upper body garment with a black single-breasted blazer with notch lapels, two buttons, flap pockets and long sleeves, buttoned closed.',
  'basic-cami':
    'Substitute the upper body garment with a white fitted camisole with thin spaghetti straps and a straight neckline.',
  'oxford-shirt':
    'Substitute the upper body garment with a light blue oxford cotton long-sleeve shirt with a pointed collar, buttoned cuffs and a curved hem, buttoned closed.',
  'utility-jacket':
    'Substitute the upper body garment with a tan brown utility shirt jacket with a pointed collar, two flap chest pockets, two lower flap pockets and long sleeves, buttoned closed.',
  'grey-hoodie':
    'Substitute the upper body garment with a light grey pullover hoodie with white drawstrings, long sleeves, ribbed cuffs and a ribbed hem, in a relaxed fit.',
  'black-sweater':
    'Substitute the upper body garment with a black fine-knit crew-neck sweater with long sleeves, ribbed cuffs and a ribbed hem.',
  'bow-blouse':
    'Substitute the upper body garment with an ivory long-sleeve blouse with a pointed collar, a long tie bow at the neck, a button front and buttoned cuffs.',
  'white-tee':
    'Substitute the upper body garment with a plain white short-sleeve crew-neck cotton t-shirt with a relaxed fit.',
  'white-shirt':
    'Substitute the upper body garment with a crisp white oversized long-sleeve shirt with a pointed collar, a chest pocket and buttoned cuffs, buttoned closed.',
  'brown-sweater':
    'Substitute the upper body garment with a caramel brown crew-neck knit sweater with long sleeves and a ribbed neckline, cuffs and hem.',
  'ribbed-tank':
    'Substitute the upper body garment with a cream fitted rib-knit tank top with a scoop neckline and wide shoulder straps.',

  // 下装
  'straight-jeans':
    'Substitute the lower body garment with high-waisted light blue wash denim jeans with a wide straight leg, full length.',
  'pleated-skirt':
    'Substitute the lower body garment with a chocolate brown pleated midi skirt with a high waistband and an A-line shape.',
  'beige-trousers':
    'Substitute the lower body garment with light beige high-waisted wide-leg tailored trousers with front pleats and belt loops, full length.',

  // 连衣裙
  'satin-slip-dress':
    'Substitute the outfit with a dark chocolate brown satin slip dress with thin spaghetti straps, a V-neckline and a draped bodice, midi length.',

  // 外套
  'brown-blazer':
    'Substitute the upper body garment with a taupe brown oversized single-breasted blazer with notch lapels, one button and flap pockets, buttoned closed.',
  'taupe-coat':
    'Substitute the upper body garment with a taupe double-breasted wool coat with notch lapels, six dark buttons and flap pockets, mid-thigh length, buttoned closed.',
  'black-cardigan':
    'Substitute the upper body garment with a black fine-knit V-neck cardigan with gold buttons, long sleeves, ribbed cuffs and a ribbed hem, buttoned closed.',
  'denim-jacket':
    'Substitute the upper body garment with a light blue wash denim trucker jacket with a pointed collar, two button-flap chest pockets and long sleeves, buttoned closed.',

  // 鞋履
  'white-sneakers':
    'Substitute the footwear with white low-top leather sneakers with white laces and a thick flat rubber sole.',
  'black-pumps':
    'Substitute the footwear with black pointed-toe pumps with thin high stiletto heels.',
  'strappy-heels':
    'Substitute the footwear with black strappy high-heel sandals with a thin toe strap, an ankle strap and stiletto heels.',

  // 包包
  'brown-tote':
    'Add a brown smooth leather tote bag with a long shoulder strap, carried on the shoulder, to the outfit.',
  'black-handbag':
    'Add a black structured leather handbag with two rounded top handles, carried in the hand, to the outfit.',

  // 配饰
  'gold-hoops':
    'Add a pair of chunky gold hoop earrings with a textured organic shape to the outfit.',
};
