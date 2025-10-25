# Database Management Scripts

This directory contains scripts for managing the database seed data.

## Available Scripts

### Seed Data (`seed.ts`)

Populates the database with sample data including:

- Test user account
- Predefined genres (Poetry, Novel, Fiction, Folklore, Urban Fiction, Crime, Thriller, Philosophy, Religious)
- Sample audiobooks with proper genre assignments
- Tags (Trending, New Releases)
- User relationships and sample data

**Usage:**

```bash
npm run db:seed
```

### Delete Seed Data (`delete-seed.ts`)

Completely empties all tables in the database. This script:

- Shows a warning before deletion
- Displays current data counts
- Deletes data in the correct order to avoid foreign key constraint errors
- Provides helpful feedback during the process

**Usage:**

```bash
npm run db:delete-seed
```

## Database Management Workflow

### Fresh Start

To completely reset the database:

```bash
npm run db:delete-seed  # Empty all tables
npm run db:seed         # Repopulate with sample data
```

### Development Reset

To reset during development:

```bash
npm run db:reset        # Reset database and run migrations
npm run db:seed         # Add sample data
```

### Schema Changes

When making schema changes:

```bash
npm run db:push         # Apply schema changes
npm run db:seed         # Add sample data
```

## Safety Features

The delete script includes several safety features:

- Clear warning messages
- Data count display before deletion
- Proper error handling
- Helpful instructions for repopulating data

## Tables Affected

The delete script removes data from all tables in this order:

1. User relationships (userAudioBooks, playlistItems)
2. User-generated content (playlists, reviews, favorites)
3. User activity (listeningHistory, chapterProgress, bookmarks, notes)
4. System data (offlineDownloads, audiobookTags)
5. Core content (chapters, audiobooks)
6. Reference data (tags, genres)
7. Users (last to avoid foreign key issues)

## Notes

- Always backup your database before running the delete script in production
- The delete script is designed for development and testing environments
- Use `prisma migrate reset` for a complete database reset including schema changes
