import PDFDocument from 'pdfkit';

/**
 * Generates a professional PDF report containing the orders list and aggregate statistics.
 * Streams the PDF directly to the Express response stream.
 */
export const generateOrdersPDF = (orders, res) => {
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    bufferPages: true, // Required to calculate total page count dynamically for footers
  });

  // Pipe the PDF document stream directly to the response
  doc.pipe(res);

  // Colors
  const colors = {
    plum: '#3B1D2A',
    wine: '#6B2B3A',
    blush: '#C5A3AE',
    cream: '#F7F2F4',
    inkDark: '#2A2A2E',
    inkLight: '#6F6B74',
    sage: '#3F7D5E', // Paid
    clay: '#C2482F', // Unpaid
    lightGray: '#F0E8EC',
    white: '#FFFFFF',
  };

  // Helper: Format Currency (INR)
  const formatINR = (num) => {
    return `Rs. ${Number(num || 0).toLocaleString('en-IN')}`;
  };

  // Helper: Format Date
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

  // Helper: Draw horizontal line
  const drawLine = (y, color = colors.lightGray, width = 1) => {
    doc.save()
       .strokeColor(color)
       .lineWidth(width)
       .moveTo(50, y)
       .lineTo(545, y)
       .stroke()
       .restore();
  };

  // Helper: Format Order Items as list with subtotals
  const formatOrderItems = (items) => {
    return (items || [])
      .map((item) => {
        const wt = item.weight >= 1000 ? `${item.weight / 1000}kg` : `${item.weight}g`;
        return `• ${item.itemName} (${wt}) x ${item.qty}   —   ${formatINR(item.amount)}`;
      })
      .join('\n');
  };

  // 1. Calculate Aggregate Stats & Prep Summary
  const prepSummaryMap = new Map();
  let totalBoxes = 0;

  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      totalBoxes += item.qty || 0;
      const key = `${item.itemName}_${item.weight}`;
      if (!prepSummaryMap.has(key)) {
        prepSummaryMap.set(key, {
          itemName: item.itemName,
          weight: item.weight,
          qty: 0,
        });
      }
      prepSummaryMap.get(key).qty += item.qty || 0;
    });
  });

  const prepSummary = Array.from(prepSummaryMap.values()).sort((a, b) => {
    if (a.itemName !== b.itemName) {
      return a.itemName.localeCompare(b.itemName);
    }
    return a.weight - b.weight;
  });

  // 2. Add Branding Header
  const renderHeader = () => {
    // Top colored banner bar
    doc.rect(50, 45, 495, 3).fill(colors.wine);

    // Title text
    doc.fillColor(colors.plum)
       .font('Times-Bold')
       .fontSize(22)
       .text('SHRI HARI SWEETS', 50, 60, { letterSpacing: 1.5 });

    // Subtitle
    doc.fillColor(colors.wine)
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('ORDER MANAGER REPORT', 50, 85, { letterSpacing: 1 });

    // Metadata details (Right aligned)
    doc.fillColor(colors.inkLight)
       .font('Helvetica')
       .fontSize(8)
       .text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 350, 63, { align: 'right', width: 195 })
       .text(`Total Orders: ${orders.length}`, 350, 75, { align: 'right', width: 195 })
       .text(`Total Boxes: ${totalBoxes}`, 350, 87, { align: 'right', width: 195 });

    drawLine(105, colors.blush, 1);
  };

  renderHeader();

  // 3. Render Boxes Preparation Summary Table
  const renderPrepSummary = (y) => {
    // Section Header
    doc.fillColor(colors.plum)
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('BOX PREPARATION SUMMARY', 50, y);

    y += 15;

    // Table Header
    doc.roundedRect(50, y, 495, 18, 4)
       .fillColor(colors.cream)
       .fill();

    doc.fillColor(colors.wine)
       .font('Helvetica-Bold')
       .fontSize(8);

    doc.text('SWEET NAME', 60, y + 5, { width: 220 });
    doc.text('BOX WEIGHT', 290, y + 5, { width: 100 });
    doc.text('BOXES TO PREPARE', 400, y + 5, { width: 135, align: 'right' });

    y += 18;

    if (prepSummary.length === 0) {
      doc.fillColor(colors.inkLight)
         .font('Helvetica-Oblique')
         .fontSize(8.5)
         .text('No items to prepare.', 60, y + 5);
      y += 16;
      drawLine(y, colors.lightGray, 0.5);
    } else {
      prepSummary.forEach((item) => {
        doc.fillColor(colors.inkDark)
           .font('Helvetica')
           .fontSize(8.5);

        // Sweet Name
        doc.text(item.itemName, 60, y + 4, { width: 220 });

        // Box Weight
        const wtStr = item.weight >= 1000 ? `${item.weight / 1000} kg` : `${item.weight} g`;
        doc.text(wtStr, 290, y + 4, { width: 100 });

        // Quantity
        doc.font('Helvetica-Bold')
           .text(`${item.qty} ${item.qty === 1 ? 'Box' : 'Boxes'}`, 400, y + 4, { width: 135, align: 'right' });

        y += 16;
        drawLine(y, colors.lightGray, 0.5);
      });
    }

    return y + 20; // Return next Y offset
  };

  let currentY = prepSummary.length > 0 ? renderPrepSummary(120) : 120;

  // 4. Orders List Table
  const renderTableHeaders = (y) => {
    doc.roundedRect(50, y, 495, 20, 4)
       .fillColor(colors.wine)
       .fill();

    doc.fillColor(colors.white)
       .font('Helvetica-Bold')
       .fontSize(8);

    doc.text('DATE', 60, y + 6, { width: 60 });
    doc.text('CUSTOMER / PHONE', 125, y + 6, { width: 130 });
    doc.text('ITEMS ORDERED', 260, y + 6, { width: 175 });
    doc.text('TOTAL', 440, y + 6, { width: 55, align: 'right' });
    doc.text('STATUS', 500, y + 6, { width: 40, align: 'center' });

    return y + 20;
  };

  currentY = renderTableHeaders(currentY);

  const drawOrderRow = (order, y) => {
    // Gather and format items listing
    const itemsFormatted = formatOrderItems(order.items);

    // Calculate row height dynamically based on items list text wrap
    doc.font('Helvetica').fontSize(8.5);
    const textHeight = doc.heightOfString(itemsFormatted, { width: 170 });
    const rowHeight = Math.max(34, textHeight + 16);

    // Alternating zebra backgrounds
    if (y % 2 === 0) {
      doc.rect(50, y, 495, rowHeight)
         .fillColor('#FDFBFC')
         .fill();
    }

    doc.fillColor(colors.inkDark);

    // Col 1: Date
    doc.font('Helvetica')
       .text(formatDate(order.createdAt), 60, y + 8, { width: 60 });

    // Col 2: Customer Name & Phone
    doc.font('Helvetica-Bold')
       .text(order.customerName, 125, y + 8, { width: 130 });
    if (order.phoneNumber) {
      doc.fillColor(colors.inkLight)
         .font('Helvetica')
         .fontSize(7.5)
         .text(order.phoneNumber, 125, y + 18, { width: 130 });
    }

    // Col 3: Items Ordered
    doc.fillColor(colors.inkDark)
       .font('Helvetica')
       .fontSize(8)
       .text(itemsFormatted || '—', 260, y + 8, { width: 170, lineGap: 2 });

    // Col 4: Total Amount
    doc.fillColor(colors.inkDark)
       .font('Helvetica-Bold')
       .fontSize(8.5)
       .text(formatINR(order.totalPrice), 430, y + 8, { width: 65, align: 'right' });

    // Col 5: Status Badge
    const isPaid = order.status === 'paid';
    const badgeColor = isPaid ? colors.sage : colors.clay;
    const badgeText = isPaid ? 'PAID' : 'UNPAID';

    doc.save();
    // Draw status pill box background
    doc.roundedRect(502, y + 7, 36, 12, 3)
       .fillColor(isPaid ? '#EEF5F1' : '#FCEFEB')
       .fill();
    // Status text
    doc.fillColor(badgeColor)
       .font('Helvetica-Bold')
       .fontSize(6.5)
       .text(badgeText, 502, y + 10, { width: 36, align: 'center' });
    doc.restore();

    // Draw bottom border line
    drawLine(y + rowHeight, colors.lightGray, 0.5);

    return y + rowHeight;
  };

  orders.forEach((order) => {
    // Estimate if the next row would exceed page limits (approx 740 points printable area)
    const itemsFormatted = formatOrderItems(order.items);
    doc.font('Helvetica').fontSize(8.5);
    const expectedHeight = Math.max(34, doc.heightOfString(itemsFormatted, { width: 170 }) + 16);

    if (currentY + expectedHeight > 740) {
      doc.addPage();
      renderHeader();
      currentY = renderTableHeaders(120);
    }

    currentY = drawOrderRow(order, currentY);
  });

  // 5. Draw Footer (Page numbers, terms, branding note) on all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Draw footer divider line
    drawLine(760, colors.blush, 0.75);

    // Footer Text
    doc.fillColor(colors.inkLight)
       .font('Helvetica')
       .fontSize(7.5)
       .text('Shri Hari Sweets — Fresh & Premium Indian Sweets', 50, 770, { align: 'left' });

    // Page Numbers
    doc.fillColor(colors.inkLight)
       .font('Helvetica-Bold')
       .fontSize(7.5)
       .text(`Page ${i + 1} of ${range.count}`, 400, 770, { align: 'right', width: 145 });
  }

  // Finalize the PDF document
  doc.end();
};
