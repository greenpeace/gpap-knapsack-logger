import { assert } from 'chai';
import * as faker from 'faker';
import logger from '../index';

describe('bunyan test', () => {
    it('should test the bunyan logger', async () => {
        try {
            logger.info(faker.random.alphaNumeric(Math.pow(10, 1000000)));
        } catch (error) {
            console.error(error);
            assert.fail();
        }
    });
});
