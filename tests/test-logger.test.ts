import logger from '..';

describe('logger', () => {
    it('should log', async () => {
        // REVIEW: How to write a test for this? Using sinon.spy?
        logger.info('lol');
        logger.debug('lol');
    });
});
