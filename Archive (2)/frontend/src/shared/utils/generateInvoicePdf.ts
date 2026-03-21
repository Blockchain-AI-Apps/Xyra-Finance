import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface InvoicePdfData {
    invoiceHash: string;
    amount: number;
    tokenType: number;
    invoiceType: number;
    walletType: number;
    status: string;
    memo?: string;
    creationTx?: string;
    paymentTxIds?: string[];
    items?: InvoiceItem[];
    donations?: { credits: number; usdcx: number; usad: number };
}

const TOKEN_LABELS: Record<number, string> = { 0: 'Credits', 1: 'USDCx', 2: 'USAD' };
const TYPE_LABELS: Record<number, string> = { 0: 'Standard', 1: 'Multi-Pay', 2: 'Donation' };
const WALLET_LABELS: Record<number, string> = { 0: 'Main Wallet', 1: 'Burner Wallet' };

const NEON: [number, number, number] = [0, 243, 255];
const DARK_BG: [number, number, number] = [12, 12, 20];
const CARD_BG: [number, number, number] = [22, 22, 34];
const TEXT_WHITE: [number, number, number] = [240, 240, 245];
const TEXT_GRAY: [number, number, number] = [140, 140, 160];
const ACCENT_GREEN: [number, number, number] = [34, 197, 94];

function loadLogoAsBase64(): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Resize to small thumbnail to keep PDF under 100KB
            const MAX = 120;
            const scale = Math.min(MAX / img.width, MAX / img.height, 1);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
                resolve('');
            }
        };
        img.onerror = () => resolve('');
        img.src = '/assets/nullpay_logo.png';
    });
}

export async function generateInvoicePdf(invoice: InvoicePdfData): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // ─── Dark background ───
    doc.setFillColor(...DARK_BG);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

    // ─── Header band ───
    doc.setFillColor(...CARD_BG);
    doc.roundedRect(margin, y, contentWidth, 38, 4, 4, 'F');

    // Logo
    try {
        const logoBase64 = await loadLogoAsBase64();
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', margin + 6, y + 4, 30, 30);
        }
    } catch { /* logo optional */ }

    // Brand text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...TEXT_WHITE);
    doc.text('NullPay', margin + 42, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_GRAY);
    doc.text('Privacy-First Payments on Aleo', margin + 42, y + 24);

    // Invoice label on right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NEON);
    doc.text('INVOICE', pageWidth - margin - 6, y + 16, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_GRAY);
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin - 6, y + 23, { align: 'right' });

    y += 46;

    // ─── Invoice Details Card ───
    doc.setFillColor(...CARD_BG);
    doc.roundedRect(margin, y, contentWidth, 52, 4, 4, 'F');

    const detailsLeft = margin + 8;
    const detailsRight = pageWidth / 2 + 8;
    const labelY = y + 12;
    const lineH = 14;

    const PENDING_COLOR: [number, number, number] = [250, 204, 21];

    const drawDetail = (x: number, rowY: number, label: string, value: string, valueColor: [number, number, number] = TEXT_WHITE) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...TEXT_GRAY);
        doc.text(label.toUpperCase(), x, rowY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...valueColor);
        doc.text(value, x, rowY + 5.5);
    };

    // Row 1
    drawDetail(detailsLeft, labelY, 'Invoice Hash', `${invoice.invoiceHash.slice(0, 16)}...${invoice.invoiceHash.slice(-8)}`);
    drawDetail(detailsRight, labelY, 'Status', invoice.status, invoice.status === 'SETTLED' ? ACCENT_GREEN : PENDING_COLOR);

    // Row 2
    drawDetail(detailsLeft, labelY + lineH, 'Type', TYPE_LABELS[invoice.invoiceType] || 'Standard');
    drawDetail(detailsRight, labelY + lineH, 'Token', TOKEN_LABELS[invoice.tokenType] || 'Credits');

    // Row 3
    drawDetail(detailsLeft, labelY + lineH * 2, 'Wallet', WALLET_LABELS[invoice.walletType] || 'Main');
    if (invoice.memo) {
        drawDetail(detailsRight, labelY + lineH * 2, 'Memo', invoice.memo.length > 30 ? invoice.memo.slice(0, 30) + '...' : invoice.memo);
    }

    y += 60;

    // ─── Line Items Table (Standard invoices only) ───
    if (invoice.items && invoice.items.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...TEXT_WHITE);
        doc.text('Line Items', margin, y + 4);
        y += 8;

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Item', 'Qty', 'Unit Price', 'Total']],
            body: invoice.items.map(item => [
                item.name || 'Unnamed',
                item.quantity.toString(),
                item.unitPrice.toFixed(2),
                item.total.toFixed(2)
            ]),
            foot: [['', '', 'TOTAL', invoice.items.reduce((sum, i) => sum + i.total, 0).toFixed(2)]],
            theme: 'plain',
            styles: {
                fillColor: CARD_BG as [number, number, number],
                textColor: TEXT_WHITE as [number, number, number],
                fontSize: 9,
                cellPadding: 4,
                lineColor: [40, 40, 55] as [number, number, number],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [30, 30, 48] as [number, number, number],
                textColor: NEON as [number, number, number],
                fontStyle: 'bold',
                fontSize: 8,
            },
            footStyles: {
                fillColor: [18, 35, 40] as [number, number, number],
                textColor: NEON as [number, number, number],
                fontStyle: 'bold',
                fontSize: 10,
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 },
            },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ─── Amount Card ───
    doc.setFillColor(18, 35, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_GRAY);

    if (invoice.invoiceType === 2 && invoice.donations) {
        // Donation invoice: show per-token breakdown
        const donLines: string[] = [];
        if (invoice.donations.credits > 0) donLines.push(`${invoice.donations.credits} Credits`);
        if (invoice.donations.usdcx > 0) donLines.push(`${invoice.donations.usdcx} USDCx`);
        if (invoice.donations.usad > 0) donLines.push(`${invoice.donations.usad} USAD`);
        const cardH = Math.max(22, 14 + donLines.length * 8);
        doc.roundedRect(margin, y, contentWidth, cardH, 4, 4, 'F');
        doc.text('TOTAL DONATIONS RECEIVED', margin + 8, y + 9);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...NEON);
        if (donLines.length > 0) {
            donLines.forEach((line, idx) => {
                doc.text(line, pageWidth - margin - 8, y + 10 + idx * 8, { align: 'right' });
            });
        } else {
            doc.text('0', pageWidth - margin - 8, y + 15, { align: 'right' });
        }
        y += cardH + 8;
    } else {
        doc.roundedRect(margin, y, contentWidth, 22, 4, 4, 'F');
        doc.text('TOTAL AMOUNT', margin + 8, y + 9);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...NEON);
        const amountStr = `${invoice.amount} ${TOKEN_LABELS[invoice.tokenType] || 'Credits'}`;
        doc.text(amountStr, pageWidth - margin - 8, y + 15, { align: 'right' });
        y += 30;
    }

    // ─── Payment Transactions ───
    if (invoice.paymentTxIds && invoice.paymentTxIds.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...TEXT_WHITE);
        doc.text('Payment Transactions', margin, y + 4);
        y += 8;

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['#', 'Transaction ID']],
            body: invoice.paymentTxIds.map((txId, idx) => [
                (idx + 1).toString(),
                txId
            ]),
            theme: 'plain',
            styles: {
                fillColor: CARD_BG as [number, number, number],
                textColor: TEXT_WHITE as [number, number, number],
                fontSize: 8,
                cellPadding: 4,
                lineColor: [40, 40, 55] as [number, number, number],
                lineWidth: 0.2,
                font: 'courier',
            },
            headStyles: {
                fillColor: [30, 30, 48] as [number, number, number],
                textColor: ACCENT_GREEN as [number, number, number],
                fontStyle: 'bold',
                fontSize: 8,
                font: 'helvetica',
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 'auto' },
            },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ─── Creation Tx ───
    if (invoice.creationTx) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...TEXT_GRAY);
        doc.text('Creation Tx: ' + invoice.creationTx, margin, y + 4);
        y += 10;
    }

    // ─── Footer ───
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(40, 40, 55);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_GRAY);
    doc.text('Generated by NullPay — nullpay.app', margin, footerY);
    doc.text(`${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' });

    // ─── Save ───
    const hashPrefix = invoice.invoiceHash.slice(0, 10);
    doc.save(`NullPay_Invoice_${hashPrefix}.pdf`);
}
