with open('index.html', 'r') as f:
    content = f.read()

new_header = '''<header class="bg-[#1b0b2f]/80 backdrop-blur-xl border-b border-[#cdbdff]/20 shadow-[0_4px_20px_rgba(255,215,0,0.15)] flex justify-between items-center px-6 h-16 w-full sticky top-0 z-50">
  <div class="flex items-center gap-2">
    <span class="material-symbols-outlined text-[#ffd700]" style="font-variation-settings:'FILL' 1;">pets</span>
    <span class="text-lg font-bold text-[#ffd700] tracking-wider">Perfect Paw Match</span>
  </div>
  <nav class="hidden md:flex gap-6 items-end">
    <span class="nav-link text-xs font-bold tracking-widest active" data-section="home" onclick="showSection('home')">HOME</span>
    <a class="text-xs text-[#d0c6ab] tracking-widest font-bold hover:text-[#ffd700]" href="game.html">LEVELS</a>
    <span class="nav-link text-xs text-[#d0c6ab] tracking-widest font-bold hover:text-[#ffd700]" data-section="collection" onclick="showSection('collection')">COLLECTION</span>
    <span class="nav-link text-xs text-[#d0c6ab] tracking-widest font-bold hover:text-[#ffd700]" data-section="shop" onclick="showSection('shop')">SHOP</span>
  </nav>
  <button class="md:hidden material-symbols-outlined text-[#ffd700] text-2xl" onclick="toggleMobileMenu()">menu</button>
</header>
<div id="mobileMenu" class="hidden md:hidden fixed top-16 left-0 right-0 bg-[#1b0b2f]/95 border-b border-[#cdbdff]/20 z-40">
  <nav class="flex flex-col gap-4 p-6">
    <span class="nav-link text-sm font-bold tracking-widest text-[#ffd700] cursor-pointer" data-section="home" onclick="showSection('home'); toggleMobileMenu()">HOME</span>
    <a class="text-sm text-[#d0c6ab] tracking-widest font-bold hover:text-[#ffd700]" href="game.html">LEVELS</a>
    <span class="nav-link text-sm text-[#d0c6ab] tracking-widest font-bold hover:text-[#ffd700] cursor-pointer" data-section="collection" onclick="showSection('collection'); toggleMobileMenu()">COLLECTION</span>
    <span class="nav-link text-sm text-[#d0c6ab] tracking-widest font-bold hover:text-[#ffd700] cursor-pointer" data-section="shop" onclick="showSection('shop'); toggleMobileMenu()">SHOP</span>
  </nav>
</div>
<script>
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('hidden');
}
</script>'''

import re
pattern = r'<header[^>]*>.*?</header>'
content = re.sub(pattern, new_header, content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(content)
print('done')
