"""Build the illustrative PDF used by the FORMA Club static demo (reportlab)."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
pdfmetrics.registerFont(TTFont('FormaSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('FormaBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'assets'/'Scheda_esempio_FORMA_Club.pdf'
c=canvas.Canvas(str(p),pagesize=A4);w,h=A4
c.setTitle('FORMA Club - Scheda di esempio');c.setAuthor('FORMA Club - Demo')
ink=HexColor('#191c19');lime=HexColor('#c5ed59');gray=HexColor('#686d63')
c.setFillColor(ink);c.rect(0,h-150,w,150,fill=1,stroke=0)
c.setFillColor(lime);c.setFont('FormaBold',12);c.drawString(43,h-44,'FORMA CLUB / IL TUO PROGRAMMA')
c.setFillColor(HexColor('#ffffff'));c.setFont('FormaBold',24);c.drawString(43,h-88,'Una direzione, ogni sessione.')
c.setFont('FormaSans',10);c.drawString(43,h-115,'ESEMPIO ILLUSTRATIVO - NON PERSONALIZZATO')
c.setFillColor(ink);c.setFont('FormaBold',16);c.drawString(43,h-195,'Giorno A / Esempio di sessione')
c.setFont('FormaSans',10);c.setFillColor(gray)
for i,line in enumerate(['Questo PDF mostra soltanto il formato del servizio FORMA Club.', 'Non e\u0300 un programma costruito sulle tue risposte al questionario.', 'Esercizi, carichi e progressioni vanno definiti con il professionista.']):
 c.drawString(43,h-220-i*17,line.replace('e\u0300','è'))
y=h-305
c.setFillColor(HexColor('#eceee5'));c.rect(43,y-4,w-86,30,fill=1,stroke=0)
c.setFillColor(ink);c.setFont('FormaBold',9)
for x,t in [(54,'ESERCIZIO'),(326,'SERIE x RIP.'),(431,'RECUPERO')]:c.drawString(x,y+7,t)
rows=[('01  Squat con manubrio','3 x 10','90 secondi'),('02  Spinte su panca','3 x 10','90 secondi'),('03  Rematore con manubrio','3 x 12','75 secondi')]
for i,row in enumerate(rows):
 yy=y-40-i*48;c.setFillColor(ink);c.setFont('FormaSans',10)
 for x,t in zip([54,326,431],row):c.drawString(x,yy,t)
 c.setStrokeColor(HexColor('#dedfd7'));c.line(43,yy-17,w-43,yy-17)
y=h-535;c.setFillColor(ink);c.setFont('FormaBold',14);c.drawString(43,y,'Lo spazio per il confronto')
c.setFont('FormaSans',10);c.setFillColor(gray)
for i,t in enumerate(['Nella scheda reale troverai le indicazioni definite dal coach:', 'distribuzione delle giornate, tecnica, carichi e progressioni.', 'Per chiarimenti e aggiornamenti userai la tua area personale.']):c.drawString(43,y-25-i*17,t)
c.setStrokeColor(HexColor('#dedfd7'));c.line(43,100,w-43,100)
c.setFont('FormaSans',8);c.drawString(43,79,'Concept dimostrativo - Nessun percorso professionale attivato')
c.drawRightString(w-43,79,'FORMA Club / 01');c.save()
print(p)
