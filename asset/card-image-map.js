window.CARD_IMAGE_MAP = {
  "amethyst-heart":      "./asset/cards/amethyst-heart.png",
  "celestial-potion":    "./asset/cards/celestial-potion.png",
  "crystal-ball":        "./asset/cards/crystal-ball.png",
  "fuchsia-ribbon":      "./asset/cards/fuchsia-ribbon.png",
  "golden-paw":          "./asset/cards/golden-paw.png",
  "indigo-bowtie":       "./asset/cards/indigo-bowtie.png",
  "jeweled-key":         "./asset/cards/jeweled-key.png",
  "mistic-yarn":         "./asset/cards/mistic-yarn.png",
  "rose-pufferfish":     "./asset/cards/rose-pufferfish.png",
  "royal-cat-bed":       "./asset/cards/royal-cat-bed.png",
  "sapphire-paw":        "./asset/cards/sapphire-paw.png",
  "silver-bag":          "./asset/cards/silver-bag.png",
  "starry-mic":          "./asset/cards/starry-mic.png",
  "turquoise-cushion":   "./asset/cards/turquoise-cushion.png"
};
window.CARD_ORDER = ["amethyst-heart","celestial-potion","crystal-ball","fuchsia-ribbon","golden-paw","indigo-bowtie","jeweled-key","mistic-yarn","rose-pufferfish","royal-cat-bed","sapphire-paw","silver-bag","starry-mic","turquoise-cushion"];
window.cardImgSrc = function(key){return (window.CARD_IMAGE_MAP && window.CARD_IMAGE_MAP[key]) || "./asset/cards/golden-paw.png";};
