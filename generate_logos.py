"""
Dive ON 로고 일괄 생성기.

원본: ./DIVE ON LOGO/diveon-logo.jpg
대상: PWA, web 화면, iOS AppIcon, Android mipmap_*launcher
"""

from PIL import Image, ImageDraw
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(ROOT, "DIVE ON LOGO", "diveon-logo.jpg")
WEB = os.path.join(ROOT, "nos-divers-web")

print(f"source: {SOURCE}")
src = Image.open(SOURCE).convert("RGBA")
print(f"original size: {src.size}")

# 정사각형으로 자르기
w, h = src.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
square = src.crop((left, top, left + side, top + side))


def make_transparent_circle(img: Image.Image) -> Image.Image:
    """
    원형 외곽의 흰 배경을 투명 처리.
    내부 흰색 텍스트는 보존되도록 원 마스크만 적용.
    """
    size = img.size[0]  # 정사각형 가정
    # 원형 마스크: 정확한 안티앨리어싱을 위해 4배 해상도로 그린 뒤 다운샘플
    scale = 4
    big = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(big).ellipse(
        (0, 0, size * scale - 1, size * scale - 1),
        fill=255,
    )
    mask = big.resize((size, size), Image.LANCZOS)

    out = img.copy()
    out.putalpha(mask)
    return out


# 모든 출력에 사용할 투명 원형 로고
square = make_transparent_circle(square)
print("background: 원형 외곽 투명 처리 완료")


def save_png(img, path, size):
    """size×size 로 리샘플 후 저장."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = img.resize((size, size), Image.LANCZOS)
    out.save(path, "PNG")
    print(f"  PNG  {size:>5}x{size:<5} → {path}")


def save_webp(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = img.resize((size, size), Image.LANCZOS)
    out.save(path, "WEBP", quality=90)
    print(f"  WEBP {size:>5}x{size:<5} → {path}")


def save_jpg(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = img.convert("RGB").resize((size, size), Image.LANCZOS)
    out.save(path, "JPEG", quality=92)
    print(f"  JPG  {size:>5}x{size:<5} → {path}")


# ─── 1) public/logo-*.png ───
print("\n[1] public logos")
public_dir = os.path.join(WEB, "public")
for name in [
    "logo-dolphin.png",
    "logo-dolphin-official.png",
    "logo-full.png",
    "logo-full-official.png",
    "logo-full-white.png",
    "logo-text.png",
]:
    save_png(square, os.path.join(public_dir, name), 1024)

# ─── 2) icons/icon-*.webp (PWA) ───
print("\n[2] PWA icons (icons/icon-*.webp)")
for size in [48, 72, 96, 128, 192, 256, 512]:
    save_webp(square, os.path.join(WEB, "icons", f"icon-{size}.webp"), size)

# ─── 3) resources/ (Capacitor source) ───
print("\n[3] Capacitor resources")
save_png(square, os.path.join(WEB, "resources", "icon.png"), 1024)
save_png(square, os.path.join(WEB, "resources", "icon-foreground.png"), 1024)
# splash 는 흰 배경 위 가운데 배치 (2732x2732)
splash_size = 2732
splash_bg = Image.new("RGBA", (splash_size, splash_size), (255, 255, 255, 255))
logo_size = 800
logo_resized = square.resize((logo_size, logo_size), Image.LANCZOS)
splash_bg.paste(logo_resized, ((splash_size - logo_size) // 2, (splash_size - logo_size) // 2), logo_resized)
splash_bg.save(os.path.join(WEB, "resources", "splash.png"), "PNG")
print(f"  splash 2732x2732 → resources/splash.png")

# ─── 4) iOS AppIcon ───
print("\n[4] iOS AppIcon")
ios_dir = os.path.join(WEB, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset")
ios_icons = {
    "AppIcon-60@2x.png": 120,
    "AppIcon-60@3x.png": 180,
    "AppIcon-76@2x.png": 152,
    "AppIcon-83.5@2x.png": 167,
    "AppIcon-512@2x.png": 1024,
}
# iOS 는 RGB(불투명) 권장 — 흰 배경 합성
ios_bg = Image.new("RGB", square.size, (255, 255, 255))
ios_bg.paste(square, mask=square.split()[3])
for fname, size in ios_icons.items():
    out = ios_bg.resize((size, size), Image.LANCZOS)
    out_path = os.path.join(ios_dir, fname)
    out.save(out_path, "PNG")
    print(f"  PNG  {size:>5}x{size:<5} → {fname}")

# iOS Splash imageset — 흰 배경 가운데 로고 배치
print("\n[4b] iOS Splash")
ios_splash_dir = os.path.join(WEB, "ios", "App", "App", "Assets.xcassets", "Splash.imageset")
splash_files = [
    ("Default@1x~universal~anyany.png", 2732, (255, 255, 255, 255)),
    ("Default@2x~universal~anyany.png", 2732, (255, 255, 255, 255)),
    ("Default@3x~universal~anyany.png", 2732, (255, 255, 255, 255)),
    ("Default@1x~universal~anyany-dark.png", 2732, (13, 17, 23, 255)),
    ("Default@2x~universal~anyany-dark.png", 2732, (13, 17, 23, 255)),
    ("Default@3x~universal~anyany-dark.png", 2732, (13, 17, 23, 255)),
    ("splash-2732x2732.png", 2732, (255, 255, 255, 255)),
    ("splash-2732x2732-1.png", 2732, (255, 255, 255, 255)),
    ("splash-2732x2732-2.png", 2732, (255, 255, 255, 255)),
]
logo_for_splash = square.resize((800, 800), Image.LANCZOS)
for fname, size, bg in splash_files:
    bg_img = Image.new("RGBA", (size, size), bg)
    pos = ((size - 800) // 2, (size - 800) // 2)
    bg_img.paste(logo_for_splash, pos, logo_for_splash)
    bg_img.convert("RGB").save(os.path.join(ios_splash_dir, fname), "PNG")
    print(f"  splash {fname}")

# ─── 5) Android mipmap (ic_launcher*) ───
print("\n[5] Android mipmap")
android_res = os.path.join(WEB, "android", "app", "src", "main", "res")
android_sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
    "mipmap-ldpi": 36,
}
# Android: 흰색 배경 합성 (투명 영역 처리)
android_bg = Image.new("RGB", square.size, (255, 255, 255))
android_bg.paste(square, mask=square.split()[3])

# foreground 는 투명 배경 유지 (적응형 아이콘 전경)
for folder, size in android_sizes.items():
    folder_path = os.path.join(android_res, folder)
    if not os.path.isdir(folder_path):
        continue
    # ic_launcher.png, ic_launcher_round.png — 불투명 흰 배경
    for name in ["ic_launcher.png", "ic_launcher_round.png"]:
        path = os.path.join(folder_path, name)
        if os.path.exists(path):
            out = android_bg.resize((size, size), Image.LANCZOS)
            out.save(path, "PNG")
            print(f"  {folder}/{name} ({size})")
    # ic_launcher_foreground.png — 투명 PNG (적응형)
    fg = os.path.join(folder_path, "ic_launcher_foreground.png")
    if os.path.exists(fg):
        # 적응형 아이콘은 108dp 영역 중 66dp 만 표시 → 약 60% 패딩
        fg_size = int(size * 1.5)
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        inner = int(fg_size * 0.55)
        inner_img = square.resize((inner, inner), Image.LANCZOS)
        fg_canvas.paste(inner_img, ((fg_size - inner) // 2, (fg_size - inner) // 2), inner_img)
        fg_canvas.save(fg, "PNG")
        print(f"  {folder}/ic_launcher_foreground.png ({fg_size})")
    # 배경은 흰색 단색
    bg = os.path.join(folder_path, "ic_launcher_background.png")
    if os.path.exists(bg):
        bg_img = Image.new("RGB", (size, size), (255, 255, 255))
        bg_img.save(bg, "PNG")
        print(f"  {folder}/ic_launcher_background.png ({size}) - white")

# ─── 6) favicon.svg → png 임베드 SVG 로 교체 ───
print("\n[6] favicon.svg")
import base64
with open(SOURCE, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
favicon_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <image href="data:image/jpeg;base64,{b64}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>
</svg>'''
with open(os.path.join(public_dir, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(favicon_svg)
print(f"  favicon.svg (embed)")

print("\n✅ 완료")
