window.CARD_IMAGE_MAP = {
  "golden-paw": "./assets/cards/golden-paw.png",
  "indigo-bowtie": "./assets/cards/indigo-bowtie.png",
  "fuchsia-ribbon": "./assets/cards/fuchsia-ribbon.png",
  "crystal-ball": "./assets/cards/crystal-ball.png",
  "royal-cat-bed": "./assets/cards/royal-cat-bed.png",
  "silver-bag": "./assets/cards/silver-bag.png",
  "celestial-potion": "./assets/cards/celestial-potion.png",
  "starry-mic": "./assets/cards/starry-mic.png",
  "amethyst-heart": "./assets/cards/amethyst-heart.png",
  "midnight-cushion": "./assets/cards/midnight-cushion.png",
  "sapphire-paw": "./assets/cards/sapphire-paw.png",
  "mystic-yarn": "./assets/cards/mystic-yarn.png",
  "jeweled-key": "./assets/cards/jeweled-key.png",
  "rose-crystal": "./assets/cards/rose-crystal.png"
};
window.CARD_ORDER = [
  "golden-paw","indigo-bowtie","fuchsia-ribbon","crystal-ball",
  "royal-cat-bed","silver-bag","celestial-potion","starry-mic",
  "amethyst-heart","midnight-cushion","sapphire-paw","mystic-yarn",
  "jeweled-key","rose-crystal"
];
window.cardImgSrc = function(key){
  return (window.CARD_IMAGE_MAP && window.CARD_IMAGE_MAP[key]) || "./assets/cards/card-backup.png";
};
