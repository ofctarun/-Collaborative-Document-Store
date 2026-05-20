# Collaborative Document Store

A production-ready collaborative wiki backend built with Node.js, Express, and MongoDB. This project demonstrates advanced database patterns including optimistic concurrency control for conflict-free editing, schema evolution strategies, complex aggregation pipelines for analytics, and efficient full-text search.

## Features

- **Document Management:** Create, read, and delete documents with unique URLs (slugs).
- **Optimistic Concurrency Control (OCC):** Ensures conflict-free collaborative editing. When multiple users edit the same document simultaneously, versioning prevents overwriting changes and gracefully handles conflicts.
- **Revision History:** Automatically maintains a capped history of the last 20 revisions within the document.
- **Schema Evolution:** Implements a dual-strategy approach:
  - **Lazy On-Read Migration:** Transparently updates older schemas on the fly when documents are accessed.
  - **Background Migration Script:** A batch-processing script to asynchronously migrate the entire dataset to the new schema using MongoDB `bulkWrite`.
- **Full-Text Search:** Utilizes MongoDB text indexes for relevance-based search and tag filtering.
- **Analytics:** Complex aggregation pipelines to identify the most frequently edited documents and common tag co-occurrences.
- **Automated Seeding:** On startup, automatically seeds the database with 10,000 randomized documents to facilitate immediate testing and migration scenarios.

## Technologies Used

- Node.js & Express.js
- MongoDB (Native Node.js Driver)
- Docker & Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your machine.

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ofctarun/-Collaborative-Document-Store.git
   cd -Collaborative-Document-Store
   ```

2. **Environment Variables:**
   Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. **Start the Application:**
   Run the following command to build the Docker image, start the Node.js API, and spin up the MongoDB database:
   ```bash
   docker-compose up --build
   ```
   *Note: On the first run, the application will automatically seed 10,000 documents into the database. You will see a `Seeding complete` message in the logs when it is ready.*

## API Endpoints

### Documents

- `POST /api/documents`
  Create a new document.
  *Body:* `{"title": "...", "content": "...", "tags": ["..."], "authorName": "..."}`

- `GET /api/documents/:slug`
  Retrieve a document by its slug. Automatically applies lazy schema migration if required.

- `PUT /api/documents/:slug`
  Update a document (Requires OCC).
  *Body:* `{"title": "...", "content": "...", "version": <current_version>}`
  *Returns:* `200 OK` on success, `409 Conflict` if the version does not match.

- `DELETE /api/documents/:slug`
  Delete a document.

### Search

- `GET /api/search?q=<query>&tags=<tag1>,<tag2>`
  Full-text search sorted by relevance score. Optionally filter by tags.

### Analytics

- `GET /api/analytics/most-edited`
  Returns the top 10 most edited documents based on their revision history.

- `GET /api/analytics/tag-cooccurrence`
  Calculates and returns pairs of tags that most frequently appear together.

## Background Schema Migration

To execute the background schema migration script and permanently convert all old document schemas in the database:

1. **Open a new terminal** in the project directory.
2. **Run the script:**
   ```bash
   npm run migrate:author
   ```
   *(Or run it inside the docker container if preferred)*

## License

All rights reserved.
