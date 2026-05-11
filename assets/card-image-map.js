window.CARD_IMAGE_MAP = {
  "amethyst-heart":     "./assets/cards/1amethyst-heart.png",
  "celestial-potion":   "./assets/cards/2celestial-potion.png",
  "silver-shopping-bag":"./assets/cards/3silver-shopping-bag.png",
  "terquois-cushion":   "./assets/cards/4terquois-cushion.png",
  "sapphire-paw":       "./assets/cards/5sapphire-paw.png",
  "fuchsia-ribbon":     "./assets/cards/6fuchsia-ribbon.png",
  "jeweled-keyhole":    "./assets/cards/7jeweled-keyhole.png",
  "golden-paw":         "./assets/cards/8golden-paw.png",
  "pinkruby-pufferfish":"./assets/cards/9pinkruby-pufferfish.png",
  "crystal-ball":       "./assets/cards/10crystal-ball.png",
  "indigo-bowtie":      "./assets/cards/11indigo-bowtie.png",
  "royal-cat-bed":      "./assets/cards/12royal-cat-bed.png",
  "zio":                "./assets/cards/13zio.png",
  "ziawink":            "./assets/cards/14ziawink.png"
};
window.CARD_ORDER = [
  "amethyst-heart","celestial-potion","silver-shopping-bag","terquois-cushion",
  "sapphire-paw","fuchsia-ribbon","jeweled-keyhole","golden-paw",
  "pinkruby-pufferfish","crystal-ball","indigo-bowtie","royal-cat-bed",
  "zio","ziawink"
];
window.cardImgSrc = function(key){
  return (window.CARD_IMAGE_MAP && window.CARD_IMAGE_MAP[key]) || "./assets/cards/8golden-paw.png";
};
