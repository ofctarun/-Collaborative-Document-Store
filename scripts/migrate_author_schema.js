require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DATABASE_NAME || 'wiki';

async function migrate() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB for migration');
    const db = client.db(dbName);
    const collection = db.collection('documents');

    // Query for documents where metadata.author is a string
    const query = { 'metadata.author': { $type: 'string' } };
    const cursor = collection.find(query);
    const totalToMigrate = await collection.countDocuments(query);
    
    console.log(`Found ${totalToMigrate} documents to migrate.`);

    const batchSize = 1000;
    let batch = [];
    let processed = 0;
    let modified = 0;

    for await (const doc of cursor) {
      // Prepare the update operation
      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              'metadata.author': {
                id: null,
                name: doc.metadata.author,
                email: null
              }
            }
          }
        }
      });

      if (batch.length === batchSize) {
        const result = await collection.bulkWrite(batch);
        modified += result.modifiedCount;
        processed += batch.length;
        console.log(`Processed ${processed}/${totalToMigrate} (Modified: ${modified})`);
        batch = [];
      }
    }

    // Process remaining documents
    if (batch.length > 0) {
      const result = await collection.bulkWrite(batch);
      modified += result.modifiedCount;
      processed += batch.length;
      console.log(`Processed ${processed}/${totalToMigrate} (Modified: ${modified})`);
    }

    console.log(`Migration completed. Total modified: ${modified}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrate();
