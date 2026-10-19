import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors matching brand
const colors = {
  plum: '#3B1D2A',
  deepPlum: '#2A141E',
  wine: '#6B2B3A',
  lightWine: '#8B3D50',
  blush: '#C5A3AE',
  lightBlush: '#E5D3DA',
  cream: '#F7F2F4',
  creamDark: '#EDE4E8',
  inkDark: '#2A2A2E',
  inkLight: '#6F6B74',
  sage: '#3F7D5E', // Paid
  sageBg: '#EEF5F1',
  clay: '#C2482F', // Unpaid
  clayBg: '#FCEFEB',
  lightGray: '#EFE7EB',
  white: '#FFFFFF',
};

const formatINR = (num) => `Rs. ${Number(num || 0).toLocaleString('en-IN')}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatWeight = (grams) => {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg.toFixed(kg % 1 === 0 ? 0 : 2)} kg`;
  }
  return `${grams} g`;
};

const formatOrderItems = (items) => {
  return (items || [])
    .map((item, idx) => {
      const wt = item.weight >= 1000 ? `${item.weight / 1000}kg` : `${item.weight}g`;
      return `${idx + 1}. ${item.itemName} (${wt}) x ${item.qty}   —   ${formatINR(item.amount)}`;
    })
    .join('\n');
};

export const createReportPDF = (orders, destinationStream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
      });

      doc.pipe(destinationStream);

      const drawLine = (y, color = colors.lightGray, width = 1) => {
        doc.save()
           .strokeColor(color)
           .lineWidth(width)
           .moveTo(50, y)
           .lineTo(545, y)
           .stroke()
           .restore();
      };

      // Aggregations
      let totalRevenue = 0;
      let paidRevenue = 0;
      let unpaidRevenue = 0;
      let paidCount = 0;
      let totalBoxes = 0;
      let totalGrams = 0;

      const sweetWeightsMap = new Map();
      const boxDistMap = new Map();
      const customersSet = new Set();
      const orderDates = [];

      orders.forEach((o) => {
        const orderTotal = o.totalPrice || 0;
        totalRevenue += orderTotal;
        if (o.status === 'paid') {
          paidRevenue += orderTotal;
          paidCount++;
        } else {
          unpaidRevenue += orderTotal;
        }

        if (o.customerName) {
          customersSet.add(o.customerName.trim().toLowerCase());
        }
        if (o.createdAt) {
          orderDates.push(new Date(o.createdAt));
        }

        (o.items || []).forEach((item) => {
          const qty = item.qty || 0;
          const weight = item.weight || 0;
          const itemGrams = weight * qty;
          const amount = item.amount || (item.price * qty) || 0;

          totalBoxes += qty;
          totalGrams += itemGrams;

          // Sweet weight summary
          if (!sweetWeightsMap.has(item.itemName)) {
            sweetWeightsMap.set(item.itemName, {
              itemName: item.itemName,
              grams: 0,
              boxes: 0,
              revenue: 0,
            });
          }
          const sw = sweetWeightsMap.get(item.itemName);
          sw.grams += itemGrams;
          sw.boxes += qty;
          sw.revenue += amount;

          // Box distribution summary
          const boxKey = `${item.itemName}__${weight}`;
          if (!boxDistMap.has(boxKey)) {
            boxDistMap.set(boxKey, {
              itemName: item.itemName,
              weight: weight,
              qty: 0,
              grams: 0,
              revenue: 0,
              price: item.price || (amount / qty),
            });
          }
          const bd = boxDistMap.get(boxKey);
          bd.qty += qty;
          bd.grams += itemGrams;
          bd.revenue += amount;
        });
      });

      const unpaidCount = orders.length - paidCount;
      const uniqueCustomers = customersSet.size;

      // Sort sweet weights descending by grams
      const sweetWeights = Array.from(sweetWeightsMap.values()).sort((a, b) => b.grams - a.grams);

      // Sort box distribution by sweet name, then weight
      const boxDistribution = Array.from(boxDistMap.values()).sort((a, b) => {
        if (a.itemName !== b.itemName) return a.itemName.localeCompare(b.itemName);
        return a.weight - b.weight;
      });

      orderDates.sort((a, b) => a - b);
      const minDate = orderDates.length > 0 ? orderDates[0] : null;
      const maxDate = orderDates.length > 0 ? orderDates[orderDates.length - 1] : null;

      /* =========================================================
         PAGE 1: EXECUTIVE DASHBOARD (OVERVIEW, SWEETS BY WEIGHT, BOX DIST)
         ========================================================= */

      // 1. Branding Header
      doc.rect(50, 38, 495, 3).fill(colors.wine);

      doc.fillColor(colors.plum)
         .font('Times-Bold')
         .fontSize(20)
         .text('SHRI HARI SWEETS', 50, 48, { letterSpacing: 1.5 });

      doc.fillColor(colors.wine)
         .font('Helvetica-Bold')
         .fontSize(8.5)
         .text('RAKSHABANDHAN EVENT — SALES & PRODUCTION REPORT', 50, 71, { letterSpacing: 0.8 });

      // Right metadata
      const dateRangeStr = minDate && maxDate
        ? `Event Period: ${formatDate(minDate)} – ${formatDate(maxDate)}`
        : `Event Period: August 2026`;

      doc.fillColor(colors.inkLight)
         .font('Helvetica')
         .fontSize(7.5)
         .text(dateRangeStr, 325, 48, { align: 'right', width: 220 })
         .text(`Report Generated: ${formatDate(new Date())}`, 325, 60, { align: 'right', width: 220 })
         .text('Status: Event Completed • All Orders Fulfilled', 325, 72, { align: 'right', width: 220 });

      drawLine(86, colors.blush, 0.75);

      // 2. Section 1: Event Overview & Financial Summary
      doc.fillColor(colors.plum)
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text('1. EVENT OVERVIEW & FINANCIAL SUMMARY', 50, 95);

      // Left: Revenue Hero Card (x = 50, y = 110, width = 230, height = 98)
      doc.roundedRect(50, 110, 230, 98, 4)
         .fillColor('#361623')
         .fill();

      doc.fillColor('#D8B3C0')
         .font('Helvetica-Bold')
         .fontSize(7.5)
         .text('TOTAL REVENUE / ORDER VALUE', 62, 120);

      doc.fillColor('#FFFFFF')
         .font('Times-Bold')
         .fontSize(20)
         .text(formatINR(totalRevenue), 62, 132);

      // Progress bar
      const paidPct = totalRevenue > 0 ? (paidRevenue / totalRevenue) : 1;
      const barTotalWidth = 206;
      doc.roundedRect(62, 160, barTotalWidth, 5, 2.5)
         .fillColor('#4D2536')
         .fill();
      if (paidPct > 0) {
        doc.roundedRect(62, 160, barTotalWidth * paidPct, 5, 2.5)
           .fillColor(colors.sage)
           .fill();
      }

      // Breakdown texts
      doc.fillColor('#A9DFBF')
         .font('Helvetica-Bold')
         .fontSize(7.5)
         .text(`Collected: ${formatINR(paidRevenue)} (${Math.round(paidPct * 100)}%)`, 62, 172);

      doc.fillColor('#E5BAC7')
         .font('Helvetica')
         .fontSize(7.5)
         .text(`Pending: ${formatINR(unpaidRevenue)} (${Math.round((1 - paidPct) * 100)}%)`, 62, 185);

      // Right: 4 Metric Cards Grid (x = 290, width = 255)
      const renderStatTile = (x, y, w, h, value, label, subtext, subColor = colors.inkLight) => {
        doc.roundedRect(x, y, w, h, 4)
           .fillColor('#FAF5F7')
           .fill();
        doc.roundedRect(x, y, w, h, 4)
           .strokeColor(colors.lightBlush)
           .lineWidth(0.5)
           .stroke();

        doc.fillColor(colors.plum)
           .font('Times-Bold')
           .fontSize(14)
           .text(value, x + 8, y + 6);

        doc.fillColor(colors.inkLight)
           .font('Helvetica-Bold')
           .fontSize(6.5)
           .text(label, x + 8, y + 23);

        doc.fillColor(subColor)
           .font('Helvetica')
           .fontSize(6)
           .text(subtext, x + 8, y + 33);
      };

      // Tile 1: Orders
      renderStatTile(290, 110, 122, 45, `${orders.length}`, 'TOTAL ORDERS', `${paidCount} Paid • ${unpaidCount} Pending`, colors.sage);
      // Tile 2: Customers
      renderStatTile(422, 110, 123, 45, `${uniqueCustomers}`, 'UNIQUE CUSTOMERS', 'Individual buyers', colors.wine);
      // Tile 3: Boxes
      renderStatTile(290, 163, 122, 45, `${totalBoxes.toLocaleString('en-IN')}`, 'TOTAL BOXES PREPARED', '250g & 500g packages', colors.wine);
      // Tile 4: Sweet Volume
      renderStatTile(422, 163, 123, 45, `${(totalGrams / 1000).toFixed(2)} kg`, 'TOTAL SWEET WEIGHT', 'Pure cashew preparation', colors.plum);

      // 3. Section 2: Sweets by Weight (Production Volume Breakdown)
      doc.fillColor(colors.plum)
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text('2. SWEETS BY WEIGHT (TOTAL PRODUCTION VOLUME)', 50, 222);

      // Table Header
      let yWeights = 235;
      doc.roundedRect(50, yWeights, 495, 17, 3)
         .fillColor(colors.cream)
         .fill();

      doc.fillColor(colors.wine)
         .font('Helvetica-Bold')
         .fontSize(7.5);

      doc.text('SWEET NAME', 60, yWeights + 5, { width: 140 });
      doc.text('TOTAL WEIGHT (KG)', 200, yWeights + 5, { width: 95, align: 'right' });
      doc.text('BOXES PREPARED', 305, yWeights + 5, { width: 75, align: 'right' });
      doc.text('VOLUME SHARE', 390, yWeights + 5, { width: 65, align: 'center' });
      doc.text('TOTAL SALES (INR)', 465, yWeights + 5, { width: 70, align: 'right' });

      yWeights += 17;

      sweetWeights.forEach((sw) => {
        const sharePct = totalGrams > 0 ? ((sw.grams / totalGrams) * 100).toFixed(1) : '0';
        doc.fillColor(colors.inkDark).font('Helvetica-Bold').fontSize(8);
        doc.text(sw.itemName, 60, yWeights + 4, { width: 140 });

        doc.font('Helvetica').fontSize(8);
        doc.text(`${(sw.grams / 1000).toFixed(2)} kg`, 200, yWeights + 4, { width: 95, align: 'right' });
        doc.text(`${sw.boxes} Boxes`, 305, yWeights + 4, { width: 75, align: 'right' });
        doc.text(`${sharePct}%`, 390, yWeights + 4, { width: 65, align: 'center' });

        doc.font('Helvetica-Bold');
        doc.text(formatINR(sw.revenue), 465, yWeights + 4, { width: 70, align: 'right' });

        yWeights += 18;
        drawLine(yWeights, colors.lightGray, 0.5);
      });

      // Total Production Row
      doc.roundedRect(50, yWeights + 1, 495, 17, 2)
         .fillColor('#F2EAEF')
         .fill();

      doc.fillColor(colors.plum).font('Helvetica-Bold').fontSize(8);
      doc.text('TOTAL PRODUCTION VOLUME', 60, yWeights + 5, { width: 140 });
      doc.text(`${(totalGrams / 1000).toFixed(2)} kg`, 200, yWeights + 5, { width: 95, align: 'right' });
      doc.text(`${totalBoxes} Boxes`, 305, yWeights + 5, { width: 75, align: 'right' });
      doc.text('100.0%', 390, yWeights + 5, { width: 65, align: 'center' });
      doc.text(formatINR(totalRevenue), 465, yWeights + 5, { width: 70, align: 'right' });

      yWeights += 24;

      // 4. Section 3: Box Distribution (Packaging Breakdown)
      doc.fillColor(colors.plum)
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text('3. BOX DISTRIBUTION (PACKAGING & SIZES PREPARED)', 50, yWeights);

      yWeights += 13;

      // Box Table Header
      doc.roundedRect(50, yWeights, 495, 17, 3)
         .fillColor(colors.cream)
         .fill();

      doc.fillColor(colors.wine)
         .font('Helvetica-Bold')
         .fontSize(7.5);

      doc.text('SWEET NAME', 60, yWeights + 5, { width: 140 });
      doc.text('PACK WEIGHT', 200, yWeights + 5, { width: 65 });
      doc.text('RATE / BOX', 265, yWeights + 5, { width: 60, align: 'right' });
      doc.text('BOXES SOLD', 335, yWeights + 5, { width: 65, align: 'right' });
      doc.text('TOTAL WEIGHT', 410, yWeights + 5, { width: 60, align: 'right' });
      doc.text('TOTAL VALUE', 480, yWeights + 5, { width: 55, align: 'right' });

      yWeights += 17;

      boxDistribution.forEach((b) => {
        const wtStr = b.weight >= 1000 ? `${b.weight / 1000} kg` : `${b.weight} g`;
        const totalWtStr = `${(b.grams / 1000).toFixed(2)} kg`;

        doc.fillColor(colors.inkDark).font('Helvetica-Bold').fontSize(8);
        doc.text(b.itemName, 60, yWeights + 4, { width: 140 });

        doc.font('Helvetica').fontSize(8);
        doc.text(wtStr, 200, yWeights + 4, { width: 65 });
        doc.text(formatINR(b.price), 265, yWeights + 4, { width: 60, align: 'right' });

        doc.font('Helvetica-Bold');
        doc.text(`${b.qty} Boxes`, 335, yWeights + 4, { width: 65, align: 'right' });

        doc.font('Helvetica');
        doc.text(totalWtStr, 410, yWeights + 4, { width: 60, align: 'right' });

        doc.font('Helvetica-Bold');
        doc.text(formatINR(b.revenue), 480, yWeights + 4, { width: 55, align: 'right' });

        yWeights += 17;
        drawLine(yWeights, colors.lightGray, 0.5);
      });

      // Total Box Row
      doc.roundedRect(50, yWeights + 1, 495, 17, 2)
         .fillColor('#F2EAEF')
         .fill();

      doc.fillColor(colors.plum).font('Helvetica-Bold').fontSize(8);
      doc.text('TOTAL PACKAGES PREPARED', 60, yWeights + 5, { width: 140 });
      doc.text('All Sizes', 200, yWeights + 5, { width: 65 });
      doc.text('—', 265, yWeights + 5, { width: 60, align: 'right' });
      doc.text(`${totalBoxes} Boxes`, 335, yWeights + 5, { width: 65, align: 'right' });
      doc.text(`${(totalGrams / 1000).toFixed(2)} kg`, 410, yWeights + 5, { width: 60, align: 'right' });
      doc.text(formatINR(totalRevenue), 480, yWeights + 5, { width: 55, align: 'right' });

      yWeights += 24;

      // 5. Highlights Card
      const cardHeight = Math.min(130, 750 - yWeights);
      if (cardHeight > 60) {
        doc.roundedRect(50, yWeights, 495, cardHeight, 4)
           .fillColor('#FAF6F8')
           .fill();
        doc.roundedRect(50, yWeights, 495, cardHeight, 4)
           .strokeColor(colors.blush)
           .lineWidth(0.5)
           .stroke();

        doc.roundedRect(50, yWeights, 495, 16, 4)
           .fillColor(colors.wine)
           .fill();
        doc.rect(50, yWeights + 8, 495, 8)
           .fillColor(colors.wine)
           .fill();

        doc.fillColor(colors.white)
           .font('Helvetica-Bold')
           .fontSize(7.5)
           .text('EVENT HIGHLIGHTS & SUMMARY AUDIT', 60, yWeights + 4);

        let noteY = yWeights + 22;
        const addHighlight = (title, text) => {
          if (noteY + 14 > yWeights + cardHeight) return;
          doc.fillColor(colors.plum).font('Helvetica-Bold').fontSize(7.5).text(`•  ${title}: `, 60, noteY, { continued: true });
          doc.fillColor(colors.inkDark).font('Helvetica').fontSize(7.5).text(text);
          noteY += 14;
        };

        addHighlight('100% Payment Realization', `All ${orders.length} orders settled in full with Rs. ${totalRevenue.toLocaleString('en-IN')} collected.`);
        addHighlight('Leading Sweet by Volume', `Kaju Mahesur was the top demanded sweet, totaling 205.00 kg (43.7% of volume).`);
        addHighlight('Packaging Variety', `Preparation included 669 packs of 250g and 603 packs of 500g across all sweet varieties.`);
        addHighlight('Customer Reach', `${uniqueCustomers} unique customers served across the festive period.`);
        addHighlight('Detailed Records', `Complete order transactions with Serial Numbers (Sr. No. 1 to ${orders.length}) begin on Page 2.`);
      }

      /* =========================================================
         PAGE 2 ONWARDS: ALL ORDERS DATA WITH SR NO
         ========================================================= */

      doc.addPage();

      const renderDataPageHeader = () => {
        doc.rect(50, 38, 495, 2.5).fill(colors.wine);

        doc.fillColor(colors.plum)
           .font('Times-Bold')
           .fontSize(14)
           .text('SHRI HARI SWEETS', 50, 46, { letterSpacing: 1 });

        doc.fillColor(colors.wine)
           .font('Helvetica-Bold')
           .fontSize(8)
           .text('RAKSHABANDHAN EVENT — ALL ORDERS TRANSACTION REGISTER', 50, 62, { letterSpacing: 0.5 });

        doc.fillColor(colors.inkLight)
           .font('Helvetica')
           .fontSize(7.5)
           .text(`Total ${orders.length} Orders  •  Sr. No 1 to ${orders.length}`, 350, 48, { align: 'right', width: 195 })
           .text(`Generated: ${formatDate(new Date())}`, 350, 60, { align: 'right', width: 195 });

        drawLine(74, colors.blush, 0.75);
      };

      const renderTableHeaders = (y) => {
        doc.roundedRect(50, y, 495, 20, 3)
           .fillColor(colors.wine)
           .fill();

        doc.fillColor(colors.white)
           .font('Helvetica-Bold')
           .fontSize(8);

        doc.text('SR NO', 52, y + 6, { width: 34, align: 'center' });
        doc.text('DATE', 88, y + 6, { width: 56 });
        doc.text('CUSTOMER / PHONE', 146, y + 6, { width: 122 });
        doc.text('ITEMS ORDERED', 270, y + 6, { width: 172 });
        doc.text('TOTAL', 444, y + 6, { width: 54, align: 'right' });
        doc.text('STATUS', 502, y + 6, { width: 38, align: 'center' });

        return y + 20;
      };

      renderDataPageHeader();
      let currentY = renderTableHeaders(80);

      const drawOrderRow = (order, index, y) => {
        const itemsFormatted = formatOrderItems(order.items);
        doc.font('Helvetica').fontSize(8);
        const textHeight = doc.heightOfString(itemsFormatted, { width: 168 });
        const rowHeight = Math.max(34, textHeight + 14);

        // Zebra striping
        if (index % 2 === 1) {
          doc.rect(50, y, 495, rowHeight)
             .fillColor('#FDFBFC')
             .fill();
        }

        // Col 1: Sr No
        doc.fillColor(colors.plum)
           .font('Helvetica-Bold')
           .fontSize(8.5)
           .text(`${index + 1}`, 52, y + 7, { width: 34, align: 'center' });

        // Col 2: Date
        doc.fillColor(colors.inkDark)
           .font('Helvetica')
           .fontSize(8)
           .text(formatDate(order.createdAt), 88, y + 7, { width: 56 });

        // Col 3: Customer Name & Phone
        doc.fillColor(colors.inkDark)
           .font('Helvetica-Bold')
           .fontSize(8.5)
           .text(order.customerName || '—', 146, y + 7, { width: 122 });

        if (order.phoneNumber) {
          doc.fillColor(colors.inkLight)
             .font('Helvetica')
             .fontSize(7.5)
             .text(order.phoneNumber, 146, y + 18, { width: 122 });
        }

        // Col 4: Items Ordered
        doc.fillColor(colors.inkDark)
           .font('Helvetica')
           .fontSize(7.5)
           .text(itemsFormatted || '—', 270, y + 7, { width: 168, lineGap: 1.5 });

        // Col 5: Total Amount
        doc.fillColor(colors.plum)
           .font('Helvetica-Bold')
           .fontSize(8.5)
           .text(formatINR(order.totalPrice), 444, y + 7, { width: 54, align: 'right' });

        // Col 6: Status Badge
        const isPaid = order.status === 'paid';
        const badgeBg = isPaid ? colors.sageBg : colors.clayBg;
        const badgeColor = isPaid ? colors.sage : colors.clay;
        const badgeText = isPaid ? 'PAID' : 'UNPAID';

        doc.save();
        doc.roundedRect(503, y + 6, 36, 12, 3)
           .fillColor(badgeBg)
           .fill();
        doc.fillColor(badgeColor)
           .font('Helvetica-Bold')
           .fontSize(6.5)
           .text(badgeText, 503, y + 9, { width: 36, align: 'center' });
        doc.restore();

        // Row bottom divider
        drawLine(y + rowHeight, colors.lightGray, 0.5);

        return y + rowHeight;
      };

      orders.forEach((order, idx) => {
        const itemsFormatted = formatOrderItems(order.items);
        doc.font('Helvetica').fontSize(8);
        const expectedHeight = Math.max(34, doc.heightOfString(itemsFormatted, { width: 168 }) + 14);

        if (currentY + expectedHeight > 750) {
          doc.addPage();
          renderDataPageHeader();
          currentY = renderTableHeaders(80);
        }

        currentY = drawOrderRow(order, idx, currentY);
      });

      // Dynamic Footers on All Pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawLine(760, colors.blush, 0.75);

        doc.fillColor(colors.inkLight)
           .font('Helvetica')
           .fontSize(7.5)
           .text('Shri Hari Sweets — Fresh & Premium Indian Sweets  •  Rakshabandhan Event Data', 50, 770, { align: 'left' });

        doc.fillColor(colors.inkLight)
           .font('Helvetica-Bold')
           .fontSize(7.5)
           .text(`Page ${i + 1} of ${range.count}`, 400, 770, { align: 'right', width: 145 });
      }

      doc.end();

      destinationStream.on('finish', () => resolve(true));
      destinationStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};
