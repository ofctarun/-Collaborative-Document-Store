const express = require('express');
const { getDB } = require('../db');

const router = express.Router();

// GET /api/search
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const collection = db.collection('documents');
    
    const { q, tags } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const query = {
      $text: { $search: q }
    };

    if (tags) {
      const tagsArray = tags.split(',').map(t => t.trim());
      // The requirement states "ALL of the provided tags", so we use $all
      query.tags = { $all: tagsArray };
    }

    const results = await collection.find(
      query,
      { 
        projection: { score: { $meta: "textScore" } }
      }
    )
    .sort({ score: { $meta: "textScore" } })
    .toArray();
    
    // Apply lazy migration to results as well, just in case
    results.forEach(doc => {
      if (doc.metadata && typeof doc.metadata.author === 'string') {
        doc.metadata.author = {
          id: null,
          name: doc.metadata.author,
          email: null
        };
      }
    });

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
