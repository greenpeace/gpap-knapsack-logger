import {MonitoredResource} from '@google-cloud/logging-bunyan/build/src/types/core';

/**
 * Explicitly get the resource information for Bunyan Logging in Stackdriver
 * The Node 10 Cloud Function environment is missing an environment variable which causes Bunyan Logs to have an undefined
 * "region" key. This means they do not appear straight away in our Stackdriver logging.
 * This function sets those keys manually to the default cloud function region so that they DO show up.
 * @see https://github.com/googleapis/nodejs-logging-bunyan/issues/291#issuecomment-526758642
 * @see https://github.com/googleapis/nodejs-logging/blob/74704b12f63edf2da51026fa57537f6e8ae6f191/src/metadata.ts#L39
 */
export function getCloudFunctionDescriptor(): MonitoredResource {
    /**
     * In GCF versions after Node 8, K_SERVICE is the preferred way to
     * get the function name and GOOGLE_CLOUD_REGION is the preferred way
     * to get the region.
     */
    return {
        type: 'cloud_function',
        labels: {
            function_name: (process.env.K_SERVICE || process.env.FUNCTION_NAME)!,
            region: (process.env.GOOGLE_CLOUD_REGION || process.env.FUNCTION_REGION)!,
        },
    };
}

export function getCloudRunDescriptor(): MonitoredResource {
    return {
        type: "cloud_run_revision",
        labels: {
            configuration_name: process.env.K_CONFIGURATION!,
            location: "australia-southeast1",
            project_id: "gpap-engineering",
            revision_name: process.env.K_REVISION!,
            service_name: process.env.K_SERVICE!,
        }
    }
}