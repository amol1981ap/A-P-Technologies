#!/usr/bin/env python3
"""Makes a print-ready business card (front and back, 90 x 54 mm + 3 mm bleed) with a QR code to a digital card page.

Example:
  python3 scripts/make_business_card.py --name "Mohsin Jamadar" --title "Marketing Director" \
      --phone "+91 81808 21364" --email support@aptechno.biz \
      --url "https://ap-technologies-henna.vercel.app/card-mohsin-jamadar.html?utm_source=qr&utm_campaign=card-mohsin" \
      --out docs/business-card-mohsin
Needs: pip install pillow qrcode opencv-python-headless
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode, cv2, numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--name', required=True); ap.add_argument('--title', required=True)
ap.add_argument('--phone', required=True); ap.add_argument('--email', required=True)
ap.add_argument('--url', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args()

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
F = R + 'app/node_modules/@expo-google-fonts/'
def font(n, pt):
    p = {'b': F+'inter/700Bold/Inter_700Bold.ttf', 's': F+'inter/600SemiBold/Inter_600SemiBold.ttf',
         'r': F+'inter/400Regular/Inter_400Regular.ttf', 'serif': F+'source-serif-4/600SemiBold/SourceSerif4_600SemiBold.ttf'}[n]
    return ImageFont.truetype(p, int(round(pt*300/72)))
DPI = 300; mm = lambda v: int(round(v*DPI/25.4))
W, H = mm(96), mm(60)
DARK=(35,31,32); GOLD=(217,176,75); GREY=(110,110,110); SILVER=(190,190,190)
logo = Image.open(R+'docs/assets-ap-logo-1024.png').convert('RGBA')
os.makedirs(R+a.out, exist_ok=True)

q = qrcode.QRCode(border=2, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_Q); q.add_data(a.url); q.make(fit=True)
QS = mm(29)
qimg = q.make_image(fill_color='black', back_color='white').convert('RGB').resize((QS, QS), Image.NEAREST)

def centered(d, text, y, f, fill, cx, spacing=0):
    if spacing:
        w = sum(d.textlength(c, font=f) for c in text) + spacing*(len(text)-1); x = cx - w/2
        for c in text: d.text((x, y), c, font=f, fill=fill); x += d.textlength(c, font=f) + spacing
    else: d.text((cx - d.textlength(text, font=f)/2, y), text, font=f, fill=fill)

# name size shrinks if the name is long, so it never runs into the QR code
nm = 20
while ImageDraw.Draw(Image.new('RGB',(1,1))).textlength(a.name, font=font('serif', nm)) > mm(43) and nm > 13: nm -= 1

A = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(A); L = mm(10)
d.rectangle((0, 0, mm(3.2), H), fill=GOLD)
d.text((L, mm(12)), a.name, font=font('serif', nm), fill=DARK)
d.text((L, mm(21.5)), a.title.upper(), font=font('s', 7.5), fill=(150,115,30))
d.text((L, mm(26)), 'A P Technologies  |  GFRP Rebars', font=font('r', 8), fill=DARK)
y = mm(35)
for lab, val in [('Call / WhatsApp', a.phone), ('Email', a.email)]:
    d.text((L, y), lab.upper(), font=font('s', 5.5), fill=GREY); y += mm(2.7)
    d.text((L, y), val, font=font('s', 8.5), fill=DARK); y += mm(5.2)
qx = W - mm(8.5) - QS; qy = mm(14)
A.paste(qimg, (qx, qy))
centered(d, 'Scan for our products', qy+QS+mm(0.6), font('s', 5.8), DARK, qx+QS/2)
centered(d, 'and my contact', qy+QS+mm(3), font('s', 5.8), DARK, qx+QS/2)

B = Image.new('RGB', (W, H), DARK); d = ImageDraw.Draw(B)
lg = logo.resize((mm(22), mm(22)), Image.LANCZOS); B.paste(lg, ((W-mm(22))//2, mm(7)), lg)
centered(d, 'A P TECHNOLOGIES', mm(31), font('b', 12.5), GOLD, W/2, spacing=mm(0.5))
centered(d, 'Technology & Innovations', mm(37), font('r', 7.5), SILVER, W/2)
d.line((W/2-mm(9), mm(41.6), W/2+mm(9), mm(41.6)), fill=GOLD, width=2)
centered(d, 'GFRP rebars: ribbed, sand-coated, bent-up', mm(43), font('s', 6), (225,225,225), W/2)
centered(d, 'Works: A/p. Mangaon, Tal. Hatkanangale, Dist. Kolhapur 416118', mm(46.4), font('r', 6), SILVER, W/2)
centered(d, 'Office: A708, Anantpuram Residence, Bapat Camp, Kolhapur 416005', mm(49), font('r', 6), SILVER, W/2)
centered(d, 'GSTIN 27APNPP5286R1ZN', mm(51.6), font('r', 5.5), (150,150,150), W/2)

o = R + a.out + '/'
A.save(o+'business-card-print.pdf', save_all=True, append_images=[B], resolution=DPI)
for im, n in [(A,'front'), (B,'back')]:
    im.crop((mm(3), mm(3), W-mm(3), H-mm(3))).save(o+f'preview-{n}.png', dpi=(DPI, DPI))
q2 = qrcode.QRCode(border=4, box_size=20, error_correction=qrcode.constants.ERROR_CORRECT_Q); q2.add_data(a.url); q2.make(fit=True)
q2.make_image(fill_color='black', back_color='white').convert('RGB').save(o+'qr-digital-card-page.png')

det = cv2.QRCodeDetector()
crop = A.crop((qx-mm(3), qy-mm(3), qx+QS+mm(3), qy+QS+mm(3)))
res = []
for s in (1.0, 0.5, 0.4):
    im = crop.resize((int(crop.width*s), int(crop.height*s)), Image.LANCZOS)
    res.append((s, det.detectAndDecode(np.array(im.convert('RGB'))[:, :, ::-1])[0] == a.url))
im = crop.resize((int(crop.width*0.5), int(crop.height*0.5)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
res.append(('half + blur', det.detectAndDecode(np.array(im.convert('RGB'))[:, :, ::-1])[0] == a.url))
print('QR version', q.version, 'name pt', nm, 'scan tests', res)
