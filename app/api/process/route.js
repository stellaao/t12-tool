import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';

const TEMPLATE_DIR = path.join(process.cwd(), 'template');
const IMAGE_COUNT = 11;

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = await parseFormData(req);
    const files = formData.files;

    if (files.length === 0) {
      return res.status(400).json({ error: '請上傳圖片' });
    }

    // Build image map: image1.jpeg -> uploaded file (in order)
    const imageMap = {};
    files.slice(0, IMAGE_COUNT).forEach((file, i) => {
      const key = `image${i + 1}.jpeg`;
      imageMap[key] = file;
    });

    // Read template files
    const contentTypes = fs.readFileSync(path.join(TEMPLATE_DIR, '[Content_Types].xml'));
    const document = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/document.xml'));
    const rels = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/_rels/document.xml.rels'));
    const header1 = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/header1.xml'));
    const styles = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/styles.xml'));
    const settings = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/settings.xml'));
    const fontTable = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/fontTable.xml'));
    const theme = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/theme/theme1.xml'));
    const header1Rels = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/_rels/header1.xml.rels'));
    const webSettings = fs.readFileSync(path.join(TEMPLATE_DIR, 'word/webSettings.xml'));
    const coreProps = fs.readFileSync(path.join(TEMPLATE_DIR, 'docProps/core.xml'));
    const appProps = fs.readFileSync(path.join(TEMPLATE_DIR, 'docProps/app.xml'));
    const rootRels = fs.readFileSync(path.join(TEMPLATE_DIR, '_rels/.rels'));

    // Create ZIP in memory
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    const archiveStream = new Readable({
      read() {
        archive.on('data', chunk => chunks.push(chunk));
        archive.on('end', () => {
          const buffer = Buffer.concat(chunks);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', 'attachment; filename="T12_吊船文件.docx"');
          res.setHeader('Content-Length', buffer.length);
          res.end(buffer);
        });
      }
    });

    archive.pipe(archiveStream);

    // Add all static template files
    archive.append(contentTypes, { name: '[Content_Types].xml' });
    archive.append(rootRels, { name: '_rels/.rels' });
    archive.append(document, { name: 'word/document.xml' });
    archive.append(rels, { name: 'word/_rels/document.xml.rels' });
    archive.append(header1, { name: 'word/header1.xml' });
    archive.append(header1Rels, { name: 'word/_rels/header1.xml.rels' });
    archive.append(styles, { name: 'word/styles.xml' });
    archive.append(settings, { name: 'word/settings.xml' });
    archive.append(fontTable, { name: 'word/fontTable.xml' });
    archive.append(theme, { name: 'word/theme/theme1.xml' });
    archive.append(webSettings, { name: 'word/webSettings.xml' });
    archive.append(coreProps, { name: 'docProps/core.xml' });
    archive.append(appProps, { name: 'docProps/app.xml' });

    // Add replaced images
    for (let i = 1; i <= IMAGE_COUNT; i++) {
      const key = `image${i}.jpeg`;
      if (imageMap[key]) {
        const imageBuffer = await fileToBuffer(imageMap[key]);
        archive.append(imageBuffer, { name: `word/media/${key}` });
      } else {
        // Use template image
        const templateImage = path.join(TEMPLATE_DIR, `word/media/${key}`);
        if (fs.existsSync(templateImage)) {
          archive.file(templateImage, { name: `word/media/${key}` });
        }
      }
    }

    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '處理失敗：' + err.message });
  }
}

async function parseFormData(req) {
  const { default: Busboy } = await import('busboy');
  
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const files = [];
    const fields = {};

    bb.on('file', (name, file, info) => {
      const chunks = [];
      file.on('data', chunk => chunks.push(chunk));
      file.on('end', () => {
        files.push({
          filename: info.filename,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    bb.on('finish', () => resolve({ files }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

async function fileToBuffer(file) {
  if (Buffer.isBuffer(file)) return file;
  if (file.buffer) return file.buffer;
  return file;
}