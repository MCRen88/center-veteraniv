from playwright.sync_api import sync_playwright
import pathlib
d = pathlib.Path(__file__).parent
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':1400,'height':900})
    pg.goto((d/'index.html').as_uri(), wait_until='networkidle')
    pg.evaluate('document.fonts.ready')
    pg.wait_for_timeout(2000)
    pg.pdf(path=str(d/'booklet.pdf'), prefer_css_page_size=True, print_background=True)
    b.close()
