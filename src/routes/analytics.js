const express = require('express');
const { getDB } = require('../db');

const router = express.Router();

// GET /api/analytics/most-edited
router.get('/most-edited', async (req, res, next) => {
  try {
    const db = getDB();
    const collection = db.collection('documents');
    
    const pipeline = [
      {
        $project: {
          slug: 1,
          title: 1,
          editCount: { $size: { $ifNull: ["$revision_history", []] } }
        }
      },
      {
        $sort: { editCount: -1 }
      },
      {
        $limit: 10
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();
    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/tag-cooccurrence
router.get('/tag-cooccurrence', async (req, res, next) => {
  try {
    const db = getDB();
    const collection = db.collection('documents');
    
    // To find pairs of tags that occur together, we can:
    // 1. Match documents with at least 2 tags
    // 2. Unwind tags
    // 3. For each document, we need pairs. A simpler way in mongo aggregation:
    // Actually, generating pairs directly in mongo is tricky without a custom function or cross-joining.
    // The prompt says:
    // Use $unwind on the tags array to de-normalize the documents.
    // Use $group to collect all tags for each document back into an array.
    // Use a second $unwind to create pairs of tags.
    // $group again to count the occurrences of each pair.
    
    const pipeline = [
      // Filter docs with at least 2 tags
      {
        $match: {
          "tags.1": { $exists: true }
        }
      },
      // Unwind tags once to de-normalize
      {
        $unwind: "$tags"
      },
      // Group back by document _id, but we need pairs.
      // Wait, the prompt suggests a specific way, but let's implement a robust tag pairing.
      // An easier way to get pairs if we just do:
      {
        $lookup: {
          from: "documents",
          localField: "_id",
          foreignField: "_id",
          as: "selfDoc"
        }
      },
      {
        $unwind: "$selfDoc"
      },
      {
        $unwind: "$selfDoc.tags"
      },
      // Now we have pairs: $tags and $selfDoc.tags
      // Filter out same tags or ensure alphabetical order to avoid duplicate pairs like [A, B] and [B, A]
      {
        $match: {
          $expr: {
            $lt: ["$tags", "$selfDoc.tags"] // strictly less than ensures unique pairs A-B
          }
        }
      },
      // Group by the pair and count
      {
        $group: {
          _id: { tag1: "$tags", tag2: "$selfDoc.tags" },
          count: { $sum: 1 }
        }
      },
      // Format the output
      {
        $project: {
          _id: 0,
          tags: ["$_id.tag1", "$_id.tag2"],
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();
    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
