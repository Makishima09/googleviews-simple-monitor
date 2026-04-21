import { calculateContentHash, deriveReviewId } from '../lib/hashing';

describe('Hashing Functions (Milestone 5)', () => {
  describe('calculateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const review1 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      const review2 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      const hash1 = calculateContentHash(review1);
      const hash2 = calculateContentHash(review2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should generate different hash for different author', () => {
      const review1 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      const review2 = {
        author_name: 'Jane Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      expect(calculateContentHash(review1)).not.toBe(calculateContentHash(review2));
    });

    it('should generate different hash for different text', () => {
      const review1 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      const review2 = {
        author_name: 'John Doe',
        text: 'Good service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      expect(calculateContentHash(review1)).not.toBe(calculateContentHash(review2));
    });

    it('should generate different hash for different rating', () => {
      const review1 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      const review2 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 4,
        date: '2024-01-15T10:00:00.000Z'
      };

      expect(calculateContentHash(review1)).not.toBe(calculateContentHash(review2));
    });

    it('should generate different hash for different date', () => {
      const review1 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      const review2 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-16T10:00:00.000Z'
      };

      expect(calculateContentHash(review1)).not.toBe(calculateContentHash(review2));
    });

    it('should handle null/undefined values', () => {
      const review = {
        author_name: null,
        text: undefined,
        rating: null,
        date: undefined
      };

      const hash = calculateContentHash(review);
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should trim whitespace from fields', () => {
      const review1 = {
        author_name: '  John Doe  ',
        text: '  Great service!  ',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      const review2 = {
        author_name: 'John Doe',
        text: 'Great service!',
        rating: 5,
        date: '2024-01-15T10:00:00.000Z'
      };

      expect(calculateContentHash(review1)).toBe(calculateContentHash(review2));
    });

    it('should use SHA-256 algorithm', () => {
      const review = {
        author_name: 'Test',
        text: 'Test',
        rating: 5,
        date: '2024-01-15'
      };

      const hash = calculateContentHash(review);
      // SHA-256 produces hex characters
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('deriveReviewId', () => {
    it('should generate consistent ID for same input', () => {
      const id1 = deriveReviewId('place123', 'John Doe', 1705312800);
      const id2 = deriveReviewId('place123', 'John Doe', 1705312800);

      expect(id1).toBe(id2);
    });

    it('should generate different ID for different placeId', () => {
      const id1 = deriveReviewId('place123', 'John Doe', 1705312800);
      const id2 = deriveReviewId('place456', 'John Doe', 1705312800);

      expect(id1).not.toBe(id2);
    });

    it('should generate different ID for different author', () => {
      const id1 = deriveReviewId('place123', 'John Doe', 1705312800);
      const id2 = deriveReviewId('place123', 'Jane Doe', 1705312800);

      expect(id1).not.toBe(id2);
    });

    it('should generate different ID for different timestamp', () => {
      const id1 = deriveReviewId('place123', 'John Doe', 1705312800);
      const id2 = deriveReviewId('place123', 'John Doe', 1705399200);

      expect(id1).not.toBe(id2);
    });

    it('should generate MD5 hash (32 chars)', () => {
      const id = deriveReviewId('place123', 'John Doe', 1705312800);

      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[a-f0-9]+$/);
    });
  });
});