"""
Dive ON 로고 일괄 생성기 (라이트/다크 모드 분리)

원본:
  ./검정로고.png   — 검은 배경 + 흰 디자인 → 다크 모드용
  ./흰색로고.png   — 흰/투명 배경 + 검은 디자인 → 라이트 모드용

라이트 모드 (밝은 배경) → 검은 디자인이 또렷 → 흰색로고.png 사용
다크 모드 (어두운 배경) → 흰 디자인이 또렷 → 검정로고.png 사용

대상:
  public/logo-full-official.png   (라이트 모드 src)  ← 흰색로고.png
  public/logo-full.png            (다크 모드 src)    ← 검정로고.png
  public/logo-dolphin-official.png + 기타 4종       ← 모드별 동일 파생
  PWA icons (icon-*.webp), iOS AppIcon, Android mipmap (라이트 기본)
"""

from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_LIGHT = os.path.join(ROOT, "흰색로고.png")  # 검은 디자인, 라이트용
SRC_DARK = os.path.join(ROOT, "검정로고.png")    # 흰 디자인, 다크용
WEB = os.path.join(ROOT, "nos-divers-web")


def load_square(path: str) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def make_circle_alpha(img: Image.Image) -> Image.Image:
    """원 외곽을 투명 처리 (안티앨리어싱)."""
    size = img.size[0]
    scale = 4
    big = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(big).ellipse(
        (0, 0, size * scale - 1, size * scale - 1),
        fill=255,
    )
    mask = big.resize((size, size), Image.LANCZOS)
    out = img.copy()
    # 기존 알파와 AND
    if "A" in out.getbands():
        existing = out.split()[3]
        from PIL import ImageChops
        combined = ImageChops.multiply(existing, mask)
        out.putalpha(combined)
    else:
        out.putalpha(mask)
    return out


print(f"라이트용 source: {SRC_LIGHT}")
print(f"다크용 source: {SRC_DARK}")
light = make_circle_alpha(load_square(SRC_LIGHT))
dark = make_circle_alpha(load_square(SRC_DARK))
print(f"라이트 size: {light.size}, 다크 size: {dark.size}")


def save_png(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = img.resize((size, size), Image.LANCZOS)
    out.save(path, "PNG")
    print(f"  PNG  {size:>5}x{size:<5} -> {os.path.relpath(path, ROOT)}")


def save_webp(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = img.resize((size, size), Image.LANCZOS)
    out.save(path, "WEBP", quality=92)
    print(f"  WEBP {size:>5}x{size:<5} -> {os.path.relpath(path, ROOT)}")


# ─── 1) public/logo-*.png ───
# Login.tsx / TourList 의 분기:
#   isDark ? "/logo-full.png" : "/logo-full-official.png"
print("\n[1] public logos (라이트=흰색로고, 다크=검정로고)")
public_dir = os.path.join(WEB, "public")
# 라이트 모드 변형 (검은 디자인)
for name in [
    "logo-full-official.png",
    "logo-dolphin-official.png",
    "logo-text.png",
]:
    save_png(light, os.path.join(public_dir, name), 1024)
# 다크 모드 변형 (흰 디자인)
for name in [
    "logo-full.png",
    "logo-dolphin.png",
    "logo-full-white.png",
]:
    save_png(dark, os.path.join(public_dir, name), 1024)

# ─── 2) PWA icons (라이트 기본 — 다크 OS 도 동일 아이콘 사용) ───
print("\n[2] PWA icons")
for size in [48, 72, 96, 128, 192, 256, 512]:
    save_webp(light, os.path.join(WEB, "icons", f"icon-{size}.webp"), size)

# ─── 3) Capacitor resources (라이트 기본) ───
print("\n[3] Capacitor resources")
save_png(light, os.path.join(WEB, "resources", "icon.png"), 1024)
save_png(light, os.path.join(WEB, "resources", "icon-foreground.png"), 1024)

# splash: 흰 배경 + 라이트 로고
splash_size = 2732
splash_bg = Image.new("RGBA", (splash_size, splash_size), (255, 255, 255, 255))
logo_size = 800
logo_for_splash = light.resize((logo_size, logo_size), Image.LANCZOS)
splash_bg.paste(logo_for_splash, ((splash_size - logo_size) // 2, (splash_size - logo_size) // 2), logo_for_splash)
splash_bg.save(os.path.join(WEB, "resources", "splash.png"), "PNG")
print(f"  splash 2732x2732 -> resources/splash.png")

# ─── 4) iOS AppIcon (불투명, 흰 배경 합성) ───
print("\n[4] iOS AppIcon")
ios_dir = os.path.join(WEB, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset")
ios_icons = {
    "AppIcon-60@2x.png": 120,
    "AppIcon-60@3x.png": 180,
    "AppIcon-76@2x.png": 152,
    "AppIcon-83.5@2x.png": 167,
    "AppIcon-512@2x.png": 1024,
}
ios_bg = Image.new("RGB", light.size, (255, 255, 255))
ios_bg.paste(light, mask=light.split()[3])
for fname, size in ios_icons.items():
    out = ios_bg.resize((size, size), Image.LANCZOS)
    out.save(os.path.join(ios_dir, fname), "PNG")
    print(f"  PNG  {size:>5}x{size:<5} -> {fname}")

# ─── 4b) iOS Splash (light/dark) ───
print("\n[4b] iOS Splash")
ios_splash_dir = os.path.join(WEB, "ios", "App", "App", "Assets.xcassets", "Splash.imageset")
splash_files = [
    ("Default@1x~universal~anyany.png", (255, 255, 255, 255), light),
    ("Default@2x~universal~anyany.png", (255, 255, 255, 255), light),
    ("Default@3x~universal~anyany.png", (255, 255, 255, 255), light),
    ("Default@1x~universal~anyany-dark.png", (13, 17, 23, 255), dark),
    ("Default@2x~universal~anyany-dark.png", (13, 17, 23, 255), dark),
    ("Default@3x~universal~anyany-dark.png", (13, 17, 23, 255), dark),
    ("splash-2732x2732.png", (255, 255, 255, 255), light),
    ("splash-2732x2732-1.png", (255, 255, 255, 255), light),
    ("splash-2732x2732-2.png", (255, 255, 255, 255), light),
]
for fname, bg, logo in splash_files:
    bg_img = Image.new("RGBA", (splash_size, splash_size), bg)
    pos = ((splash_size - logo_size) // 2, (splash_size - logo_size) // 2)
    inner = logo.resize((logo_size, logo_size), Image.LANCZOS)
    bg_img.paste(inner, pos, inner)
    bg_img.convert("RGB").save(os.path.join(ios_splash_dir, fname), "PNG")
    print(f"  splash {fname}")

# ─── 5) Android mipmap ───
print("\n[5] Android mipmap (라이트 기본 + 적응형 전경 투명)")
android_res = os.path.join(WEB, "android", "app", "src", "main", "res")
android_sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
    "mipmap-ldpi": 36,
}
android_bg = Image.new("RGB", light.size, (255, 255, 255))
android_bg.paste(light, mask=light.split()[3])

for folder, size in android_sizes.items():
    folder_path = os.path.join(android_res, folder)
    if not os.path.isdir(folder_path):
        continue
    for name in ["ic_launcher.png", "ic_launcher_round.png"]:
        path = os.path.join(folder_path, name)
        if os.path.exists(path):
            out = android_bg.resize((size, size), Image.LANCZOS)
            out.save(path, "PNG")
            print(f"  {folder}/{name} ({size})")
    fg = os.path.join(folder_path, "ic_launcher_foreground.png")
    if os.path.exists(fg):
        fg_size = int(size * 1.5)
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        inner = int(fg_size * 0.55)
        inner_img = light.resize((inner, inner), Image.LANCZOS)
        fg_canvas.paste(inner_img, ((fg_size - inner) // 2, (fg_size - inner) // 2), inner_img)
        fg_canvas.save(fg, "PNG")
        print(f"  {folder}/ic_launcher_foreground.png ({fg_size})")
    bg = os.path.join(folder_path, "ic_launcher_background.png")
    if os.path.exists(bg):
        bg_img = Image.new("RGB", (size, size), (255, 255, 255))
        bg_img.save(bg, "PNG")
        print(f"  {folder}/ic_launcher_background.png ({size}) - white")

# ─── 6) favicon.svg (라이트 기준) ───
print("\n[6] favicon.svg (라이트=흰색로고 임베드)")
import base64
with open(SRC_LIGHT, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
favicon_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <image href="data:image/png;base64,{b64}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>
</svg>'''
with open(os.path.join(public_dir, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(favicon_svg)
print(f"  favicon.svg")

# ─── 7) DIVE ON LOGO 폴더에 정본 보관 ───
import shutil
dest_dir = os.path.join(ROOT, "DIVE ON LOGO")
os.makedirs(dest_dir, exist_ok=True)
shutil.copyfile(SRC_LIGHT, os.path.join(dest_dir, "diveon-logo-light.png"))
shutil.copyfile(SRC_DARK, os.path.join(dest_dir, "diveon-logo-dark.png"))
print(f"\n[7] DIVE ON LOGO 폴더 정본 복사 완료")

print("\n[완료]")
