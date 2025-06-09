import json
import os
from dataclasses import dataclass
from typing import List

import pandas as pd
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
import cv2

@dataclass
class Guest:
    student: str
    parent1: str
    parent2: str
    extras: str
    table: str

    def to_json(self) -> str:
        return json.dumps(self.__dict__, ensure_ascii=False)


class QRManager:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.guests: List[Guest] = []

    def load_csv(self) -> None:
        df = pd.read_csv(self.csv_path)
        for _, row in df.iterrows():
            guest = Guest(
                student=str(row.get("Student", "")),
                parent1=str(row.get("Parent1", "")),
                parent2=str(row.get("Parent2", "")),
                extras=str(row.get("Extras", "")),
                table=str(row.get("Table", "")),
            )
            self.guests.append(guest)

    def generate_qrs(self, output_dir: str) -> None:
        os.makedirs(output_dir, exist_ok=True)
        for idx, guest in enumerate(self.guests, 1):
            qr = qrcode.make(guest.to_json())
            path = os.path.join(output_dir, f"guest_{idx}.png")
            qr.save(path)

    def create_pdf(self, qr_dir: str, pdf_path: str) -> None:
        c = canvas.Canvas(pdf_path, pagesize=A4)
        width, height = A4
        x, y = 20 * mm, height - 40 * mm
        for idx, guest in enumerate(self.guests, 1):
            img_path = os.path.join(qr_dir, f"guest_{idx}.png")
            if not os.path.exists(img_path):
                continue
            c.drawImage(img_path, x, y, 30 * mm, 30 * mm)
            c.drawString(x + 35 * mm, y + 20 * mm, guest.student)
            c.drawString(x + 35 * mm, y + 15 * mm, f"Mesa: {guest.table}")
            c.drawString(x + 35 * mm, y + 10 * mm, f"Extras: {guest.extras}")
            y -= 40 * mm
            if y < 40 * mm:
                c.showPage()
                y = height - 40 * mm
        c.save()

    @staticmethod
    def decode_qr(image_path: str) -> Guest:
        detector = cv2.QRCodeDetector()
        img = cv2.imread(image_path)
        if img is None:
            raise FileNotFoundError(image_path)
        data, _, _ = detector.detectAndDecode(img)
        if not data:
            raise ValueError("QR code not found or unreadable")
        info = json.loads(data)
        return Guest(**info)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="QR event manager")
    subparsers = parser.add_subparsers(dest="command")

    gen = subparsers.add_parser("generate", help="Generate QR codes and PDF from CSV")
    gen.add_argument("--csv", required=True, help="Path to csv file")
    gen.add_argument("--outdir", default="qrs", help="Directory to store QR images")
    gen.add_argument("--pdf", default="qrs.pdf", help="Output PDF file")

    scan = subparsers.add_parser("scan", help="Decode a QR code image")
    scan.add_argument("--image", required=True, help="Path to QR image")

    args = parser.parse_args()

    if args.command == "generate":
        mgr = QRManager(args.csv)
        mgr.load_csv()
        mgr.generate_qrs(args.outdir)
        mgr.create_pdf(args.outdir, args.pdf)
        print(f"QR codes saved to {args.outdir} and PDF {args.pdf} created")
    elif args.command == "scan":
        guest = QRManager.decode_qr(args.image)
        print(guest)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
