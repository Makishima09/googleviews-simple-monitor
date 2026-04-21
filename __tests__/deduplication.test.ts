/**
 * Integration tests for deduplication functions
 * These tests require a SQLite database and are designed to run with testcontainers
 * or use an in-memory database for testing
 */

import { db } from '../lib/db/schema';
import {
  getReviewByHash,
  getReviewByHashOrDerived,
  insertReviewWithHash,
  updateReviewHash,
  markReviewDeleted,
  getActiveReviews,
  getAllReviewsForPlace,
  Review
} from '../lib/db/reviews';
import { calculateContentHash, deriveReviewId } from '../lib/hashing';

// Set up test database path
process.env.DB_PATH = ':memory:';

describe('Deduplication Functions (Milestone 5)', () => {
  // Sample test data
  const testPlaceId = 'test_place_123';
  const testReview = {
    place_id: testPlaceId,
    review_id: 'test_review_001',
    author_name: 'Test User',
    rating: 5,
    text: 'Great service!',
    date: '2024-01-15T10:00:00.000Z'
  };

  beforeEach(() => {
    // Reset database state before each test
    db.exec('DELETE FROM reviews');
    db.exec('DELETE FROM places');
  });

  describe('insertReviewWithHash', () => {
    it('should insert a new review with content_hash', () => {
      const result = insertReviewWithHash(testReview);

      expect(result).toBeGreaterThan(0);

      // Verify hash was calculated and stored
      const stored = getReviewByHash(calculateContentHash(testReview));
      expect(stored).toBeDefined();
      expect(stored?.content_hash).toBe(calculateContentHash(testReview));
    });

    it('should return 0 for duplicate review_id', () => {
      const firstInsert = insertReviewWithHash(testReview);
      const secondInsert = insertReviewWithHash(testReview);

      expect(firstInsert).toBeGreaterThan(0);
      expect(secondInsert).toBe(0);
    });
  });

  describe('getReviewByHash', () => {
    it('should find review by content_hash', () => {
      insertReviewWithHash(testReview);

      const hash = calculateContentHash(testReview);
      const found = getReviewByHash(hash);

      expect(found).toBeDefined();
      expect(found?.author_name).toBe('Test User');
      expect(found?.rating).toBe(5);
    });

    it('should return undefined for non-existent hash', () => {
      const found = getReviewByHash('nonexistent_hash_123');
      expect(found).toBeUndefined();
    });
  });

  describe('getReviewByHashOrDerived', () => {
    it('should find review by hash', () => {
      insertReviewWithHash(testReview);

      const hash = calculateContentHash(testReview);
      const derivedId = deriveReviewId(testPlaceId, testReview.author_name!, Date.now());

      const found = getReviewByHashOrDerived(hash, derivedId);
      expect(found).toBeDefined();
    });

    it('should find review by derived ID when hash not present', () => {
      // Manually insert without hash
      db.prepare(`
        INSERT INTO reviews (place_id, review_id, author_name, rating, text, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        testPlaceId,
        'manual_review_id',
        testReview.author_name,
        testReview.rating,
        testReview.text,
        testReview.date
      );

      const derivedId = deriveReviewId(testPlaceId, testReview.author_name!, 1705312800);
      const found = getReviewByHashOrDerived('nonexistent', derivedId);

      expect(found).toBeDefined();
    });

    it('should not find deleted reviews', () => {
      const insertResult = insertReviewWithHash(testReview);
      expect(insertResult).toBeGreaterThan(0);

      const review = getReviewByHash(calculateContentHash(testReview));
      expect(review).toBeDefined();

      if (review) {
        markReviewDeleted(review.id);

        const found = getReviewByHashOrDerived(
          calculateContentHash(testReview),
          'any_derived_id'
        );
        expect(found).toBeUndefined();
      }
    });
  });

  describe('updateReviewHash', () => {
    it('should update content_hash for existing review', () => {
      insertReviewWithHash(testReview);

      const originalReview = getReviewByHash(calculateContentHash(testReview));
      expect(originalReview).toBeDefined();

      if (originalReview) {
        const newHash = calculateContentHash({
          ...testReview,
          text: 'Updated text!'
        });

        updateReviewHash(originalReview.id, newHash);

        const updatedReview = getReviewByHash(newHash);
        expect(updatedReview).toBeDefined();
        expect(updatedReview?.content_hash).toBe(newHash);
      }
    });
  });

  describe('markReviewDeleted (Soft Delete)', () => {
    it('should set deleted_at timestamp', () => {
      insertReviewWithHash(testReview);

      const review = getReviewByHash(calculateContentHash(testReview));
      expect(review).toBeDefined();
      expect(review?.deleted_at).toBeNull();

      if (review) {
        markReviewDeleted(review.id);

        const deletedReview = getAllReviewsForPlace(testPlaceId)[0];
        expect(deletedReview.deleted_at).not.toBeNull();
      }
    });

    it('should not affect other reviews', () => {
      insertReviewWithHash(testReview);

      const review2 = {
        ...testReview,
        review_id: 'test_review_002',
        author_name: 'Another User'
      };
      insertReviewWithHash(review2);

      const originalReview = getReviewByHash(calculateContentHash(testReview));
      if (originalReview) {
        markReviewDeleted(originalReview.id);
      }

      const activeReviews = getActiveReviews(testPlaceId);
      expect(activeReviews.length).toBe(1);
      expect(activeReviews[0].author_name).toBe('Another User');
    });
  });

  describe('getActiveReviews', () => {
    it('should return only non-deleted reviews', () => {
      // Insert first review
      insertReviewWithHash(testReview);

      // Insert second review
      const review2 = {
        ...testReview,
        review_id: 'test_review_002'
      };
      insertReviewWithHash(review2);

      // Delete first review
      const firstReview = getReviewByHash(calculateContentHash(testReview));
      if (firstReview) {
        markReviewDeleted(firstReview.id);
      }

      const active = getActiveReviews(testPlaceId);
      expect(active.length).toBe(1);
      expect(active[0].review_id).toBe('test_review_002');
    });

    it('should return reviews sorted by date descending', () => {
      const review1 = {
        ...testReview,
        review_id: 'review_001',
        date: '2024-01-10T10:00:00.000Z'
      };
      const review2 = {
        ...testReview,
        review_id: 'review_002',
        date: '2024-01-20T10:00:00.000Z'
      };
      const review3 = {
        ...testReview,
        review_id: 'review_003',
        date: '2024-01-15T10:00:00.000Z'
      };

      insertReviewWithHash(review1);
      insertReviewWithHash(review2);
      insertReviewWithHash(review3);

      const active = getActiveReviews(testPlaceId);
      expect(active.length).toBe(3);
      expect(active[0].review_id).toBe('review_002'); // Latest date first
      expect(active[1].review_id).toBe('review_003');
      expect(active[2].review_id).toBe('review_001');
    });
  });
});