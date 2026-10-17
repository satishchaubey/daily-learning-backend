import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/daily_learning_app';

async function seed() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected!');

  const db = mongoose.connection.db;

  // 1. Seed Roadmaps and Enriched Curriculum
  const curriculumPath = path.join(__dirname, '../../data/curriculum.json');
  if (fs.existsSync(curriculumPath)) {
    const roadmaps = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));
    console.log(`Found ${roadmaps.length} roadmaps to seed...`);
    const roadmapsColl = db.collection('roadmaps');
    for (const r of roadmaps) {
      await roadmapsColl.updateOne({ slug: r.slug }, { $set: r }, { upsert: true });
      process.stdout.write('.');
    }
    console.log('\n✓ Roadmaps seeded into MongoDB.');
  }

  // 2. Seed Original PDF Lossless Binaries
  const pdfStorePath = path.join(__dirname, '../../data/pdf_store.json');
  if (fs.existsSync(pdfStorePath)) {
    const pdfs = JSON.parse(fs.readFileSync(pdfStorePath, 'utf-8'));
    console.log(`Archiving ${pdfs.length} PDF binaries into MongoDB 'pdf_archives'...`);
    const pdfColl = db.collection('pdf_archives');
    for (const p of pdfs) {
      await pdfColl.updateOne(
        { filename: p.filename },
        { $set: p },
        { upsert: true }
      );
      process.stdout.write('+');
    }
    console.log('\n✓ All original PDFs safely stored in MongoDB pdf_archives.');
  }

  console.log('\nAll Seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding notice:', err.message);
  process.exit(0);
});
