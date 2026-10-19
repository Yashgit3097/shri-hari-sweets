import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createReportPDF } from './generateBackupPDF.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://upkarbg_db_user:IhTRrUBrprEsTF9I@cluster0.apsprbq.mongodb.net/sweetDB?retryWrites=true&w=majority';

async function generateBackup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB sweetDB successfully.');

  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  // Fetch orders sorted chronologically (1st order placed to last order) for the audit register
  const orders = await Order.find({}).sort({ createdAt: 1 }).lean();
  console.log(`Fetched ${orders.length} orders for Rakshabandhan event.`);

  const backupDir = path.join(__dirname, '..', 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`Created backup folder: ${backupDir}`);
  }

  const outputPath = path.join(backupDir, 'rakshabandhan_sell_data.pdf');
  const writeStream = fs.createWriteStream(outputPath);

  console.log(`Generating PDF at ${outputPath}...`);
  await createReportPDF(orders, writeStream);

  const stats = fs.statSync(outputPath);
  console.log(`\nSUCCESS! PDF generated successfully:`);
  console.log(`File: ${outputPath}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);

  await mongoose.disconnect();
  process.exit(0);
}

generateBackup().catch((err) => {
  console.error('Error generating backup:', err);
  process.exit(1);
});
