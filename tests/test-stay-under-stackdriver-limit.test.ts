import { assert } from 'chai';
import * as faker from 'faker';
import {stayUnderStackDriverSizeLimit} from '../src/util/size-limits/stay-under-stackdriver-size-limit';

describe('stay under stack driver limit', () => {
    it('should stay under', async () => {

        const object = {
            a: 123,
            b: 12345,
            c: faker.random.alphaNumeric(128001),
            d: {
                x: faker.random.alphaNumeric(128),
                y: faker.random.alphaNumeric(128),
                z: faker.random.alphaNumeric(128),
            },
        };

        const result = stayUnderStackDriverSizeLimit(object);

        const logParts = result.map(elem => elem.logPart);

        // The way in which we expect `object` to be broken up by the Knapsack Algorithm
        const aAndB = logParts.find((elem => !!elem.a && !!elem.b));
        const c = logParts.find((elem => !!elem.c));
        const dX = logParts.find((elem => !!elem.d && !!elem.d.x));
        const dY = logParts.find((elem => !!elem.d && !!elem.d.y));
        const dZ = logParts.find((elem => !!elem.d && !!elem.d.z));

        assert.isDefined(aAndB);
        assert.equal(c!.c, 'Too large to log');
        assert.isDefined(dX);
        assert.isDefined(dY);
        assert.isDefined(dZ);
    });
});
