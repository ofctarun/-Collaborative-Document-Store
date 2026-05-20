const { MongoClient } = require('mongodb');
const slugify = require('slugify');

let db = null;
let client = null;

const connectDB = async () => {
  if (db) return db;

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DATABASE_NAME || 'wiki';

  client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');
    db = client.db(dbName);

    await ensureIndexes();
    await seedDataIfNeeded();

    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

const ensureIndexes = async () => {
  const collection = db.collection('documents');
  console.log('Ensuring indexes...');
  // Unique index on slug
  await collection.createIndex({ slug: 1 }, { unique: true });
  // Text index on title and content
  await collection.createIndex({ title: 'text', content: 'text' });
  console.log('Indexes ensured.');
};

const seedDataIfNeeded = async () => {
  const collection = db.collection('documents');
  const count = await collection.countDocuments();

  if (count > 0) {
    console.log(`Database already has ${count} documents. Skipping seed.`);
    return;
  }

  console.log('Database empty. Seeding 10,000 documents...');
  
  const tagsPool = ['mongodb', 'guide', 'api-design', 'database', 'backend', 'node', 'express', 'nosql', 'performance', 'architecture'];
  const wordsPool = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'];

  const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  const generateSentence = (len) => {
    return Array.from({ length: len }, () => getRandomElement(wordsPool)).join(' ');
  };

  const generateContent = () => {
    return `# ${generateSentence(3)}\n\n${generateSentence(20)}\n\n## ${generateSentence(2)}\n\n${generateSentence(30)}`;
  };

  const batchSize = 1000;
  
  for (let i = 0; i < 10; i++) {
    const docs = [];
    for (let j = 0; j < batchSize; j++) {
      const docIndex = i * batchSize + j;
      const title = `Document Title ${docIndex} ${generateSentence(2)}`;
      const slug = slugify(title, { lower: true, strict: true }) + '-' + docIndex; // ensure uniqueness
      const isOldSchema = Math.random() < 0.10; // ~10% old schema
      
      const authorId = `user-${Math.floor(Math.random() * 1000)}`;
      const authorName = `Author Name ${Math.floor(Math.random() * 1000)}`;
      
      const doc = {
        slug,
        title,
        content: generateContent(),
        version: 1,
        tags: [getRandomElement(tagsPool), getRandomElement(tagsPool)], // 2 random tags
        metadata: {
          author: isOldSchema ? authorName : {
            id: authorId,
            name: authorName,
            email: `${authorId}@example.com`
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          wordCount: Math.floor(Math.random() * 500) + 100
        },
        revision_history: [
          {
            version: 1,
            updatedAt: new Date(),
            authorId: isOldSchema ? null : authorId,
            contentDiff: "Initial creation"
          }
        ]
      };
      
      // Ensure unique tags
      doc.tags = [...new Set(doc.tags)];
      docs.push(doc);
    }
    
    await collection.insertMany(docs);
    console.log(`Seeded batch ${i + 1}/10`);
  }
  
  console.log('Seeding complete.');
};

module.exports = {
  connectDB,
  getDB
};
