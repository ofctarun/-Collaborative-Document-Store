const express = require('express');
const slugify = require('slugify');
const { getDB } = require('../db');

const router = express.Router();

// POST /api/documents
router.post('/', async (req, res, next) => {
  try {
    const db = getDB();
    const collection = db.collection('documents');
    
    const { title, content, tags = [], authorName, authorEmail } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    
    // Ensure slug uniqueness (simple retry mechanism)
    let slugExists = await collection.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${baseSlug}-${counter}`;
      slugExists = await collection.findOne({ slug });
      counter++;
    }

    const newDoc = {
      slug,
      title,
      content,
      version: 1,
      tags,
      metadata: {
        author: {
          id: null,
          name: authorName || 'Anonymous',
          email: authorEmail || null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: content.split(/\s+/).length
      },
      revision_history: [
        {
          version: 1,
          updatedAt: new Date(),
          authorId: null,
          contentDiff: "Initial creation"
        }
      ]
    };

    await collection.insertOne(newDoc);
    
    // The inserted document might have an _id, return the document
    res.status(201).json(newDoc);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const db = getDB();
    const collection = db.collection('documents');
    
    const { slug } = req.params;
    const document = await collection.findOne({ slug });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Lazy Migration On-Read Logic
    if (typeof document.metadata.author === 'string') {
      document.metadata.author = {
        id: null,
        name: document.metadata.author,
        email: null
      };
    }
    
    res.status(200).json(document);
  } catch (err) {
    next(err);
  }
});

// PUT /api/documents/:slug
router.put('/:slug', async (req, res, next) => {
  try {
    const db = getDB();
    const collection = db.collection('documents');
    
    const { slug } = req.params;
    const { title, content, version } = req.body;
    
    if (typeof version !== 'number') {
      return res.status(400).json({ error: 'Version number is required' });
    }

    const expectedVersion = version;
    const newVersion = expectedVersion + 1;

    // Optimistic Concurrency Control update
    const result = await collection.findOneAndUpdate(
      { slug, version: expectedVersion },
      {
        $set: { 
          title: title, 
          content: content, 
          'metadata.updatedAt': new Date(),
          'metadata.wordCount': content ? content.split(/\s+/).length : 0
        },
        $inc: { version: 1 },
        $push: {
          revision_history: {
            $each: [{ 
              version: newVersion, 
              updatedAt: new Date(), 
              authorId: null, 
              contentDiff: "Updated content" // Simplified diff 
            }],
            $slice: -20
          }
        }
      },
      { returnDocument: 'after' } // Returns the modified document
    );

    if (result) {
      // Document updated successfully
      
      // Since it's a read, we might want to apply lazy migration if we want the response to be clean, 
      // but findOneAndUpdate result will have the DB representation. 
      const updatedDoc = result;
      if (updatedDoc.metadata && typeof updatedDoc.metadata.author === 'string') {
        updatedDoc.metadata.author = {
          id: null,
          name: updatedDoc.metadata.author,
          email: null
        };
      }
      
      return res.status(200).json(updatedDoc);
    } else {
      // Document not found with that slug and version. It could be a conflict or truly not found.
      const currentDoc = await collection.findOne({ slug });
      
      if (!currentDoc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Lazy migration for the returned conflict doc too
      if (typeof currentDoc.metadata.author === 'string') {
        currentDoc.metadata.author = {
          id: null,
          name: currentDoc.metadata.author,
          email: null
        };
      }

      // Conflict occurred
      return res.status(409).json(currentDoc);
    }

  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:slug
router.delete('/:slug', async (req, res, next) => {
  try {
    const db = getDB();
    const collection = db.collection('documents');
    
    const { slug } = req.params;
    const result = await collection.deleteOne({ slug });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
