/// <reference types="bunyan" />
// eslint-disable-next-line import/order
import * as bunyan from 'bunyan';
import * as path from 'path';
import {ulid} from 'ulid';
// Imports the Google Cloud client library for Bunyan (Node 6+)
import {LoggingBunyan} from '@google-cloud/logging-bunyan';
import {is, stayUnderStackDriverSizeLimit} from './util/size-limits/stay-under-stackdriver-size-limit';
import {getCloudFunctionDescriptor} from './cloud-function-environment-polyfill';
import {getCloudFunctionNameFromGCloud, isRunningOnGCloud} from './cloud-function-environment-detection';

// @ts-ignore that this module has no DefinitelyTyped type declaration
import bunyanDebugStream = require('bunyan-debug-stream');

/**
 * Create a unique name for the logs on your cloud function
 */
function getLoggerName() {
    const maybeAFunctionName = getCloudFunctionNameFromGCloud();
    if (maybeAFunctionName) {
        return `${maybeAFunctionName} [${ulid()}]`;
    }

    return `Data Pipeline [${ulid()}]`;
}

/**
 * Resolve the path to the root of the Pipelines directory.
 * Given the current structure of the Pipelines repo, the root can be found
 * two directories higher than this current file (i.e ./bunyan.ts/../..)
 */
function getPathToProjectRoot() {
    return path.join(__dirname, '..', '..');
}


// Creates a Bunyan Stackdriver Logging client
const loggingBunyan = new LoggingBunyan({
    resource: getCloudFunctionDescriptor(),
});

// Bunyan logs order importance with ascending numbers (e.g. low risk = 0, high risk = 100).
const min_log_level = 'trace';

// Create a Bunyan logger that streams to Stackdriver Logging
// Logs will be written to: "projects/YOUR_PROJECT_ID/logs/bunyan_log"
const bunyanLogger = bunyan.createLogger({
    // log at 'debug' and above
    level: min_log_level,
    // The JSON payload of the log as it appears in Stackdriver Logging
    // will contain "name": "my-service"
    name: getLoggerName(),
    streams: [{
        ...loggingBunyan.stream(min_log_level),
        reemitErrorEvents: true,
    }],
});

/**
 * @todo post bunyan error to slack
 */
bunyanLogger.on('error', (err) => {
    console.error(err);
});

// If we are not running on gcloud, write to STDOUT
if (!isRunningOnGCloud()) {
    const project_root = getPathToProjectRoot();
    bunyanLogger.addStream({
        level: min_log_level,
        stream: bunyanDebugStream({
                basepath: project_root, // this should be the root folder of your project.
                forceColor: true,
        }),
        type:   'stream',
    });
    bunyanLogger.addSerializers(bunyanDebugStream.serializers);
}

/**
 * A utility function to safely log objects which are too large for Stackdrivers 256k limit.
 * @param bunyanLogLevel
 * @param args
 * @note it is crucial to set the `this` argument of the bunyan logging function to the bunyan object
 */
export function sizeSafeLog(bunyanLogLevel: (...args: any) => any, ...args: any[]) {
    const [mainObject] = args;

    if (is.overStackDriverLimit(mainObject)) {
        const loggableParts = stayUnderStackDriverSizeLimit(mainObject);
        return loggableParts.map((part) => bunyanLogLevel.call(bunyanLogger, part));
    } else {
        return bunyanLogLevel.call(bunyanLogger, ...args);
    }
}

bunyanLogger.info = sizeSafeLog.bind(bunyanLogger, bunyanLogger.info);
bunyanLogger.debug = sizeSafeLog.bind(bunyanLogger, bunyanLogger.debug);
bunyanLogger.error = sizeSafeLog.bind(bunyanLogger, bunyanLogger.error);

export default bunyanLogger as bunyan;
