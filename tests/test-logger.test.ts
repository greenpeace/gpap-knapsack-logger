import {assert} from 'chai';
import logger from '../index';

describe('logger', () => {
    it('should log', async () => {
        try {
            // REVIEW: How to write a test for this? Using sinon.spy?
            logger.info('lol');
            logger.debug('lol');
        } catch (error) {
            assert.fail('Logging should occur successfully');
        }
    });
});
